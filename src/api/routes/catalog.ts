import { Router, Request } from 'express';
import { z } from 'zod';
import { logger } from '../logger';
import { parseQuery, errMsg } from '../validators';
import * as logisticsRepo from '../../repositories/logistics';
import * as masterDataRepo from '../../repositories/master-data';
import * as fiscalRepo from '../../repositories/fiscal';
import * as stockExtRepo from '../../repositories/stock-extended';

const router = Router();

// ── Motoristas ────────────────────────────────────────────────────────────────
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

router.get('/api/drivers', async (_req, res) => {
  try { res.json(await logisticsRepo.listDrivers()); }
  catch (e) { logger.error('GET /api/drivers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/drivers', async (req, res) => {
  const b = driverBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await logisticsRepo.createDriver(b.data)); }
  catch (e) { logger.error('POST /api/drivers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/drivers/:id', async (req, res) => {
  const b = driverBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await logisticsRepo.updateDriver(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/drivers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/drivers/:id', async (req, res) => {
  try { await logisticsRepo.deleteDriver(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/drivers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Veículos ──────────────────────────────────────────────────────────────────
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

router.get('/api/vehicles', async (_req, res) => {
  try { res.json(await logisticsRepo.listVehicles()); }
  catch (e) { logger.error('GET /api/vehicles', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/vehicles', async (req, res) => {
  const b = vehicleBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await logisticsRepo.createVehicle(b.data)); }
  catch (e) { logger.error('POST /api/vehicles', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/vehicles/:id', async (req, res) => {
  const b = vehicleBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await logisticsRepo.updateVehicle(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/vehicles/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/vehicles/:id', async (req, res) => {
  try { await logisticsRepo.deleteVehicle(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/vehicles/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Rotas ─────────────────────────────────────────────────────────────────────
const routeBody = z.object({
  route_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  driver_id:        z.string().uuid().optional().nullable(),
  vehicle_id:       z.string().uuid().optional().nullable(),
  status:           z.enum(['planned','in_progress','completed','cancelled']).default('planned'),
  total_weight_kg:  z.coerce.number().min(0).optional().nullable(),
  notes:            z.string().max(1000).optional().nullable(),
});

router.get('/api/routes', async (req, res) => {
  const { dateFrom, dateTo } = req.query as Record<string, string>;
  try { res.json(await logisticsRepo.listRoutes(dateFrom, dateTo)); }
  catch (e) { logger.error('GET /api/routes', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/routes', async (req, res) => {
  const b = routeBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await logisticsRepo.createRoute(b.data)); }
  catch (e) { logger.error('POST /api/routes', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/routes/:id', async (req, res) => {
  const b = routeBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await logisticsRepo.updateRoute(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/routes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/routes/:id', async (req, res) => {
  try { await logisticsRepo.deleteRoute(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/routes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Marcas ────────────────────────────────────────────────────────────────────
const brandBody = z.object({
  name:      z.string().min(1).max(200),
  code:      z.string().max(50).optional(),
  logo_url:  z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
});

router.get('/api/brands', async (_req, res) => {
  try { res.json(await masterDataRepo.listBrands()); }
  catch (e) { logger.error('GET /api/brands', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/brands', async (req, res) => {
  const b = brandBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createBrand(b.data)); }
  catch (e) { logger.error('POST /api/brands', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/brands/:id', async (req, res) => {
  const b = brandBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateBrand(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/brands/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/brands/:id', async (req, res) => {
  try { await masterDataRepo.deleteBrand(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/brands/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Categorias ────────────────────────────────────────────────────────────────
const categoryBody = z.object({
  name:      z.string().min(1).max(200),
  code:      z.string().max(50).optional(),
  parent_id: z.string().uuid().optional().nullable(),
  level:     z.coerce.number().int().min(1).max(5).optional(),
  is_active: z.boolean().optional(),
});

router.get('/api/categories', async (_req, res) => {
  try { res.json(await masterDataRepo.listCategories()); }
  catch (e) { logger.error('GET /api/categories', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/categories', async (req, res) => {
  const b = categoryBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createCategory(b.data)); }
  catch (e) { logger.error('POST /api/categories', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/categories/:id', async (req, res) => {
  const b = categoryBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateCategory(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/categories/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Formas de Pagamento ───────────────────────────────────────────────────────
const paymentMethodBody = z.object({
  name:         z.string().min(1).max(200),
  code:         z.string().min(1).max(50),
  type:         z.enum(['cash','bank_transfer','credit_card','debit_card','boleto','pix','check','other']),
  installments: z.coerce.number().int().min(1).max(60).optional(),
  grace_days:   z.coerce.number().int().min(0).max(365).optional(),
  is_active:    z.boolean().optional(),
});

router.get('/api/payment-methods', async (_req, res) => {
  try { res.json(await masterDataRepo.listPaymentMethods()); }
  catch (e) { logger.error('GET /api/payment-methods', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/payment-methods', async (req, res) => {
  const b = paymentMethodBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createPaymentMethod(b.data)); }
  catch (e) { logger.error('POST /api/payment-methods', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/payment-methods/:id', async (req, res) => {
  const b = paymentMethodBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updatePaymentMethod(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/payment-methods/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Representantes ────────────────────────────────────────────────────────────
const salesRepBody = z.object({
  name:           z.string().min(1).max(200),
  code:           z.string().max(50).optional().nullable(),
  email:          z.string().email().optional().nullable(),
  phone:          z.string().max(30).optional().nullable(),
  region:         z.string().max(100).optional().nullable(),
  commission_pct: z.coerce.number().min(0).max(100).optional(),
  is_active:      z.boolean().optional(),
});

router.get('/api/sales-reps', async (req, res) => {
  const activeOnly = req.query.active !== 'false';
  try { res.json(await masterDataRepo.listSalesReps(activeOnly)); }
  catch (e) { logger.error('GET /api/sales-reps', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/sales-reps', async (req, res) => {
  const b = salesRepBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createSalesRep(b.data)); }
  catch (e) { logger.error('POST /api/sales-reps', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/sales-reps/:id', async (req, res) => {
  const b = salesRepBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateSalesRep(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/sales-reps/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Transportadoras ───────────────────────────────────────────────────────────
const carrierBody = z.object({
  name:     z.string().min(1).max(200),
  code:     z.string().max(50).optional().nullable(),
  document: z.string().max(20).optional().nullable(),
  email:    z.string().email().optional().nullable(),
  phone:    z.string().max(30).optional().nullable(),
  modality: z.enum(['road','air','sea','express','own']).optional().nullable(),
  is_active:z.boolean().optional(),
});

router.get('/api/carriers', async (req, res) => {
  const activeOnly = req.query.active !== 'false';
  try { res.json(await masterDataRepo.listCarriers(activeOnly)); }
  catch (e) { logger.error('GET /api/carriers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/carriers', async (req, res) => {
  const b = carrierBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createCarrier(b.data)); }
  catch (e) { logger.error('POST /api/carriers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/carriers/:id', async (req, res) => {
  const b = carrierBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateCarrier(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/carriers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Centros de Custo ──────────────────────────────────────────────────────────
const costCenterBody = z.object({
  name:      z.string().min(1).max(200),
  code:      z.string().min(1).max(50),
  parent_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
});

router.get('/api/cost-centers', async (_req, res) => {
  try { res.json(await masterDataRepo.listCostCenters()); }
  catch (e) { logger.error('GET /api/cost-centers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/cost-centers', async (req, res) => {
  const b = costCenterBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await masterDataRepo.createCostCenter(b.data)); }
  catch (e) { logger.error('POST /api/cost-centers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/cost-centers/:id', async (req, res) => {
  const b = costCenterBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await masterDataRepo.updateCostCenter(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/cost-centers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Notas Fiscais ─────────────────────────────────────────────────────────────
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

router.get('/api/invoices', async (req, res) => {
  const q = parseQuery(qInvoiceList, req.query, res); if (!q) return;
  try { res.json(await fiscalRepo.listInvoices(q)); }
  catch (e) { logger.error('GET /api/invoices', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/invoices/:id', async (req, res) => {
  try { res.json(await fiscalRepo.getInvoice(req.params.id)); }
  catch (e) { logger.error('GET /api/invoices/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/invoices', async (req, res) => {
  const b = invoiceBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await fiscalRepo.createInvoice(b.data)); }
  catch (e) { logger.error('POST /api/invoices', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/invoices/:id', async (req, res) => {
  const b = invoiceBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await fiscalRepo.updateInvoice(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/invoices/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/invoices/:id', async (req, res) => {
  try { res.json(await fiscalRepo.cancelInvoice(req.params.id)); }
  catch (e) { logger.error('DELETE /api/invoices/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Configurações e Regras Fiscais ────────────────────────────────────────────
router.get('/api/fiscal/config', async (_req, res) => {
  try { res.json(await fiscalRepo.getFiscalConfig()); }
  catch (e) { logger.error('GET /api/fiscal/config', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/fiscal/config', async (req, res) => {
  try { res.json(await fiscalRepo.upsertFiscalConfig(req.body as Record<string, unknown>)); }
  catch (e) { logger.error('PUT /api/fiscal/config', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/fiscal/tax-rules', async (req, res) => {
  try { res.json(await fiscalRepo.listTaxRules(req.query.ncm as string | undefined)); }
  catch (e) { logger.error('GET /api/fiscal/tax-rules', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/fiscal/tax-rules', async (req, res) => {
  try { res.status(201).json(await fiscalRepo.createTaxRule(req.body as Record<string, unknown>)); }
  catch (e) { logger.error('POST /api/fiscal/tax-rules', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Estoque Crítico ───────────────────────────────────────────────────────────
router.get('/api/stock/critical', async (req, res) => {
  try { res.json(await stockExtRepo.getCriticalStock(req.query.warehouse as string | undefined)); }
  catch (e) { logger.error('GET /api/stock/critical', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/stock/product-ranking', async (req, res) => {
  const q = parseQuery(z.object({ months: z.coerce.number().int().min(1).max(24).default(3), limit: z.coerce.number().int().min(1).max(100).default(20) }), req.query, res); if (!q) return;
  try { res.json(await stockExtRepo.getProductRanking(q.months, q.limit)); }
  catch (e) { logger.error('GET /api/stock/product-ranking', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Contagens de Inventário ───────────────────────────────────────────────────
router.get('/api/inventory-counts', async (req, res) => {
  try { res.json(await stockExtRepo.listInventoryCounts(req.query.status as string | undefined)); }
  catch (e) { logger.error('GET /api/inventory-counts', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/inventory-counts/:id', async (req, res) => {
  try { res.json(await stockExtRepo.getInventoryCount(req.params.id)); }
  catch (e) { logger.error('GET /api/inventory-counts/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/inventory-counts', async (req, res) => {
  const authUser = (req as Request & { user?: { id: string } }).user;
  try { res.status(201).json(await stockExtRepo.createInventoryCount(req.body as Record<string, unknown>, authUser?.id ?? '')); }
  catch (e) { logger.error('POST /api/inventory-counts', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/inventory-counts/:id', async (req, res) => {
  try { res.json(await stockExtRepo.updateInventoryCount(req.params.id, req.body as Record<string, unknown>)); }
  catch (e) { logger.error('PUT /api/inventory-counts/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/inventory-counts/:id/items', async (req, res) => {
  const b = z.object({ product_id: z.string().uuid(), counted_qty: z.coerce.number(), notes: z.string().max(500).optional() }).safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await stockExtRepo.upsertCountItem(req.params.id, b.data.product_id, b.data.counted_qty, b.data.notes)); }
  catch (e) { logger.error('POST /api/inventory-counts/:id/items', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

export default router;
