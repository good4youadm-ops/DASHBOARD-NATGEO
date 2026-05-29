import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../logger';
import { parseQuery, errMsg, qMonths, qYear } from '../validators';
import * as financeRepo from '../../repositories/finance';
import * as finExtRepo from '../../repositories/finance-extended';
import * as commercialRepo from '../../repositories/commercial';

const router = Router();

// ── Contas a Receber ──────────────────────────────────────────────────────────
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

router.get('/api/receivable', async (req, res) => {
  const q = parseQuery(qAR2, req.query, res); if (!q) return;
  try { res.json(await financeRepo.listAccountsReceivable(q)); }
  catch (e) { logger.error('GET /api/receivable', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/receivable/:id', async (req, res) => {
  try { res.json(await financeRepo.getAccountReceivable(req.params.id)); }
  catch (e) { logger.error('GET /api/receivable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/receivable', async (req, res) => {
  const b = arBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await financeRepo.createAccountReceivable(b.data)); }
  catch (e) { logger.error('POST /api/receivable', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/receivable/:id', async (req, res) => {
  const b = arBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await financeRepo.updateAccountReceivable(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/receivable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/receivable/:id', async (req, res) => {
  try { await financeRepo.deleteAccountReceivable(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/receivable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Contas a Pagar ────────────────────────────────────────────────────────────
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

router.get('/api/payable', async (req, res) => {
  const q = parseQuery(qAP2, req.query, res); if (!q) return;
  try { res.json(await financeRepo.listAccountsPayable(q)); }
  catch (e) { logger.error('GET /api/payable', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/payable/categories', async (_req, res) => {
  try { res.json(await financeRepo.listAPCategories()); }
  catch (e) { logger.error('GET /api/payable/categories', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/payable/:id', async (req, res) => {
  try { res.json(await financeRepo.getAccountPayable(req.params.id)); }
  catch (e) { logger.error('GET /api/payable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/payable', async (req, res) => {
  const b = apBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await financeRepo.createAccountPayable(b.data)); }
  catch (e) { logger.error('POST /api/payable', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/payable/:id', async (req, res) => {
  const b = apBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await financeRepo.updateAccountPayable(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/payable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/payable/:id', async (req, res) => {
  try { await financeRepo.deleteAccountPayable(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/payable/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Contas Bancárias ──────────────────────────────────────────────────────────
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

router.get('/api/bank-accounts', async (_req, res) => {
  try { res.json(await finExtRepo.listBankAccounts()); }
  catch (e) { logger.error('GET /api/bank-accounts', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/bank-accounts', async (req, res) => {
  const b = bankAccountBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await finExtRepo.createBankAccount(b.data)); }
  catch (e) { logger.error('POST /api/bank-accounts', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/bank-accounts/:id', async (req, res) => {
  const b = bankAccountBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await finExtRepo.updateBankAccount(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/bank-accounts/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/bank-accounts/:id', async (req, res) => {
  try { await finExtRepo.deleteBankAccount(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/bank-accounts/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Transações ────────────────────────────────────────────────────────────────
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

router.get('/api/transactions', async (req, res) => {
  const q = parseQuery(qTransactions, req.query, res); if (!q) return;
  try { res.json(await finExtRepo.listTransactions(q)); }
  catch (e) { logger.error('GET /api/transactions', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/transactions', async (req, res) => {
  const b = transactionBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await finExtRepo.createTransaction(b.data)); }
  catch (e) { logger.error('POST /api/transactions', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/transactions/:id', async (req, res) => {
  const b = transactionBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await finExtRepo.updateTransaction(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/transactions/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/transactions/:id', async (req, res) => {
  try { await finExtRepo.deleteTransaction(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/transactions/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

router.get('/api/cash-flow', async (req, res) => {
  const q = parseQuery(z.object({ bankAccountId: z.string().uuid().optional(), months: z.coerce.number().int().min(1).max(24).default(3) }), req.query, res); if (!q) return;
  try { res.json(await finExtRepo.getCashFlow(q.bankAccountId, q.months)); }
  catch (e) { logger.error('GET /api/cash-flow', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Orçamentos ────────────────────────────────────────────────────────────────
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

router.get('/api/quotes', async (req, res) => {
  const q = parseQuery(qCommercialList, req.query, res); if (!q) return;
  try { res.json(await commercialRepo.listQuotes(q)); }
  catch (e) { logger.error('GET /api/quotes', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/quotes/:id', async (req, res) => {
  try { res.json(await commercialRepo.getQuote(req.params.id)); }
  catch (e) { logger.error('GET /api/quotes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/quotes', async (req, res) => {
  const b = quoteBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await commercialRepo.createQuote(b.data)); }
  catch (e) { logger.error('POST /api/quotes', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/quotes/:id/items', async (req, res) => {
  const b = quoteItemBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await commercialRepo.addQuoteItem(req.params.id, b.data)); }
  catch (e) { logger.error('POST /api/quotes/:id/items', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.put('/api/quotes/:id', async (req, res) => {
  const b = quoteBody.partial().safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.json(await commercialRepo.updateQuote(req.params.id, b.data)); }
  catch (e) { logger.error('PUT /api/quotes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/quotes/:id/items/:itemId', async (req, res) => {
  try { await commercialRepo.removeQuoteItem(req.params.itemId); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/quotes/:id/items/:itemId', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.delete('/api/quotes/:id', async (req, res) => {
  try { await commercialRepo.deleteQuote(req.params.id); res.status(204).end(); }
  catch (e) { logger.error('DELETE /api/quotes/:id', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Metas e Comissões ─────────────────────────────────────────────────────────
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

router.get('/api/goals', async (req, res) => {
  const q = parseQuery(qYear, req.query, res); if (!q) return;
  try { res.json(await commercialRepo.listGoals(q.year, q.month)); }
  catch (e) { logger.error('GET /api/goals', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.post('/api/goals', async (req, res) => {
  const b = goalBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Dados inválidos', details: b.error.flatten() }); return; }
  try { res.status(201).json(await commercialRepo.upsertGoal(b.data)); }
  catch (e) { logger.error('POST /api/goals', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/goals/vs-actual', async (req, res) => {
  const q = parseQuery(qYear, req.query, res); if (!q) return;
  try { res.json(await commercialRepo.getGoalsVsActual(q.year, q.month)); }
  catch (e) { logger.error('GET /api/goals/vs-actual', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});
router.get('/api/sales-reps/performance', async (req, res) => {
  const q = parseQuery(qMonths, req.query, res); if (!q) return;
  try { res.json(await commercialRepo.getSalesRepPerformance(q.months)); }
  catch (e) { logger.error('GET /api/sales-reps/performance', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

// ── Devoluções (returns) — retorna lista via repo finance ─────────────────────
// (proxy via AR aberto, filtrado por status written_off/negotiating)
router.get('/api/returns', async (_req, res) => {
  try {
    const data = await financeRepo.getAccountsReceivableOpen({});
    const returns = (data as unknown as Record<string, unknown>[]).filter(r =>
      r['status'] === 'written_off' || r['status'] === 'negotiating'
    );
    res.json(returns);
  } catch (e) { logger.error('GET /api/returns', { error: e }); res.status(500).json({ error: errMsg(e) }); }
});

export default router;
