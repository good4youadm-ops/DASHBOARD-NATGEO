import {
  fetchJSON, DATA_SOURCES,
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
  applyPagination,
} from '../services/dataService';

/**
 * @file quotes.json            Orçamentos  { id, tenant_id, quote_number, customer_id, status, total_value, valid_until, created_at }
 * @file quote-items.json       Itens de orçamentos { id, tenant_id, quote_id, product_id, qty, unit_price, total_price }
 * @file returns.json           Devoluções  { id, tenant_id, return_number, order_id, customer_id, status, reason, total_value, created_at }
 * @file goals.json             Metas       { id, tenant_id, year, month, sales_rep_id, target_revenue, target_orders }
 * @file commissions.json       Comissões   { id, tenant_id, year, month, sales_rep_id, revenue, commission_pct, commission_value, status }
 * @file campaigns.json         Campanhas   { id, tenant_id, name, status, start_date, end_date, discount_pct }
 * @file goals-vs-actual.json   Metas x real (somente leitura) { year, month, sales_rep_id, target_revenue, actual_revenue, achievement_pct }
 * @file sales-rep-performance.json  Performance representantes (somente leitura) { sales_rep_id, sales_rep_name, month, revenue, orders, avg_ticket }
 */

export interface ListQuotesParams { customerId?: string; status?: string; search?: string; page?: number; limit?: number }
export interface ListReturnsParams { customerId?: string; status?: string; page?: number; limit?: number }

// ── Orçamentos ─────────────────────────────────────────────────────────────────

export async function listQuotes(p: ListQuotesParams = {}) {
  const all = await storeGetAll('quotes');
  const filters = [
    { field: 'customer_id',   value: p.customerId, op: 'eq'    as const },
    { field: 'status',        value: p.status,     op: 'eq'    as const },
    { field: 'quote_number',  value: p.search,     op: 'ilike' as const },
  ];
  return applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'created_at', ascending: false, filters });
}
export async function getQuote(id: string)                       { return storeGetById('quotes', id); }
export async function createQuote(payload: Record<string, unknown>) {
  return storeInsert('quotes', { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() });
}
export async function updateQuote(id: string, payload: Record<string, unknown>) { return storeUpdate('quotes', id, payload); }
export async function deleteQuote(id: string)                    { return storeDelete('quotes', id); }
export async function addQuoteItem(quoteId: string, payload: Record<string, unknown>) {
  return storeInsert('quoteItems', { ...payload, id: crypto.randomUUID(), quote_id: quoteId });
}
export async function removeQuoteItem(itemId: string)            { return storeDelete('quoteItems', itemId); }

// ── Devoluções ─────────────────────────────────────────────────────────────────

export async function listReturns(p: ListReturnsParams = {}) {
  const all = await storeGetAll('returns');
  const filters = [
    { field: 'customer_id', value: p.customerId, op: 'eq' as const },
    { field: 'status',      value: p.status,     op: 'eq' as const },
  ];
  return applyPagination(all, { page: p.page, limit: p.limit, orderBy: 'created_at', ascending: false, filters });
}
export async function getReturn(id: string)                      { return storeGetById('returns', id); }
export async function createReturn(payload: Record<string, unknown>) {
  return storeInsert('returns', { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() });
}
export async function updateReturn(id: string, payload: Record<string, unknown>) { return storeUpdate('returns', id, payload); }

// ── Metas ──────────────────────────────────────────────────────────────────────

export async function listGoals(year: number, month?: number) {
  const all = await storeGetAll('goals');
  let result = all.filter(r => r['year'] === year);
  if (month !== undefined) result = result.filter(r => r['month'] === month);
  return result;
}
export async function upsertGoal(payload: Record<string, unknown>) {
  const id = payload['id'] as string | undefined;
  if (id) {
    try { return await storeUpdate('goals', id, payload); } catch { /* fall through */ }
  }
  return storeInsert('goals', { ...payload, id: id ?? crypto.randomUUID() });
}

// ── Comissões ──────────────────────────────────────────────────────────────────

export async function listCommissions(year: number, month?: number) {
  const all = await storeGetAll('commissions');
  let result = all.filter(r => r['year'] === year);
  if (month !== undefined) result = result.filter(r => r['month'] === month);
  return result;
}
export async function createCommission(payload: Record<string, unknown>) {
  return storeInsert('commissions', { ...payload, id: crypto.randomUUID() });
}
export async function updateCommission(id: string, payload: Record<string, unknown>) { return storeUpdate('commissions', id, payload); }

// ── Campanhas ──────────────────────────────────────────────────────────────────

export async function listCampaigns(status?: string) {
  const all = await storeGetAll('campaigns');
  return status ? all.filter(r => r['status'] === status) : all;
}
export async function createCampaign(payload: Record<string, unknown>) {
  return storeInsert('campaigns', { ...payload, id: crypto.randomUUID() });
}
export async function updateCampaign(id: string, payload: Record<string, unknown>) { return storeUpdate('campaigns', id, payload); }

// ── Views somente leitura ──────────────────────────────────────────────────────

export async function getGoalsVsActual(year: number, month?: number) {
  const data = await fetchJSON<Record<string, unknown>[]>(DATA_SOURCES.goalsVsActual, 'goalsVsActual');
  let result = data.filter(r => r['year'] === year);
  if (month !== undefined) result = result.filter(r => r['month'] === month);
  return result;
}

export async function getSalesRepPerformance(months = 6) {
  const data = await fetchJSON<Record<string, unknown>[]>(DATA_SOURCES.salesRepPerformance, 'salesRepPerformance');
  return data.slice(0, months * 10); // aprox. todos os reps para N meses
}
