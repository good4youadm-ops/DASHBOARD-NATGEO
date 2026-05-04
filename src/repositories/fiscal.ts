import { SupabaseClient } from '@supabase/supabase-js';

// ── Notas Fiscais (estendido) ─────────────────────────────────────────────────
interface InvoiceListParams {
  tenantId: string;
  status?: string;
  direction?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function listInvoices(client: SupabaseClient, p: InvoiceListParams) {
  const limit = p.limit ?? 50;
  const from = ((p.page ?? 1) - 1) * limit;

  let q = client
    .from('invoices')
    .select('*, customers(name,document), sales_orders(order_number)', { count: 'exact' })
    .eq('tenant_id', p.tenantId)
    .order('issue_date', { ascending: false });

  if (p.status) q = q.eq('status', p.status);
  if (p.direction) q = q.eq('direction', p.direction);
  if (p.customerId) q = q.eq('customer_id', p.customerId);
  if (p.dateFrom) q = q.gte('issue_date', p.dateFrom);
  if (p.dateTo) q = q.lte('issue_date', p.dateTo);

  const { data, error, count } = await q.range(from, from + limit - 1);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function getInvoice(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('invoices')
    .select('*, customers(*), sales_orders(order_number,customer_id), invoice_items(*, products(name,sku,ncm))')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;
  return data;
}

export async function createInvoice(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('invoices')
    .insert({ ...payload, tenant_id: tenantId, source_system: 'manual', source_id: crypto.randomUUID() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInvoice(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('invoices')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelInvoice(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('invoices')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Itens de Nota Fiscal ──────────────────────────────────────────────────────
export async function addInvoiceItem(client: SupabaseClient, tenantId: string, invoiceId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('invoice_items')
    .insert({ ...payload, tenant_id: tenantId, invoice_id: invoiceId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeInvoiceItem(client: SupabaseClient, tenantId: string, itemId: string) {
  const { error } = await client
    .from('invoice_items')
    .delete()
    .eq('id', itemId)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

// ── Configurações Fiscais ─────────────────────────────────────────────────────
export async function getFiscalConfig(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('fiscal_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // 116 = not found
  return data ?? null;
}

export async function upsertFiscalConfig(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('fiscal_configs')
    .upsert({ ...payload, tenant_id: tenantId }, { onConflict: 'tenant_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Regras de Imposto ─────────────────────────────────────────────────────────
export async function listTaxRules(client: SupabaseClient, tenantId: string, ncm?: string) {
  let q = client
    .from('tax_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);
  if (ncm) q = q.eq('ncm', ncm);
  const { data, error } = await q.order('ncm');
  if (error) throw error;
  return data ?? [];
}

export async function createTaxRule(client: SupabaseClient, tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('tax_rules')
    .insert({ ...payload, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaxRule(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('tax_rules')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTaxRule(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('tax_rules')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}
