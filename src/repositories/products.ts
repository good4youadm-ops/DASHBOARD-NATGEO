import { SupabaseClient } from '@supabase/supabase-js';

export interface ListParams {
  tenantId: string;
  search?: string;
  category?: string;
  abcCurve?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function listProducts(client: SupabaseClient, p: ListParams) {
  const page  = p.page  ?? 1;
  const limit = p.limit ?? 50;
  const from  = (page - 1) * limit;

  let q = client
    .from('products')
    .select('id,sku,name,category,subcategory,brand,supplier_name,unit,cost_price,sale_price,abc_curve,is_active,min_stock,reorder_point,synced_at', { count: 'exact' })
    .eq('tenant_id', p.tenantId)
    .order('name', { ascending: true })
    .range(from, from + limit - 1);

  if (p.search)           q = q.or(`name.ilike.%${p.search}%,sku.ilike.%${p.search}%,ean.ilike.%${p.search}%`);
  if (p.category)         q = q.eq('category', p.category);
  if (p.abcCurve)         q = q.eq('abc_curve', p.abcCurve);
  if (p.isActive != null) q = q.eq('is_active', p.isActive);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, limit };
}

export async function getProduct(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProduct(client: SupabaseClient, tenantId: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('products')
    .insert({ ...body, tenant_id: tenantId, source_system: 'manual', source_id: crypto.randomUUID() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(client: SupabaseClient, tenantId: string, id: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('products')
    .update(body)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('products')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('id', id);
  if (error) throw error;
}

export async function listCategories(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('products')
    .select('category')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('category', 'is', null);
  if (error) throw error;
  const unique = [...new Set((data ?? []).map(r => r.category).filter(Boolean))].sort();
  return unique;
}
