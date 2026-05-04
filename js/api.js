/**
 * DashboardAPI — cliente HTTP para a API Express.
 * Sem fallback para mocks — erros reais são exibidos ao usuário.
 */
(function(global) {
  'use strict';

  const BASE = global.__API_URL__ || (location.protocol === 'file:' ? 'http://localhost:3001' : '');
  const TIMEOUT_MS = 8000;

  // ── Utilitários de formatação ─────────────────────────────────────────────
  function fmt(n, opts) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('pt-BR', opts || {});
  }
  function fmtBRL(n) {
    if (n == null || isNaN(n)) return '—';
    const v = Math.abs(Number(n));
    if (v >= 1e6) return 'R$ ' + (v / 1e6).toFixed(2).replace('.', ',') + 'M';
    if (v >= 1e3) return 'R$ ' + (v / 1e3).toFixed(0) + 'K';
    return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  // ── Fetch com timeout e auth ──────────────────────────────────────────────
  async function apiFetch(path, opts) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const headers = { 'Content-Type': 'application/json' };
    if (global.__authToken) headers['Authorization'] = 'Bearer ' + global.__authToken;
    try {
      const res = await fetch(BASE + path, {
        signal: ctrl.signal,
        ...opts,
        headers: { ...headers, ...(opts && opts.headers) },
      });
      clearTimeout(tid);
      if (res.status === 401) {
        localStorage.removeItem('natgeo_auth');
        global.__authToken = null;
        window.location.replace('login.html');
        throw new Error('Sessão expirada');
      }
      if (!res.ok) {
        let msg = 'Erro HTTP ' + res.status;
        try { const j = await res.json(); msg = j.error || j.message || msg; } catch (_) {}
        throw new Error(msg);
      }
      if (res.status === 204) return null;
      return await res.json();
    } catch (e) {
      clearTimeout(tid);
      if (e.name === 'AbortError') throw new Error('Timeout: servidor demorou mais de ' + (TIMEOUT_MS / 1000) + 's.');
      throw e;
    }
  }

  // ── API pública ───────────────────────────────────────────────────────────
  const DashboardAPI = {
    fmt,
    fmtBRL,
    fmtDate,

    health: () => apiFetch('/health'),

    sales: {
      summary:   (months) => apiFetch('/api/dashboard/sales/summary?months=' + (months || 12)),
      byDay:     ()       => apiFetch('/api/dashboard/sales/by-day'),
      customers: (limit)  => apiFetch('/api/dashboard/sales/customers?limit=' + (limit || 20)),
      products:  (limit)  => apiFetch('/api/dashboard/sales/products?limit=' + (limit || 20)),
    },

    inventory: {
      summary:  ()     => apiFetch('/api/dashboard/inventory/summary'),
      products: (p)    => apiFetch('/api/dashboard/inventory/products' + (p ? '?' + new URLSearchParams(p) : '')),
      expiring: (days) => apiFetch('/api/dashboard/inventory/expiring?daysAhead=' + (days || 90)),
    },

    finance: {
      summary:    ()  => apiFetch('/api/dashboard/finance/summary'),
      receivable: (p) => apiFetch('/api/dashboard/finance/receivable' + (p ? '?' + new URLSearchParams(p) : '')),
      payable:    (p) => apiFetch('/api/dashboard/finance/payable' + (p ? '?' + new URLSearchParams(p) : '')),
    },

    sync: {
      status: ()  => apiFetch('/api/sync/status'),
      errors: (n) => apiFetch('/api/sync/errors?limit=' + (n || 50)),
    },

    customers: {
      list:   (p)     => apiFetch('/api/customers' + (p ? '?' + new URLSearchParams(p) : '')),
      get:    (id)    => apiFetch('/api/customers/' + id),
      create: (b)     => apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/customers/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/customers/' + id, { method: 'DELETE' }),
    },

    products: {
      list:       (p)     => apiFetch('/api/products' + (p ? '?' + new URLSearchParams(p) : '')),
      get:        (id)    => apiFetch('/api/products/' + id),
      create:     (b)     => apiFetch('/api/products', { method: 'POST', body: JSON.stringify(b) }),
      update:     (id, b) => apiFetch('/api/products/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete:     (id)    => apiFetch('/api/products/' + id, { method: 'DELETE' }),
      categories: ()      => apiFetch('/api/products/categories'),
    },

    suppliers: {
      list:   (p)     => apiFetch('/api/suppliers' + (p ? '?' + new URLSearchParams(p) : '')),
      get:    (id)    => apiFetch('/api/suppliers/' + id),
      create: (b)     => apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/suppliers/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/suppliers/' + id, { method: 'DELETE' }),
    },

    orders: {
      list:       (p)          => apiFetch('/api/orders' + (p ? '?' + new URLSearchParams(p) : '')),
      get:        (id)         => apiFetch('/api/orders/' + id),
      create:     (b)          => apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(b) }),
      update:     (id, b)      => apiFetch('/api/orders/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete:     (id)         => apiFetch('/api/orders/' + id, { method: 'DELETE' }),
      items:      (id)         => apiFetch('/api/orders/' + id + '/items'),
      addItem:    (id, b)      => apiFetch('/api/orders/' + id + '/items', { method: 'POST', body: JSON.stringify(b) }),
      removeItem: (id, itemId) => apiFetch('/api/orders/' + id + '/items/' + itemId, { method: 'DELETE' }),
    },

    receivable: {
      list:   (p)     => apiFetch('/api/receivable' + (p ? '?' + new URLSearchParams(p) : '')),
      get:    (id)    => apiFetch('/api/receivable/' + id),
      create: (b)     => apiFetch('/api/receivable', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/receivable/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/receivable/' + id, { method: 'DELETE' }),
    },

    payable: {
      list:       (p)     => apiFetch('/api/payable' + (p ? '?' + new URLSearchParams(p) : '')),
      get:        (id)    => apiFetch('/api/payable/' + id),
      create:     (b)     => apiFetch('/api/payable', { method: 'POST', body: JSON.stringify(b) }),
      update:     (id, b) => apiFetch('/api/payable/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete:     (id)    => apiFetch('/api/payable/' + id, { method: 'DELETE' }),
      categories: ()      => apiFetch('/api/payable/categories'),
    },

    logistics: {
      drivers:  {
        list:   (p)     => apiFetch('/api/drivers' + (p ? '?' + new URLSearchParams(p) : '')),
        create: (b)     => apiFetch('/api/drivers', { method: 'POST', body: JSON.stringify(b) }),
        update: (id, b) => apiFetch('/api/drivers/' + id, { method: 'PUT', body: JSON.stringify(b) }),
        delete: (id)    => apiFetch('/api/drivers/' + id, { method: 'DELETE' }),
      },
      vehicles: {
        list:   (p)     => apiFetch('/api/vehicles' + (p ? '?' + new URLSearchParams(p) : '')),
        create: (b)     => apiFetch('/api/vehicles', { method: 'POST', body: JSON.stringify(b) }),
        update: (id, b) => apiFetch('/api/vehicles/' + id, { method: 'PUT', body: JSON.stringify(b) }),
        delete: (id)    => apiFetch('/api/vehicles/' + id, { method: 'DELETE' }),
      },
      routes: {
        list:   (p)     => apiFetch('/api/routes' + (p ? '?' + new URLSearchParams(p) : '')),
        create: (b)     => apiFetch('/api/routes', { method: 'POST', body: JSON.stringify(b) }),
        update: (id, b) => apiFetch('/api/routes/' + id, { method: 'PUT', body: JSON.stringify(b) }),
        delete: (id)    => apiFetch('/api/routes/' + id, { method: 'DELETE' }),
      },
      deliveries: {
        list:        (p)     => apiFetch('/api/deliveries' + (p ? '?' + new URLSearchParams(p) : '')),
        get:         (id)    => apiFetch('/api/deliveries/' + id),
        create:      (b)     => apiFetch('/api/deliveries', { method: 'POST', body: JSON.stringify(b) }),
        update:      (id, b) => apiFetch('/api/deliveries/' + id, { method: 'PUT', body: JSON.stringify(b) }),
        addEvent:    (id, b) => apiFetch('/api/deliveries/' + id + '/events', { method: 'POST', body: JSON.stringify(b) }),
      },
    },

    // ── Dados Mestres ─────────────────────────────────────────────────────────
    brands: {
      list:   (p)     => apiFetch('/api/brands' + (p ? '?' + new URLSearchParams(p) : '')),
      create: (b)     => apiFetch('/api/brands', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/brands/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/brands/' + id, { method: 'DELETE' }),
    },

    categories: {
      list:   (p)     => apiFetch('/api/categories' + (p ? '?' + new URLSearchParams(p) : '')),
      create: (b)     => apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/categories/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/categories/' + id, { method: 'DELETE' }),
    },

    paymentMethods: {
      list:   (p)     => apiFetch('/api/payment-methods' + (p ? '?' + new URLSearchParams(p) : '')),
      create: (b)     => apiFetch('/api/payment-methods', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/payment-methods/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/payment-methods/' + id, { method: 'DELETE' }),
    },

    salesReps: {
      list:        (p)     => apiFetch('/api/sales-reps' + (p ? '?' + new URLSearchParams(p) : '')),
      create:      (b)     => apiFetch('/api/sales-reps', { method: 'POST', body: JSON.stringify(b) }),
      update:      (id, b) => apiFetch('/api/sales-reps/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete:      (id)    => apiFetch('/api/sales-reps/' + id, { method: 'DELETE' }),
      performance: (p)     => apiFetch('/api/sales-reps/performance' + (p ? '?' + new URLSearchParams(p) : '')),
    },

    carriers: {
      list:   (p)     => apiFetch('/api/carriers' + (p ? '?' + new URLSearchParams(p) : '')),
      create: (b)     => apiFetch('/api/carriers', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/carriers/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/carriers/' + id, { method: 'DELETE' }),
    },

    costCenters: {
      list:   (p)     => apiFetch('/api/cost-centers' + (p ? '?' + new URLSearchParams(p) : '')),
      create: (b)     => apiFetch('/api/cost-centers', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/cost-centers/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/cost-centers/' + id, { method: 'DELETE' }),
    },

    // ── Módulo Comercial ──────────────────────────────────────────────────────
    quotes: {
      list:       (p)          => apiFetch('/api/quotes' + (p ? '?' + new URLSearchParams(p) : '')),
      get:        (id)         => apiFetch('/api/quotes/' + id),
      create:     (b)          => apiFetch('/api/quotes', { method: 'POST', body: JSON.stringify(b) }),
      update:     (id, b)      => apiFetch('/api/quotes/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete:     (id)         => apiFetch('/api/quotes/' + id, { method: 'DELETE' }),
      addItem:    (id, b)      => apiFetch('/api/quotes/' + id + '/items', { method: 'POST', body: JSON.stringify(b) }),
      removeItem: (id, itemId) => apiFetch('/api/quotes/' + id + '/items/' + itemId, { method: 'DELETE' }),
    },

    goals: {
      list:      (p) => apiFetch('/api/goals' + (p ? '?' + new URLSearchParams(p) : '')),
      upsert:    (b) => apiFetch('/api/goals', { method: 'POST', body: JSON.stringify(b) }),
      vsActual:  (p) => apiFetch('/api/goals/vs-actual' + (p ? '?' + new URLSearchParams(p) : '')),
    },

    commissions: {
      list:   (p)     => apiFetch('/api/commissions' + (p ? '?' + new URLSearchParams(p) : '')),
      create: (b)     => apiFetch('/api/commissions', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/commissions/' + id, { method: 'PUT', body: JSON.stringify(b) }),
    },

    returns: {
      list:    (p)     => apiFetch('/api/returns' + (p ? '?' + new URLSearchParams(p) : '')),
      get:     (id)    => apiFetch('/api/returns/' + id),
      create:  (b)     => apiFetch('/api/returns', { method: 'POST', body: JSON.stringify(b) }),
      update:  (id, b) => apiFetch('/api/returns/' + id, { method: 'PUT', body: JSON.stringify(b) }),
    },

    campaigns: {
      list:   (p)     => apiFetch('/api/campaigns' + (p ? '?' + new URLSearchParams(p) : '')),
      get:    (id)    => apiFetch('/api/campaigns/' + id),
      create: (b)     => apiFetch('/api/campaigns', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/campaigns/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/campaigns/' + id, { method: 'DELETE' }),
    },

    // ── Módulo Financeiro Estendido ───────────────────────────────────────────
    bankAccounts: {
      list:   (p)     => apiFetch('/api/bank-accounts' + (p ? '?' + new URLSearchParams(p) : '')),
      get:    (id)    => apiFetch('/api/bank-accounts/' + id),
      create: (b)     => apiFetch('/api/bank-accounts', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/bank-accounts/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/bank-accounts/' + id, { method: 'DELETE' }),
    },

    transactions: {
      list:   (p)     => apiFetch('/api/transactions' + (p ? '?' + new URLSearchParams(p) : '')),
      get:    (id)    => apiFetch('/api/transactions/' + id),
      create: (b)     => apiFetch('/api/transactions', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/transactions/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/transactions/' + id, { method: 'DELETE' }),
      cashFlow: (p)   => apiFetch('/api/cash-flow' + (p ? '?' + new URLSearchParams(p) : '')),
    },

    financialCategories: {
      list:   (p)     => apiFetch('/api/financial-categories' + (p ? '?' + new URLSearchParams(p) : '')),
      create: (b)     => apiFetch('/api/financial-categories', { method: 'POST', body: JSON.stringify(b) }),
      update: (id, b) => apiFetch('/api/financial-categories/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      delete: (id)    => apiFetch('/api/financial-categories/' + id, { method: 'DELETE' }),
    },

    // ── Módulo Fiscal ─────────────────────────────────────────────────────────
    invoices: {
      list:       (p)          => apiFetch('/api/invoices' + (p ? '?' + new URLSearchParams(p) : '')),
      get:        (id)         => apiFetch('/api/invoices/' + id),
      create:     (b)          => apiFetch('/api/invoices', { method: 'POST', body: JSON.stringify(b) }),
      update:     (id, b)      => apiFetch('/api/invoices/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      cancel:     (id)         => apiFetch('/api/invoices/' + id + '/cancel', { method: 'POST' }),
      addItem:    (id, b)      => apiFetch('/api/invoices/' + id + '/items', { method: 'POST', body: JSON.stringify(b) }),
      removeItem: (id, itemId) => apiFetch('/api/invoices/' + id + '/items/' + itemId, { method: 'DELETE' }),
    },

    fiscal: {
      getConfig:    ()  => apiFetch('/api/fiscal/config'),
      saveConfig:   (b) => apiFetch('/api/fiscal/config', { method: 'PUT', body: JSON.stringify(b) }),
      taxRules:     (p) => apiFetch('/api/fiscal/tax-rules' + (p ? '?' + new URLSearchParams(p) : '')),
      createTaxRule:(b) => apiFetch('/api/fiscal/tax-rules', { method: 'POST', body: JSON.stringify(b) }),
      updateTaxRule:(id, b) => apiFetch('/api/fiscal/tax-rules/' + id, { method: 'PUT', body: JSON.stringify(b) }),
      deleteTaxRule:(id)    => apiFetch('/api/fiscal/tax-rules/' + id, { method: 'DELETE' }),
    },

    // ── Módulo Estoque Estendido ──────────────────────────────────────────────
    stock: {
      movements:   (p) => apiFetch('/api/stock/movements' + (p ? '?' + new URLSearchParams(p) : '')),
      move:        (b) => apiFetch('/api/stock/movements', { method: 'POST', body: JSON.stringify(b) }),
      critical:    (p) => apiFetch('/api/stock/critical' + (p ? '?' + new URLSearchParams(p) : '')),
      ranking:     (p) => apiFetch('/api/stock/product-ranking' + (p ? '?' + new URLSearchParams(p) : '')),
      reservations: {
        list:    (p)     => apiFetch('/api/stock/reservations' + (p ? '?' + new URLSearchParams(p) : '')),
        create:  (b)     => apiFetch('/api/stock/reservations', { method: 'POST', body: JSON.stringify(b) }),
        release: (id)    => apiFetch('/api/stock/reservations/' + id + '/release', { method: 'POST' }),
      },
      counts: {
        list:      (p)         => apiFetch('/api/inventory-counts' + (p ? '?' + new URLSearchParams(p) : '')),
        get:       (id)        => apiFetch('/api/inventory-counts/' + id),
        create:    (b)         => apiFetch('/api/inventory-counts', { method: 'POST', body: JSON.stringify(b) }),
        update:    (id, b)     => apiFetch('/api/inventory-counts/' + id, { method: 'PUT', body: JSON.stringify(b) }),
        upsertItem:(id, b)     => apiFetch('/api/inventory-counts/' + id + '/items', { method: 'POST', body: JSON.stringify(b) }),
      },
    },

    // ── Integrações ───────────────────────────────────────────────────────────
    imports: {
      list:   (p) => apiFetch('/api/import-jobs' + (p ? '?' + new URLSearchParams(p) : '')),
      get:    (id) => apiFetch('/api/import-jobs/' + id),
      csv:    (entity, b) => apiFetch('/api/import/csv?entity=' + entity, { method: 'POST', body: JSON.stringify(b) }),
    },

    webhooks: {
      list: (p) => apiFetch('/api/webhooks' + (p ? '?' + new URLSearchParams(p) : '')),
    },

    apiKeys: {
      list:   ()        => apiFetch('/api/api-keys'),
      create: (b)       => apiFetch('/api/api-keys', { method: 'POST', body: JSON.stringify(b) }),
      revoke: (id)      => apiFetch('/api/api-keys/' + id + '/revoke', { method: 'POST' }),
    },

    // ── BI / Analytics ────────────────────────────────────────────────────────
    bi: {
      dailyKpis:       (p) => apiFetch('/api/bi/daily-kpis' + (p ? '?' + new URLSearchParams(p) : '')),
      customerRanking: (p) => apiFetch('/api/bi/customer-ranking' + (p ? '?' + new URLSearchParams(p) : '')),
      arAging:         ()  => apiFetch('/api/bi/ar-aging'),
      goalsVsActual:   (p) => apiFetch('/api/goals/vs-actual' + (p ? '?' + new URLSearchParams(p) : '')),
      productRanking:  (p) => apiFetch('/api/stock/product-ranking' + (p ? '?' + new URLSearchParams(p) : '')),
      salesRepPerf:    (p) => apiFetch('/api/sales-reps/performance' + (p ? '?' + new URLSearchParams(p) : '')),
      cashFlow:        (p) => apiFetch('/api/cash-flow' + (p ? '?' + new URLSearchParams(p) : '')),
    },
  };

  global.DashboardAPI = DashboardAPI;
})(window);
