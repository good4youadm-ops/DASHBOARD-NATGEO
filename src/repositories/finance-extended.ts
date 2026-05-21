import {
  fetchJSON, DATA_SOURCES,
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
  applyPagination,
} from '../services/dataService';

/**
 * @file financial-categories.json  { id, tenant_id, name, type (income|expense), parent_id }
 * @file bank-accounts.json         { id, tenant_id, name, bank, agency, account, balance, is_active }
 * @file transactions.json          { id, tenant_id, bank_account_id, category_id, type, amount, date, description, is_reconciled }
 * @file cash-flow.json             Fluxo de caixa (somente leitura) { bank_account_id, month, opening_balance, inflow, outflow, closing_balance }
 */

export interface ListTransactionsParams {
  bankAccountId?: string;
  categoryId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ── Categorias Financeiras ─────────────────────────────────────────────────────

export async function listFinancialCategories(type?: string) {
  const all = await storeGetAll('financialCategories');
  return type ? all.filter(r => r['type'] === type) : all;
}
export async function createFinancialCategory(payload: Record<string, unknown>) {
  return storeInsert('financialCategories', { ...payload, id: crypto.randomUUID() });
}
export async function updateFinancialCategory(id: string, payload: Record<string, unknown>) {
  return storeUpdate('financialCategories', id, payload);
}

// ── Contas Bancárias ───────────────────────────────────────────────────────────

export async function listBankAccounts() {
  return storeGetAll('bankAccounts');
}
export async function getBankAccount(id: string) {
  return storeGetById('bankAccounts', id);
}
export async function createBankAccount(payload: Record<string, unknown>) {
  return storeInsert('bankAccounts', { ...payload, id: crypto.randomUUID() });
}
export async function updateBankAccount(id: string, payload: Record<string, unknown>) {
  return storeUpdate('bankAccounts', id, payload);
}
export async function deleteBankAccount(id: string) {
  return storeDelete('bankAccounts', id);
}

// ── Transações ─────────────────────────────────────────────────────────────────

export async function listTransactions(p: ListTransactionsParams = {}) {
  const all = await storeGetAll('transactions');
  const filters = [
    { field: 'bank_account_id', value: p.bankAccountId, op: 'eq' as const },
    { field: 'category_id',     value: p.categoryId,    op: 'eq' as const },
    { field: 'type',            value: p.type,          op: 'eq' as const },
  ];
  let result = applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'date', ascending: false, filters });
  if (p.dateFrom) result.data = result.data.filter(r => String(r['date']) >= p.dateFrom!);
  if (p.dateTo)   result.data = result.data.filter(r => String(r['date']) <= p.dateTo!);
  return result;
}
export async function createTransaction(payload: Record<string, unknown>) {
  return storeInsert('transactions', { ...payload, id: crypto.randomUUID() });
}
export async function updateTransaction(id: string, payload: Record<string, unknown>) {
  return storeUpdate('transactions', id, payload);
}
export async function deleteTransaction(id: string) {
  return storeDelete('transactions', id);
}

// ── Fluxo de Caixa (somente leitura) ──────────────────────────────────────────

export async function getCashFlow(bankAccountId?: string, months = 6) {
  const data = await fetchJSON<Record<string, unknown>[]>(DATA_SOURCES.cashFlow, 'cashFlow');
  let result = data;
  if (bankAccountId) result = result.filter(r => r['bank_account_id'] === bankAccountId);
  return result.slice(0, months);
}
