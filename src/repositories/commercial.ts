import { SupabaseClient } from '@supabase/supabase-js';

interface ListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  salesRepId?: string;
}

// ── Orçamentos ────────────────────────────────────────────────────────────────
export async function listQuotes(client: SupabaseClient, p: ListParams) {
  const limit = p.limit ?? 50;
  const from = ((p.page ?? 1) - 1) * limit;

  let q = client
    .from('quotes')
    .select('*, customers(name,document), sales_reps(name)', { count: 'exact' })
    .eq('tenant_id', p.tenantId)
    .order('created_at', { ascending: false });

  if (p.status) q = q.eq('status', p.status);
  if (p.customerId) q = q.eq('customer_id', p.customerId);
  if (p.salesRepId) q = q.eq('sales_rep_id', p.salesRepId);
  if (p.search) q = q.ilike('quote_number', `%${p.search}%`);

  const { data, error, count } = await q.range(from, from + limit - 1);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function getQuote(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('quotes')
    .select('*, customers(*), sales_reps(name), quote_items(*, products(name,sku))')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;
  return data;
}

export async function createQuote(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('quotes')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuote(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('quotes')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuote(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('quotes')
    .update({ status: 'expired' })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function addQuoteItem(client: SupabaseClient, tenantId: string, quoteId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('quote_items')
    .insert({ ...payload, tenant_id: tenantId, quote_id: quoteId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeQuoteItem(client: SupabaseClient, tenantId: string, itemId: string) {
  const { error } = await client
    .from('quote_items')
    .delete()
    .eq('id', itemId)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

// ── Devoluções ────────────────────────────────────────────────────────────────
export async function listReturns(client: SupabaseClient, p: ListParams) {
  const limit = p.limit ?? 50;
  const from = ((p.page ?? 1) - 1) * limit;

  let q = client
    .from('returns')
    .select('*, customers(name), sales_orders(order_number)', { count: 'exact' })
    .eq('tenant_id', p.tenantId)
    .order('created_at', { ascending: false });

  if (p.status) q = q.eq('status', p.status);
  if (p.customerId) q = q.eq('customer_id', p.customerId);

  const { data, error, count } = await q.range(from, from + limit - 1);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function getReturn(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('returns')
    .select('*, customers(*), sales_orders(order_number), return_items(*, products(name,sku))')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;
  return data;
}

export async function createReturn(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('returns')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReturn(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('returns')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Metas ─────────────────────────────────────────────────────────────────────
export async function listGoals(client: SupabaseClient, tenantId: string, year: number, month?: number) {
  let q = client
    .from('goals')
    .select('*, sales_reps(name,region), branches(name)')
    .eq('tenant_id', tenantId)
    .eq('period_year', year);
  if (month) q = q.eq('period_month', month);
  const { data, error } = await q.order('period_month');
  if (error) throw error;
  return data ?? [];
}

export async function upsertGoal(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('goals')
    .upsert({ ...payload, tenant_id: tenantId }, {
      onConflict: 'tenant_id,sales_rep_id,period_type,period_year,period_month,period_quarter',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Comissões ─────────────────────────────────────────────────────────────────
export async function listCommissions(client: SupabaseClient, tenantId: string, year: number, month?: number) {
  let q = client
    .from('commissions')
    .select('*, sales_reps(name), sales_orders(order_number)')
    .eq('tenant_id', tenantId)
    .eq('period_year', year);
  if (month) q = q.eq('period_month', month);
  const { data, error } = await q.order('period_month').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCommission(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('commissions')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCommission(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('commissions')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Campanhas ─────────────────────────────────────────────────────────────────
export async function listCampaigns(client: SupabaseClient, tenantId: string, status?: string) {
  let q = client
    .from('campaigns')
    .select('*')
    .eq('tenant_id', tenantId);
  if (status) q = q.eq('status', status);
  const { data, error } = await q.order('starts_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCampaign(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('campaigns')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('campaigns')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── BI: Metas vs Realizado ────────────────────────────────────────────────────
export async function getGoalsVsActual(client: SupabaseClient, tenantId: string, year: number, month?: number) {
  let q = client
    .from('vw_goals_vs_actual')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('period_year', year);
  if (month) q = q.eq('period_month', month);
  const { data, error } = await q.order('revenue_attainment_pct', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── BI: Performance de Representantes ────────────────────────────────────────
export async function getSalesRepPerformance(client: SupabaseClient, tenantId: string, months = 3) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const { data, error } = await client
    .from('vw_sales_rep_performance')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('month', since.toISOString().slice(0, 7))
    .order('month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
