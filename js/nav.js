/**
 * nav.js — helpers de navegação por querystring entre as 4 áreas principais.
 * Uso:
 *   NatGeoNav.getParam('filtro')          → lê ?filtro=critico
 *   NatGeoNav.navTo('estoque.html', { filtro: 'critico' })
 *   NatGeoNav.updateParam('status', 'vencido')  → atualiza URL sem reload
 *   NatGeoNav.applyFromURL(handlerMap)    → aplica filtros iniciais da URL
 */
var NatGeoNav = (function () {

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function navTo(url, params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    window.location.href = url + qs;
  }

  function updateParam(name, value) {
    var sp = new URLSearchParams(window.location.search);
    if (value === null || value === undefined || value === '') {
      sp.delete(name);
    } else {
      sp.set(name, value);
    }
    var newUrl = window.location.pathname + (sp.toString() ? '?' + sp.toString() : '');
    history.replaceState(null, '', newUrl);
  }

  /**
   * handlerMap: { paramName: function(value) }
   * Chama cada handler se o param correspondente existir na URL.
   */
  function applyFromURL(handlerMap) {
    var sp = new URLSearchParams(window.location.search);
    Object.keys(handlerMap).forEach(function (key) {
      var val = sp.get(key);
      if (val !== null) {
        handlerMap[key](val);
      }
    });
  }

  return { getParam: getParam, navTo: navTo, updateParam: updateParam, applyFromURL: applyFromURL };
})();
