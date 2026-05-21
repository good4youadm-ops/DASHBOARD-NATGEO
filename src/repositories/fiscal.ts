import {
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
  applyPagination,
} from '../services/dataService';

/**
 * @file invoices.json      NF-e/NFS-e emitidas { id, tenant_id, invoice_number, series, order_id, customer_id, issue_date, status, total_value, tax_value, cfop, access_key }
 * @file invoice-items.json Itens de notas fiscais { id, tenant_id, invoice_id, product_id, qty, unit_price, total_price, cfop, ncm, tax_icms, tax_pis, tax_cofins }
 * @file fiscal-config.json Configuração fiscal do tenant { tenant_id, cnpj, ie, crt, nfe_series, nfe_sequence, certificate_expiry }
 * @file tax-rules.json     Regras fiscais por NCM { id, tenant_id, ncm, description, cst_icms, aliq_icms, cst_pis, aliq_pis, cst_cofins, aliq_cofins }
 */

export interface ListInvoicesParams {
  status?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listInvoices(p: ListInvoicesParams = {}) {
  const all = await storeGetAll('invoices');
  const filters = [
    { field: 'status',          value: p.status,     op: 'eq'    as const },
    { field: 'customer_id',     value: p.customerId, op: 'eq'    as const },
    { field: 'invoice_number',  value: p.search,     op: 'ilike' as const },
  ];
  return applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'issue_date', ascending: false, filters });
}

export async function getInvoice(id: string) {
  return storeGetById('invoices', id);
}

export async function createInvoice(payload: Record<string, unknown>) {
  return storeInsert('invoices', { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() });
}

export async function updateInvoice(id: string, payload: Record<string, unknown>) {
  return storeUpdate('invoices', id, payload);
}

export async function cancelInvoice(id: string) {
  return storeUpdate('invoices', id, { status: 'cancelled', cancelled_at: new Date().toISOString() });
}

export async function addInvoiceItem(invoiceId: string, payload: Record<string, unknown>) {
  return storeInsert('invoiceItems', { ...payload, id: crypto.randomUUID(), invoice_id: invoiceId });
}

export async function removeInvoiceItem(itemId: string) {
  return storeDelete('invoiceItems', itemId);
}

export async function getFiscalConfig() {
  const all = await storeGetAll('fiscalConfig');
  return all[0] ?? null;
}

export async function upsertFiscalConfig(payload: Record<string, unknown>) {
  const all = await storeGetAll('fiscalConfig');
  if (all.length > 0) {
    return storeUpdate('fiscalConfig', all[0]['id'] as string, payload);
  }
  return storeInsert('fiscalConfig', { ...payload, id: crypto.randomUUID() });
}

export async function listTaxRules(ncm?: string) {
  const all = await storeGetAll('taxRules');
  return ncm ? all.filter(r => String(r['ncm']).startsWith(ncm)) : all;
}

export async function createTaxRule(payload: Record<string, unknown>) {
  return storeInsert('taxRules', { ...payload, id: crypto.randomUUID() });
}

export async function updateTaxRule(id: string, payload: Record<string, unknown>) {
  return storeUpdate('taxRules', id, payload);
}

export async function deleteTaxRule(id: string) {
  return storeDelete('taxRules', id);
}
