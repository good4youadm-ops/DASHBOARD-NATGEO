type OracleRow = Record<string, unknown>;

function str(v: unknown): string | null {
  return v != null && v !== '' ? String(v) : null;
}
function num(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}
function date(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function arStatus(v: unknown): string {
  const map: Record<string, string> = {
    'A': 'open', 'P': 'paid', 'T': 'partial', 'V': 'overdue',
    'B': 'written_off', 'N': 'negotiating',
  };
  return map[String(v ?? '').toUpperCase()] ?? 'open';
}

function apStatus(v: unknown): string {
  const map: Record<string, string> = {
    'A': 'open', 'P': 'paid', 'T': 'partial', 'V': 'overdue', 'C': 'cancelled',
  };
  return map[String(v ?? '').toUpperCase()] ?? 'open';
}

export function mapAccountReceivable(row: OracleRow, tenantId: string, sourceName: string) {
  return {
    tenant_id: tenantId,
    source_system: sourceName,
    source_id: String(row['SOURCE_ID']),
    customer_source_id: str(row['CUSTOMER_SOURCE_ID']),
    invoice_source_id: str(row['INVOICE_SOURCE_ID']),
    document_number: str(row['DOCUMENT_NUMBER']),
    parcel: str(row['PARCEL']),
    issue_date: date(row['ISSUE_DATE'])!,
    due_date: date(row['DUE_DATE'])!,
    payment_date: date(row['PAYMENT_DATE']),
    status: arStatus(row['STATUS']),
    face_value: num(row['FACE_VALUE']),
    paid_amount: num(row['PAID_AMOUNT']),
    interest_amount: num(row['INTEREST_AMOUNT']),
    discount_amount: num(row['DISCOUNT_AMOUNT']),
    payment_method: str(row['PAYMENT_METHOD']),
    bank_account: str(row['BANK_ACCOUNT']),
    notes: str(row['NOTES']),
    synced_at: new Date().toISOString(),
  };
}

export function mapAccountPayable(row: OracleRow, tenantId: string, sourceName: string) {
  return {
    tenant_id: tenantId,
    source_system: sourceName,
    source_id: String(row['SOURCE_ID']),
    supplier_source_id: str(row['SUPPLIER_SOURCE_ID']),
    supplier_name: str(row['SUPPLIER_NAME']),
    supplier_document: str(row['SUPPLIER_DOCUMENT']),
    document_number: str(row['DOCUMENT_NUMBER']),
    parcel: str(row['PARCEL']),
    category: str(row['CATEGORY']),
    cost_center: str(row['COST_CENTER']),
    issue_date: date(row['ISSUE_DATE'])!,
    due_date: date(row['DUE_DATE'])!,
    payment_date: date(row['PAYMENT_DATE']),
    status: apStatus(row['STATUS']),
    face_value: num(row['FACE_VALUE']),
    paid_amount: num(row['PAID_AMOUNT']),
    interest_amount: num(row['INTEREST_AMOUNT']),
    discount_amount: num(row['DISCOUNT_AMOUNT']),
    payment_method: str(row['PAYMENT_METHOD']),
    bank_account: str(row['BANK_ACCOUNT']),
    notes: str(row['NOTES']),
    synced_at: new Date().toISOString(),
  };
}
