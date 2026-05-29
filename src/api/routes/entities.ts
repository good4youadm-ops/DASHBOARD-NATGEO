import { Router, Request } from 'express';
import { z } from 'zod';
import { logger } from '../logger';
import { parseQuery, errMsg, qCrudList, qLimit50 } from '../validators';
import * as customersRepo from '../../repositories/customers';
import * as productsRepo from '../../repositories/products';
import * as suppliersRepo from '../../repositories/suppliers';
import * as ordersRepo from '../../repositories/orders';

const router = Router();

// ── Clientes ──────────────────────────────────────────────────────────────────
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

router.get('/api/customers', async (req, res) => {
  const q = parseQuery(qCrudList, req.query, res); if (!q) return;
  try { res.json(await customersRepo.listCustomers(q)); }
  catch (e) { logger.error('GET /api/customers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/customers/:id', async (req, res) => {
  try { res.json(await customersRepo.getCustomer(req.params.id)); }
  catch (e) { logger.error('GET /api/customers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/customers', async (req, res) => {
  const b = customerBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await customersRepo.createCustomer(b.data)); }
  catch (e) { logger.error('POST /api/customers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/customers/:id', async (req, res) => {
  const b = customerBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await customersRepo.updateCustomer(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/customers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/customers/:id', async (req, res) => {
  try { await customersRepo.deleteCustomer(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/customers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Produtos ──────────────────────────────────────────────────────────────────
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

router.get('/api/products', async (req, res) => {
  const q = parseQuery(z.object({
    search:   z.string().max(200).optional(),
    category: z.string().max(100).optional(),
    abcCurve: z.enum(['A','B','C','D']).optional(),
    isActive: z.enum(['true','false']).optional(),
    page:     z.coerce.number().int().min(1).default(1),
    limit:    z.coerce.number().int().min(1).max(200).default(50),
  }), req.query, res); if (!q) return;
  try { res.json(await productsRepo.listProducts({ search: q.search, categoryId: q.category, isActive: q.isActive, page: q.page, limit: q.limit })); }
  catch (e) { logger.error('GET /api/products', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/products/categories', async (_req, res) => {
  try { res.json(await productsRepo.listCategories()); }
  catch (e) { logger.error('GET /api/products/categories', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/products/:id', async (req, res) => {
  try { res.json(await productsRepo.getProduct(req.params.id)); }
  catch (e) { logger.error('GET /api/products/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/products', async (req, res) => {
  const b = productBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await productsRepo.createProduct(b.data)); }
  catch (e) { logger.error('POST /api/products', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/products/:id', async (req, res) => {
  const b = productBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await productsRepo.updateProduct(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/products/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/products/:id', async (req, res) => {
  try { await productsRepo.deleteProduct(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/products/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Fornecedores ──────────────────────────────────────────────────────────────
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

router.get('/api/suppliers', async (req, res) => {
  const q = parseQuery(qCrudList, req.query, res); if (!q) return;
  try { res.json(await suppliersRepo.listSuppliers(q)); }
  catch (e) { logger.error('GET /api/suppliers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/suppliers/:id', async (req, res) => {
  try { res.json(await suppliersRepo.getSupplier(req.params.id)); }
  catch (e) { logger.error('GET /api/suppliers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/suppliers', async (req, res) => {
  const b = supplierBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await suppliersRepo.createSupplier(b.data)); }
  catch (e) { logger.error('POST /api/suppliers', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/suppliers/:id', async (req, res) => {
  const b = supplierBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await suppliersRepo.updateSupplier(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/suppliers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/suppliers/:id', async (req, res) => {
  try { await suppliersRepo.deleteSupplier(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/suppliers/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Pedidos ───────────────────────────────────────────────────────────────────
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

router.get('/api/orders', async (req, res) => {
  const q = parseQuery(qOrders, req.query, res); if (!q) return;
  try { res.json(await ordersRepo.listOrders(q)); }
  catch (e) { logger.error('GET /api/orders', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/orders/:id', async (req, res) => {
  try { res.json(await ordersRepo.getOrder(req.params.id)); }
  catch (e) { logger.error('GET /api/orders/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/orders/:id/items', async (req, res) => {
  try { res.json(await ordersRepo.getOrderItems(req.params.id)); }
  catch (e) { logger.error('GET /api/orders/:id/items', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/orders', async (req, res) => {
  const b = orderBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await ordersRepo.createOrder(b.data)); }
  catch (e) { logger.error('POST /api/orders', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/orders/:id/items', async (req, res) => {
  const b = orderItemBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await ordersRepo.addOrderItem(req.params.id, b.data)); }
  catch (e) { logger.error('POST /api/orders/:id/items', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/orders/:id', async (req, res) => {
  const b = orderBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await ordersRepo.updateOrder(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/orders/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/orders/:id/items/:itemId', async (req, res) => {
  try { await ordersRepo.removeOrderItem(req.params.id, req.params.itemId); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/orders/:id/items/:itemId', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/orders/:id', async (req, res) => {
  try { await ordersRepo.deleteOrder(req.params.id); res.status(204).end(); }
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

router.get('/api/stock/movements', async (req, res) => {
  const q = parseQuery(qLimit50, req.query, res); if (!q) return;
  try {
    const { storeGetAll } = await import('../../services/dataService');
    const all = await storeGetAll('stockReservations');
    res.json((all as unknown[]).slice(0, q.limit ?? 50));
  } catch (e) { logger.error('GET /api/stock/movements', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/stock/movements', async (req, res) => {
  const b = movementBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try {
    const { storeInsert } = await import('../../services/dataService');
    const payload = { ...b.data, id: crypto.randomUUID(), source_system: 'manual', created_at: new Date().toISOString() };
    const data = await storeInsert('stockReservations', payload);
    res.status(201).json(data);
  } catch (e) { logger.error('POST /api/stock/movements', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

export default router;
