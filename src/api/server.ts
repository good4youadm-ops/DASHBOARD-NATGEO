import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { z, ZodError } from 'zod';
import { createLogger, format, transports } from 'winston';
import { supabaseAdmin } from '../lib/supabase/admin';
import * as salesRepo from '../repositories/sales';
import * as inventoryRepo from '../repositories/inventory';
import * as financeRepo from '../repositories/finance';
import * as syncRepo from '../repositories/sync';
import * as customersRepo from '../repositories/customers';
import * as productsRepo from '../repositories/products';
import * as suppliersRepo from '../repositories/suppliers';
import * as ordersRepo from '../repositories/orders';
import * as logisticsRepo from '../repositories/logistics';
import * as masterDataRepo from '../repositories/master-data';
import * as commercialRepo from '../repositories/commercial';
import * as finExtRepo from '../repositories/finance-extended';
import * as fiscalRepo from '../repositories/fiscal';
import * as stockExtRepo from '../repositories/stock-extended';
import * as integrationsRepo from '../repositories/integrations';

dotenv.config();

const PORT = parseInt(process.env.PORT ?? '3001');
const TENANT_ID = process.env.SYNC_DEFAULT_TENANT_ID ?? '';
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const VERSION = process.env.npm_package_version ?? '1.0.0';
const startedAt = Date.now();

// Falha imediata se tenant não configurado — impede inicialização silenciosa quebrada
if (!TENANT_ID) {
  console.error('[FATAL] SYNC_DEFAULT_TENANT_ID não definido. Configure o .env e reinicie.');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[FATAL] Variáveis Supabase (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) não definidas.');
  process.exit(1);
}

// ── Logger (Winston) ──────────────────────────────────────────────────────────
const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [
    new transports.Console({
      format: NODE_ENV === 'development'
        ? format.combine(format.colorize(), format.simple())
        : format.json(),
    }),
    new transports.File({ filename: process.env.LOG_FILE ?? 'logs/api.log' }),
  ],
});

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();

// Arquivos estáticos — HTML dos dashboards e js/
const publicDir = path.resolve('.');
app.use(express.static(publicDir, { index: 'dashboard-comercial.html' }));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
app.use(express.json());

// Rate limiting — 120 req/min por IP nas rotas de API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
});
app.use('/api', apiLimiter);

// Log de cada requisição (sem expor body — pode conter dados sensíveis)
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, query: req.query });
  next();
});

// ── Health: básico ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: NODE_ENV,
    version: VERSION,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// ── Health: deep (testa dependências externas) ────────────────────────────────
app.get('/health/deep', async (_req, res) => {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Supabase
  try {
    const { error } = await supabaseAdmin.from('tenants').select('id').limit(1);
    checks.supabase = error
      ? { ok: false, detail: error.message }
      : { ok: true };
  } catch (e) {
    checks.supabase = { ok: false, detail: 'Conexão falhou' };
    logger.error('Deep health — Supabase falhou', { error: String(e) });
  }

  // Oracle: verifica apenas se está configurado (não abre pool aqui)
  const oracleConfigured = !!(
    process.env.ORACLE_USER &&
    process.env.ORACLE_PASSWORD &&
    process.env.ORACLE_CONNECT_STRING
  );
  checks.oracle = {
    ok: true,
    detail: oracleConfigured ? 'configurado' : 'não configurado',
  };

  // Sync: última execução por entidade
  try {
    const { data, error } = await supabaseAdmin
      .from('sync_state')
      .select('entity_name, last_synced_at')
      .eq('tenant_id', TENANT_ID)
      .limit(10);

    checks.sync = error
      ? { ok: false, detail: error.message }
      : { ok: true, detail: `${data?.length ?? 0} entidade(s) sincronizada(s)` };
  } catch (e) {
    checks.sync = { ok: false, detail: 'Consulta falhou' };
    logger.error('Deep health — sync_state falhou', { error: String(e) });
  }

  const allOk = Object.values(checks).every(c => c.ok);
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    env: NODE_ENV,
    version: VERSION,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    checks,
  });
});

// ── Config pública (URL e anon key — seguros para expor ao browser) ──────────
app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl:     process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  });
});

// ── Middleware de autenticação JWT ────────────────────────────────────────────
async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação necessário' });
    return;
  }
  const token = auth.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
  (req as Request & { user: typeof user }).user = user;
  next();
}

// Protege todas as rotas /api/* exceto /api/config
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/config') return next();
  requireAuth(req, res, next);
});

// ── Schemas de validação (Zod) ────────────────────────────────────────────────
const qMonths    = z.object({ months:    z.coerce.number().int().min(1).max(36).default(12) });
const qLimit20   = z.object({ limit:     z.coerce.number().int().min(1).max(100).default(20) });
const qLimit50   = z.object({ limit:     z.coerce.number().int().min(1).max(200).default(50) });
const qDaysAhead = z.object({ daysAhead: z.coerce.number().int().min(1).max(365).default(90) });
const qInventory = z.object({
  warehouse: z.string().max(100).optional(),
  abcCurve:  z.enum(['A','B','C','D']).optional(),
  alertOnly: z.enum(['true','false']).transform(v => v === 'true').optional(),
});
const qAR = z.object({
  bucket:     z.string().max(50).optional(),
  customerId: z.string().uuid().optional(),
});
const qAP = z.object({
  bucket:   z.string().max(50).optional(),
  category: z.string().max(100).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseQuery<T>(schema: z.ZodType<T, any, any>, query: unknown, res: Response): T | null {
  const result = schema.safeParse(query);
  if (!result.success) {
    res.status(400).json({ error: 'Parâmetros inválidos', details: result.error.flatten() });
    return null;
  }
  return result.data;
}

// ── Helper de erro ────────────────────────────────────────────────────────────
function errMsg(e: unknown): string {
  if (e instanceof ZodError) return 'Parâmetros inválidos';
  // Em produção não expõe detalhes internos ao cliente; erro fica nos logs
  if (NODE_ENV === 'production') return 'Erro interno do servidor';
  return e instanceof Error ? e.message : String(e);
}

// ── Dashboard — Vendas ────────────────────────────────────────────────────────
app.get('/api/dashboard/sales/summary', async (req, res) => {
  const q = parseQuery(qMonths, req.query, res);
  if (!q) return;
  try {
    const data = await salesRepo.getDashboardSalesSummary(supabaseAdmin, { tenantId: TENANT_ID, months: q.months });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/sales/summary', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/sales/by-day', async (_req, res) => {
  try {
    const data = await salesRepo.getSalesByDay(supabaseAdmin, TENANT_ID);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/sales/by-day', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/sales/customers', async (req, res) => {
  const q = parseQuery(qLimit20, req.query, res);
  if (!q) return;
  try {
    const data = await salesRepo.getTopCustomers(supabaseAdmin, TENANT_ID, q.limit);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/sales/customers', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/sales/products', async (req, res) => {
  const q = parseQuery(qLimit20, req.query, res);
  if (!q) return;
  try {
    const data = await salesRepo.getTopProducts(supabaseAdmin, TENANT_ID, q.limit);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/sales/products', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── Dashboard — Estoque ───────────────────────────────────────────────────────
app.get('/api/dashboard/inventory/summary', async (_req, res) => {
  try {
    const data = await inventoryRepo.getDashboardInventorySummary(supabaseAdmin, TENANT_ID);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/inventory/summary', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/inventory/products', async (req, res) => {
  const q = parseQuery(qInventory, req.query, res);
  if (!q) return;
  try {
    const data = await inventoryRepo.getStockByProduct(supabaseAdmin, TENANT_ID, {
      warehouse:  q.warehouse,
      abcCurve:   q.abcCurve,
      alertOnly:  q.alertOnly ?? false,
    });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/inventory/products', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/inventory/expiring', async (req, res) => {
  const q = parseQuery(qDaysAhead, req.query, res);
  if (!q) return;
  try {
    const data = await inventoryRepo.getExpiringLots(supabaseAdmin, TENANT_ID, q.daysAhead);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/inventory/expiring', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── Dashboard — Financeiro ────────────────────────────────────────────────────
app.get('/api/dashboard/finance/summary', async (_req, res) => {
  try {
    const data = await financeRepo.getDashboardFinanceSummary(supabaseAdmin, TENANT_ID);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/finance/summary', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/finance/receivable', async (req, res) => {
  const q = parseQuery(qAR, req.query, res);
  if (!q) return;
  try {
    const data = await financeRepo.getAccountsReceivableOpen(supabaseAdmin, TENANT_ID, { bucket: q.bucket, customerId: q.customerId });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/finance/receivable', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/finance/payable', async (req, res) => {
  const q = parseQuery(qAP, req.query, res);
  if (!q) return;
  try {
    const data = await financeRepo.getAccountsPayableOpen(supabaseAdmin, TENANT_ID, { bucket: q.bucket, category: q.category });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/finance/payable', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── Sync status ───────────────────────────────────────────────────────────────
app.get('/api/sync/status', async (_req, res) => {
  try {
    const data = await syncRepo.getSyncStatus(supabaseAdmin, TENANT_ID);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/sync/status', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/sync/errors', async (req, res) => {
  const q = parseQuery(qLimit50, req.query, res);
  if (!q) return;
  try {
    const data = await syncRepo.getRecentErrors(supabaseAdmin, TENANT_ID, q.limit);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/sync/errors', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── CRUD: Clientes ────────────────────────────────────────────────────────────
const qCrudList = z.object({
  search:   z.string().max(200).optional(),
  isActive: z.enum(['true','false']).transform(v => v === 'true').optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(200).default(50),
});

const customerBody = z.object({
  name:          z.string().min(1).max(255),
  trade_name:    z.string().max(255).optional(),
  code:          z.string().max(50).optional(),
  document:      z.string().max(20).optional(),
  document_type: z.enum(['cpf','cnpj','outros']).optional(),
  email:         z.string().email().max(255).optional().or(z.literal('')),
  phone:         z.string().max(30).optional(),
  segment:       z.string().max(100).optional(),
  classification:z.string().max(10).optional(),
  credit_limit:  z.coerce.number().min(0).optional(),
  payment_terms: z.string().max(100).optional(),
  is_active:     z.boolean().optional(),
});

app.get('/api/customers', async (req, res) => {
  const q = parseQuery(qCrudList, req.query, res); if (!q) return;
  try { res.json(await customersRepo.listCustomers(supabaseAdmin, { tenantId: TENANT_ID, ...q })); }
  catch (e) { logger.error('GET /api/customers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/customers/:id', async (req, res) => {
  try { res.json(await customersRepo.getCustomer(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/customers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.post('/api/customers', async (req, res) => {
  const b = customerBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await customersRepo.createCustomer(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/customers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.put('/api/customers/:id', async (req, res) => {
  const b = customerBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await customersRepo.updateCustomer(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/customers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.delete('/api/customers/:id', async (req, res) => {
  try { await customersRepo.deleteCustomer(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/customers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── CRUD: Produtos ────────────────────────────────────────────────────────────
const productBody = z.object({
  name:           z.string().min(1).max(255),
  sku:            z.string().max(50).optional(),
  description:    z.string().max(1000).optional(),
  category:       z.string().max(100).optional(),
  subcategory:    z.string().max(100).optional(),
  brand:          z.string().max(100).optional(),
  supplier_name:  z.string().max(255).optional(),
  unit:           z.string().max(10).default('UN'),
  unit_weight:    z.coerce.number().min(0).optional(),
  units_per_box:  z.coerce.number().int().min(1).optional(),
  cost_price:     z.coerce.number().min(0).optional(),
  sale_price:     z.coerce.number().min(0).optional(),
  min_price:      z.coerce.number().min(0).optional(),
  ncm:            z.string().max(20).optional(),
  ean:            z.string().max(20).optional(),
  abc_curve:      z.enum(['A','B','C','D']).optional(),
  is_fractionable:z.boolean().optional(),
  requires_cold:  z.boolean().optional(),
  shelf_life_days:z.coerce.number().int().min(0).optional(),
  min_stock:      z.coerce.number().min(0).optional(),
  max_stock:      z.coerce.number().min(0).optional(),
  reorder_point:  z.coerce.number().min(0).optional(),
  is_active:      z.boolean().optional(),
});

app.get('/api/products', async (req, res) => {
  const q = parseQuery(z.object({
    search:   z.string().max(200).optional(),
    category: z.string().max(100).optional(),
    abcCurve: z.enum(['A','B','C','D']).optional(),
    isActive: z.enum(['true','false']).transform(v => v === 'true').optional(),
    page:     z.coerce.number().int().min(1).default(1),
    limit:    z.coerce.number().int().min(1).max(200).default(50),
  }), req.query, res); if (!q) return;
  try { res.json(await productsRepo.listProducts(supabaseAdmin, { tenantId: TENANT_ID, ...q })); }
  catch (e) { logger.error('GET /api/products', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/products/categories', async (_req, res) => {
  try { res.json(await productsRepo.listCategories(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/products/categories', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/products/:id', async (req, res) => {
  try { res.json(await productsRepo.getProduct(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/products/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.post('/api/products', async (req, res) => {
  const b = productBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await productsRepo.createProduct(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/products', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.put('/api/products/:id', async (req, res) => {
  const b = productBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await productsRepo.updateProduct(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/products/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try { await productsRepo.deleteProduct(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/products/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── CRUD: Fornecedores ────────────────────────────────────────────────────────
const supplierBody = z.object({
  name:          z.string().min(1).max(255),
  trade_name:    z.string().max(255).optional(),
  document:      z.string().max(20).optional(),
  document_type: z.enum(['cpf','cnpj']).optional(),
  email:         z.string().email().max(255).optional().or(z.literal('')),
  phone:         z.string().max(30).optional(),
  category:      z.string().max(100).optional(),
  payment_terms: z.string().max(100).optional(),
  credit_limit:  z.coerce.number().min(0).optional(),
  is_active:     z.boolean().optional(),
});

app.get('/api/suppliers', async (req, res) => {
  const q = parseQuery(qCrudList, req.query, res); if (!q) return;
  try { res.json(await suppliersRepo.listSuppliers(supabaseAdmin, { tenantId: TENANT_ID, ...q })); }
  catch (e) { logger.error('GET /api/suppliers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/suppliers/:id', async (req, res) => {
  try { res.json(await suppliersRepo.getSupplier(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/suppliers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.post('/api/suppliers', async (req, res) => {
  const b = supplierBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await suppliersRepo.createSupplier(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/suppliers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.put('/api/suppliers/:id', async (req, res) => {
  const b = supplierBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await suppliersRepo.updateSupplier(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/suppliers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try { await suppliersRepo.deleteSupplier(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/suppliers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Lançamentos — Contas a Receber ────────────────────────────────────────────
const qAR2 = z.object({
  status: z.string().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const arBody = z.object({
  customer_id:    z.string().uuid().optional().nullable(),
  document_number: z.string().max(50).optional(),
  parcel:         z.string().max(20).optional(),
  issue_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  face_value:     z.coerce.number().min(0),
  paid_amount:    z.coerce.number().min(0).default(0),
  interest_amount: z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  status:         z.enum(['open','paid','partial','overdue','written_off','negotiating']).default('open'),
  payment_method: z.string().max(50).optional().nullable(),
  bank_account:   z.string().max(100).optional().nullable(),
  notes:          z.string().max(1000).optional().nullable(),
});

app.get('/api/receivable', async (req, res) => {
  const q = parseQuery(qAR2, req.query, res); if (!q) return;
  try { res.json(await financeRepo.listAccountsReceivable(supabaseAdmin, { tenantId: TENANT_ID, ...q })); }
  catch (e) { logger.error('GET /api/receivable', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/receivable/:id', async (req, res) => {
  try { res.json(await financeRepo.getAccountReceivable(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/receivable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.post('/api/receivable', async (req, res) => {
  const b = arBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await financeRepo.createAccountReceivable(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/receivable', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.put('/api/receivable/:id', async (req, res) => {
  const b = arBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await financeRepo.updateAccountReceivable(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/receivable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.delete('/api/receivable/:id', async (req, res) => {
  try { await financeRepo.deleteAccountReceivable(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/receivable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Lançamentos — Contas a Pagar ──────────────────────────────────────────────
const qAP2 = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const apBody = z.object({
  supplier_name:     z.string().max(200).optional().nullable(),
  supplier_document: z.string().max(30).optional().nullable(),
  document_number:   z.string().max(50).optional(),
  parcel:            z.string().max(20).optional(),
  category:          z.string().max(100).optional().nullable(),
  cost_center:       z.string().max(100).optional().nullable(),
  issue_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  face_value:        z.coerce.number().min(0),
  paid_amount:       z.coerce.number().min(0).default(0),
  interest_amount:   z.coerce.number().min(0).default(0),
  discount_amount:   z.coerce.number().min(0).default(0),
  status:            z.enum(['open','paid','partial','overdue','cancelled']).default('open'),
  payment_method:    z.string().max(50).optional().nullable(),
  bank_account:      z.string().max(100).optional().nullable(),
  notes:             z.string().max(1000).optional().nullable(),
});

app.get('/api/payable', async (req, res) => {
  const q = parseQuery(qAP2, req.query, res); if (!q) return;
  try { res.json(await financeRepo.listAccountsPayable(supabaseAdmin, { tenantId: TENANT_ID, ...q })); }
  catch (e) { logger.error('GET /api/payable', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/payable/categories', async (_req, res) => {
  try { res.json(await financeRepo.listAPCategories(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/payable/categories', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/payable/:id', async (req, res) => {
  try { res.json(await financeRepo.getAccountPayable(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/payable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.post('/api/payable', async (req, res) => {
  const b = apBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await financeRepo.createAccountPayable(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/payable', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.put('/api/payable/:id', async (req, res) => {
  const b = apBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await financeRepo.updateAccountPayable(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/payable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.delete('/api/payable/:id', async (req, res) => {
  try { await financeRepo.deleteAccountPayable(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/payable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Pedidos (Sales Orders) ────────────────────────────────────────────────────
const qOrders = z.object({
  search:     z.string().max(100).optional(),
  status:     z.string().optional(),
  customerId: z.string().uuid().optional(),
  dateFrom:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(200).default(50),
});

const orderBody = z.object({
  customer_id:     z.string().uuid().optional().nullable(),
  order_number:    z.string().max(50).optional().nullable(),
  order_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  delivery_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status:          z.enum(['pending','approved','processing','shipped','delivered','cancelled','partial']).default('pending'),
  payment_terms:   z.string().max(100).optional().nullable(),
  payment_method:  z.string().max(50).optional().nullable(),
  salesperson:     z.string().max(100).optional().nullable(),
  subtotal:        z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  tax_amount:      z.coerce.number().min(0).default(0),
  freight_amount:  z.coerce.number().min(0).default(0),
  total_amount:    z.coerce.number().min(0).default(0),
  notes:           z.string().max(2000).optional().nullable(),
});

const orderItemBody = z.object({
  product_id:   z.string().uuid().optional().nullable(),
  product_name: z.string().max(200),
  product_code: z.string().max(50).optional().nullable(),
  unit:         z.string().max(10).default('UN'),
  line_number:  z.coerce.number().int().min(1).optional(),
  quantity:     z.coerce.number().min(0),
  unit_price:   z.coerce.number().min(0),
  discount_pct: z.coerce.number().min(0).max(100).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  total_amount: z.coerce.number().min(0),
});

app.get('/api/orders', async (req, res) => {
  const q = parseQuery(qOrders, req.query, res); if (!q) return;
  try { res.json(await ordersRepo.listOrders(supabaseAdmin, { tenantId: TENANT_ID, ...q })); }
  catch (e) { logger.error('GET /api/orders', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/orders/:id', async (req, res) => {
  try { res.json(await ordersRepo.getOrder(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/orders/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/orders/:id/items', async (req, res) => {
  try { res.json(await ordersRepo.getOrderItems(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/orders/:id/items', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.post('/api/orders', async (req, res) => {
  const b = orderBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await ordersRepo.createOrder(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/orders', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.post('/api/orders/:id/items', async (req, res) => {
  const b = orderItemBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await ordersRepo.addOrderItem(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('POST /api/orders/:id/items', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.put('/api/orders/:id', async (req, res) => {
  const b = orderBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await ordersRepo.updateOrder(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/orders/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.delete('/api/orders/:id/items/:itemId', async (req, res) => {
  try { await ordersRepo.removeOrderItem(supabaseAdmin, TENANT_ID, req.params.id, req.params.itemId); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/orders/:id/items/:itemId', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.delete('/api/orders/:id', async (req, res) => {
  try { await ordersRepo.deleteOrder(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/orders/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Estoque — movimentos manuais ──────────────────────────────────────────────
const movementBody = z.object({
  product_id:     z.string().uuid(),
  movement_date:  z.string().default(() => new Date().toISOString()),
  movement_type:  z.enum(['entrada','saida','ajuste','transferencia','devolucao','perda','avaria','inventario']),
  direction:      z.enum(['in','out']),
  warehouse_from: z.string().max(50).optional().nullable(),
  warehouse_to:   z.string().max(50).optional().nullable(),
  quantity:       z.coerce.number(),
  unit_cost:      z.coerce.number().min(0).optional().nullable(),
  total_cost:     z.coerce.number().min(0).optional().nullable(),
  document_ref:   z.string().max(100).optional().nullable(),
  reason:         z.string().max(500).optional().nullable(),
  operator:       z.string().max(100).optional().nullable(),
});

app.get('/api/stock/movements', async (req, res) => {
  const q = parseQuery(qLimit50, req.query, res); if (!q) return;
  try {
    const { data, error } = await supabaseAdmin
      .from('inventory_movements')
      .select('*, products(name,sku)')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
      .range(0, (q.limit ?? 50) - 1);
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { logger.error('GET /api/stock/movements', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.post('/api/stock/movements', async (req, res) => {
  const b = movementBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try {
    const payload = { ...b.data, tenant_id: TENANT_ID, source_system: 'manual', source_id: crypto.randomUUID() };
    const { data, error } = await supabaseAdmin
      .from('inventory_movements')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(payload as any)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { logger.error('POST /api/stock/movements', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Logística — Motoristas ────────────────────────────────────────────────────
const driverBody = z.object({
  name:         z.string().min(1).max(200),
  document:     z.string().max(20).optional().nullable(),
  cnh:          z.string().max(30).optional().nullable(),
  cnh_category: z.string().max(5).optional().nullable(),
  cnh_expiry:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  phone:        z.string().max(20).optional().nullable(),
  email:        z.string().email().optional().nullable(),
  is_active:    z.boolean().default(true),
  notes:        z.string().max(1000).optional().nullable(),
});

app.get('/api/drivers', async (req, res) => {
  try { res.json(await logisticsRepo.listDrivers(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/drivers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/drivers', async (req, res) => {
  const b = driverBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await logisticsRepo.createDriver(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/drivers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/drivers/:id', async (req, res) => {
  const b = driverBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await logisticsRepo.updateDriver(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/drivers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.delete('/api/drivers/:id', async (req, res) => {
  try { await logisticsRepo.deleteDriver(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/drivers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Logística — Veículos ──────────────────────────────────────────────────────
const vehicleBody = z.object({
  plate:       z.string().min(1).max(10),
  model:       z.string().max(100).optional().nullable(),
  brand:       z.string().max(100).optional().nullable(),
  year:        z.coerce.number().int().min(1980).max(2030).optional().nullable(),
  type:        z.enum(['caminhao','van','moto','carro','utilitario']).optional().nullable(),
  capacity_kg: z.coerce.number().min(0).optional().nullable(),
  is_active:   z.boolean().default(true),
  notes:       z.string().max(1000).optional().nullable(),
});

app.get('/api/vehicles', async (req, res) => {
  try { res.json(await logisticsRepo.listVehicles(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/vehicles', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/vehicles', async (req, res) => {
  const b = vehicleBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await logisticsRepo.createVehicle(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/vehicles', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/vehicles/:id', async (req, res) => {
  const b = vehicleBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await logisticsRepo.updateVehicle(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/vehicles/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.delete('/api/vehicles/:id', async (req, res) => {
  try { await logisticsRepo.deleteVehicle(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/vehicles/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Logística — Rotas ─────────────────────────────────────────────────────────
const routeBody = z.object({
  route_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  driver_id:        z.string().uuid().optional().nullable(),
  vehicle_id:       z.string().uuid().optional().nullable(),
  status:           z.enum(['planned','in_progress','completed','cancelled']).default('planned'),
  total_weight_kg:  z.coerce.number().min(0).optional().nullable(),
  notes:            z.string().max(1000).optional().nullable(),
});

app.get('/api/routes', async (req, res) => {
  const { dateFrom, dateTo } = req.query as Record<string, string>;
  try { res.json(await logisticsRepo.listRoutes(supabaseAdmin, TENANT_ID, dateFrom, dateTo)); }
  catch (e) { logger.error('GET /api/routes', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/routes', async (req, res) => {
  const b = routeBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await logisticsRepo.createRoute(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/routes', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/routes/:id', async (req, res) => {
  const b = routeBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await logisticsRepo.updateRoute(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/routes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.delete('/api/routes/:id', async (req, res) => {
  try { await logisticsRepo.deleteRoute(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/routes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Master Data — Marcas ──────────────────────────────────────────────────────
const brandBody = z.object({
  name:      z.string().min(1).max(200),
  code:      z.string().max(50).optional(),
  logo_url:  z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
});

app.get('/api/brands', async (_req, res) => {
  try { res.json(await masterDataRepo.listBrands(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/brands', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/brands', async (req, res) => {
  const b = brandBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createBrand(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/brands', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/brands/:id', async (req, res) => {
  const b = brandBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateBrand(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/brands/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.delete('/api/brands/:id', async (req, res) => {
  try { await masterDataRepo.deleteBrand(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/brands/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Master Data — Categorias ──────────────────────────────────────────────────
const categoryBody = z.object({
  name:      z.string().min(1).max(200),
  code:      z.string().max(50).optional(),
  parent_id: z.string().uuid().optional().nullable(),
  level:     z.coerce.number().int().min(1).max(5).optional(),
  is_active: z.boolean().optional(),
});

app.get('/api/categories', async (_req, res) => {
  try { res.json(await masterDataRepo.listCategories(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/categories', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/categories', async (req, res) => {
  const b = categoryBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createCategory(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/categories', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/categories/:id', async (req, res) => {
  const b = categoryBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateCategory(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/categories/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Master Data — Formas de Pagamento ────────────────────────────────────────
const paymentMethodBody = z.object({
  name:         z.string().min(1).max(200),
  code:         z.string().min(1).max(50),
  type:         z.enum(['cash','bank_transfer','credit_card','debit_card','boleto','pix','check','other']),
  installments: z.coerce.number().int().min(1).max(60).optional(),
  grace_days:   z.coerce.number().int().min(0).max(365).optional(),
  is_active:    z.boolean().optional(),
});

app.get('/api/payment-methods', async (_req, res) => {
  try { res.json(await masterDataRepo.listPaymentMethods(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/payment-methods', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/payment-methods', async (req, res) => {
  const b = paymentMethodBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createPaymentMethod(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/payment-methods', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/payment-methods/:id', async (req, res) => {
  const b = paymentMethodBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updatePaymentMethod(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/payment-methods/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Master Data — Representantes ──────────────────────────────────────────────
const salesRepBody = z.object({
  name:           z.string().min(1).max(200),
  code:           z.string().max(50).optional().nullable(),
  email:          z.string().email().optional().nullable(),
  phone:          z.string().max(30).optional().nullable(),
  region:         z.string().max(100).optional().nullable(),
  commission_pct: z.coerce.number().min(0).max(100).optional(),
  is_active:      z.boolean().optional(),
});

app.get('/api/sales-reps', async (req, res) => {
  const activeOnly = req.query.active !== 'false';
  try { res.json(await masterDataRepo.listSalesReps(supabaseAdmin, TENANT_ID, activeOnly)); }
  catch (e) { logger.error('GET /api/sales-reps', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/sales-reps', async (req, res) => {
  const b = salesRepBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createSalesRep(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/sales-reps', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/sales-reps/:id', async (req, res) => {
  const b = salesRepBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateSalesRep(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/sales-reps/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Master Data — Transportadoras ────────────────────────────────────────────
const carrierBody = z.object({
  name:     z.string().min(1).max(200),
  code:     z.string().max(50).optional().nullable(),
  document: z.string().max(20).optional().nullable(),
  email:    z.string().email().optional().nullable(),
  phone:    z.string().max(30).optional().nullable(),
  modality: z.enum(['road','air','sea','express','own']).optional().nullable(),
  is_active:z.boolean().optional(),
});

app.get('/api/carriers', async (req, res) => {
  const activeOnly = req.query.active !== 'false';
  try { res.json(await masterDataRepo.listCarriers(supabaseAdmin, TENANT_ID, activeOnly)); }
  catch (e) { logger.error('GET /api/carriers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/carriers', async (req, res) => {
  const b = carrierBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createCarrier(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/carriers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/carriers/:id', async (req, res) => {
  const b = carrierBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateCarrier(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/carriers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Master Data — Centros de Custo ────────────────────────────────────────────
const costCenterBody = z.object({
  name:      z.string().min(1).max(200),
  code:      z.string().min(1).max(50),
  parent_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
});

app.get('/api/cost-centers', async (_req, res) => {
  try { res.json(await masterDataRepo.listCostCenters(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/cost-centers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/cost-centers', async (req, res) => {
  const b = costCenterBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createCostCenter(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/cost-centers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/cost-centers/:id', async (req, res) => {
  const b = costCenterBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateCostCenter(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/cost-centers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Comercial — Orçamentos ────────────────────────────────────────────────────
const quoteBody = z.object({
  customer_id:    z.string().uuid(),
  sales_rep_id:   z.string().uuid().optional().nullable(),
  price_table_id: z.string().uuid().optional().nullable(),
  quote_number:   z.string().max(50),
  status:         z.enum(['draft','sent','accepted','rejected','expired','converted']).optional(),
  valid_until:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  subtotal:       z.coerce.number().min(0).optional(),
  discount_pct:   z.coerce.number().min(0).max(100).optional(),
  discount_value: z.coerce.number().min(0).optional(),
  total:          z.coerce.number().min(0).optional(),
  notes:          z.string().max(2000).optional().nullable(),
});
const quoteItemBody = z.object({
  product_id:  z.string().uuid(),
  quantity:    z.coerce.number().min(0.001),
  unit_price:  z.coerce.number().min(0),
  discount_pct:z.coerce.number().min(0).max(100).optional(),
  total:       z.coerce.number().min(0).optional(),
  notes:       z.string().max(500).optional().nullable(),
});
const qCommercialList = z.object({
  status:      z.string().optional(),
  customerId:  z.string().uuid().optional(),
  salesRepId:  z.string().uuid().optional(),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(200).default(50),
});

app.get('/api/quotes', async (req, res) => {
  const q = parseQuery(qCommercialList, req.query, res); if (!q) return;
  try { res.json(await commercialRepo.listQuotes(supabaseAdmin, { tenantId: TENANT_ID, ...q })); }
  catch (e) { logger.error('GET /api/quotes', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.get('/api/quotes/:id', async (req, res) => {
  try { res.json(await commercialRepo.getQuote(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/quotes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/quotes', async (req, res) => {
  const b = quoteBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await commercialRepo.createQuote(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/quotes', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/quotes/:id/items', async (req, res) => {
  const b = quoteItemBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await commercialRepo.addQuoteItem(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('POST /api/quotes/:id/items', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/quotes/:id', async (req, res) => {
  const b = quoteBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await commercialRepo.updateQuote(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/quotes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.delete('/api/quotes/:id/items/:itemId', async (req, res) => {
  try { await commercialRepo.removeQuoteItem(supabaseAdmin, TENANT_ID, req.params.itemId); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/quotes/:id/items/:itemId', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.delete('/api/quotes/:id', async (req, res) => {
  try { await commercialRepo.deleteQuote(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/quotes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Comercial — Metas e Comissões ─────────────────────────────────────────────
const goalBody = z.object({
  sales_rep_id:     z.string().uuid().optional().nullable(),
  branch_id:        z.string().uuid().optional().nullable(),
  period_type:      z.enum(['monthly','quarterly','yearly']),
  period_year:      z.coerce.number().int().min(2020).max(2099),
  period_month:     z.coerce.number().int().min(1).max(12).optional().nullable(),
  period_quarter:   z.coerce.number().int().min(1).max(4).optional().nullable(),
  target_revenue:   z.coerce.number().min(0),
  target_orders:    z.coerce.number().int().min(0).optional().nullable(),
  target_customers: z.coerce.number().int().min(0).optional().nullable(),
  notes:            z.string().max(500).optional().nullable(),
});
const qYear = z.object({
  year:  z.coerce.number().int().min(2020).max(2099).default(new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

app.get('/api/goals', async (req, res) => {
  const q = parseQuery(qYear, req.query, res); if (!q) return;
  try { res.json(await commercialRepo.listGoals(supabaseAdmin, TENANT_ID, q.year, q.month)); }
  catch (e) { logger.error('GET /api/goals', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/goals', async (req, res) => {
  const b = goalBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await commercialRepo.upsertGoal(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/goals', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/goals/vs-actual', async (req, res) => {
  const q = parseQuery(qYear, req.query, res); if (!q) return;
  try { res.json(await commercialRepo.getGoalsVsActual(supabaseAdmin, TENANT_ID, q.year, q.month)); }
  catch (e) { logger.error('GET /api/goals/vs-actual', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/sales-reps/performance', async (req, res) => {
  const q = parseQuery(qMonths, req.query, res); if (!q) return;
  try { res.json(await commercialRepo.getSalesRepPerformance(supabaseAdmin, TENANT_ID, q.months)); }
  catch (e) { logger.error('GET /api/sales-reps/performance', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Financeiro Estendido — Contas Bancárias ───────────────────────────────────
const bankAccountBody = z.object({
  name:            z.string().min(1).max(200),
  bank_name:       z.string().min(1).max(200),
  bank_code:       z.string().max(10).optional().nullable(),
  agency:          z.string().max(20).optional().nullable(),
  account:         z.string().max(20).optional().nullable(),
  account_type:    z.enum(['checking','savings','investment','cash']),
  currency:        z.string().length(3).optional(),
  initial_balance: z.coerce.number().optional(),
  is_active:       z.boolean().optional(),
});

app.get('/api/bank-accounts', async (_req, res) => {
  try { res.json(await finExtRepo.listBankAccounts(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/bank-accounts', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/bank-accounts', async (req, res) => {
  const b = bankAccountBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await finExtRepo.createBankAccount(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/bank-accounts', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/bank-accounts/:id', async (req, res) => {
  const b = bankAccountBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await finExtRepo.updateBankAccount(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/bank-accounts/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.delete('/api/bank-accounts/:id', async (req, res) => {
  try { await finExtRepo.deleteBankAccount(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/bank-accounts/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Financeiro Estendido — Transações ─────────────────────────────────────────
const transactionBody = z.object({
  bank_account_id:  z.string().uuid(),
  category_id:      z.string().uuid().optional().nullable(),
  cost_center_id:   z.string().uuid().optional().nullable(),
  type:             z.enum(['credit','debit','transfer']),
  amount:           z.coerce.number().min(0.01),
  description:      z.string().min(1).max(500),
  reference:        z.string().max(100).optional().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reconciled:       z.boolean().optional(),
});
const qTransactions = z.object({
  bankAccountId: z.string().uuid().optional(),
  categoryId:    z.string().uuid().optional(),
  type:          z.enum(['credit','debit','transfer']).optional(),
  reconciled:    z.enum(['true','false']).transform(v => v === 'true').optional(),
  dateFrom:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page:          z.coerce.number().int().min(1).default(1),
  limit:         z.coerce.number().int().min(1).max(200).default(50),
});

app.get('/api/transactions', async (req, res) => {
  const q = parseQuery(qTransactions, req.query, res); if (!q) return;
  try { res.json(await finExtRepo.listTransactions(supabaseAdmin, { tenantId: TENANT_ID, ...q })); }
  catch (e) { logger.error('GET /api/transactions', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/transactions', async (req, res) => {
  const b = transactionBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await finExtRepo.createTransaction(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/transactions', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/transactions/:id', async (req, res) => {
  const b = transactionBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await finExtRepo.updateTransaction(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/transactions/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.delete('/api/transactions/:id', async (req, res) => {
  try { await finExtRepo.deleteTransaction(supabaseAdmin, TENANT_ID, req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/transactions/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.get('/api/cash-flow', async (req, res) => {
  const q = parseQuery(z.object({ bankAccountId: z.string().uuid().optional(), months: z.coerce.number().int().min(1).max(24).default(3) }), req.query, res); if (!q) return;
  try { res.json(await finExtRepo.getCashFlow(supabaseAdmin, TENANT_ID, q.bankAccountId, q.months)); }
  catch (e) { logger.error('GET /api/cash-flow', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Fiscal — Notas Fiscais ────────────────────────────────────────────────────
const invoiceBody = z.object({
  customer_id:   z.string().uuid().optional().nullable(),
  sales_order_id:z.string().uuid().optional().nullable(),
  invoice_number:z.string().max(20).optional().nullable(),
  series:        z.string().max(5).optional(),
  direction:     z.enum(['outgoing','incoming']).optional(),
  status:        z.enum(['draft','pending','authorized','rejected','cancelled','contingency']).optional(),
  issue_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  total_products:z.coerce.number().min(0).optional(),
  total_freight: z.coerce.number().min(0).optional(),
  total_tax:     z.coerce.number().min(0).optional(),
  total_invoice: z.coerce.number().min(0).optional(),
  notes:         z.string().max(2000).optional().nullable(),
});
const qInvoiceList = z.object({
  status:     z.string().optional(),
  direction:  z.enum(['outgoing','incoming']).optional(),
  customerId: z.string().uuid().optional(),
  dateFrom:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(200).default(50),
});

app.get('/api/invoices', async (req, res) => {
  const q = parseQuery(qInvoiceList, req.query, res); if (!q) return;
  try { res.json(await fiscalRepo.listInvoices(supabaseAdmin, { tenantId: TENANT_ID, ...q })); }
  catch (e) { logger.error('GET /api/invoices', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.get('/api/invoices/:id', async (req, res) => {
  try { res.json(await fiscalRepo.getInvoice(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/invoices/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/invoices', async (req, res) => {
  const b = invoiceBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await fiscalRepo.createInvoice(supabaseAdmin, TENANT_ID, b.data)); }
  catch (e) { logger.error('POST /api/invoices', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/invoices/:id', async (req, res) => {
  const b = invoiceBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await fiscalRepo.updateInvoice(supabaseAdmin, TENANT_ID, req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/invoices/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.delete('/api/invoices/:id', async (req, res) => {
  try { res.json(await fiscalRepo.cancelInvoice(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('DELETE /api/invoices/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Fiscal — Configurações e Regras ──────────────────────────────────────────
app.get('/api/fiscal/config', async (_req, res) => {
  try { res.json(await fiscalRepo.getFiscalConfig(supabaseAdmin, TENANT_ID)); }
  catch (e) { logger.error('GET /api/fiscal/config', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/fiscal/config', async (req, res) => {
  try { res.json(await fiscalRepo.upsertFiscalConfig(supabaseAdmin, TENANT_ID, req.body as Record<string, unknown>)); }
  catch (e) { logger.error('PUT /api/fiscal/config', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.get('/api/fiscal/tax-rules', async (req, res) => {
  try { res.json(await fiscalRepo.listTaxRules(supabaseAdmin, TENANT_ID, req.query.ncm as string | undefined)); }
  catch (e) { logger.error('GET /api/fiscal/tax-rules', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/fiscal/tax-rules', async (req, res) => {
  try { res.status(201).json(await fiscalRepo.createTaxRule(supabaseAdmin, TENANT_ID, req.body as Record<string, unknown>)); }
  catch (e) { logger.error('POST /api/fiscal/tax-rules', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Estoque Estendido — Crítico e Reservas ────────────────────────────────────
app.get('/api/stock/critical', async (req, res) => {
  try { res.json(await stockExtRepo.getCriticalStock(supabaseAdmin, TENANT_ID, req.query.warehouse as string | undefined)); }
  catch (e) { logger.error('GET /api/stock/critical', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.get('/api/stock/product-ranking', async (req, res) => {
  const q = parseQuery(z.object({ months: z.coerce.number().int().min(1).max(24).default(3), limit: z.coerce.number().int().min(1).max(100).default(20) }), req.query, res); if (!q) return;
  try { res.json(await stockExtRepo.getProductRanking(supabaseAdmin, TENANT_ID, q.months, q.limit)); }
  catch (e) { logger.error('GET /api/stock/product-ranking', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Estoque — Contagens de Inventário ────────────────────────────────────────
app.get('/api/inventory-counts', async (req, res) => {
  try { res.json(await stockExtRepo.listInventoryCounts(supabaseAdmin, TENANT_ID, req.query.status as string | undefined)); }
  catch (e) { logger.error('GET /api/inventory-counts', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.get('/api/inventory-counts/:id', async (req, res) => {
  try { res.json(await stockExtRepo.getInventoryCount(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/inventory-counts/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/inventory-counts', async (req, res) => {
  const authUser = (req as Request & { user?: { id: string } }).user;
  try { res.status(201).json(await stockExtRepo.createInventoryCount(supabaseAdmin, TENANT_ID, req.body as Record<string, unknown>, authUser?.id ?? '')); }
  catch (e) { logger.error('POST /api/inventory-counts', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.put('/api/inventory-counts/:id', async (req, res) => {
  try { res.json(await stockExtRepo.updateInventoryCount(supabaseAdmin, TENANT_ID, req.params.id, req.body as Record<string, unknown>)); }
  catch (e) { logger.error('PUT /api/inventory-counts/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.post('/api/inventory-counts/:id/items', async (req, res) => {
  const b = z.object({ product_id: z.string().uuid(), counted_qty: z.coerce.number(), notes: z.string().max(500).optional() }).safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await stockExtRepo.upsertCountItem(supabaseAdmin, TENANT_ID, req.params.id, b.data.product_id, b.data.counted_qty, b.data.notes)); }
  catch (e) { logger.error('POST /api/inventory-counts/:id/items', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Integrações — Jobs de Importação ─────────────────────────────────────────
app.get('/api/import-jobs', async (req, res) => {
  const q = parseQuery(qLimit20, req.query, res); if (!q) return;
  try { res.json(await integrationsRepo.listImportJobs(supabaseAdmin, TENANT_ID, q.limit)); }
  catch (e) { logger.error('GET /api/import-jobs', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
app.get('/api/import-jobs/:id', async (req, res) => {
  try { res.json(await integrationsRepo.getImportJob(supabaseAdmin, TENANT_ID, req.params.id)); }
  catch (e) { logger.error('GET /api/import-jobs/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// CSV import — cria job e enfileira (processamento real seria em worker separado)
app.post('/api/import/csv', async (req, res) => {
  const b = z.object({
    entity:    z.enum(['customers','products','suppliers','orders','receivable','payable']),
    file_name: z.string().max(255).optional(),
    options:   z.record(z.unknown()).optional(),
  }).safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  const authUser = (req as Request & { user?: { id: string } }).user;
  try {
    const job = await integrationsRepo.createImportJob(
      supabaseAdmin, TENANT_ID, b.data.entity, 'csv', authUser?.id ?? '', b.data.options ?? {}
    );
    res.status(202).json({ message: 'Job de importação criado', job });
  } catch (e) { logger.error('POST /api/import/csv', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Webhook receiver ──────────────────────────────────────────────────────────
app.post('/api/webhooks/:source', async (req, res) => {
  const source = req.params.source;
  const allowedSources = ['oracle','sefaz','stripe','crm','erp'];
  if (!allowedSources.includes(source)) {
    res.status(400).json({ error: 'Fonte de webhook não reconhecida' });
    return;
  }
  try {
    const log = await integrationsRepo.logWebhook(
      supabaseAdmin,
      TENANT_ID,
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

// ── BI — KPIs diários ─────────────────────────────────────────────────────────
app.get('/api/bi/daily-kpis', async (req, res) => {
  const q = parseQuery(z.object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }), req.query, res); if (!q) return;
  try {
    let dbq = supabaseAdmin.from('vw_daily_kpis').select('*').eq('tenant_id', TENANT_ID).order('kpi_date', { ascending: false });
    if (q.dateFrom) dbq = dbq.gte('kpi_date', q.dateFrom);
    if (q.dateTo) dbq = dbq.lte('kpi_date', q.dateTo);
    const { data, error } = await dbq.limit(90);
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { logger.error('GET /api/bi/daily-kpis', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/bi/customer-ranking', async (req, res) => {
  const q = parseQuery(qMonths, req.query, res); if (!q) return;
  try {
    const since = new Date(); since.setMonth(since.getMonth() - q.months);
    const { data, error } = await supabaseAdmin
      .from('vw_customer_ranking')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .gte('month', since.toISOString().slice(0, 7))
      .order('revenue_rank')
      .limit(50);
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { logger.error('GET /api/bi/customer-ranking', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

app.get('/api/bi/ar-aging', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('vw_ar_aging')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('days_overdue', { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { logger.error('GET /api/bi/ar-aging', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`API iniciada`, { port: PORT, env: NODE_ENV, tenant: TENANT_ID });
});

export default app;
