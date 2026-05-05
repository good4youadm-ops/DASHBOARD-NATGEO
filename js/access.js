/**
 * access.js — controle de acesso por página.
 *
 * Regra:
 *  - Páginas abertas (OPEN_PAGES): qualquer usuário logado pode acessar.
 *  - Demais páginas: apenas o usuário master pode acessar.
 *
 * Para usuários comuns em página bloqueada:
 *  - Um overlay de tela cheia é exibido sobre o conteúdo principal.
 *  - A sidebar continua visível (usuário vê que está em módulo bloqueado).
 *  - O conteúdo da página fica inacessível (pointer-events: none).
 *  - Não há como contornar via URL direta — o overlay cobre tudo.
 *
 * Usuário master: ferrerjoao2206@gmail.com — acessa tudo normalmente.
 */
(function () {
  'use strict';

  var MASTER_EMAIL = 'ferrerjoao2206@gmail.com';
  var SESSION_KEY  = 'natgeo_auth';

  // Páginas abertas para todos os usuários autenticados
  var OPEN_PAGES = [
    'dashboard-distribuidora',
    'dashboard-comercial',
    'financeiro',
    'estoque',
    'login',
    'reset-password',
  ];

  var page = (location.pathname.split('/').pop() || '').replace('.html', '') || 'dashboard-distribuidora';

  // Página aberta — nada a fazer
  if (OPEN_PAGES.indexOf(page) !== -1) return;

  function isMaster() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      return !!(s && s.user && s.user.email === MASTER_EMAIL);
    } catch (e) { return false; }
  }

  // Usuário master — acesso liberado
  if (isMaster()) return;

  // ── Usuário comum em página bloqueada: exibe overlay ─────────────────────────
  function injectOverlay() {
    // Evita duplicar se já existir
    if (document.getElementById('natgeo-access-overlay')) return;

    var sidebarW = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w').trim() || '230px';

    var overlay = document.createElement('div');
    overlay.id = 'natgeo-access-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'top:0',
      'left:' + sidebarW,
      'right:0',
      'bottom:0',
      'z-index:9990',
      'background:#f5f5f7',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'flex-direction:column',
      'font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif',
    ].join(';');

    overlay.innerHTML = [
      '<div style="text-align:center;max-width:420px;padding:40px 24px;">',
        '<div style="',
          'width:72px;height:72px;border-radius:50%;',
          'background:#e8f4ee;',
          'display:flex;align-items:center;justify-content:center;',
          'margin:0 auto 24px;',
        '">',
          '<i class="fa-solid fa-lock" style="font-size:1.8rem;color:#1a4731;"></i>',
        '</div>',
        '<h2 style="font-size:1.25rem;font-weight:700;color:#1d1d1f;margin-bottom:8px;letter-spacing:-.3px;">',
          'Módulo em Desenvolvimento',
        '</h2>',
        '<p style="font-size:.9rem;color:#6e6e73;line-height:1.5;margin-bottom:6px;">',
          'Este módulo ainda não está disponível para usuários comuns.',
        '</p>',
        '<p style="font-size:.85rem;color:#aeaeb2;line-height:1.5;margin-bottom:32px;">',
          'Disponível em fase futura · Acesso liberado apenas para administrador',
        '</p>',
        '<a href="dashboard-distribuidora.html" style="',
          'display:inline-flex;align-items:center;gap:8px;',
          'background:#1a4731;color:#fff;',
          'font-size:.88rem;font-weight:600;',
          'padding:10px 22px;border-radius:8px;',
          'text-decoration:none;transition:background .15s;',
          'letter-spacing:-.2px;',
        '">',
          '<i class="fa-solid fa-arrow-left" style="font-size:.78rem;"></i>',
          'Voltar ao Dashboard',
        '</a>',
      '</div>',
    ].join('');

    // Impede interação com o conteúdo por trás
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);

    // Reposiciona caso a variável CSS não esteja disponível ainda
    document.addEventListener('DOMContentLoaded', function () {
      var sw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w').trim();
      if (sw) overlay.style.left = sw;
    });
  }

  // Injeta imediatamente se o DOM já estiver pronto, ou aguarda
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectOverlay);
  } else {
    injectOverlay();
  }

  // Segunda camada de proteção: bloqueia fetch/XHR da página restrita
  // (impede que scripts da página consultem APIs com dados sensíveis)
  var _fetch = window.fetch;
  window.fetch = function (url) {
    var u = String(url);
    // Permite apenas /api/config (para auth.js funcionar) e recursos estáticos
    if (u.indexOf('/api/') !== -1 && u.indexOf('/api/config') === -1) {
      return Promise.reject(new Error('Acesso bloqueado — módulo em desenvolvimento.'));
    }
    return _fetch.apply(this, arguments);
  };
})();
