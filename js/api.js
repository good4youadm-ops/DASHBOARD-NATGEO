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

    stock: {
      movements: (p) => apiFetch('/api/stock/movements' + (p ? '?' + new URLSearchParams(p) : '')),
      move:      (b) => apiFetch('/api/stock/movements', { method: 'POST', body: JSON.stringify(b) }),
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
    },
  };

  global.DashboardAPI = DashboardAPI;
})(window);
