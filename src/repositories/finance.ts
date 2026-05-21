import {
  fetchJSON, DATA_SOURCES,
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
  applyPagination,
} from '../services/dataService';

// ── Tipos ──────────────────────────────────────────────────────────────────────

/**
 * @file finance-summary.json
 * @description Resumo financeiro para o dashboard
 * @fields tenant_id, receivable_open, payable_open, receivable_overdue, payable_overdue, cash_balance
 * @example { "tenant_id": "t1", "receivable_open": 85000.00, "payable_open": 42000.00, "receivable_overdue": 8000.00, "payable_overdue": 3000.00, "cash_balance": 52000.00 }
 */
export interface FinanceSummaryRow {
  tenant_id: string;
  receivable_open: number;
  payable_open: number;
  receivable_overdue: number;
  payable_overdue: number;
  cash_balance: number;
}

/**
 * @file accounts-receivable.json
 * @description Contas a receber
 * @fields id, tenant_id, document_number, parcel, issue_date, due_date, payment_date, status, face_value, paid_amount, interest_amount, discount_amount, balance, days_overdue, payment_method, notes, customer_id, source_system, created_at, customers
 * @example { "id": "ar1", "tenant_id": "t1", "document_number": "NF-00123", "parcel": "1/1", "issue_date": "2024-05-01", "due_date": "2024-06-01", "payment_date": null, "status": "open", "face_value": 1500.00, "paid_amount": 0, "balance": 1500.00, "days_overdue": 0, "customer_id": "c1", "customers": { "name": "Empresa X" } }
 */
export interface AccountReceivable {
  id: string;
  tenant_id: string;
  document_number: string;
  parcel?: string;
  issue_date: string;
  due_date: string;
  payment_date?: string | null;
  status: string;
  face_value: number;
  paid_amount: number;
  interest_amount?: number;
  discount_amount?: number;
  balance: number;
  days_overdue?: number;
  payment_method?: string;
  notes?: string;
  customer_id?: string;
  source_system?: string;
  created_at?: string;
  customers?: { name: string };
}

/**
 * @file accounts-payable.json
 * @description Contas a pagar
 * @fields id, tenant_id, document_number, parcel, supplier_name, supplier_document, category, cost_center, issue_date, due_date, payment_date, status, face_value, paid_amount, balance, days_overdue, payment_method, notes, source_system, created_at
 * @example { "id": "ap1", "tenant_id": "t1", "document_number": "BOL-0099", "supplier_name": "Fornecedor A", "category": "Mercadoria", "due_date": "2024-06-10", "status": "open", "face_value": 8000.00, "balance": 8000.00 }
 */
export interface AccountPayable {
  id: string;
  tenant_id: string;
  document_number?: string;
  parcel?: string;
  supplier_name?: string;
  supplier_document?: string;
  category?: string;
  cost_center?: string;
  issue_date?: string;
  due_date: string;
  payment_date?: string | null;
  status: string;
  face_value: number;
  paid_amount?: number;
  interest_amount?: number;
  discount_amount?: number;
  balance: number;
  days_overdue?: number;
  payment_method?: string;
  notes?: string;
  source_system?: string;
  created_at?: string;
}

export interface ListARParams {
  status?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  bucket?: string;
}

export interface ListAPParams {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  bucket?: string;
}

// ── Funções ────────────────────────────────────────────────────────────────────

export async function getDashboardFinanceSummary(): Promise<FinanceSummaryRow> {
  const data = await fetchJSON<FinanceSummaryRow | FinanceSummaryRow[]>(
    DATA_SOURCES.financeSummary,
    'financeSummary',
  );
  return Array.isArray(data) ? data[0] : data;
}

export async function listAccountsReceivable(p: ListARParams = {}) {
  const all = await storeGetAll('accountsReceivable') as unknown as AccountReceivable[];
  const filters = [
    { field: 'status',      value: p.status,     op: 'eq'    as const },
    { field: 'customer_id', value: p.customerId, op: 'eq'    as const },
    { field: 'document_number', value: p.search, op: 'ilike' as const },
  ];
  return applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'due_date', ascending: true, filters });
}

export async function getAccountsReceivableOpen(filters: { bucket?: string } = {}) {
  const all = await storeGetAll('accountsReceivable') as unknown as AccountReceivable[];
  let result = all.filter(r => r.status === 'open' || r.status === 'overdue');
  if (filters.bucket === 'overdue') result = result.filter(r => (r.days_overdue ?? 0) > 0);
  return result;
}

export async function getAccountReceivable(id: string) {
  return storeGetById('accountsReceivable', id);
}

export async function createAccountReceivable(body: Record<string, unknown>) {
  const record = { ...body, id: crypto.randomUUID(), source_system: 'manual', created_at: new Date().toISOString() };
  return storeInsert('accountsReceivable', record);
}

export async function updateAccountReceivable(id: string, body: Record<string, unknown>) {
  return storeUpdate('accountsReceivable', id, body);
}

export async function deleteAccountReceivable(id: string) {
  return storeDelete('accountsReceivable', id);
}

// ── Contas a Pagar ─────────────────────────────────────────────────────────────

export async function listAccountsPayable(p: ListAPParams = {}) {
  const all = await storeGetAll('accountsPayable') as unknown as AccountPayable[];
  const filters = [
    { field: 'status',   value: p.status,   op: 'eq'    as const },
    { field: 'category', value: p.category, op: 'eq'    as const },
    { field: 'document_number', value: p.search, op: 'ilike' as const },
  ];
  return applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'due_date', ascending: true, filters });
}

export async function getAccountsPayableOpen(filters: { bucket?: string } = {}) {
  const all = await storeGetAll('accountsPayable') as unknown as AccountPayable[];
  let result = all.filter(r => r.status === 'open' || r.status === 'overdue');
  if (filters.bucket === 'overdue') result = result.filter(r => (r.days_overdue ?? 0) > 0);
  return result;
}

export async function getAccountPayable(id: string) {
  return storeGetById('accountsPayable', id);
}

export async function listAPCategories() {
  const all = await storeGetAll('accountsPayable') as unknown as AccountPayable[];
  const cats = [...new Set(all.map(r => r.category).filter(Boolean))];
  return cats.map(c => ({ category: c }));
}

export async function createAccountPayable(body: Record<string, unknown>) {
  const record = { ...body, id: crypto.randomUUID(), source_system: 'manual', created_at: new Date().toISOString() };
  return storeInsert('accountsPayable', record);
}

export async function updateAccountPayable(id: string, body: Record<string, unknown>) {
  return storeUpdate('accountsPayable', id, body);
}

export async function deleteAccountPayable(id: string) {
  return storeDelete('accountsPayable', id);
}
