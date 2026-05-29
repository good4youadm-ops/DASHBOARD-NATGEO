import { Router } from 'express';
import { logger } from '../logger';
import { parseQuery, errMsg, qMonths, qLimit20, qInventory, qDaysAhead, qAR, qAP, qLimit50 } from '../validators';
import * as salesRepo from '../../repositories/sales';
import * as inventoryRepo from '../../repositories/inventory';
import * as financeRepo from '../../repositories/finance';
import * as syncRepo from '../../repositories/sync';

const router = Router();

router.get('/api/dashboard/sales/summary', async (req, res) => {
  const q = parseQuery(qMonths, req.query, res);
  if (!q) return;
  try {
    const data = await salesRepo.getDashboardSalesSummary({ months: q.months });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/sales/summary', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/dashboard/sales/by-day', async (_req, res) => {
  try {
    const data = await salesRepo.getSalesByDay();
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/sales/by-day', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/dashboard/sales/customers', async (req, res) => {
  const q = parseQuery(qLimit20, req.query, res);
  if (!q) return;
  try {
    const data = await salesRepo.getTopCustomers(q.limit);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/sales/customers', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/dashboard/sales/products', async (req, res) => {
  const q = parseQuery(qLimit20, req.query, res);
  if (!q) return;
  try {
    const data = await salesRepo.getTopProducts(q.limit);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/sales/products', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/dashboard/inventory/summary', async (_req, res) => {
  try {
    const data = await inventoryRepo.getDashboardInventorySummary();
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/inventory/summary', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/dashboard/inventory/products', async (req, res) => {
  const q = parseQuery(qInventory, req.query, res);
  if (!q) return;
  try {
    const data = await inventoryRepo.getStockByProduct({
      warehouse:  q.warehouse,
      abcCurve:   q.abcCurve,
      alertOnly:  q.alertOnly,
    });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/inventory/products', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/dashboard/inventory/expiring', async (req, res) => {
  const q = parseQuery(qDaysAhead, req.query, res);
  if (!q) return;
  try {
    const data = await inventoryRepo.getExpiringLots(q.daysAhead);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/inventory/expiring', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/dashboard/finance/summary', async (_req, res) => {
  try {
    const data = await financeRepo.getDashboardFinanceSummary();
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/finance/summary', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/dashboard/finance/receivable', async (req, res) => {
  const q = parseQuery(qAR, req.query, res);
  if (!q) return;
  try {
    const data = await financeRepo.getAccountsReceivableOpen({ bucket: q.bucket });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/finance/receivable', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/dashboard/finance/payable', async (req, res) => {
  const q = parseQuery(qAP, req.query, res);
  if (!q) return;
  try {
    const data = await financeRepo.getAccountsPayableOpen({ bucket: q.bucket });
    res.json(data);
  } catch (e) {
    logger.error('GET /api/dashboard/finance/payable', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/sync/status', async (_req, res) => {
  try {
    const data = await syncRepo.getSyncStatus();
    res.json(data);
  } catch (e) {
    logger.error('GET /api/sync/status', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

router.get('/api/sync/errors', async (req, res) => {
  const q = parseQuery(qLimit50, req.query, res);
  if (!q) return;
  try {
    const data = await syncRepo.getRecentErrors(q.limit);
    res.json(data);
  } catch (e) {
    logger.error('GET /api/sync/errors', { error: e });
    res.status(500).json({ error: errMsg(e) });
  }
});

export default router;
