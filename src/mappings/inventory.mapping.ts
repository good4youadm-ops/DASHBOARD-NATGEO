type OracleRow = Record<string, unknown>;

function str(v: unknown): string | null {
  return v != null && v !== '' ? String(v) : null;
}
function num(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}
function numNull(v: unknown): number | null {
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
function date(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export function mapStockPosition(row: OracleRow, tenantId: string, sourceName: string) {
  return {
    tenant_id: tenantId,
    source_system: sourceName,
    source_id: String(row['SOURCE_ID']),
    product_source_id: str(row['PRODUCT_SOURCE_ID']),
    warehouse: str(row['WAREHOUSE']) ?? 'CD_PRINCIPAL',
    location: str(row['LOCATION']),
    qty_available: num(row['QTY_AVAILABLE']),
    qty_reserved: num(row['QTY_RESERVED']),
    qty_blocked: num(row['QTY_BLOCKED']),
    qty_in_transit: num(row['QTY_IN_TRANSIT']),
    avg_cost: num(row['AVG_COST']),
    coverage_days: numNull(row['COVERAGE_DAYS']),
    abc_curve: str(row['ABC_CURVE']),
    ruptura: bool(row['RUPTURA']),
    position_date: date(row['POSITION_DATE']) ?? new Date().toISOString().slice(0, 10),
    synced_at: new Date().toISOString(),
  };
}

export function mapStockLot(row: OracleRow, tenantId: string, sourceName: string) {
  const statusMap: Record<string, string> = {
    'D': 'available', 'B': 'blocked', 'V': 'expired',
    'C': 'consumed', 'A': 'open_box',
  };
  return {
    tenant_id: tenantId,
    source_system: sourceName,
    source_id: String(row['SOURCE_ID']),
    product_source_id: str(row['PRODUCT_SOURCE_ID']),
    lot_number: String(row['LOT_NUMBER'] ?? ''),
    warehouse: str(row['WAREHOUSE']) ?? 'CD_PRINCIPAL',
    location: str(row['LOCATION']),
    manufacture_date: date(row['MANUFACTURE_DATE']),
    expiry_date: date(row['EXPIRY_DATE']),
    status: statusMap[String(row['STATUS'] ?? '').toUpperCase()] ?? 'available',
    is_open_box: bool(row['IS_OPEN_BOX']),
    units_per_box: int(row['UNITS_PER_BOX']),
    qty_initial: num(row['QTY_INITIAL']),
    qty_current: num(row['QTY_CURRENT']),
    qty_consumed: num(row['QTY_CONSUMED']),
    unit_cost: num(row['UNIT_COST']),
    fefo_compliant: bool(row['FEFO_COMPLIANT']),
    synced_at: new Date().toISOString(),
  };
}
