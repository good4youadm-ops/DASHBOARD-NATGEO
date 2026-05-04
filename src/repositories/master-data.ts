import { SupabaseClient } from '@supabase/supabase-js';

// ── Marcas ────────────────────────────────────────────────────────────────────
export async function listBrands(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('brands')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createBrand(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('brands')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBrand(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('brands')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBrand(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('brands')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

// ── Categorias ────────────────────────────────────────────────────────────────
export async function listCategories(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('level')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('categories')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('categories')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Tabelas de Preço ──────────────────────────────────────────────────────────
export async function listPriceTables(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('price_tables')
    .select('*, price_table_items(count)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getPriceTable(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('price_tables')
    .select('*, price_table_items(*, products(name,sku))')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;
  return data;
}

export async function createPriceTable(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('price_tables')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePriceTable(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('price_tables')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertPriceTableItem(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('price_table_items')
    .upsert({ ...payload, tenant_id: tenantId }, { onConflict: 'price_table_id,product_id,min_qty' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePriceTableItem(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('price_table_items')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

// ── Formas de Pagamento ───────────────────────────────────────────────────────
export async function listPaymentMethods(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('payment_methods')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createPaymentMethod(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('payment_methods')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePaymentMethod(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('payment_methods')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Representantes ────────────────────────────────────────────────────────────
export async function listSalesReps(client: SupabaseClient, tenantId: string, activeOnly = true) {
  let q = client
    .from('sales_reps')
    .select('*')
    .eq('tenant_id', tenantId);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q.order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createSalesRep(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('sales_reps')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSalesRep(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('sales_reps')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Transportadoras ───────────────────────────────────────────────────────────
export async function listCarriers(client: SupabaseClient, tenantId: string, activeOnly = true) {
  let q = client
    .from('carriers')
    .select('id, name, code, modality, is_active')
    .eq('tenant_id', tenantId);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q.order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCarrier(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('carriers')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCarrier(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('carriers')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Centros de Custo ──────────────────────────────────────────────────────────
export async function listCostCenters(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('cost_centers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('code');
  if (error) throw error;
  return data ?? [];
}

export async function createCostCenter(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('cost_centers')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCostCenter(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('cost_centers')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
