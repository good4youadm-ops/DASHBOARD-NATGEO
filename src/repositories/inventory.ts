import { getSupabase, defaultTenantId } from '../lib/supabase';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface InventorySummaryRow {
  tenant_id: string;
  total_skus: number;
  total_qty: number;
  total_value: number;
  skus_below_min: number;
  skus_out_of_stock: number;
}

export interface StockByProductRow {
  product_id: string;
  sku: string;
  product_name: string;
  warehouse: string;
  qty_available: number;
  qty_reserved: number;
  min_stock: number;
  abc_curve: string;
  unit_cost: number;
  total_value: number;
}

export interface ExpiringLotRow {
  lot_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  lot_number: string;
  expiry_date: string;
  qty: number;
  days_until_expiry: number;
}

export interface StockFilters {
  warehouse?: string;
  abcCurve?: string;
  alertOnly?: string;
}

// ── Funções ────────────────────────────────────────────────────────────────────

export async function getDashboardInventorySummary(): Promise<InventorySummaryRow> {
  const tid = defaultTenantId();
  const { data, error } = await getSupabase()
    .from('vw_dashboard_inventory_summary')
    .select('sku_count, total_qty_available, total_inventory_value, ruptura_count')
    .eq('tenant_id', tid);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return {
    tenant_id: tid,
    // Soma por depósito; pode supercontar SKUs em múltiplos depósitos — aceitável no card do dashboard
    total_skus: rows.reduce((s, r) => s + Number(r.sku_count ?? 0), 0),
    total_qty: rows.reduce((s, r) => s + Number(r.total_qty_available ?? 0), 0),
    total_value: rows.reduce((s, r) => s + Number(r.total_inventory_value ?? 0), 0),
    skus_below_min: 0,
    skus_out_of_stock: rows.reduce((s, r) => s + Number(r.ruptura_count ?? 0), 0),
  };
}

export async function getStockByProduct(filters: StockFilters = {}): Promise<StockByProductRow[]> {
  const tid = defaultTenantId();
  let query = getSupabase()
    .from('vw_stock_by_product')
    .select('product_id, sku, product_name, warehouse, qty_available, qty_reserved, min_stock, abc_curve, avg_cost, total_cost, stock_alert')
    .eq('tenant_id', tid);
  if (filters.warehouse) query = query.eq('warehouse', filters.warehouse);
  if (filters.abcCurve)  query = query.eq('abc_curve', filters.abcCurve);
  if (filters.alertOnly === 'true') query = query.in('stock_alert', ['sem_estoque', 'ponto_pedido', 'estoque_minimo']);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    product_id: String(r.product_id ?? ''),
    sku: String(r.sku ?? ''),
    product_name: String(r.product_name ?? r.sku ?? 'N/D'),
    warehouse: String(r.warehouse ?? ''),
    qty_available: Number(r.qty_available ?? 0),
    qty_reserved: Number(r.qty_reserved ?? 0),
    min_stock: Number(r.min_stock ?? 0),
    abc_curve: String(r.abc_curve ?? ''),
    unit_cost: Number(r.avg_cost ?? 0),
    total_value: Number(r.total_cost ?? 0),
  }));
}

export async function getExpiringLots(daysAhead = 90): Promise<ExpiringLotRow[]> {
  const tid = defaultTenantId();
  const { data, error } = await getSupabase()
    .from('vw_expiring_lots')
    .select('product_id, sku, product_name, lot_number, expiry_date, days_to_expiry, qty_current')
    .eq('tenant_id', tid)
    .lte('days_to_expiry', daysAhead)
    .order('days_to_expiry', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    lot_id: '',
    product_id: String(r.product_id ?? ''),
    sku: String(r.sku ?? ''),
    product_name: String(r.product_name ?? ''),
    lot_number: String(r.lot_number ?? ''),
    expiry_date: String(r.expiry_date ?? ''),
    qty: Number(r.qty_current ?? 0),
    days_until_expiry: Number(r.days_to_expiry ?? 0),
  }));
}
