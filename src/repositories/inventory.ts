import { fetchJSON, DATA_SOURCES } from '../services/dataService';

// ── Tipos ──────────────────────────────────────────────────────────────────────

/**
 * @file inventory-summary.json
 * @description Resumo do estoque para o dashboard
 * @fields tenant_id, total_skus, total_qty, total_value, skus_below_min, skus_out_of_stock
 * @example { "tenant_id": "t1", "total_skus": 150, "total_qty": 8200, "total_value": 245000.00, "skus_below_min": 12, "skus_out_of_stock": 3 }
 */
export interface InventorySummaryRow {
  tenant_id: string;
  total_skus: number;
  total_qty: number;
  total_value: number;
  skus_below_min: number;
  skus_out_of_stock: number;
}

/**
 * @file stock-by-product.json
 * @description Posição de estoque por produto
 * @fields product_id, sku, product_name, warehouse, qty_available, qty_reserved, min_stock, abc_curve, unit_cost, total_value
 * @example { "product_id": "p1", "sku": "SKU-001", "product_name": "Produto A", "warehouse": "CD-SP", "qty_available": 120, "qty_reserved": 10, "min_stock": 20, "abc_curve": "A", "unit_cost": 29.90, "total_value": 3588.00 }
 */
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

/**
 * @file expiring-lots.json
 * @description Lotes com vencimento próximo
 * @fields lot_id, product_id, sku, product_name, lot_number, expiry_date, qty, days_until_expiry
 * @example { "lot_id": "l1", "product_id": "p1", "sku": "SKU-001", "product_name": "Produto A", "lot_number": "L2024001", "expiry_date": "2024-07-01", "qty": 50, "days_until_expiry": 45 }
 */
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
  const data = await fetchJSON<InventorySummaryRow | InventorySummaryRow[]>(
    DATA_SOURCES.inventorySummary,
    'inventorySummary',
  );
  return Array.isArray(data) ? data[0] : data;
}

export async function getStockByProduct(filters: StockFilters = {}): Promise<StockByProductRow[]> {
  const data = await fetchJSON<StockByProductRow[]>(DATA_SOURCES.stockByProduct, 'stockByProduct');
  let result = data;
  if (filters.warehouse)        result = result.filter(r => r.warehouse === filters.warehouse);
  if (filters.abcCurve)         result = result.filter(r => r.abc_curve === filters.abcCurve);
  if (filters.alertOnly === 'true') result = result.filter(r => r.qty_available <= r.min_stock);
  return result;
}

export async function getExpiringLots(daysAhead = 90): Promise<ExpiringLotRow[]> {
  const data = await fetchJSON<ExpiringLotRow[]>(DATA_SOURCES.expiringLots, 'expiringLots');
  return data.filter(r => r.days_until_expiry <= daysAhead);
}
