import {
  fetchJSON, DATA_SOURCES,
  storeGetAll, storeGetById, storeInsert, storeUpdate,
  applyPagination,
} from '../services/dataService';

/**
 * @file critical-stock.json        Estoque crítico (somente leitura) { product_id, sku, product_name, warehouse, qty_available, min_stock, shortage }
 * @file stock-reservations.json    Reservas de estoque { id, tenant_id, product_id, order_id, qty_reserved, status, created_at }
 * @file inventory-counts.json      Inventários { id, tenant_id, status, warehouse, started_at, finished_at, created_by }
 * @file inventory-count-items.json Itens de inventário { id, tenant_id, count_id, product_id, system_qty, counted_qty, difference, notes }
 * @file product-ranking.json       Ranking de produtos (somente leitura) { product_id, sku, product_name, total_qty, total_revenue, rank }
 */

export async function getCriticalStock(warehouse?: string) {
  const data = await fetchJSON<Record<string, unknown>[]>(DATA_SOURCES.criticalStock, 'criticalStock');
  return warehouse ? data.filter(r => r['warehouse'] === warehouse) : data;
}

export async function listReservations(productId?: string) {
  const all = await storeGetAll('stockReservations');
  return productId ? all.filter(r => r['product_id'] === productId) : all;
}

export async function createReservation(payload: Record<string, unknown>) {
  return storeInsert('stockReservations', { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() });
}

export async function releaseReservation(id: string) {
  return storeUpdate('stockReservations', id, { status: 'released', released_at: new Date().toISOString() });
}

export async function listInventoryCounts(status?: string) {
  const all = await storeGetAll('inventoryCounts');
  return status ? all.filter(r => r['status'] === status) : all;
}

export async function getInventoryCount(id: string) {
  return storeGetById('inventoryCounts', id);
}

export async function createInventoryCount(payload: Record<string, unknown>, createdBy: string) {
  return storeInsert('inventoryCounts', {
    ...payload,
    id: crypto.randomUUID(),
    status: 'open',
    created_by: createdBy,
    started_at: new Date().toISOString(),
  });
}

export async function updateInventoryCount(id: string, payload: Record<string, unknown>) {
  return storeUpdate('inventoryCounts', id, payload);
}

export async function upsertCountItem(
  countId: string,
  productId: string,
  countedQty: number,
  notes?: string,
) {
  const all = await storeGetAll('inventoryCountItems');
  const existing = all.find(r => r['count_id'] === countId && r['product_id'] === productId);
  if (existing) {
    return storeUpdate('inventoryCountItems', existing['id'] as string, { counted_qty: countedQty, notes });
  }
  return storeInsert('inventoryCountItems', {
    id: crypto.randomUUID(),
    count_id: countId,
    product_id: productId,
    counted_qty: countedQty,
    notes,
  });
}

export async function getProductRanking(months = 3, limit = 20) {
  const data = await fetchJSON<Record<string, unknown>[]>(DATA_SOURCES.productRanking, 'productRanking');
  return data.slice(0, limit);
}
