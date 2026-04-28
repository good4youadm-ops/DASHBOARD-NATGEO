type OracleRow = Record<string, unknown>;

function str(v: unknown): string | null {
  return v != null && v !== '' ? String(v) : null;
}
function num(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}
function int(v: unknown): number | null {
  const n = parseInt(String(v));
  return isNaN(n) ? null : n;
}
function bool(v: unknown): boolean {
  return String(v).toUpperCase() === 'S' || v === true || v === 1;
}

export function mapProduct(row: OracleRow, tenantId: string, sourceName: string) {
  return {
    tenant_id: tenantId,
    source_system: sourceName,
    source_id: String(row['SOURCE_ID']),
    sku: str(row['SKU']),
    name: String(row['NAME'] ?? ''),
    description: str(row['DESCRIPTION']),
    category: str(row['CATEGORY']),
    subcategory: str(row['SUBCATEGORY']),
    brand: str(row['BRAND']),
    supplier_id: str(row['SUPPLIER_ID']),
    supplier_name: str(row['SUPPLIER_NAME']),
    unit: str(row['UNIT']) ?? 'UN',
    unit_weight: num(row['UNIT_WEIGHT']),
    units_per_box: int(row['UNITS_PER_BOX']),
    cost_price: num(row['COST_PRICE']),
    sale_price: num(row['SALE_PRICE']),
    min_price: num(row['MIN_PRICE']),
    ncm: str(row['NCM']),
    ean: str(row['EAN']),
    abc_curve: str(row['ABC_CURVE']),
    is_fractionable: bool(row['IS_FRACTIONABLE']),
    requires_cold: bool(row['REQUIRES_COLD']),
    shelf_life_days: int(row['SHELF_LIFE_DAYS']),
    min_stock: num(row['MIN_STOCK']),
    max_stock: num(row['MAX_STOCK']),
    reorder_point: num(row['REORDER_POINT']),
    is_active: bool(row['IS_ACTIVE']),
    synced_at: new Date().toISOString(),
  };
}
