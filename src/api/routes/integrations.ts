import { Router, Request } from 'express';
import { z } from 'zod';
import { logger } from '../logger';
import { parseQuery, errMsg, qMonths, qLimit20 } from '../validators';
import * as integrationsRepo from '../../repositories/integrations';
import * as salesRepo from '../../repositories/sales';
import * as financeRepo from '../../repositories/finance';

const router = Router();

// ── Jobs de Importação ────────────────────────────────────────────────────────
router.get('/api/import-jobs', async (req, res) => {
  const q = parseQuery(qLimit20, req.query, res); if (!q) return;
  try { res.json(await integrationsRepo.listImportJobs(q.limit)); }
  catch (e) { logger.error('GET /api/import-jobs', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/import-jobs/:id', async (req, res) => {
  try { res.json(await integrationsRepo.getImportJob(req.params.id)); }
  catch (e) { logger.error('GET /api/import-jobs/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

router.post('/api/import/csv', async (req, res) => {
  const b = z.object({
    entity:         z.enum(['customers','products','suppliers','orders','receivable','payable']),
    file_name:      z.string().max(255).optional(),
    file_type:      z.enum(['csv','xlsx']).optional(),
    column_mapping: z.record(z.string()).optional(),
    options:        z.record(z.unknown()).optional(),
  }).safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  const authUser = (req as Request & { user?: { id: string } }).user;
  try {
    const opts = b.data.options ?? {};
    const csvHeaders = Array.isArray(opts['csv_headers']) ? (opts['csv_headers'] as string[]) : [];
    const mappedFields = Object.keys(b.data.column_mapping ?? {}).length;
    const enrichedOpts = {
      ...opts,
      file_type:      b.data.file_type ?? 'csv',
      column_mapping: b.data.column_mapping ?? {},
      mapped_fields:  mappedFields,
      detected_at:    new Date().toISOString(),
    };
    const source = b.data.file_type === 'xlsx' ? 'xlsx' : 'csv';
    const job = await integrationsRepo.createImportJob(
      b.data.entity, source, authUser?.id ?? '', enrichedOpts
    );
    res.status(202).json({
      message: 'Job de importação criado com mapeamento de ' + mappedFields + ' campo(s). Aguardando processamento pelo worker.',
      job,
      detected_columns:  csvHeaders,
      mapped_fields:     mappedFields,
    });
  } catch (e) { logger.error('POST /api/import/csv', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Webhooks ──────────────────────────────────────────────────────────────────
router.post('/api/webhooks/:source', async (req, res) => {
  const source = req.params.source;
  const allowedSources = ['oracle','sefaz','stripe','crm','erp'];
  if (!allowedSources.includes(source)) {
    res.status(400).json({ error: 'Fonte de webhook não reconhecida' });
    return;
  }
  try {
    const log = await integrationsRepo.logWebhook(
      source,
      String(req.headers['x-event-type'] ?? req.body?.event ?? 'unknown'),
      req.body as unknown,
      Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
      req.ip,
    );
    res.status(202).json({ received: true, id: log?.id });
  } catch (e) {
    logger.error(`POST /api/webhooks/${source}`, { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── BI ────────────────────────────────────────────────────────────────────────
router.get('/api/bi/daily-kpis', async (req, res) => {
  const q = parseQuery(z.object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }), req.query, res); if (!q) return;
  try {
    const { fetchJSON, DATA_SOURCES } = await import('../../services/dataService');
    let data = await fetchJSON<Record<string, unknown>[]>(DATA_SOURCES.salesByDay, 'salesByDay');
    if (q.dateFrom) data = data.filter(r => String(r['order_date']) >= q.dateFrom!);
    if (q.dateTo)   data = data.filter(r => String(r['order_date']) <= q.dateTo!);
    res.json(data.slice(0, 90));
  } catch (e) { logger.error('GET /api/bi/daily-kpis', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

router.get('/api/bi/customer-ranking', async (req, res) => {
  const q = parseQuery(qMonths, req.query, res); if (!q) return;
  try {
    const data = await salesRepo.getTopCustomers(50);
    res.json(data);
  } catch (e) { logger.error('GET /api/bi/customer-ranking', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

router.get('/api/bi/ar-aging', async (_req, res) => {
  try {
    const data = await financeRepo.getAccountsReceivableOpen();
    const sorted = (data as unknown as Record<string, unknown>[]).sort((a, b) => Number(b['days_overdue'] ?? 0) - Number(a['days_overdue'] ?? 0));
    res.json(sorted);
  } catch (e) { logger.error('GET /api/bi/ar-aging', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

export default router;
