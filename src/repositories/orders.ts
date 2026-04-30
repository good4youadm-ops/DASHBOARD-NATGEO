import { SupabaseClient } from '@supabase/supabase-js';

export interface ListOrdersParams {
  tenantId: string;
  search?: string;
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function listOrders(client: SupabaseClient, p: ListOrdersParams) {
  const page  = p.page  ?? 1;
  const limit = p.limit ?? 50;
  const from  = (page - 1) * limit;

  let q = client
    .from('sales_orders')
    .select(
      'id,order_number,order_date,delivery_date,status,total_amount,discount_amount,freight_amount,payment_terms,salesperson,notes,source_system,customer_id,customers(name,document)',
      { count: 'exact' },
    )
    .eq('tenant_id', p.tenantId)
    .order('order_date', { ascending: false });

  if (p.search)     q = q.or(`order_number.ilike.%${p.search}%`);
  if (p.status)     q = q.eq('status', p.status);
  if (p.customerId) q = q.eq('customer_id', p.customerId);
  if (p.dateFrom)   q = q.gte('order_date', p.dateFrom);
  if (p.dateTo)     q = q.lte('order_date', p.dateTo);

  const { data, error, count } = await q.range(from, from + limit - 1);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, limit };
}

export async function getOrder(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('sales_orders')
    .select('*, customers(name,document,email,phone)')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getOrderItems(client: SupabaseClient, tenantId: string, orderId: string) {
  const { data, error } = await client
    .from('sales_order_items')
    .select('*, products(name,sku,unit)')
    .eq('tenant_id', tenantId)
    .eq('sales_order_id', orderId)
    .order('line_number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createOrder(client: SupabaseClient, tenantId: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('sales_orders')
    .insert({ ...body, tenant_id: tenantId, source_system: 'manual', source_id: crypto.randomUUID() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addOrderItem(client: SupabaseClient, tenantId: string, orderId: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('sales_order_items')
    .insert({ ...body, tenant_id: tenantId, sales_order_id: orderId, source_system: 'manual', source_id: crypto.randomUUID() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrder(client: SupabaseClient, tenantId: string, id: string, body: Record<string, unknown>) {
  const { data, error } = await client
    .from('sales_orders')
    .update(body)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeOrderItem(client: SupabaseClient, tenantId: string, orderId: string, itemId: string) {
  const { error } = await client
    .from('sales_order_items')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('sales_order_id', orderId)
    .eq('id', itemId)
    .eq('source_system', 'manual');
  if (error) throw error;
}

export async function deleteOrder(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('sales_orders')
    .update({ status: 'cancelled' })
    .eq('tenant_id', tenantId)
    .eq('id', id);
  if (error) throw error;
}
