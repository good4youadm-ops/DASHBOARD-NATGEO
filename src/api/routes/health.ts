import { Router } from 'express';
import { logger } from '../logger';
import * as syncRepo from '../../repositories/sync';

const router = Router();

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const VERSION = process.env.npm_package_version ?? '1.0.0';
const startedAt = Date.now();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: NODE_ENV,
    version: VERSION,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

router.get('/health/deep', async (_req, res) => {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    const { DATA_SOURCES } = await import('../../services/dataService');
    const placeholders = Object.entries(DATA_SOURCES).filter(([, v]) => v.includes('PLACEHOLDER'));
    checks.dataSources = {
      ok: placeholders.length === 0,
      detail: placeholders.length > 0
        ? `${placeholders.length} URL(s) com PLACEHOLDER: ${placeholders.slice(0, 3).map(([k]) => k).join(', ')}`
        : 'Todas as URLs configuradas',
    };
  } catch (e) {
    checks.dataSources = { ok: false, detail: String(e) };
  }

  try {
    const syncStatus = await syncRepo.getSyncStatus();
    checks.sync = { ok: true, detail: syncStatus ? `Último sync: ${syncStatus.last_sync_at}` : 'Sem dados' };
  } catch (e) {
    checks.sync = { ok: false, detail: String(e) };
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

router.get('/api/config', (_req, res) => {
  res.json({ version: VERSION, env: NODE_ENV });
});

export default router;
