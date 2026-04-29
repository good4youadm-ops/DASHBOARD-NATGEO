import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { supabaseAdmin } from '../lib/supabase/admin';
import * as salesRepo from '../repositories/sales';
import * as inventoryRepo from '../repositories/inventory';
import * as financeRepo from '../repositories/finance';
import * as syncRepo from '../repositories/sync';

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

// ── Helper de erro ────────────────────────────────────────────────────────────
function errMsg(e: unknown): string {
  // Em produção não expõe detalhes internos ao cliente; erro fica nos logs
  if (NODE_ENV === 'production') return 'Erro interno do servidor';
  return e instanceof Error ? e.message : String(e);
}

// ── Dashboard — Vendas ────────────────────────────────────────────────────────
app.get('/api/dashboard/sales/summary', async (req, res) => {
  try {
    const months = parseInt(String(req.query.months ?? '12'));
    const data = await salesRepo.getDashboardSalesSummary(supabaseAdmin, { tenantId: TENANT_ID, months });
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
  try {
    const limit = parseInt(String(req.query.limit ?? '20'));
    const data = await salesRepo.getTopCustomers(supabaseAdmin, TENANT_ID, limit);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/sales/customers', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/sales/products', async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? '20'));
    const data = await salesRepo.getTopProducts(supabaseAdmin, TENANT_ID, limit);
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
  try {
    const { warehouse, abcCurve, alertOnly } = req.query as Record<string, string>;
    const data = await inventoryRepo.getStockByProduct(supabaseAdmin, TENANT_ID, {
      warehouse,
      abcCurve,
      alertOnly: alertOnly === 'true',
    });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/inventory/products', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/inventory/expiring', async (req, res) => {
  try {
    const daysAhead = parseInt(String(req.query.daysAhead ?? '90'));
    const data = await inventoryRepo.getExpiringLots(supabaseAdmin, TENANT_ID, daysAhead);
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
  try {
    const { bucket, customerId } = req.query as Record<string, string>;
    const data = await financeRepo.getAccountsReceivableOpen(supabaseAdmin, TENANT_ID, { bucket, customerId });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/finance/receivable', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

app.get('/api/dashboard/finance/payable', async (req, res) => {
  try {
    const { bucket, category } = req.query as Record<string, string>;
    const data = await financeRepo.getAccountsPayableOpen(supabaseAdmin, TENANT_ID, { bucket, category });
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
  try {
    const limit = parseInt(String(req.query.limit ?? '50'));
    const data = await syncRepo.getRecentErrors(supabaseAdmin, TENANT_ID, limit);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/sync/errors', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`API iniciada`, { port: PORT, env: NODE_ENV, tenant: TENANT_ID });
});

export default app;
