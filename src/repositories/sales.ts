import { fetchJSON, DATA_SOURCES } from '../services/dataService';

// ── Tipos ──────────────────────────────────────────────────────────────────────

/**
 * @file sales-summary.json
 * @description Resumo mensal de vendas para o dashboard
 * @fields month, tenant_id, total_orders, total_revenue, avg_ticket, total_items
 * @example { "month": "2024-05", "tenant_id": "t1", "total_orders": 320, "total_revenue": 48000.00, "avg_ticket": 150.00, "total_items": 890 }
 */
export interface SalesSummaryRow {
  month: string;
  tenant_id: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  total_items: number;
}

/**
 * @file sales-by-day.json
 * @description Vendas agrupadas por dia
 * @fields order_date, tenant_id, total_orders, total_revenue
 * @example { "order_date": "2024-05-01", "tenant_id": "t1", "total_orders": 12, "total_revenue": 1800.00 }
 */
export interface SalesByDayRow {
  order_date: string;
  tenant_id: string;
  total_orders: number;
  total_revenue: number;
}

/**
 * @file sales-by-customer.json
 * @description Ranking de clientes por receita
 * @fields customer_id, customer_name, tenant_id, total_orders, total_revenue, last_order_date
 * @example { "customer_id": "c1", "customer_name": "Empresa X", "tenant_id": "t1", "total_orders": 15, "total_revenue": 9800.00, "last_order_date": "2024-05-10" }
 */
export interface SalesByCustomerRow {
  customer_id: string;
  customer_name: string;
  tenant_id: string;
  total_orders: number;
  total_revenue: number;
  last_order_date: string;
}

/**
 * @file sales-by-product.json
 * @description Ranking de produtos por receita
 * @fields product_id, product_name, sku, tenant_id, total_qty, total_revenue
 * @example { "product_id": "p1", "product_name": "Produto A", "sku": "SKU-001", "tenant_id": "t1", "total_qty": 200, "total_revenue": 12000.00 }
 */
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
  const data = await fetchJSON<SalesSummaryRow[]>(DATA_SOURCES.salesSummary, 'salesSummary');
  return data.slice(0, months);
}

export async function getSalesByDay(): Promise<SalesByDayRow[]> {
  return fetchJSON<SalesByDayRow[]>(DATA_SOURCES.salesByDay, 'salesByDay');
}

export async function getTopCustomers(limit = 20): Promise<SalesByCustomerRow[]> {
  const data = await fetchJSON<SalesByCustomerRow[]>(DATA_SOURCES.salesByCustomer, 'salesByCustomer');
  return data
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit);
}

export async function getTopProducts(limit = 20): Promise<SalesByProductRow[]> {
  const data = await fetchJSON<SalesByProductRow[]>(DATA_SOURCES.salesByProduct, 'salesByProduct');
  return data
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit);
}
