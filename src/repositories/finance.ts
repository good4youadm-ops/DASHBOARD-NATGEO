import { SupabaseClient } from '@supabase/supabase-js';

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
