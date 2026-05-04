import { SupabaseClient } from '@supabase/supabase-js';

// ── Categorias Financeiras ────────────────────────────────────────────────────
export async function listFinancialCategories(client: SupabaseClient, tenantId: string, type?: string) {
  let q = client
    .from('financial_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);
  if (type) q = q.eq('type', type);
  const { data, error } = await q.order('code');
  if (error) throw error;
  return data ?? [];
}

export async function createFinancialCategory(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('financial_categories')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFinancialCategory(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('financial_categories')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Contas Bancárias ──────────────────────────────────────────────────────────
export async function listBankAccounts(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('bank_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getBankAccount(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('bank_accounts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;
  return data;
}

export async function createBankAccount(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('bank_accounts')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBankAccount(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('bank_accounts')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBankAccount(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('bank_accounts')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

// ── Transações ────────────────────────────────────────────────────────────────
interface TxListParams {
  tenantId: string;
  bankAccountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  reconciled?: boolean;
  page?: number;
  limit?: number;
}

export async function listTransactions(client: SupabaseClient, p: TxListParams) {
  const limit = p.limit ?? 50;
  const from = ((p.page ?? 1) - 1) * limit;

  let q = client
    .from('transactions')
    .select('*, bank_accounts(name), financial_categories(name,type)', { count: 'exact' })
    .eq('tenant_id', p.tenantId)
    .order('transaction_date', { ascending: false });

  if (p.bankAccountId) q = q.eq('bank_account_id', p.bankAccountId);
  if (p.categoryId) q = q.eq('category_id', p.categoryId);
  if (p.type) q = q.eq('type', p.type);
  if (p.reconciled !== undefined) q = q.eq('reconciled', p.reconciled);
  if (p.dateFrom) q = q.gte('transaction_date', p.dateFrom);
  if (p.dateTo) q = q.lte('transaction_date', p.dateTo);

  const { data, error, count } = await q.range(from, from + limit - 1);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function createTransaction(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('transactions')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

// ── BI: Fluxo de Caixa ────────────────────────────────────────────────────────
export async function getCashFlow(client: SupabaseClient, tenantId: string, bankAccountId?: string, months = 3) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  let q = client
    .from('vw_cash_flow')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('flow_date', since.toISOString().slice(0, 10))
    .order('flow_date');

  if (bankAccountId) q = q.eq('bank_account_id', bankAccountId);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
