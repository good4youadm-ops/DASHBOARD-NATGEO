/**
 * sidebar.js — sidebar canônica única para todos os dashboards.
 * Injeta o HTML completo no elemento <aside class="sidebar"> de qualquer página.
 * A página ativa é detectada automaticamente pelo nome do arquivo na URL.
 */
(function () {
  var aside = document.querySelector('.sidebar');
  if (!aside) return;

  var page = location.pathname.split('/').pop().replace('.html', '') || 'dashboard-distribuidora';

  function sec(label) {
    return '<div class="sidebar-section">' + label + '</div>';
  }

  function lnk(href, icon, label) {
    var slug = href.replace('.html', '');
    var active = slug === page ? ' active' : '';
    return '<a class="nav-item' + active + '" href="' + href + '">' +
      '<i class="fa-solid ' + icon + '"></i><span>' + label + '</span></a>';
  }

  // Normaliza CSS do botão de logout para funcionar em todas as páginas
  var styleId = 'sidebarNormCSS';
  if (!document.getElementById(styleId)) {
    var st = document.createElement('style');
    st.id = styleId;
    st.textContent = '#logoutBtn.logout-btn{background:none;border:none;padding:4px;margin-left:auto;cursor:pointer;}';
    document.head.appendChild(st);
  }

  aside.innerHTML =
    '<div class="sidebar-logo">' +
      '<div class="logo-icon"><i class="fa-solid fa-leaf"></i></div>' +
      '<div class="logo-name">Nat<span>Geo</span></div>' +
    '</div>' +
    sec('Principal') +
    lnk('dashboard-distribuidora.html', 'fa-chart-line',      'Dashboard') +
    lnk('dashboard-comercial.html',     'fa-briefcase',        'Comercial') +
    lnk('financeiro.html',              'fa-chart-column',     'Financeiro') +
    lnk('estoque.html',                 'fa-boxes-stacked',    'Estoque') +
    sec('Operações') +
    lnk('pedidos.html',                 'fa-cart-shopping',    'Pedidos') +
    lnk('orcamentos.html',              'fa-file-invoice',     'Orçamentos') +
    lnk('fiscal.html',                  'fa-file-contract',    'Fiscal / NF-e') +
    lnk('metas.html',                   'fa-bullseye',         'Metas') +
    lnk('fluxo-caixa.html',             'fa-money-bill-transfer', 'Fluxo de Caixa') +
    lnk('logistica.html',               'fa-truck',            'Logística') +
    sec('Cadastros') +
    lnk('cadastros.html',               'fa-database',         'Cadastros') +
    lnk('lancamentos.html',             'fa-pen-to-square',    'Lançamentos') +
    sec('Relatórios') +
    lnk('estatistica-vendas.html',      'fa-chart-bar',        'Estatísticas') +
    '<div class="sidebar-footer">' +
      '<div class="avatar" id="userInitials">U</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="u-name" id="userName">Carregando…</div>' +
        '<div class="u-role">Usuário</div>' +
      '</div>' +
      '<button class="logout-btn" id="logoutBtn" title="Sair">' +
        '<i class="fa-solid fa-arrow-right-from-bracket"></i>' +
      '</button>' +
    '</div>';
})();
