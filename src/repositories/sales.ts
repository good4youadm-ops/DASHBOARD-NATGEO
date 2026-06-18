import { getSupabase, defaultTenantId } from '../lib/supabase';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface SalesSummaryRow {
  month: string;
  tenant_id: string;
  total_orders: number;
  total_revenue: number;
  gross_revenue: number;
  unique_customers: number;
  avg_ticket: number;
  total_items: number;
}

export interface SalesByDayRow {
  order_date: string;
  tenant_id: string;
  total_orders: number;
  total_revenue: number;
  revenue: number;
}

export interface SalesByCustomerRow {
  customer_id: string;
  customer_name: string;
  tenant_id: string;
  total_orders: number;
  total_revenue: number;
  last_order_date: string;
}

export interface SalesByProductRow {
  product_id: string;
  product_name: string;
  sku: string;
  tenant_id: string;
  total_qty: number;
  total_revenue: number;
}

// ── Funções ────────────────────────────────────────────────────────────────────

export async function getDashboardSalesSummary({ months = 12 } = {}): Promise<SalesSummaryRow[]> {
  const tid = defaultTenantId();
  const { data, error } = await getSupabase()
    .from('vw_dashboard_sales_summary')
    .select('tenant_id, month, total_orders, unique_customers, gross_revenue, net_revenue, avg_ticket')
    .eq('tenant_id', tid)
    .order('month', { ascending: false })
    .limit(months);
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    month: String(r.month ?? '').slice(0, 7),
    tenant_id: String(r.tenant_id ?? ''),
    total_orders: Number(r.total_orders ?? 0),
    gross_revenue: Number(r.gross_revenue ?? 0),
    unique_customers: Number(r.unique_customers ?? 0),
    total_revenue: Number(r.net_revenue ?? 0),
    avg_ticket: Number(r.avg_ticket ?? 0),
    total_items: 0,
  }));
}

export async function getSalesByDay(): Promise<SalesByDayRow[]> {
  const tid = defaultTenantId();
  const { data, error } = await getSupabase()
    .from('vw_sales_by_day')
    .select('tenant_id, order_date, orders_count, revenue')
    .eq('tenant_id', tid)
    .order('order_date', { ascending: false })
    .limit(90);
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    order_date: String(r.order_date ?? ''),
    tenant_id: String(r.tenant_id ?? ''),
    total_orders: Number(r.orders_count ?? 0),
    total_revenue: Number(r.revenue ?? 0),
    revenue: Number(r.revenue ?? 0),
  }));
}

export async function getTopCustomers(limit = 20): Promise<SalesByCustomerRow[]> {
  const tid = defaultTenantId();
  const { data, error } = await getSupabase()
    .from('vw_sales_by_customer')
    .select('tenant_id, customer_id, customer_name, total_orders, total_revenue, last_order_date')
    .eq('tenant_id', tid)
    .order('total_revenue', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter(r => r.customer_id != null)
    .map(r => ({
      customer_id: String(r.customer_id ?? ''),
      customer_name: String(r.customer_name ?? r.customer_id ?? 'N/D'),
      tenant_id: String(r.tenant_id ?? ''),
      total_orders: Number(r.total_orders ?? 0),
      total_revenue: Number(r.total_revenue ?? 0),
      last_order_date: String(r.last_order_date ?? ''),
    }));
}

export async function getTopProducts(limit = 20): Promise<SalesByProductRow[]> {
  const tid = defaultTenantId();
  const { data, error } = await getSupabase()
    .from('vw_sales_by_product')
    .select('tenant_id, product_id, sku, product_name, total_qty_sold, total_revenue')
    .eq('tenant_id', tid)
    .order('total_revenue', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter(r => r.product_id != null)
    .map(r => ({
      product_id: String(r.product_id ?? ''),
      product_name: String(r.product_name ?? r.sku ?? 'N/D'),
      sku: String(r.sku ?? ''),
      tenant_id: String(r.tenant_id ?? ''),
      total_qty: Number(r.total_qty_sold ?? 0),
      total_revenue: Number(r.total_revenue ?? 0),
    }));
}
