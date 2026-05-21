import {
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
  applyPagination,
} from '../services/dataService';

/**
 * @file customers.json
 * @description Cadastro de clientes
 * @fields id, tenant_id, name, document, email, phone, address, city, state, zip_code, is_active, created_at
 * @example { "id": "c1", "tenant_id": "t1", "name": "Empresa X Ltda", "document": "12.345.678/0001-99", "email": "contato@empresax.com", "phone": "(11) 9999-9999", "city": "São Paulo", "state": "SP", "is_active": true, "created_at": "2024-01-10T00:00:00Z" }
 */
export interface Customer {
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
  is_active?: boolean;
  created_at?: string;
}

export interface ListCustomersParams {
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export async function listCustomers(p: ListCustomersParams = {}) {
  const all = await storeGetAll('customers') as unknown as Customer[];
  const filters = [
    { field: 'name',      value: p.search,   op: 'ilike' as const },
    { field: 'is_active', value: p.isActive === 'true' ? true : p.isActive === 'false' ? false : undefined },
  ];
  return applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'name', filters });
}

export async function getCustomer(id: string) {
  return storeGetById('customers', id);
}

export async function createCustomer(body: Record<string, unknown>) {
  const record = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  return storeInsert('customers', record);
}

export async function updateCustomer(id: string, body: Record<string, unknown>) {
  return storeUpdate('customers', id, body);
}

export async function deleteCustomer(id: string) {
  return storeDelete('customers', id);
}
