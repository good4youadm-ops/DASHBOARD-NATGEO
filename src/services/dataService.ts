/**
 * @file dataService.ts
 * @description Camada centralizada de acesso a dados via fetch().
 *              Todos os repositórios devem usar este módulo — nunca chamadas diretas espalhadas.
 *
 * CORS: os arquivos JSON precisam ser servidos com o header:
 *   Access-Control-Allow-Origin: *
 * Isso é responsabilidade da empresa fornecedora dos dados.
 */

// ─── DATA SOURCES ─────────────────────────────────────────────────────────────
// TODO: substituir cada URL pelo link real fornecido pela empresa

export const DATA_SOURCES = {
  // ── Dashboard — Vendas (somente leitura) ──
  /** @see SalesSummaryRow */
  salesSummary:          'https://PLACEHOLDER/sales-summary.json',
  /** @see SalesByDayRow */
  salesByDay:            'https://PLACEHOLDER/sales-by-day.json',
  /** @see SalesByCustomerRow */
  salesByCustomer:       'https://PLACEHOLDER/sales-by-customer.json',
  /** @see SalesByProductRow */
  salesByProduct:        'https://PLACEHOLDER/sales-by-product.json',

  // ── Dashboard — Estoque (somente leitura) ──
  /** @see InventorySummaryRow */
  inventorySummary:      'https://PLACEHOLDER/inventory-summary.json',
  /** @see StockByProductRow */
  stockByProduct:        'https://PLACEHOLDER/stock-by-product.json',
  /** @see ExpiringLotRow */
  expiringLots:          'https://PLACEHOLDER/expiring-lots.json',

  // ── Dashboard — Financeiro (somente leitura) ──
  /** @see FinanceSummaryRow */
  financeSummary:        'https://PLACEHOLDER/finance-summary.json',

  // ── Financeiro — CRUD ──
  /** @see AccountReceivable */
  accountsReceivable:    'https://PLACEHOLDER/accounts-receivable.json',
  /** @see AccountPayable */
  accountsPayable:       'https://PLACEHOLDER/accounts-payable.json',
  /** @see FinancialCategory */
  financialCategories:   'https://PLACEHOLDER/financial-categories.json',
  /** @see BankAccount */
  bankAccounts:          'https://PLACEHOLDER/bank-accounts.json',
  /** @see Transaction */
  transactions:          'https://PLACEHOLDER/transactions.json',
  /** @see CashFlowRow */
  cashFlow:              'https://PLACEHOLDER/cash-flow.json',

  // ── Cadastros — CRUD ──
  /** @see Customer */
  customers:             'https://PLACEHOLDER/customers.json',
  /** @see Product */
  products:              'https://PLACEHOLDER/products.json',
  /** @see Category */
  categories:            'https://PLACEHOLDER/categories.json',
  /** @see Supplier */
  suppliers:             'https://PLACEHOLDER/suppliers.json',

  // ── Pedidos — CRUD ──
  /** @see SalesOrder */
  orders:                'https://PLACEHOLDER/orders.json',
  /** @see SalesOrderItem */
  orderItems:            'https://PLACEHOLDER/order-items.json',

  // ── Logística — CRUD ──
  /** @see Driver */
  drivers:               'https://PLACEHOLDER/drivers.json',
  /** @see Vehicle */
  vehicles:              'https://PLACEHOLDER/vehicles.json',
  /** @see DeliveryRoute */
  deliveryRoutes:        'https://PLACEHOLDER/delivery-routes.json',

  // ── Dados Mestre — CRUD ──
  /** @see Brand */
  brands:                'https://PLACEHOLDER/brands.json',
  /** @see PriceTable */
  priceTables:           'https://PLACEHOLDER/price-tables.json',
  /** @see PriceTableItem */
  priceTableItems:       'https://PLACEHOLDER/price-table-items.json',
  /** @see PaymentMethod */
  paymentMethods:        'https://PLACEHOLDER/payment-methods.json',
  /** @see SalesRep */
  salesReps:             'https://PLACEHOLDER/sales-reps.json',
  /** @see Carrier */
  carriers:              'https://PLACEHOLDER/carriers.json',
  /** @see CostCenter */
  costCenters:           'https://PLACEHOLDER/cost-centers.json',

  // ── Comercial — CRUD ──
  /** @see Quote */
  quotes:                'https://PLACEHOLDER/quotes.json',
  /** @see QuoteItem */
  quoteItems:            'https://PLACEHOLDER/quote-items.json',
  /** @see Return */
  returns:               'https://PLACEHOLDER/returns.json',
  /** @see Goal */
  goals:                 'https://PLACEHOLDER/goals.json',
  /** @see Commission */
  commissions:           'https://PLACEHOLDER/commissions.json',
  /** @see Campaign */
  campaigns:             'https://PLACEHOLDER/campaigns.json',
  /** @see GoalsVsActualRow */
  goalsVsActual:         'https://PLACEHOLDER/goals-vs-actual.json',
  /** @see SalesRepPerformanceRow */
  salesRepPerformance:   'https://PLACEHOLDER/sales-rep-performance.json',

  // ── Fiscal — CRUD ──
  /** @see Invoice */
  invoices:              'https://PLACEHOLDER/invoices.json',
  /** @see InvoiceItem */
  invoiceItems:          'https://PLACEHOLDER/invoice-items.json',
  /** @see FiscalConfig */
  fiscalConfig:          'https://PLACEHOLDER/fiscal-config.json',
  /** @see TaxRule */
  taxRules:              'https://PLACEHOLDER/tax-rules.json',

  // ── Estoque Estendido — CRUD ──
  /** @see CriticalStockRow */
  criticalStock:         'https://PLACEHOLDER/critical-stock.json',
  /** @see StockReservation */
  stockReservations:     'https://PLACEHOLDER/stock-reservations.json',
  /** @see InventoryCount */
  inventoryCounts:       'https://PLACEHOLDER/inventory-counts.json',
  /** @see InventoryCountItem */
  inventoryCountItems:   'https://PLACEHOLDER/inventory-count-items.json',
  /** @see ProductRankingRow */
  productRanking:        'https://PLACEHOLDER/product-ranking.json',

  // ── Integrações ──
  /** @see ImportJob */
  importJobs:            'https://PLACEHOLDER/import-jobs.json',
  /** @see WebhookLog */
  webhooksLog:           'https://PLACEHOLDER/webhooks-log.json',
  /** @see ApiKey */
  apiKeys:               'https://PLACEHOLDER/api-keys.json',

  // ── Sync ──
  /** @see SyncStatusRow */
  syncStatus:            'https://PLACEHOLDER/sync-status.json',
  /** @see SyncError */
  syncErrors:            'https://PLACEHOLDER/sync-errors.json',
} as const;

export type DataSourceKey = keyof typeof DATA_SOURCES;

// ─── CACHE ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

const _cache = new Map<string, CacheEntry>();

function _isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

export function invalidateCache(key?: DataSourceKey): void {
  if (key) {
    _cache.delete(key);
  } else {
    _cache.clear();
  }
}

// ─── IN-MEMORY STORE (para operações de escrita) ──────────────────────────────
// Inicializado com os dados do JSON externo na primeira leitura.
// Escritas persistem apenas em memória — resetam ao reiniciar o servidor.
// TODO: implementar persistência real quando a empresa fornecer um endpoint de escrita.

type AnyRecord = Record<string, unknown>;
const _stores = new Map<DataSourceKey, AnyRecord[]>();
const _storeLoading = new Map<DataSourceKey, Promise<AnyRecord[]>>();

async function _loadStore(key: DataSourceKey): Promise<AnyRecord[]> {
  if (_stores.has(key)) return _stores.get(key)!;

  // Evita múltiplas requisições simultâneas para o mesmo store
  if (_storeLoading.has(key)) return _storeLoading.get(key)!;

  const promise = fetchJSON<AnyRecord[]>(DATA_SOURCES[key]).then(data => {
    const arr = Array.isArray(data) ? data : [];
    _stores.set(key, arr);
    _storeLoading.delete(key);
    return arr;
  }).catch(err => {
    _storeLoading.delete(key);
    console.warn(`[dataService] Falha ao carregar store "${key}": ${err.message}. Iniciando com array vazio.`);
    _stores.set(key, []);
    return [] as AnyRecord[];
  });

  _storeLoading.set(key, promise);
  return promise;
}

// ─── FETCH HELPER ─────────────────────────────────────────────────────────────

/**
 * Busca JSON de uma URL com cache em memória.
 * @throws Error se a requisição falhar e não houver cache disponível.
 */
export async function fetchJSON<T>(url: string, cacheKey?: string): Promise<T> {
  if (cacheKey && _cache.has(cacheKey)) {
    const entry = _cache.get(cacheKey)!;
    if (_isCacheValid(entry)) {
      return entry.data as T;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[dataService] Erro de rede ao buscar "${url}": ${msg}`);
  }

  if (!res.ok) {
    throw new Error(`[dataService] HTTP ${res.status} ao buscar "${url}": ${res.statusText}`);
  }

  const data = (await res.json()) as T;

  if (cacheKey) _cache.set(cacheKey, { data, fetchedAt: Date.now() });

  return data;
}

// ─── API PÚBLICA DO STORE ─────────────────────────────────────────────────────

/**
 * Retorna todos os registros de uma entidade (com lazy-load do JSON externo).
 */
export async function storeGetAll(key: DataSourceKey): Promise<AnyRecord[]> {
  return _loadStore(key);
}

/**
 * Retorna um único registro por id.
 */
export async function storeGetById(key: DataSourceKey, id: string | number): Promise<AnyRecord | undefined> {
  const all = await _loadStore(key);
  return all.find(r => r['id'] === id || r['id'] === String(id) || r['id'] === Number(id));
}

/**
 * Insere um novo registro no store em memória.
 * O id deve ser fornecido pelo chamador (ex: crypto.randomUUID()).
 */
export async function storeInsert(key: DataSourceKey, record: AnyRecord): Promise<AnyRecord> {
  const all = await _loadStore(key);
  all.push(record);
  return record;
}

/**
 * Atualiza um registro existente por id (merge parcial).
 */
export async function storeUpdate(
  key: DataSourceKey,
  id: string | number,
  patch: AnyRecord,
): Promise<AnyRecord> {
  const all = await _loadStore(key);
  const idx = all.findIndex(r => r['id'] === id || r['id'] === String(id) || r['id'] === Number(id));
  if (idx === -1) throw new Error(`[dataService] Registro id="${id}" não encontrado em "${key}"`);
  all[idx] = { ...all[idx], ...patch };
  return all[idx];
}

/**
 * Remove um registro por id.
 */
export async function storeDelete(key: DataSourceKey, id: string | number): Promise<void> {
  const all = await _loadStore(key);
  const idx = all.findIndex(r => r['id'] === id || r['id'] === String(id) || r['id'] === Number(id));
  if (idx === -1) throw new Error(`[dataService] Registro id="${id}" não encontrado em "${key}"`);
  all.splice(idx, 1);
}

// ─── HELPERS DE FILTRAGEM / PAGINAÇÃO ─────────────────────────────────────────

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Aplica filtros simples, ordenação e paginação sobre um array de registros.
 */
export function applyPagination<T extends AnyRecord>(
  records: T[],
  opts: {
    page?: number;
    limit?: number;
    orderBy?: string;
    ascending?: boolean;
    filters?: Array<{ field: string; value: unknown; op?: 'eq' | 'ilike' | 'gte' | 'lte' }>;
  } = {},
): PaginationResult<T> {
  const { page = 1, limit = 50, orderBy, ascending = true, filters = [] } = opts;

  let result = [...records];

  for (const f of filters) {
    if (f.value === undefined || f.value === null || f.value === '') continue;
    const op = f.op ?? 'eq';
    result = result.filter(r => {
      const v = r[f.field];
      if (op === 'eq')    return v === f.value;
      if (op === 'ilike') return String(v ?? '').toLowerCase().includes(String(f.value).toLowerCase());
      if (op === 'gte')   return Number(v) >= Number(f.value);
      if (op === 'lte')   return Number(v) <= Number(f.value);
      return true;
    });
  }

  if (orderBy) {
    result.sort((a, b) => {
      const av = a[orderBy] ?? '';
      const bv = b[orderBy] ?? '';
      return ascending
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }

  const total = result.length;
  const from  = (page - 1) * limit;
  const data  = result.slice(from, from + limit);

  return { data, total, page, limit };
}
