/**
 * sidebar.js — sidebar canônica única para todos os dashboards.
 * Injeta HTML, CSS e lógica mobile (hambúrguer + overlay) em todas as páginas.
 */
(function () {
  var MASTER_EMAIL = 'ferrerjoao2206@gmail.com';

  var OPEN_PAGES = [
    'dashboard-distribuidora',
    'dashboard-comercial',
    'financeiro',
    'estoque',
  ];

  function isCurrentUserMaster() {
    try {
      var raw = localStorage.getItem('natgeo_auth');
      if (!raw) return false;
      var s = JSON.parse(raw);
      return !!(s && s.user && s.user.email === MASTER_EMAIL);
    } catch (e) { return false; }
  }

  function run() {
    var aside = document.querySelector('.sidebar');
    if (!aside) return;

    var page = location.pathname.split('/').pop().replace('.html', '') || 'dashboard-distribuidora';
    var master = isCurrentUserMaster();

    function sec(label) {
      return '<div class="sidebar-section">' + label + '</div>';
    }

    function lnk(href, icon, label) {
      var slug = href.replace('.html', '');
      var active = slug === page ? ' active' : '';
      var isOpen = OPEN_PAGES.indexOf(slug) !== -1;

      if (!isOpen && !master) {
        return '<span class="nav-item nav-locked" title="Módulo em desenvolvimento — acesso liberado em fase futura">' +
          '<i class="fa-solid ' + icon + '"></i>' +
          '<span>' + label + '</span>' +
          '<i class="fa-solid fa-lock nav-lock-icon"></i>' +
          '</span>';
      }

      return '<a class="nav-item' + active + '" href="' + href + '">' +
        '<i class="fa-solid ' + icon + '"></i><span>' + label + '</span></a>';
    }

    /* ── CSS canônico injetado uma vez ── */
    var styleId = 'sidebarNormCSS';
    if (!document.getElementById(styleId)) {
      var st = document.createElement('style');
      st.id = styleId;
      st.textContent = [
        '.sidebar-logo{height:56px;display:flex!important;align-items:center!important;gap:10px!important;padding:0 20px!important;border-bottom:1px solid rgba(255,255,255,.1)!important;flex-shrink:0;}',
        '.logo-icon{width:32px!important;height:32px!important;border-radius:8px!important;background:rgba(255,255,255,.15)!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:.85rem!important;color:#fff!important;flex-shrink:0!important;}',
        '.logo-name{font-size:1rem!important;font-weight:700!important;letter-spacing:-.4px!important;color:#fff!important;}',
        '.logo-name span{color:#7BA05B!important;}',
        '.sidebar-footer{margin-top:auto!important;border-top:1px solid rgba(255,255,255,.1)!important;padding:14px 16px!important;display:flex!important;align-items:center!important;gap:10px!important;}',
        '.avatar{width:32px!important;height:32px!important;border-radius:50%!important;background:rgba(255,255,255,.2)!important;display:flex!important;align-items:center!important;justify-content:center!important;font-weight:600!important;font-size:.78rem!important;color:#fff!important;flex-shrink:0!important;}',
        '.u-name{font-size:.82rem!important;font-weight:600!important;color:#fff!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.u-role{font-size:.72rem!important;color:rgba(255,255,255,.55)!important;}',
        '#logoutBtn.logout-btn{background:none!important;border:none!important;padding:4px!important;margin-left:auto!important;color:rgba(255,255,255,.55)!important;cursor:pointer!important;font-size:.82rem!important;transition:color .15s;}',
        '.nav-locked{opacity:.38;cursor:not-allowed;pointer-events:none;user-select:none;}',
        '.nav-lock-icon{margin-left:auto;font-size:.6rem;opacity:.8;flex-shrink:0;}',
      ].join('');
      document.head.appendChild(st);
    }

    /* ── CSS responsivo (carrega arquivo uma vez) ── */
    var linkId = 'sidebarResponsiveCSS';
    if (!document.getElementById(linkId)) {
      var lk = document.createElement('link');
      lk.id = linkId; lk.rel = 'stylesheet';
      lk.href = '/css/responsive.css';
      document.head.appendChild(lk);
    }

    /* ── HTML da sidebar ── */
    aside.innerHTML =
      '<div class="sidebar-logo">' +
        '<div class="logo-icon"><i class="fa-solid fa-leaf"></i></div>' +
        '<div class="logo-name">Nat<span>Geo</span></div>' +
      '</div>' +
      sec('Principal') +
      lnk('dashboard-distribuidora.html', 'fa-chart-line',          'Dashboard') +
      lnk('dashboard-comercial.html',     'fa-briefcase',           'Comercial') +
      lnk('financeiro.html',              'fa-chart-column',        'Financeiro') +
      lnk('estoque.html',                 'fa-boxes-stacked',       'Estoque') +
      sec('Operações') +
      lnk('pedidos.html',                 'fa-cart-shopping',       'Pedidos') +
      lnk('orcamentos.html',              'fa-file-invoice',        'Orçamentos') +
      lnk('fiscal.html',                  'fa-file-contract',       'Fiscal / NF-e') +
      lnk('metas.html',                   'fa-bullseye',            'Metas') +
      lnk('fluxo-caixa.html',             'fa-money-bill-transfer', 'Fluxo de Caixa') +
      lnk('logistica.html',               'fa-truck',               'Logística') +
      sec('Cadastros') +
      lnk('cadastros.html',               'fa-database',            'Cadastros') +
      lnk('lancamentos.html',             'fa-pen-to-square',       'Lançamentos') +
      sec('Relatórios') +
      lnk('estatistica-vendas.html',      'fa-chart-bar',           'Estatísticas') +
      '<div class="sidebar-footer">' +
        '<div class="avatar" id="userInitials">U</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="u-name" id="userName">Carregando…</div>' +
          '<div class="u-role" id="userRole">Usuário</div>' +
        '</div>' +
        '<button class="logout-btn" id="logoutBtn" title="Sair">' +
          '<i class="fa-solid fa-arrow-right-from-bracket"></i>' +
        '</button>' +
      '</div>';

    /* ── Dados do usuário ── */
    try {
      var raw = localStorage.getItem('natgeo_auth');
      var s = raw ? JSON.parse(raw) : null;
      var u = s && s.user;
      if (u) {
        var fullName = (u.user_metadata && u.user_metadata.full_name) || u.email || '';
        var initials = fullName.split(' ').filter(Boolean).slice(0, 2)
                         .map(function (p) { return p[0]; }).join('').toUpperCase() || 'U';
        var avatarEl = document.getElementById('userInitials');
        var nameEl   = document.getElementById('userName');
        var roleEl   = document.getElementById('userRole');
        if (avatarEl) avatarEl.textContent = initials;
        if (nameEl)   nameEl.textContent   = fullName || u.email || '—';
        if (roleEl)   roleEl.textContent   = (u.user_metadata && u.user_metadata.role) || 'Administrador';
      }
    } catch (e) {}

    /* ── Mobile: hambúrguer + overlay ── */
    var overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebarOverlay';
      document.body.appendChild(overlay);
    }

    var topbar = document.querySelector('.topbar');
    if (topbar && !document.getElementById('sidebarToggle')) {
      var btn = document.createElement('button');
      btn.id = 'sidebarToggle';
      btn.setAttribute('aria-label', 'Abrir menu');
      btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      topbar.prepend(btn);
    }

    function openSidebar() {
      aside.classList.add('mob-open');
      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      aside.classList.remove('mob-open');
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    }

    var toggle = document.getElementById('sidebarToggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        aside.classList.contains('mob-open') ? closeSidebar() : openSidebar();
      });
    }

    overlay.addEventListener('click', closeSidebar);

    /* Fecha ao navegar (mobile) */
    var navItems = aside.querySelectorAll('a.nav-item');
    for (var i = 0; i < navItems.length; i++) {
      navItems[i].addEventListener('click', function () {
        if (window.innerWidth <= 640) closeSidebar();
      });
    }

    /* Fecha com ESC */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    document.dispatchEvent(new CustomEvent('sidebarReady'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
