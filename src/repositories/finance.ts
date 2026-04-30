import { SupabaseClient } from '@supabase/supabase-js';

// ── Listagem paginada ─────────────────────────────────────────────────────────

export interface ListARParams {
  tenantId: string;
  status?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listAccountsReceivable(client: SupabaseClient, p: ListARParams) {
  const page  = p.page  ?? 1;
  const limit = p.limit ?? 50;
  const from  = (page - 1) * limit;

  let q = client
    .from('accounts_receivable')
    .select(
      'id,document_number,parcel,issue_date,due_date,payment_date,status,face_value,paid_amount,interest_amount,discount_amount,balance,days_overdue,payment_method,notes,customer_id,source_system,created_at,customers(name)',
      { count: 'exact' },
    )
    .eq('tenant_id', p.tenantId)
    .order('due_date', { ascending: true })
    .range(from, from + limit - 1);

  if (p.status)     q = q.eq('status', p.status);
  if (p.customerId) q = q.eq('customer_id', p.customerId);
  if (p.search)     q = q.ilike('document_number', `%${p.search}%`);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, limit };
}

export async function getAccountReceivable(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('accounts_receivable')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createAccountReceivable(client: SupabaseClient, tenantId: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('accounts_receivable')
    .insert({ ...body, tenant_id: tenantId, source_system: 'manual', source_id: crypto.randomUUID() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccountReceivable(client: SupabaseClient, tenantId: string, id: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('accounts_receivable')
    .update(body)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccountReceivable(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('accounts_receivable')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .eq('source_system', 'manual');
  if (error) throw error;
}

// ── Contas a Pagar ─────────────────────────────────────────────────────────────

export interface ListAPParams {
  tenantId: string;
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listAccountsPayable(client: SupabaseClient, p: ListAPParams) {
  const page  = p.page  ?? 1;
  const limit = p.limit ?? 50;
  const from  = (page - 1) * limit;

  let q = client
    .from('accounts_payable')
    .select(
      'id,document_number,parcel,supplier_name,supplier_document,category,cost_center,issue_date,due_date,payment_date,status,face_value,paid_amount,interest_amount,discount_amount,balance,days_overdue,payment_method,notes,source_system,created_at',
      { count: 'exact' },
    )
    .eq('tenant_id', p.tenantId)
    .order('due_date', { ascending: true })
    .range(from, from + limit - 1);

  if (p.status)   q = q.eq('status', p.status);
  if (p.category) q = q.eq('category', p.category);
  if (p.search)   q = q.or(`document_number.ilike.%${p.search}%,supplier_name.ilike.%${p.search}%`);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, limit };
}

export async function getAccountPayable(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('accounts_payable')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createAccountPayable(client: SupabaseClient, tenantId: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('accounts_payable')
    .insert({ ...body, tenant_id: tenantId, source_system: 'manual', source_id: crypto.randomUUID() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccountPayable(client: SupabaseClient, tenantId: string, id: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('accounts_payable')
    .update(body)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccountPayable(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('accounts_payable')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .eq('source_system', 'manual');
  if (error) throw error;
}

export async function listAPCategories(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('accounts_payable')
    .select('category')
    .eq('tenant_id', tenantId)
    .not('category', 'is', null);
  if (error) throw error;
  return [...new Set((data ?? []).map(r => r.category).filter(Boolean))].sort();
}

// ── Dashboard queries (existentes) ────────────────────────────────────────────

export async function getDashboardFinanceSummary(
  client: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await client
    .from('vw_dashboard_finance_summary')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error) throw error;
  return data;
}

export async function getAccountsReceivableOpen(
  client: SupabaseClient,
  tenantId: string,
  filters?: { bucket?: string; customerId?: string },
) {
  let query = client
    .from('vw_accounts_receivable_open')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.bucket)     query = query.eq('aging_bucket', filters.bucket);
  if (filters?.customerId) query = query.eq('customer_id', filters.customerId);

  const { data, error } = await query.order('days_overdue', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAccountsPayableOpen(
  client: SupabaseClient,
  tenantId: string,
  filters?: { bucket?: string; category?: string },
) {
  let query = client
    .from('vw_accounts_payable_open')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.bucket)   query = query.eq('aging_bucket', filters.bucket);
  if (filters?.category) query = query.eq('category', filters.category);

  const { data, error } = await query.order('days_overdue', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
