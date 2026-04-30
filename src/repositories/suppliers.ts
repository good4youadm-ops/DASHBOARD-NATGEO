import { SupabaseClient } from '@supabase/supabase-js';

export interface ListParams {
  tenantId: string;
  search?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function listSuppliers(client: SupabaseClient, p: ListParams) {
  const page  = p.page  ?? 1;
  const limit = p.limit ?? 50;
  const from  = (page - 1) * limit;

  let q = client
    .from('suppliers')
    .select('id,name,trade_name,document,document_type,email,phone,category,payment_terms,credit_limit,is_active,synced_at', { count: 'exact' })
    .eq('tenant_id', p.tenantId)
    .order('name', { ascending: true })
    .range(from, from + limit - 1);

  if (p.search)           q = q.or(`name.ilike.%${p.search}%,document.ilike.%${p.search}%`);
  if (p.category)         q = q.eq('category', p.category);
  if (p.isActive != null) q = q.eq('is_active', p.isActive);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, limit };
}

export async function getSupplier(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('suppliers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createSupplier(client: SupabaseClient, tenantId: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('suppliers')
    .insert({ ...body, tenant_id: tenantId, source_system: 'manual', source_id: crypto.randomUUID() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSupplier(client: SupabaseClient, tenantId: string, id: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('suppliers')
    .update(body)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('suppliers')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('id', id);
  if (error) throw error;
}
