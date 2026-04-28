type OracleRow = Record<string, unknown>;

function str(v: unknown): string | null {
  return v != null && v !== '' ? String(v) : null;
}
function num(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}
function int(v: unknown): number | null {
  const n = parseInt(String(v));
  return isNaN(n) ? null : n;
}
function date(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.slice(0, 10);
}
function statusOrder(v: unknown): string {
  const map: Record<string, string> = {
    'P': 'pending', 'A': 'approved', 'E': 'processing',
    'F': 'shipped', 'D': 'delivered', 'C': 'cancelled', 'T': 'partial',
  };
  return map[String(v ?? '').toUpperCase()] ?? 'pending';
}

export function mapSalesOrder(row: OracleRow, tenantId: string, sourceName: string) {
  return {
    tenant_id: tenantId,
    source_system: sourceName,
    source_id: String(row['SOURCE_ID']),
    customer_source_id: str(row['CUSTOMER_SOURCE_ID']),
    order_number: str(row['ORDER_NUMBER']),
    order_date: date(row['ORDER_DATE'])!,
    delivery_date: date(row['DELIVERY_DATE']),
    status: statusOrder(row['STATUS']),
    payment_terms: str(row['PAYMENT_TERMS']),
    payment_method: str(row['PAYMENT_METHOD']),
    salesperson: str(row['SALESPERSON']),
    branch: str(row['BRANCH']),
    channel: str(row['CHANNEL']),
    subtotal: num(row['SUBTOTAL']),
    discount_amount: num(row['DISCOUNT_AMOUNT']),
    tax_amount: num(row['TAX_AMOUNT']),
    freight_amount: num(row['FREIGHT_AMOUNT']),
    total_amount: num(row['TOTAL_AMOUNT']),
    notes: str(row['NOTES']),
    synced_at: new Date().toISOString(),
  };
}

export function mapSalesOrderItem(row: OracleRow, tenantId: string, sourceName: string) {
  return {
    tenant_id: tenantId,
    source_system: sourceName,
    source_id: String(row['SOURCE_ID']),
    order_source_id: str(row['ORDER_SOURCE_ID']),
    product_source_id: str(row['PRODUCT_SOURCE_ID']),
    line_number: int(row['LINE_NUMBER']),
    product_code: str(row['PRODUCT_CODE']),
    product_name: str(row['PRODUCT_NAME']),
    unit: str(row['UNIT']) ?? 'UN',
    quantity: num(row['QUANTITY']),
    quantity_shipped: num(row['QUANTITY_SHIPPED']),
    unit_price: num(row['UNIT_PRICE']),
    discount_pct: num(row['DISCOUNT_PCT']),
    discount_amount: num(row['DISCOUNT_AMOUNT']),
    total_amount: num(row['TOTAL_AMOUNT']),
    status: str(row['STATUS']),
    synced_at: new Date().toISOString(),
  };
}
