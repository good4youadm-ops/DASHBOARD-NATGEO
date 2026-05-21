import {
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
  applyPagination,
} from '../services/dataService';

/**
 * @file products.json
 * @description Cadastro de produtos
 * @fields id, tenant_id, sku, name, description, category_id, brand_id, unit, unit_cost, sale_price, min_stock, is_active, created_at
 * @example { "id": "p1", "tenant_id": "t1", "sku": "SKU-001", "name": "Produto A", "category_id": "cat1", "unit": "UN", "unit_cost": 29.90, "sale_price": 59.90, "min_stock": 20, "is_active": true }
 */
export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  brand_id?: string;
  unit?: string;
  unit_cost?: number;
  sale_price?: number;
  min_stock?: number;
  is_active?: boolean;
  created_at?: string;
}

/**
 * @file categories.json
 * @description Categorias de produtos
 * @fields id, tenant_id, name, parent_id
 * @example { "id": "cat1", "tenant_id": "t1", "name": "Suplementos", "parent_id": null }
 */
export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  parent_id?: string | null;
}

export interface ListProductsParams {
  search?: string;
  categoryId?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export async function listProducts(p: ListProductsParams = {}) {
  const all = await storeGetAll('products') as unknown as Product[];
  const filters = [
    { field: 'name',        value: p.search,     op: 'ilike' as const },
    { field: 'category_id', value: p.categoryId, op: 'eq'    as const },
    { field: 'is_active',   value: p.isActive === 'true' ? true : p.isActive === 'false' ? false : undefined },
  ];
  return applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'name', filters });
}

export async function getProduct(id: string) {
  return storeGetById('products', id);
}

export async function createProduct(body: Record<string, unknown>) {
  const record = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  return storeInsert('products', record);
}

export async function updateProduct(id: string, body: Record<string, unknown>) {
  return storeUpdate('products', id, body);
}

export async function deleteProduct(id: string) {
  return storeDelete('products', id);
}

export async function listCategories() {
  return storeGetAll('categories');
}
