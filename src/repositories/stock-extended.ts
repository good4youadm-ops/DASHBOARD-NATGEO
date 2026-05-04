import { SupabaseClient } from '@supabase/supabase-js';

// ── Estoque Crítico (BI) ──────────────────────────────────────────────────────
export async function getCriticalStock(client: SupabaseClient, tenantId: string, warehouse?: string) {
  let q = client
    .from('vw_critical_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('qty_to_reorder', { ascending: false });
  if (warehouse) q = q.eq('warehouse', warehouse);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Reservas de Estoque ───────────────────────────────────────────────────────
export async function listReservations(client: SupabaseClient, tenantId: string, productId?: string) {
  let q = client
    .from('stock_reservations')
    .select('*, products(name,sku), sales_orders(order_number)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (productId) q = q.eq('product_id', productId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createReservation(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('stock_reservations')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function releaseReservation(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('stock_reservations')
    .update({ status: 'released' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Contagens de Inventário ───────────────────────────────────────────────────
export async function listInventoryCounts(client: SupabaseClient, tenantId: string, status?: string) {
  let q = client
    .from('vw_inventory_count_summary')
    .select('*')
    .eq('tenant_id', tenantId);
  if (status) q = q.eq('status', status);
  const { data, error } = await q.order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getInventoryCount(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('inventory_counts')
    .select('*, inventory_count_items(*, products(name,sku))')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;
  return data;
}

export async function createInventoryCount(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>, createdBy: string) {
  const { data, error } = await client
    .from('inventory_counts')
    .insert({ ...payload, tenant_id: tenantId, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventoryCount(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('inventory_counts')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertCountItem(client: SupabaseClient, tenantId: string, countId: string, productId: string, countedQty: number, notes?: string) {
  const { data, error } = await client
    .from('inventory_count_items')
    .upsert(
      { tenant_id: tenantId, count_id: countId, product_id: productId, counted_qty: countedQty, notes: notes ?? null, counted_at: new Date().toISOString() },
      { onConflict: 'count_id,product_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── BI: Ranking de Produtos ───────────────────────────────────────────────────
export async function getProductRanking(client: SupabaseClient, tenantId: string, months = 3, limit = 20) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data, error } = await client
    .from('vw_product_ranking')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('month', since.toISOString().slice(0, 7))
    .order('revenue_rank')
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
