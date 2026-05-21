import {
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
} from '../services/dataService';

/**
 * @file brands.json            { id, tenant_id, name, is_active }
 * @file categories.json        { id, tenant_id, name, parent_id }
 * @file price-tables.json      { id, tenant_id, name, valid_from, valid_to, is_active }
 * @file price-table-items.json { id, tenant_id, price_table_id, product_id, price }
 * @file payment-methods.json   { id, tenant_id, name, installments, is_active }
 * @file sales-reps.json        { id, tenant_id, name, email, commission_pct, is_active }
 * @file carriers.json          { id, tenant_id, name, document, is_active }
 * @file cost-centers.json      { id, tenant_id, name, code, parent_id }
 */

// ── Marcas ─────────────────────────────────────────────────────────────────────

export async function listBrands() {
  return storeGetAll('brands');
}
export async function createBrand(payload: Record<string, unknown>) {
  return storeInsert('brands', { ...payload, id: crypto.randomUUID() });
}
export async function updateBrand(id: string, payload: Record<string, unknown>) {
  return storeUpdate('brands', id, payload);
}
export async function deleteBrand(id: string) {
  return storeDelete('brands', id);
}

// ── Categorias ─────────────────────────────────────────────────────────────────

export async function listCategories() {
  return storeGetAll('categories');
}
export async function createCategory(payload: Record<string, unknown>) {
  return storeInsert('categories', { ...payload, id: crypto.randomUUID() });
}
export async function updateCategory(id: string, payload: Record<string, unknown>) {
  return storeUpdate('categories', id, payload);
}

// ── Tabelas de Preço ───────────────────────────────────────────────────────────

export async function listPriceTables() {
  return storeGetAll('priceTables');
}
export async function getPriceTable(id: string) {
  return storeGetById('priceTables', id);
}
export async function createPriceTable(payload: Record<string, unknown>) {
  return storeInsert('priceTables', { ...payload, id: crypto.randomUUID() });
}
export async function updatePriceTable(id: string, payload: Record<string, unknown>) {
  return storeUpdate('priceTables', id, payload);
}
export async function upsertPriceTableItem(payload: Record<string, unknown>) {
  const id = payload['id'] as string | undefined;
  if (id) {
    try { return await storeUpdate('priceTableItems', id, payload); } catch { /* fall through to insert */ }
  }
  return storeInsert('priceTableItems', { ...payload, id: id ?? crypto.randomUUID() });
}
export async function deletePriceTableItem(id: string) {
  return storeDelete('priceTableItems', id);
}

// ── Formas de Pagamento ────────────────────────────────────────────────────────

export async function listPaymentMethods() {
  return storeGetAll('paymentMethods');
}
export async function createPaymentMethod(payload: Record<string, unknown>) {
  return storeInsert('paymentMethods', { ...payload, id: crypto.randomUUID() });
}
export async function updatePaymentMethod(id: string, payload: Record<string, unknown>) {
  return storeUpdate('paymentMethods', id, payload);
}

// ── Representantes ─────────────────────────────────────────────────────────────

export async function listSalesReps(activeOnly = false) {
  const all = await storeGetAll('salesReps');
  return activeOnly ? all.filter(r => r['is_active'] === true) : all;
}
export async function createSalesRep(payload: Record<string, unknown>) {
  return storeInsert('salesReps', { ...payload, id: crypto.randomUUID() });
}
export async function updateSalesRep(id: string, payload: Record<string, unknown>) {
  return storeUpdate('salesReps', id, payload);
}

// ── Transportadoras ────────────────────────────────────────────────────────────

export async function listCarriers(activeOnly = false) {
  const all = await storeGetAll('carriers');
  return activeOnly ? all.filter(r => r['is_active'] === true) : all;
}
export async function createCarrier(payload: Record<string, unknown>) {
  return storeInsert('carriers', { ...payload, id: crypto.randomUUID() });
}
export async function updateCarrier(id: string, payload: Record<string, unknown>) {
  return storeUpdate('carriers', id, payload);
}

// ── Centros de Custo ───────────────────────────────────────────────────────────

export async function listCostCenters() {
  return storeGetAll('costCenters');
}
export async function createCostCenter(payload: Record<string, unknown>) {
  return storeInsert('costCenters', { ...payload, id: crypto.randomUUID() });
}
export async function updateCostCenter(id: string, payload: Record<string, unknown>) {
  return storeUpdate('costCenters', id, payload);
}
