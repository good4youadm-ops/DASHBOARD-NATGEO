// HTTP client para chamar a API Express do backend

const BASE_URL = (typeof window !== 'undefined'
  ? window.__API_URL__
  : process.env.API_URL) ?? 'http://localhost:3001';

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} falhou (${res.status}): ${msg}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Dashboard — vendas
  salesSummary: (months?: number) =>
    get('/api/dashboard/sales/summary', months ? { months: String(months) } : undefined),
  salesByDay: () => get('/api/dashboard/sales/by-day'),
  topCustomers: (limit?: number) =>
    get('/api/dashboard/sales/customers', limit ? { limit: String(limit) } : undefined),
  topProducts: (limit?: number) =>
    get('/api/dashboard/sales/products', limit ? { limit: String(limit) } : undefined),

  // Dashboard — estoque
  inventorySummary: () => get('/api/dashboard/inventory/summary'),
  stockByProduct: (params?: { warehouse?: string; abcCurve?: string; alertOnly?: string }) =>
    get('/api/dashboard/inventory/products', params),
  expiringLots: (daysAhead?: number) =>
    get('/api/dashboard/inventory/expiring', daysAhead ? { daysAhead: String(daysAhead) } : undefined),

  // Dashboard — financeiro
  financeSummary: () => get('/api/dashboard/finance/summary'),
  accountsReceivable: (params?: { bucket?: string }) =>
    get('/api/dashboard/finance/receivable', params),
  accountsPayable: (params?: { bucket?: string; category?: string }) =>
    get('/api/dashboard/finance/payable', params),

  // Sync status
  syncStatus: () => get('/api/sync/status'),
  syncErrors: (limit?: number) =>
    get('/api/sync/errors', limit ? { limit: String(limit) } : undefined),
};

// Permite override da URL base via atributo data-api-url na tag <script>
declare global {
  interface Window {
    __API_URL__?: string;
  }
}
