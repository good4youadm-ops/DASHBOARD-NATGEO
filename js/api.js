/**
 * DashboardAPI — cliente HTTP para a API Express (http://localhost:3001)
 * Fallback automático para dados mock quando a API não está disponível.
 * Uso: await DashboardAPI.sales.summary()
 */
(function(global) {
  'use strict';

  // ── Configuração ────────────────────────────────────────────────────────────
  // Em produção (servido pelo Express) usa URL relativa — mesmo origin.
  // Localmente (file://) usa localhost:3001 para dev, mas mocks cobrem o caso.
  const BASE = global.__API_URL__ || (location.protocol === 'file:' ? 'http://localhost:3001' : '');
  const TIMEOUT_MS = 6000;

  // Em produção (fora do localhost) mocks são proibidos.
  // Dados fictícios em produção são mais perigosos que uma tela de erro.
  const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(location.hostname);

  // Estado global
  let _apiAvailable = null; // null = não testado ainda
  let _mockMode = false;

  // ── Utilidades ─────────────────────────────────────────────────────────────
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
  function today() { return new Date().toISOString().slice(0, 10); }

  // ── Fetch com timeout ───────────────────────────────────────────────────────
  async function apiFetch(path) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(BASE + path, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      clearTimeout(tid);
      throw e;
    }
  }

  async function safeGet(path, fallback) {
    try {
      const data = await apiFetch(path);
      _apiAvailable = true;
      _mockMode = false;
      return data;
    } catch (err) {
      _apiAvailable = false;
      // Mocks são permitidos apenas em ambiente local de desenvolvimento.
      // Em produção (domínio real), lança erro para que o dashboard mostre
      // uma falha real, não dados fictícios silenciosamente.
      if (!IS_LOCAL) {
        _mockMode = false;
        throw new Error('API indisponível. Verifique o servidor. (' + path + ')');
      }
      _mockMode = true;
      return typeof fallback === 'function' ? fallback() : fallback;
    }
  }

  // ── Banner de Mock Mode ─────────────────────────────────────────────────────
  function showMockBanner() {
    if (document.getElementById('__mockBanner')) return;
    const b = document.createElement('div');
    b.id = '__mockBanner';
    b.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;background:#ff9f0a;color:#fff;padding:8px 14px;border-radius:8px;font-size:.75rem;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.2);display:flex;align-items:center;gap:6px;cursor:pointer';
    b.innerHTML = '<i class="fa-solid fa-database"></i> Dados de demonstração — API offline';
    b.title = 'Configure a URL da API em .env e inicie o servidor com npm run api';
    b.onclick = () => b.remove();
    document.body.appendChild(b);
  }

  // ── Mocks ───────────────────────────────────────────────────────────────────

  function mockSalesSummary(n) {
    return Array.from({ length: n || 12 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const gross = 180000 + Math.random() * 120000;
      return {
        month: d.toISOString().slice(0, 7) + '-01',
        total_orders: Math.floor(200 + Math.random() * 150),
        unique_customers: Math.floor(80 + Math.random() * 60),
        gross_revenue: gross,
        net_revenue: gross * 0.95,
        total_discounts: gross * 0.05,
        total_freight: gross * 0.02,
        avg_ticket: gross / (200 + Math.random() * 150),
        delivered_orders: Math.floor(160 + Math.random() * 100),
        cancelled_orders: Math.floor(5 + Math.random() * 10),
        pending_orders: Math.floor(10 + Math.random() * 30),
      };
    });
  }

  function mockSalesByDay() {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      const cnt = Math.floor(8 + Math.random() * 20);
      const rev = cnt * (800 + Math.random() * 400);
      return { order_date: d.toISOString().slice(0, 10), orders_count: cnt, revenue: rev, avg_ticket: rev / cnt };
    }).reverse();
  }

  function mockTopCustomers(n) {
    const names = ['Supermercado Alpha Ltda','Bio Mercado Premium','Vida Verde Loja','Rest. Grão de Luz','FitShop Suplementos','Empório Natural','Mercado Orgânico','Lanchonete Verde','Saúde Total Com.','Verde Vida Distrib.'];
    const segs = ['Varejo','Atacado','Food Service','Indústria','Varejo Saudável'];
    return Array.from({ length: Math.min(n || 10, names.length) }, (_, i) => ({
      customer_name: names[i],
      customer_document: `12.${String(i+1).padStart(3,'0')}.000/0001-00`,
      abc_curve: i < 3 ? 'A' : i < 6 ? 'B' : 'C',
      segment: segs[i % segs.length],
      total_orders: Math.floor(20 + Math.random() * 80),
      total_revenue: 72400 - i * 5200 + Math.random() * 2000,
      avg_ticket: 1200 + Math.random() * 800,
      last_order_date: new Date(Date.now() - i * 86400000 * 3).toISOString().slice(0, 10),
    }));
  }

  function mockTopProducts(n) {
    const names = ['Tofu Orgânico 400g','Leite de Coco 200ml','Quinoa 500g','Açaí Congelado 400g','Granola Artesanal 1kg','Whey Vegano 900g','Azeite Extra Virgem 500ml','Chia Orgânica 200g','Kombucha 330ml','Proteína de Ervilha 1kg'];
    const cats = ['Proteínas Vegetais','Bebidas Naturais','Grãos e Cereais','Frutas','Grãos','Suplementos','Óleos e Gorduras','Grãos e Cereais','Bebidas Naturais','Suplementos'];
    return Array.from({ length: Math.min(n || 10, names.length) }, (_, i) => ({
      sku: `NGT-${String(i+1).padStart(3,'0')}`,
      product_name: names[i],
      category: cats[i],
      abc_curve: i < 3 ? 'A' : i < 6 ? 'B' : 'C',
      total_qty_sold: Math.floor(500 + Math.random() * 2000) - i * 80,
      total_revenue: 3840 - i * 230 + Math.random() * 200,
      avg_unit_price: 12 + Math.random() * 50,
    }));
  }

  function mockInventorySummary() {
    return [{
      warehouse: 'CD_PRINCIPAL',
      sku_count: 284,
      total_qty_available: 145320,
      total_inventory_value: 1850000,
      ruptura_count: 2,
      sku_a_count: 68,
      sku_b_count: 128,
      sku_c_count: 88,
      avg_coverage_days: 18.4,
    }];
  }

  function mockStockByProduct(n) {
    const names = ['Tofu Orgânico 400g','Leite de Coco 200ml','Quinoa 500g','Açaí Congelado 400g','Granola Artesanal 1kg','Whey Vegano 900g','Azeite Extra Virgem 500ml','Leite de Castanha 1L','Proteína de Ervilha 1kg','Chia Orgânica 200g','Iogurte Natural 170g','Kombucha 330ml'];
    const cats = ['Proteínas Vegetais','Bebidas Naturais','Grãos e Cereais','Frutas e Legumes','Grãos e Cereais','Suplementos','Óleos e Gorduras','Laticínios Naturais','Suplementos','Grãos e Cereais','Laticínios Naturais','Bebidas Naturais'];
    return Array.from({ length: Math.min(n || 12, names.length) }, (_, i) => {
      const qty = Math.floor([18,320,76,24,88,214,142,42,88,186,64,280][i] || 100);
      const minStock = [100,200,120,80,150,60,50,80,40,100,80,120][i];
      const alert = qty <= 0 ? 'sem_estoque' : qty <= minStock * 0.5 ? 'sem_estoque' : qty <= minStock ? 'estoque_minimo' : 'normal';
      return {
        sku: `NGT-${String(i+1).padStart(3,'0')}`,
        product_name: names[i],
        category: cats[i],
        abc_curve: i < 3 ? 'A' : i < 7 ? 'B' : 'C',
        warehouse: 'CD_PRINCIPAL',
        qty_available: qty,
        qty_reserved: Math.floor(Math.random() * 30),
        qty_blocked: Math.floor(Math.random() * 10),
        avg_cost: [12.40,4.80,22.50,18.90,28.00,84.00,32.00,11.60,92.00,8.40,6.20,9.80][i],
        total_cost: qty * [12.40,4.80,22.50,18.90,28.00,84.00,32.00,11.60,92.00,8.40,6.20,9.80][i],
        coverage_days: Math.floor(5 + Math.random() * 40),
        ruptura: qty <= minStock * 0.3,
        min_stock: minStock,
        stock_alert: alert,
        lot_number: `LOT-226${String(i+1).padStart(4,'0')}`,
        location: ['A1-P3','C1-P2','A2-P1','B2-F1','A3-P1','D1-P4','C2-P3','B1-F2','D2-P1','A1-P4','B3-F1','C3-P1'][i],
        expiry_date: new Date(Date.now() + (7 + i * 10) * 86400000).toISOString().slice(0, 10),
      };
    });
  }

  function mockExpiringLots() {
    const names = ['Leite de Castanha 1L','Açaí Congelado 400g','Iogurte Natural 170g','Quinoa 500g','Kombucha 330ml','Tofu Orgânico 400g'];
    return names.map((n, i) => {
      const days = [7, 19, 13, 34, 54, 72][i];
      return {
        sku: `NGT-${String(i+1).padStart(3,'0')}`,
        product_name: n,
        lot_number: `LOT-226030${i+2}`,
        expiry_date: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
        days_to_expiry: days,
        qty_current: Math.floor(20 + Math.random() * 100),
        total_cost: Math.floor(1000 + Math.random() * 4000),
        expiry_alert: days <= 7 ? 'critico' : days <= 30 ? 'urgente' : 'atencao',
      };
    });
  }

  function mockFinanceSummary() {
    return {
      ar_open_balance: 485320.50,
      ar_overdue_balance: 87450.00,
      ar_received_this_month: 320000.00,
      ar_due_next_30: 195000.00,
      ap_open_balance: 280150.75,
      ap_overdue_balance: 32000.00,
      ap_paid_this_month: 210000.00,
      ap_due_next_30: 145000.00,
      net_position: 205169.75,
    };
  }

  function mockReceivable() {
    const clis = ['Empório Integral Ltda','Saúde Total Com.','Bio Gourmet Eireli','Verde Vida Distrib.','Nutrição Pura SA','Colheita Orgânica ME','Bem Estar Alimentos','Terra Fértil Com.'];
    return clis.map((n, i) => {
      const dias = [48,62,35,91,27,73,18,44][i];
      return { customer_name: n, balance: [18400,14200,11800,9600,8200,6400,5100,4800][i], days_overdue: dias,
        aging_bucket: dias <= 15 ? 'atraso_1_15' : dias <= 30 ? 'atraso_16_30' : dias <= 60 ? 'atraso_31_60' : 'atraso_90_mais',
        status: 'overdue', due_date: new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10) };
    });
  }

  function mockPayable() {
    const names = ['BioFresh Alimentos SA','VeganProt Distrib.','NaturalBio Insumos','EcoGreen Embalagens','LogiBio Transportes','Imóveis SP Gestão','TechFarm Sistemas','Energia SP Ltda'];
    const vals = [142000,118000,96000,74000,68000,54000,38000,24000];
    return names.map((n, i) => ({ supplier_name: n, balance: vals[i], category: ['Fornecedor','Fornecedor','Fornecedor','Fornecedor','Serviço','Aluguel','TI/SaaS','Concessionária'][i], days_overdue: i < 4 ? 0 : i * 8 }));
  }

  function mockSyncStatus() {
    const entities = ['customers','products','sales_orders','stock_positions','accounts_receivable'];
    return {
      runs: entities.map((e, i) => ({
        id: String(i+1), entity_name: e,
        status: i === 3 ? 'partial' : i === 4 ? 'running' : 'success',
        started_at: new Date(Date.now() - (5-i) * 3600000).toISOString(),
        finished_at: i === 4 ? null : new Date(Date.now() - (5-i) * 3540000).toISOString(),
        rows_read: Math.floor(200 + Math.random() * 800),
        rows_inserted: Math.floor(10 + Math.random() * 50),
        rows_updated: Math.floor(100 + Math.random() * 200),
        rows_failed: i === 3 ? 3 : 0,
        error_message: i === 3 ? 'Timeout em 3 registros' : null,
      })),
      states: entities.map(e => ({
        entity_name: e,
        last_synced_at: new Date(Date.now() - 3600000).toISOString(),
        last_source_updated_at: new Date(Date.now() - 7200000).toISOString(),
      })),
    };
  }

  // ── API pública ─────────────────────────────────────────────────────────────
  const DashboardAPI = {
    fmt: fmt,
    fmtBRL: fmtBRL,
    fmtDate: fmtDate,
    isMockMode: () => _mockMode,

    health: async function() {
      try { await apiFetch('/health'); return true; } catch(_) { return false; }
    },

    sales: {
      summary: (months) => safeGet('/api/dashboard/sales/summary?months=' + (months||12), () => mockSalesSummary(months||12)),
      byDay:   ()       => safeGet('/api/dashboard/sales/by-day', mockSalesByDay),
      customers:(limit) => safeGet('/api/dashboard/sales/customers?limit=' + (limit||20), () => mockTopCustomers(limit||20)),
      products: (limit) => safeGet('/api/dashboard/sales/products?limit=' + (limit||20), () => mockTopProducts(limit||20)),
    },

    inventory: {
      summary:  ()      => safeGet('/api/dashboard/inventory/summary', mockInventorySummary),
      products: (p)     => safeGet('/api/dashboard/inventory/products' + (p ? '?' + new URLSearchParams(p) : ''), () => mockStockByProduct(30)),
      expiring: (days)  => safeGet('/api/dashboard/inventory/expiring?daysAhead=' + (days||90), mockExpiringLots),
    },

    finance: {
      summary:    () => safeGet('/api/dashboard/finance/summary', mockFinanceSummary),
      receivable: (p) => safeGet('/api/dashboard/finance/receivable' + (p ? '?' + new URLSearchParams(p) : ''), mockReceivable),
      payable:    (p) => safeGet('/api/dashboard/finance/payable' + (p ? '?' + new URLSearchParams(p) : ''), mockPayable),
    },

    sync: {
      status: () => safeGet('/api/sync/status', mockSyncStatus),
      errors: (n) => safeGet('/api/sync/errors?limit=' + (n||50), () => []),
    },

    // Mostra banner se API offline depois de qualquer chamada
    afterLoad: function() {
      if (_mockMode) showMockBanner();
    },
  };

  global.DashboardAPI = DashboardAPI;
})(window);
