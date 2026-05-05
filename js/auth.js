/**
 * NatGeoAuth — gerenciamento de sessão para dashboards vanilla HTML
 * Depende apenas de localStorage; não usa supabase-js (o login.html usa via CDN).
 */
(function (global) {
  'use strict';

  var SESSION_KEY = 'natgeo_auth';
  var MASTER_EMAIL = 'ferrerjoao2206@gmail.com';

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.access_token || !s.expires_at) return null;
      // Considera expirado 60s antes para evitar race condition
      if (Date.now() / 1000 > s.expires_at - 60) return null;
      return s;
    } catch (e) { return null; }
  }

  function storeSession(session) {
    if (session && session.access_token) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
        expires_at:    session.expires_at,
        user:          session.user,
      }));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  // Tenta renovar o token via refresh_token (Supabase endpoint).
  async function tryRefresh(session) {
    if (!session || !session.refresh_token) return null;
    try {
      var cfg = await fetch('/api/config').then(function (r) { return r.json(); });
      if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
      var url = cfg.supabaseUrl + '/auth/v1/token?grant_type=refresh_token';
      var resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.supabaseAnonKey,
        },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (!resp.ok) return null;
      var data = await resp.json();
      if (!data.access_token) return null;
      var newSession = {
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
        user:          data.user,
      };
      storeSession(newSession);
      return newSession;
    } catch (e) { return null; }
  }

  // Popula nome/iniciais/logout na sidebar — aguarda sidebar estar pronta.
  function populateSidebarUser(session) {
    var user = session && session.user;
    if (!user) return;
    var name     = (user.user_metadata && user.user_metadata.full_name) || user.email || '';
    var email    = user.email || '';
    var initials = name.split(' ').slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase() || 'U';

    function fill() {
      var avatarEl  = document.getElementById('userInitials') || document.querySelector('.sidebar .avatar');
      var nameEl    = document.getElementById('userName')     || document.querySelector('.sidebar .u-name') || document.querySelector('.sidebar .user-name');
      var roleEl    = document.querySelector('.sidebar .u-role') || document.querySelector('.sidebar .user-role');
      var logoutBtn = document.getElementById('logoutBtn')    || document.querySelector('.logout-btn');
      if (avatarEl)  avatarEl.textContent  = initials;
      if (nameEl)    nameEl.textContent    = name || email;
      if (roleEl)    roleEl.textContent    = (user.user_metadata && user.user_metadata.role) || 'Usuário';
      if (logoutBtn) { logoutBtn.style.cursor = 'pointer'; logoutBtn.addEventListener('click', signOut); }
    }

    // sidebar.js dispara 'sidebarReady' depois de injetar o HTML.
    // Se já foi disparado (ou DOM já está pronto e o aside tem conteúdo), preenche direto.
    if (document.getElementById('userInitials')) {
      fill();
    } else {
      document.addEventListener('sidebarReady', fill, { once: true });
      // Fallback: se sidebarReady nunca chegar, tenta no DOMContentLoaded
      document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('userInitials')) fill();
      }, { once: true });
    }
  }

  // Chamado em cada dashboard para garantir autenticação.
  // Redireciona para login.html se não houver sessão válida.
  async function requireAuth() {
    var session = getSession();

    if (!session) {
      // Tenta refresh antes de redirecionar
      var raw = null;
      try {
        var r = localStorage.getItem(SESSION_KEY);
        raw = r ? JSON.parse(r) : null;
      } catch (e) {}

      if (raw && raw.refresh_token) {
        session = await tryRefresh(raw);
      }

      if (!session) {
        window.location.replace('login.html');
        return null;
      }
    }

    global.__authToken = session.access_token;
    populateSidebarUser(session);
    return session;
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    global.__authToken = null;
    window.location.replace('login.html');
  }

  // Verifica se o usuário logado é o master (acesso total)
  function isMaster() {
    var session = getSession();
    return !!(session && session.user && session.user.email === MASTER_EMAIL);
  }

  global.NatGeoAuth = { getSession, storeSession, requireAuth, signOut, isMaster, MASTER_EMAIL };
}(window));
