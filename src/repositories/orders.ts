import {
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
  applyPagination,
} from '../services/dataService';

/**
 * @file orders.json
 * @description Pedidos de venda
 * @fields id, tenant_id, order_number, customer_id, order_date, status, total_value, notes, created_at
 * @example { "id": "o1", "tenant_id": "t1", "order_number": "PV-00123", "customer_id": "c1", "order_date": "2024-05-10", "status": "confirmed", "total_value": 1800.00 }
 */
export interface SalesOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  status: string;
  total_value: number;
  notes?: string;
  created_at?: string;
}

/**
 * @file order-items.json
 * @description Itens de pedidos de venda
 * @fields id, tenant_id, order_id, product_id, sku, product_name, qty, unit_price, total_price, discount
 * @example { "id": "oi1", "tenant_id": "t1", "order_id": "o1", "product_id": "p1", "sku": "SKU-001", "product_name": "Produto A", "qty": 10, "unit_price": 59.90, "total_price": 599.00, "discount": 0 }
 */
export interface SalesOrderItem {
  id: string;
  tenant_id: string;
  order_id: string;
  product_id: string;
  sku?: string;
  product_name?: string;
  qty: number;
  unit_price: number;
  total_price: number;
  discount?: number;
}

export interface ListOrdersParams {
  customerId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listOrders(p: ListOrdersParams = {}) {
  const all = await storeGetAll('orders') as unknown as SalesOrder[];
  const filters = [
    { field: 'customer_id',   value: p.customerId, op: 'eq'    as const },
    { field: 'status',        value: p.status,     op: 'eq'    as const },
    { field: 'order_number',  value: p.search,     op: 'ilike' as const },
  ];
  return applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'order_date', ascending: false, filters });
}

export async function getOrder(id: string) {
  return storeGetById('orders', id);
}

export async function getOrderItems(orderId: string) {
  const all = await storeGetAll('orderItems') as unknown as SalesOrderItem[];
  return all.filter(r => r.order_id === orderId);
}

export async function createOrder(body: Record<string, unknown>) {
  const record = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  return storeInsert('orders', record);
}

export async function addOrderItem(orderId: string, body: Record<string, unknown>) {
  const record = { ...body, id: crypto.randomUUID(), order_id: orderId };
  return storeInsert('orderItems', record);
}

export async function updateOrder(id: string, body: Record<string, unknown>) {
  return storeUpdate('orders', id, body);
}

export async function removeOrderItem(orderId: string, itemId: string) {
  const all = await storeGetAll('orderItems') as unknown as SalesOrderItem[];
  const item = all.find(r => r.id === itemId && r.order_id === orderId);
  if (!item) throw new Error(`Item ${itemId} não encontrado no pedido ${orderId}`);
  return storeDelete('orderItems', itemId);
}

export async function deleteOrder(id: string) {
  return storeDelete('orders', id);
}
