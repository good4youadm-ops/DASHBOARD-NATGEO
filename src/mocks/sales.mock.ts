// Dados fictícios para desenvolvimento local sem Oracle/Supabase

const TENANT = '00000000-0000-0000-0000-000000000001';

export const mockSalesSummary = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const month = d.toISOString().slice(0, 7) + '-01';
  const revenue = 180000 + Math.random() * 120000;
  return {
    tenant_id: TENANT,
    month,
    total_orders: Math.floor(200 + Math.random() * 150),
    unique_customers: Math.floor(80 + Math.random() * 60),
    gross_revenue: revenue,
    total_discounts: revenue * 0.05,
    net_revenue: revenue * 0.95,
    total_freight: revenue * 0.02,
    avg_ticket: revenue / (200 + Math.random() * 150),
    delivered_orders: Math.floor(160 + Math.random() * 100),
    cancelled_orders: Math.floor(5 + Math.random() * 10),
    pending_orders: Math.floor(10 + Math.random() * 30),
  };
});

export const mockSalesByDay = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const orders = Math.floor(8 + Math.random() * 20);
  const revenue = orders * (800 + Math.random() * 400);
  return {
    tenant_id: TENANT,
    order_date: d.toISOString().slice(0, 10),
    orders_count: orders,
    revenue,
    discounts: revenue * 0.04,
    avg_ticket: revenue / orders,
  };
});

export const mockTopCustomers = Array.from({ length: 20 }, (_, i) => ({
  tenant_id: TENANT,
  customer_id: `cust-${i + 1}`,
  customer_name: `Supermercado ${String.fromCharCode(65 + i)} Ltda`,
  customer_document: `12.345.${String(i + 1).padStart(3, '0')}/0001-00`,
  abc_curve: i < 4 ? 'A' : i < 10 ? 'B' : 'C',
  segment: ['Varejo', 'Atacado', 'Indústria'][i % 3],
  total_orders: Math.floor(20 + Math.random() * 80),
  total_revenue: 50000 - i * 2000 + Math.random() * 5000,
  avg_ticket: 1200 + Math.random() * 800,
  last_order_date: new Date(Date.now() - i * 86400000 * 3).toISOString().slice(0, 10),
}));

export const mockTopProducts = Array.from({ length: 20 }, (_, i) => ({
  tenant_id: TENANT,
  product_id: `prod-${i + 1}`,
  sku: `PRD${String(i + 1).padStart(5, '0')}`,
  product_name: `Produto ${i + 1}`,
  category: ['Laticínios', 'Frios', 'Bebidas', 'Padaria'][i % 4],
  brand: ['MarcaA', 'MarcaB', 'MarcaC'][i % 3],
  abc_curve: i < 4 ? 'A' : i < 10 ? 'B' : 'C',
  total_qty_sold: Math.floor(500 + Math.random() * 2000),
  total_revenue: 40000 - i * 1500 + Math.random() * 3000,
  avg_unit_price: 12 + Math.random() * 30,
  order_count: Math.floor(50 + Math.random() * 150),
}));
