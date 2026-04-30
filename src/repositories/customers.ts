import { SupabaseClient } from '@supabase/supabase-js';

export interface ListParams {
  tenantId: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function listCustomers(client: SupabaseClient, p: ListParams) {
  const page  = p.page  ?? 1;
  const limit = p.limit ?? 50;
  const from  = (page - 1) * limit;

  let q = client
    .from('customers')
    .select('id,code,name,trade_name,document,document_type,email,phone,segment,classification,credit_limit,payment_terms,is_active,synced_at', { count: 'exact' })
    .eq('tenant_id', p.tenantId)
    .order('name', { ascending: true });

  if (p.search)           q = q.or(`name.ilike.%${p.search}%,document.ilike.%${p.search}%,code.ilike.%${p.search}%`);
  if (p.isActive != null) q = q.eq('is_active', p.isActive);

  const { data, error, count } = await q.range(from, from + limit - 1);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, limit };
}

export async function getCustomer(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCustomer(client: SupabaseClient, tenantId: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('customers')
    .insert({ ...body, tenant_id: tenantId, source_system: 'manual', source_id: crypto.randomUUID() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(client: SupabaseClient, tenantId: string, id: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('customers')
    .update(body)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('customers')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('id', id);
  if (error) throw error;
}
