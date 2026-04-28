import { SupabaseClient } from '@supabase/supabase-js';

export async function getDashboardInventorySummary(
  client: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await client
    .from('vw_dashboard_inventory_summary')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return data ?? [];
}

export async function getStockByProduct(
  client: SupabaseClient,
  tenantId: string,
  filters?: { warehouse?: string; abcCurve?: string; alertOnly?: boolean },
) {
  let query = client
    .from('vw_stock_by_product')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.warehouse) query = query.eq('warehouse', filters.warehouse);
  if (filters?.abcCurve)  query = query.eq('abc_curve', filters.abcCurve);
  if (filters?.alertOnly)  query = query.neq('stock_alert', 'normal');

  const { data, error } = await query.order('total_cost', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getExpiringLots(
  client: SupabaseClient,
  tenantId: string,
  daysAhead = 90,
) {
  const { data, error } = await client
    .from('vw_expiring_lots')
    .select('*')
    .eq('tenant_id', tenantId)
    .lte('days_to_expiry', daysAhead)
    .order('days_to_expiry', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
