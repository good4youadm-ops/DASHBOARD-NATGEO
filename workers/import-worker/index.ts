/**
 * Import Worker — processa import_jobs com status='queued'.
 * Lê options.csv_data (texto CSV bruto) + options.column_mapping para inserir
 * registros na tabela correta via Supabase.
 *
 * Uso:
 *   npx tsx workers/import-worker/index.ts          # loop infinito (padrão)
 *   npx tsx workers/import-worker/index.ts --once   # processa tudo e sai
 */
import dotenv from 'dotenv';
dotenv.config();

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL         = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POLL_INTERVAL_MS     = parseInt(process.env.IMPORT_POLL_INTERVAL_MS ?? '10000');
const MAX_ROWS_PER_JOB     = parseInt(process.env.IMPORT_MAX_ROWS        ?? '50000');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[import-worker] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Logger ───────────────────────────────────────────────────────────────────
const log = {
  info:  (msg: string, ctx?: object) => console.log(JSON.stringify({ level: 'info',  msg, ts: new Date().toISOString(), ...ctx })),
  warn:  (msg: string, ctx?: object) => console.warn(JSON.stringify({ level: 'warn',  msg, ts: new Date().toISOString(), ...ctx })),
  error: (msg: string, ctx?: object) => console.error(JSON.stringify({ level: 'error', msg, ts: new Date().toISOString(), ...ctx })),
};

// ── Tipos ────────────────────────────────────────────────────────────────────
interface ImportJob {
  id:        string;
  tenant_id: string;
  entity:    string;
  source:    string;
  status:    string;
  options:   Record<string, unknown>;
  created_by: string;
}

interface ImportResult {
  inserted: number;
  updated:  number;
  failed:   number;
  errors:   Array<{ row: number | null; source_id?: string; error: string }>;
}

// ── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(
  text: string,
  colMapping: Record<string, string>,  // { sysField → fileCol }
): Array<Record<string, string>> {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep  = lines[0].includes(';') ? ';' : ',';
  const hdrs = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));

  // Inverte mapeamento: fileCol → sysField
  const inv: Record<string, string> = {};
  for (const [sys, file] of Object.entries(colMapping)) inv[file] = sys;

  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    hdrs.forEach((h, i) => {
      const sysKey = inv[h] ?? h; // usa sysField se mapeado, senão header original
      row[sysKey] = vals[i] ?? '';
    });
    return row;
  });
}

// ── Helpers de coerção ───────────────────────────────────────────────────────
function toFloat(v: string | undefined): number | null {
  if (!v || v.trim() === '') return null;
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function toDate(v: string | undefined): string | null {
  if (!v || v.trim() === '') return null;
  const iso = v.includes('/') ? v.trim().split('/').reverse().join('-') : v.trim();
  const d   = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function sourceId(tenantId: string, ...keys: (string | undefined | null)[]): string {
  return createHash('sha256')
    .update(`${tenantId}:${keys.filter(Boolean).join(':')}`)
    .digest('hex')
    .slice(0, 20);
}

// ── Job lifecycle ─────────────────────────────────────────────────────────────
async function claimJob(job: ImportJob): Promise<boolean> {
  const { error } = await sb
    .from('import_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'queued');
  return !error;
}

async function finishJob(job: ImportJob, total: number, result: ImportResult): Promise<void> {
  const status = result.failed === total && total > 0 ? 'failed' : 'completed';
  await sb.from('import_jobs').update({
    status,
    finished_at:    new Date().toISOString(),
    processed_rows: total,
    success_rows:   result.inserted + result.updated,
    error_rows:     result.failed,
  }).eq('id', job.id);

  for (const e of result.errors) {
    await sb.from('import_errors').insert({
      tenant_id:  job.tenant_id,
      job_id:     job.id,
      row_number: e.row,
      row_data:   e.source_id ? { source_id: e.source_id } : null,
      error_code: 'ROW_ERROR',
      error_msg:  e.error,
    });
  }
}

async function failJob(job: ImportJob, msg: string): Promise<void> {
  await sb.from('import_jobs').update({
    status:      'failed',
    finished_at: new Date().toISOString(),
    error_rows:  0,
    options:     { ...(job.options ?? {}), fatal_error: msg },
  }).eq('id', job.id);
  log.warn(`[import-worker] Job ${job.id} falhou — ${msg}`);
}

async function upsertBatch(
  table: string,
  records: Record<string, unknown>[],
  conflict: string,
  result: ImportResult,
  baseIdx: number,
): Promise<void> {
  const { error } = await sb.from(table).upsert(records, {
    onConflict:       conflict,
    ignoreDuplicates: false,
  });
  if (error) {
    result.failed += records.length;
    records.forEach((_, j) => result.errors.push({ row: baseIdx + j + 2, error: error.message }));
  } else {
    result.updated += records.length;
  }
}

// ── Processadores por entidade ────────────────────────────────────────────────

async function processCustomers(tenantId: string, rows: Array<Record<string, string>>): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, failed: 0, errors: [] };
  const CHUNK = 500;

  const mapped = rows.map((r, i) => {
    const name = r.nome || r.name || '';
    if (!name) {
      result.failed++;
      result.errors.push({ row: i + 2, error: 'Campo "Nome" obrigatório ausente ou vazio' });
      return null;
    }
    const doc = r.cpf_cnpj || r.document || r.cnpj || r.cpf || '';
    return {
      tenant_id:     tenantId,
      source_system: 'csv_import',
      source_id:     sourceId(tenantId, doc || name, String(i)),
      name,
      trade_name:    r.nome_fantasia   || null,
      document:      doc               || null,
      document_type: doc ? (doc.replace(/\D/g, '').length > 11 ? 'cnpj' : 'cpf') : null,
      email:         r.email           || null,
      phone:         r.telefone        || null,
      address: {
        street: r.endereco || null,
        city:   r.cidade   || null,
        state:  r.estado   || null,
        zip:    r.cep      || null,
      },
      is_active:     true,
    };
  }).filter(Boolean) as Array<Record<string, unknown>>;

  for (let i = 0; i < mapped.length; i += CHUNK) {
    await upsertBatch('customers', mapped.slice(i, i + CHUNK), 'tenant_id,source_system,source_id', result, i);
  }
  return result;
}

async function processProducts(tenantId: string, rows: Array<Record<string, string>>): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, failed: 0, errors: [] };
  const CHUNK = 500;

  const mapped = rows.map((r, i) => {
    const name = r.descricao || r.name || r.nome || '';
    const code = r.codigo    || r.sku  || r.code || '';
    if (!name || !code) {
      result.failed++;
      result.errors.push({ row: i + 2, error: 'Campos "Código" e "Descrição" são obrigatórios' });
      return null;
    }
    return {
      tenant_id:     tenantId,
      source_system: 'csv_import',
      source_id:     sourceId(tenantId, code),
      sku:           code,
      name,
      category:      r.categoria      || null,
      unit:          r.unidade        || 'UN',
      sale_price:    toFloat(r.preco),
      ncm:           r.ncm            || null,
      extra:         r.estoque ? { stock_quantity: toFloat(r.estoque) } : {},
      is_active:     true,
    };
  }).filter(Boolean) as Array<Record<string, unknown>>;

  for (let i = 0; i < mapped.length; i += CHUNK) {
    await upsertBatch('products', mapped.slice(i, i + CHUNK), 'tenant_id,source_system,source_id', result, i);
  }
  return result;
}

async function processSuppliers(tenantId: string, rows: Array<Record<string, string>>): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, failed: 0, errors: [] };
  const CHUNK = 500;

  const mapped = rows.map((r, i) => {
    const name = r.nome || r.name || '';
    if (!name) {
      result.failed++;
      result.errors.push({ row: i + 2, error: 'Campo "Nome" obrigatório ausente ou vazio' });
      return null;
    }
    const doc = r.cpf_cnpj || r.cnpj || r.cpf || '';
    return {
      tenant_id:     tenantId,
      source_system: 'csv_import',
      source_id:     sourceId(tenantId, doc || name, String(i)),
      name,
      document:      doc || null,
      document_type: doc ? (doc.replace(/\D/g, '').length > 11 ? 'cnpj' : 'cpf') : null,
      email:         r.email    || null,
      phone:         r.telefone || null,
      address: {
        city:  r.cidade || null,
        state: r.estado || null,
      },
      is_active:     true,
    };
  }).filter(Boolean) as Array<Record<string, unknown>>;

  for (let i = 0; i < mapped.length; i += CHUNK) {
    await upsertBatch('suppliers', mapped.slice(i, i + CHUNK), 'tenant_id,source_system,source_id', result, i);
  }
  return result;
}

async function processOrders(tenantId: string, rows: Array<Record<string, string>>): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, failed: 0, errors: [] };
  const CHUNK = 200;

  const mapped = rows.map((r, i) => {
    const num  = r.numero || r.order_number || '';
    const date = toDate(r.data || r.order_date);
    const total= toFloat(r.total || r.total_amount);
    if (!num || !date) {
      result.failed++;
      result.errors.push({ row: i + 2, error: 'Campos "Nº do Pedido" e "Data" são obrigatórios' });
      return null;
    }
    return {
      tenant_id:      tenantId,
      source_system:  'csv_import',
      source_id:      sourceId(tenantId, num),
      order_number:   num,
      order_date:     date,
      total_amount:   total       ?? 0,
      status:         (['pending','approved','processing','shipped','delivered','cancelled','partial'].includes(r.status ?? '')
                        ? r.status : 'pending'),
      salesperson:    r.vendedor  || null,
      extra:          r.cliente   ? { customer_name: r.cliente } : {},
    };
  }).filter(Boolean) as Array<Record<string, unknown>>;

  for (let i = 0; i < mapped.length; i += CHUNK) {
    await upsertBatch('sales_orders', mapped.slice(i, i + CHUNK), 'tenant_id,source_system,source_id', result, i);
  }
  return result;
}

const AR_STATUS_MAP: Record<string, string> = {
  aberto: 'open', open: 'open',
  pago: 'paid', paid: 'paid',
  parcial: 'partial', partial: 'partial',
  vencido: 'overdue', overdue: 'overdue',
  cancelado: 'written_off', baixado: 'written_off', written_off: 'written_off',
  negociando: 'negotiating', negotiating: 'negotiating',
};

async function processReceivable(tenantId: string, rows: Array<Record<string, string>>): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, failed: 0, errors: [] };
  const CHUNK = 500;
  const today = new Date().toISOString().slice(0, 10);

  const mapped = rows.map((r, i) => {
    const faceValue = toFloat(r.valor || r.amount || r.face_value);
    const due       = toDate(r.vencimento || r.due_date);
    if (faceValue == null || !due) {
      result.failed++;
      result.errors.push({ row: i + 2, error: 'Campos "Valor" e "Vencimento" são obrigatórios' });
      return null;
    }
    const issueDate = toDate(r.emissao || r.issue_date) ?? today;
    const rawStatus = (r.status ?? '').toLowerCase();
    const status    = AR_STATUS_MAP[rawStatus] ?? 'open';
    const notes     = r.descricao || r.description || r.documento || null;
    return {
      tenant_id:       tenantId,
      source_system:   'csv_import',
      source_id:       sourceId(tenantId, notes ?? '', due, String(faceValue)),
      issue_date:      issueDate,
      due_date:        due,
      face_value:      faceValue,
      paid_amount:     toFloat(r.valor_pago || r.paid_amount) ?? 0,
      interest_amount: 0,
      discount_amount: 0,
      status,
      notes,
      extra:           {
        ...(r.cliente   ? { customer_name: r.cliente }   : {}),
        ...(r.categoria ? { category:      r.categoria } : {}),
      },
    };
  }).filter(Boolean) as Array<Record<string, unknown>>;

  for (let i = 0; i < mapped.length; i += CHUNK) {
    await upsertBatch('accounts_receivable', mapped.slice(i, i + CHUNK), 'tenant_id,source_system,source_id', result, i);
  }
  return result;
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
async function processJob(job: ImportJob): Promise<void> {
  const opts  = job.options ?? {};
  const colMapping = (opts.column_mapping ?? {}) as Record<string, string>;

  // Aceita raw text em csv_data, ou URL em csv_url
  const csvData: string | null = (opts.csv_data as string) ?? null;
  const csvUrl:  string | null = (opts.csv_url  as string) ?? null;

  let rawCSV: string;
  if (csvData) {
    rawCSV = csvData;
  } else if (csvUrl) {
    try {
      const resp = await fetch(csvUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      rawCSV = await resp.text();
    } catch (e: unknown) {
      await failJob(job, `Falha ao baixar CSV: ${(e as Error).message}`);
      return;
    }
  } else {
    await failJob(job, 'Nenhum dado CSV encontrado. options.csv_data ou options.csv_url são necessários.');
    return;
  }

  const rows = parseCSV(rawCSV, colMapping);
  if (rows.length === 0) {
    await failJob(job, 'Arquivo CSV vazio ou sem linhas de dados');
    return;
  }
  if (rows.length > MAX_ROWS_PER_JOB) {
    await failJob(job, `CSV excede o limite de ${MAX_ROWS_PER_JOB} linhas por job. Divida o arquivo.`);
    return;
  }

  log.info(`[import-worker] Processando job ${job.id}`, { entity: job.entity, rows: rows.length });

  let result: ImportResult;
  try {
    switch (job.entity) {
      case 'customers':  result = await processCustomers(job.tenant_id, rows);  break;
      case 'products':   result = await processProducts(job.tenant_id, rows);   break;
      case 'suppliers':  result = await processSuppliers(job.tenant_id, rows);  break;
      case 'orders':     result = await processOrders(job.tenant_id, rows);     break;
      case 'receivable': result = await processReceivable(job.tenant_id, rows); break;
      default:
        await failJob(job, `Entidade não suportada: ${job.entity}`);
        return;
    }
  } catch (e: unknown) {
    await failJob(job, `Erro inesperado: ${(e as Error).message}`);
    return;
  }

  await finishJob(job, rows.length, result);
  log.info(`[import-worker] Job ${job.id} concluído`, {
    entity:   job.entity,
    total:    rows.length,
    success:  result.inserted + result.updated,
    failed:   result.failed,
  });
}

// ── Polling ───────────────────────────────────────────────────────────────────
async function pollOnce(): Promise<number> {
  const { data: jobs, error } = await sb
    .from('import_jobs')
    .select('id, tenant_id, entity, source, status, options, created_by')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) { log.error('[import-worker] Erro ao buscar jobs', { error: error.message }); return 0; }
  if (!jobs || jobs.length === 0) return 0;

  for (const job of jobs as ImportJob[]) {
    const claimed = await claimJob(job);
    if (!claimed) continue;
    await processJob(job);
  }
  return jobs.length;
}

async function main(): Promise<void> {
  const once = process.argv.includes('--once');
  log.info('[import-worker] Iniciado', { mode: once ? 'once' : 'watch', pollIntervalMs: POLL_INTERVAL_MS });

  const count = await pollOnce();
  if (once) {
    log.info(`[import-worker] Modo --once: ${count} job(s) processado(s). Encerrando.`);
    process.exit(0);
  }

  setInterval(async () => {
    try { await pollOnce(); }
    catch (e: unknown) { log.error('[import-worker] Erro no ciclo', { error: (e as Error).message }); }
  }, POLL_INTERVAL_MS);
}

main().catch(e => { log.error('[import-worker] Erro fatal', { error: String(e) }); process.exit(1); });
