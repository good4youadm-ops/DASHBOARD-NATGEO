type OracleRow = Record<string, unknown>;

function str(v: unknown): string | null {
  return v != null && v !== '' ? String(v) : null;
}
function num(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}
function bool(v: unknown): boolean {
  return String(v).toUpperCase() === 'S' || v === true || v === 1;
}
function docType(v: unknown): 'cpf' | 'cnpj' | 'outros' | null {
  const t = String(v ?? '').toUpperCase();
  if (t === 'J' || t === 'PJ') return 'cnpj';
  if (t === 'F' || t === 'PF') return 'cpf';
  return 'outros';
}

export function mapCustomer(row: OracleRow, tenantId: string, sourceName: string) {
  return {
    tenant_id: tenantId,
    source_system: sourceName,
    source_id: String(row['SOURCE_ID']),
    code: str(row['CODE']),
    name: String(row['NAME'] ?? ''),
    trade_name: str(row['TRADE_NAME']),
    document: str(row['DOCUMENT']),
    document_type: docType(row['DOCUMENT_TYPE']),
    email: str(row['EMAIL']),
    phone: str(row['PHONE']),
    address: {
      street: str(row['ADDRESS_STREET']),
      number: str(row['ADDRESS_NUMBER']),
      neighborhood: str(row['ADDRESS_NEIGHBORHOOD']),
      city: str(row['ADDRESS_CITY']),
      state: str(row['ADDRESS_STATE']),
      zip: str(row['ADDRESS_ZIP']),
    },
    segment: str(row['SEGMENT']),
    classification: str(row['CLASSIFICATION']),
    credit_limit: num(row['CREDIT_LIMIT']),
    payment_terms: str(row['PAYMENT_TERMS']),
    is_active: bool(row['IS_ACTIVE']),
    synced_at: new Date().toISOString(),
  };
}
