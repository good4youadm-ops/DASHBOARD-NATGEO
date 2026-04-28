import { SupabaseClient } from '@supabase/supabase-js';

export interface SalesSummaryParams {
  tenantId: string;
  months?: number;
}

export async function getDashboardSalesSummary(
  client: SupabaseClient,
  { tenantId, months = 12 }: SalesSummaryParams,
) {
  const { data, error } = await client
    .from('vw_dashboard_sales_summary')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('month', { ascending: false })
    .limit(months);

  if (error) throw error;
  return data ?? [];
}

export async function getSalesByDay(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('vw_sales_by_day')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('order_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getTopCustomers(
  client: SupabaseClient,
  tenantId: string,
  limit = 20,
) {
  const { data, error } = await client
    .from('vw_sales_by_customer')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('total_revenue', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getTopProducts(
  client: SupabaseClient,
  tenantId: string,
  limit = 20,
) {
  const { data, error } = await client
    .from('vw_sales_by_product')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('total_revenue', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
