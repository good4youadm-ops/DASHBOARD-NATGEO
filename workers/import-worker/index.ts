/**
 * Import Worker — processa fila de import_jobs com status='queued'
 *
 * Suporta importação de CSV para: customers, products, suppliers
 * Executa em loop contínuo com polling interval configurável.
 *
 * Uso:
 *   npx ts-node workers/import-worker/index.ts
 *   IMPORT_POLL_INTERVAL_MS=5000 npx ts-node workers/import-worker/index.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL          = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POLL_INTERVAL_MS      = parseInt(process.env.IMPORT_POLL_INTERVAL_MS ?? '10000');
const MAX_ROWS_PER_JOB      = parseInt(process.env.IMPORT_MAX_ROWS ?? '5000');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[import-worker] NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Logger simples ────────────────────────────────────────────────────────────
const log = {
  info:  (msg: string, ctx?: object) => console.log(JSON.stringify({ level: 'info',  msg, ts: new Date().toISOString(), ...ctx })),
  warn:  (msg: string, ctx?: object) => console.warn(JSON.stringify({ level: 'warn',  msg, ts: new Date().toISOString(), ...ctx })),
  error: (msg: string, ctx?: object) => console.error(JSON.stringify({ level: 'error', msg, ts: new Date().toISOString(), ...ctx })),
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ImportJob {
  id: string;
  tenant_id: string;
  entity: string;
  source: string;
  status: string;
  options: Record<string, unknown>;
  created_by: string;
}

interface ImportResult {
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; source_id?: string; error: string }>;
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

async function finishJob(job: ImportJob, result: ImportResult): Promise<void> {
  const status = result.failed === 0 ? 'completed' : result.inserted + result.updated > 0 ? 'partial' : 'failed';
  await sb.from('import_jobs').update({
    status,
    finished_at:   new Date().toISOString(),
    rows_processed: result.inserted + result.updated + result.failed,
    rows_inserted:  result.inserted,
    rows_updated:   result.updated,
    rows_failed:    result.failed,
  }).eq('id', job.id);

  // Persiste erros de linha na tabela import_errors
  for (const e of result.errors) {
    await sb.from('import_errors').insert({
      tenant_id:   job.tenant_id,
      job_id:      job.id,
      row_number:  e.row,
      row_data:    e.source_id ? { source_id: e.source_id } : null,
      error_code:  'ROW_ERROR',
      error_msg:   e.error,
    });
  }
}

async function failJob(job: ImportJob, error: string): Promise<void> {
  await sb.from('import_jobs').update({
    status:      'failed',
    finished_at: new Date().toISOString(),
    error_msg:   error,
  }).eq('id', job.id);
}

// ── Parsers de CSV ────────────────────────────────────────────────────────────
function parseCSV(csvText: string): Array<Record<string, string>> {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

// ── Processadores por entidade ────────────────────────────────────────────────
async function processCustomers(
  tenantId: string,
  rows: Array<Record<string, string>>,
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, failed: 0, errors: [] };
  const CHUNK = 500;

  const mapped = rows.map((r, i) => {
    try {
      if (!r.name && !r.nome) throw new Error('Campo "name" ou "nome" obrigatório');
      const name = r.name || r.nome;
      const document = r.document || r.cnpj_cpf || r.cnpj || r.cpf || null;
      const sourceId = document
        ? createHash('sha256').update(`${tenantId}:${document}`).digest('hex').slice(0, 16)
        : createHash('sha256').update(`${tenantId}:${name}:${i}`).digest('hex').slice(0, 16);
      return {
        _rowIndex: i + 2,
        _ok: true,
        tenant_id:    tenantId,
        source_system: 'csv_import',
        source_id:    sourceId,
        name,
        trade_name:   r.trade_name || r.nome_fantasia || null,
        document:     document,
        document_type: document ? (document.replace(/\D/g, '').length > 11 ? 'cnpj' : 'cpf') : null,
        email:        r.email || null,
        phone:        r.phone || r.telefone || null,
        segment:      r.segment || r.segmento || null,
        is_active:    true,
      };
    } catch (e: unknown) {
      result.failed++;
      result.errors.push({ row: i + 2, error: (e as Error).message });
      return null;
    }
  }).filter(Boolean) as Array<Record<string, unknown>>;

  for (let i = 0; i < mapped.length; i += CHUNK) {
    const chunk = mapped.slice(i, i + CHUNK).map(({ _rowIndex: _, _ok: __, ...rest }) => rest);
    const { error } = await sb
      .from('customers')
      .upsert(chunk, { onConflict: 'tenant_id,source_system,source_id', ignoreDuplicates: false });
    if (error) {
      result.failed += chunk.length;
      chunk.forEach((_, j) => result.errors.push({ row: i + j + 2, error: error.message }));
    } else {
      result.updated += chunk.length;
    }
  }
  return result;
}

async function processProducts(
  tenantId: string,
  rows: Array<Record<string, string>>,
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, failed: 0, errors: [] };
  const CHUNK = 500;

  const mapped = rows.map((r, i) => {
    try {
      if (!r.name && !r.nome && !r.descricao) throw new Error('Campo "name" obrigatório');
      const sku = r.sku || r.cod_produto || r.codigo || null;
      const name = r.name || r.nome || r.descricao;
      const sourceId = sku
        ? createHash('sha256').update(`${tenantId}:${sku}`).digest('hex').slice(0, 16)
        : createHash('sha256').update(`${tenantId}:${name}:${i}`).digest('hex').slice(0, 16);
      return {
        _rowIndex: i + 2,
        tenant_id:     tenantId,
        source_system: 'csv_import',
        source_id:     sourceId,
        sku:           sku,
        name,
        description:   r.description || r.descricao_detalhada || null,
        category:      r.category || r.categoria || null,
        brand:         r.brand || r.marca || null,
        unit:          r.unit || r.unidade || 'UN',
        cost_price:    r.cost_price || r.preco_custo ? parseFloat(r.cost_price || r.preco_custo) : null,
        sale_price:    r.sale_price || r.preco_venda ? parseFloat(r.sale_price || r.preco_venda) : null,
        ncm:           r.ncm || null,
        is_active:     true,
      };
    } catch (e: unknown) {
      result.failed++;
      result.errors.push({ row: i + 2, error: (e as Error).message });
      return null;
    }
  }).filter(Boolean) as Array<Record<string, unknown>>;

  for (let i = 0; i < mapped.length; i += CHUNK) {
    const chunk = mapped.slice(i, i + CHUNK).map(({ _rowIndex: _, ...rest }) => rest);
    const { error } = await sb
      .from('products')
      .upsert(chunk, { onConflict: 'tenant_id,source_system,source_id', ignoreDuplicates: false });
    if (error) {
      result.failed += chunk.length;
      chunk.forEach((_, j) => result.errors.push({ row: i + j + 2, error: error.message }));
    } else {
      result.updated += chunk.length;
    }
  }
  return result;
}

async function processSuppliers(
  tenantId: string,
  rows: Array<Record<string, string>>,
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, failed: 0, errors: [] };
  const CHUNK = 500;

  const mapped = rows.map((r, i) => {
    try {
      if (!r.name && !r.nome) throw new Error('Campo "name" obrigatório');
      const name = r.name || r.nome;
      const document = r.document || r.cnpj || r.cpf || null;
      const sourceId = document
        ? createHash('sha256').update(`${tenantId}:${document}`).digest('hex').slice(0, 16)
        : createHash('sha256').update(`${tenantId}:${name}:${i}`).digest('hex').slice(0, 16);
      return {
        _rowIndex: i + 2,
        tenant_id:     tenantId,
        source_system: 'csv_import',
        source_id:     sourceId,
        name,
        trade_name:    r.trade_name || r.nome_fantasia || null,
        document,
        document_type: document ? (document.replace(/\D/g, '').length > 11 ? 'cnpj' : 'cpf') : null,
        email:         r.email || null,
        phone:         r.phone || r.telefone || null,
        category:      r.category || r.categoria || null,
        is_active:     true,
      };
    } catch (e: unknown) {
      result.failed++;
      result.errors.push({ row: i + 2, error: (e as Error).message });
      return null;
    }
  }).filter(Boolean) as Array<Record<string, unknown>>;

  for (let i = 0; i < mapped.length; i += CHUNK) {
    const chunk = mapped.slice(i, i + CHUNK).map(({ _rowIndex: _, ...rest }) => rest);
    const { error } = await sb
      .from('suppliers')
      .upsert(chunk, { onConflict: 'tenant_id,source_system,source_id', ignoreDuplicates: false });
    if (error) {
      result.failed += chunk.length;
      chunk.forEach((_, j) => result.errors.push({ row: i + j + 2, error: error.message }));
    } else {
      result.updated += chunk.length;
    }
  }
  return result;
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
async function processJob(job: ImportJob): Promise<void> {
  log.info(`[import-worker] Processando job ${job.id}`, { entity: job.entity, source: job.source });

  const csvUrl: string | null = (job.options?.csv_url as string) ?? null;
  const csvData: string | null = (job.options?.csv_data as string) ?? null;

  let rawCSV: string;
  if (csvData) {
    rawCSV = csvData;
  } else if (csvUrl) {
    try {
      const resp = await fetch(csvUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ao buscar CSV`);
      rawCSV = await resp.text();
    } catch (e: unknown) {
      await failJob(job, `Falha ao baixar CSV: ${(e as Error).message}`);
      return;
    }
  } else {
    await failJob(job, 'Nenhum dado CSV encontrado em options.csv_data ou options.csv_url');
    return;
  }

  const rows = parseCSV(rawCSV);
  if (rows.length === 0) {
    await failJob(job, 'CSV vazio ou sem linhas de dados');
    return;
  }
  if (rows.length > MAX_ROWS_PER_JOB) {
    await failJob(job, `CSV excede o limite de ${MAX_ROWS_PER_JOB} linhas por job`);
    return;
  }

  log.info(`[import-worker] ${rows.length} linhas encontradas`, { entity: job.entity });

  let result: ImportResult;
  try {
    switch (job.entity) {
      case 'customers':  result = await processCustomers(job.tenant_id, rows); break;
      case 'products':   result = await processProducts(job.tenant_id, rows);  break;
      case 'suppliers':  result = await processSuppliers(job.tenant_id, rows); break;
      default:
        await failJob(job, `Entidade não suportada: ${job.entity}. Use: customers, products, suppliers`);
        return;
    }
  } catch (e: unknown) {
    await failJob(job, `Erro inesperado: ${(e as Error).message}`);
    return;
  }

  await finishJob(job, result);
  log.info(`[import-worker] Job ${job.id} finalizado`, {
    entity: job.entity,
    inserted: result.inserted,
    updated:  result.updated,
    failed:   result.failed,
  });
}

// ── Polling loop ──────────────────────────────────────────────────────────────
async function pollOnce(): Promise<void> {
  const { data: jobs, error } = await sb
    .from('import_jobs')
    .select('id, tenant_id, entity, source, status, options, created_by')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) {
    log.error('[import-worker] Erro ao buscar jobs', { error: error.message });
    return;
  }

  if (!jobs || jobs.length === 0) return;

  for (const job of jobs as ImportJob[]) {
    const claimed = await claimJob(job);
    if (!claimed) continue; // outro worker pegou o job (race condition)
    await processJob(job);
  }
}

async function main(): Promise<void> {
  log.info('[import-worker] Iniciado', { pollIntervalMs: POLL_INTERVAL_MS, maxRowsPerJob: MAX_ROWS_PER_JOB });

  // Primeira execução imediata
  await pollOnce();

  // Loop de polling
  setInterval(async () => {
    try {
      await pollOnce();
    } catch (e: unknown) {
      log.error('[import-worker] Erro no ciclo de polling', { error: (e as Error).message });
    }
  }, POLL_INTERVAL_MS);
}

main().catch(e => {
  log.error('[import-worker] Erro fatal', { error: String(e) });
  process.exit(1);
});
