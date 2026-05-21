import {
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
  applyPagination,
} from '../services/dataService';

/**
 * @file suppliers.json
 * @description Cadastro de fornecedores
 * @fields id, tenant_id, name, document, email, phone, address, city, state, zip_code, payment_term, is_active, created_at
 * @example { "id": "s1", "tenant_id": "t1", "name": "Fornecedor A Ltda", "document": "98.765.432/0001-00", "email": "vendas@fornecedora.com", "payment_term": 30, "is_active": true }
 */
export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  payment_term?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface ListSuppliersParams {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export async function listSuppliers(p: ListSuppliersParams = {}) {
  const all = await storeGetAll('suppliers') as unknown as Supplier[];
  const filters = [
    { field: 'name',      value: p.search,   op: 'ilike' as const },
    { field: 'is_active', value: p.isActive === 'true' ? true : p.isActive === 'false' ? false : undefined },
  ];
  return applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'name', filters });
}

export async function getSupplier(id: string) {
  return storeGetById('suppliers', id);
}

export async function createSupplier(body: Record<string, unknown>) {
  const record = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  return storeInsert('suppliers', record);
}

export async function updateSupplier(id: string, body: Record<string, unknown>) {
  return storeUpdate('suppliers', id, body);
}

export async function deleteSupplier(id: string) {
  return storeDelete('suppliers', id);
}
