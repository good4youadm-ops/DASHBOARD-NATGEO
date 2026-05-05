/**
 * NatGeoImport — modal de importação CSV / Excel para todos os dashboards.
 * Uso: NatGeoImport.open()
 * Injeta o modal no DOM na primeira chamada e remove ao fechar.
 */
(function (global) {
  'use strict';

  var MODAL_ID = 'natgeoImportModal';

  // ── CSS inline (injetado uma vez) ──────────────────────────────────────────
  var CSS = `
#natgeoImportModal { position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center; }
#natgeoImportModal .im-overlay { position:absolute;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px); }
#natgeoImportModal .im-box { position:relative;background:#fff;border-radius:16px;padding:28px 28px 24px;width:520px;max-width:95vw;box-shadow:0 24px 60px rgba(0,0,0,.18);animation:imIn .18s ease; }
@keyframes imIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
#natgeoImportModal .im-close { position:absolute;top:14px;right:14px;background:none;border:none;cursor:pointer;font-size:1rem;color:#888;line-height:1; }
#natgeoImportModal .im-close:hover { color:#111; }
#natgeoImportModal .im-title { font-size:1.05rem;font-weight:700;margin-bottom:4px;color:#1a1a1a; }
#natgeoImportModal .im-sub { font-size:.78rem;color:#888;margin-bottom:20px; }
#natgeoImportModal .im-drop { border:2px dashed #d0d0d0;border-radius:12px;padding:32px 20px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s; }
#natgeoImportModal .im-drop.over { border-color:#1a4731;background:#f0f9f4; }
#natgeoImportModal .im-drop i { font-size:2rem;color:#1a4731;margin-bottom:10px;display:block; }
#natgeoImportModal .im-drop p { font-size:.84rem;color:#555;margin:0; }
#natgeoImportModal .im-drop small { font-size:.72rem;color:#aaa; }
#natgeoImportModal .im-file-inp { display:none; }
#natgeoImportModal .im-preview { margin-top:16px;font-size:.8rem;color:#444;background:#f5f5f5;border-radius:8px;padding:10px 14px;display:none; }
#natgeoImportModal .im-preview b { color:#1a4731; }
#natgeoImportModal .im-opts { margin-top:16px;display:none; }
#natgeoImportModal .im-opts label { font-size:.8rem;color:#555;display:block;margin-bottom:6px;font-weight:600; }
#natgeoImportModal .im-opts select { width:100%;padding:8px 10px;border:1px solid #d8d8d8;border-radius:8px;font-size:.82rem;font-family:inherit;color:#222; }
#natgeoImportModal .im-actions { display:flex;gap:10px;margin-top:20px;justify-content:flex-end; }
#natgeoImportModal .im-btn { padding:9px 20px;border-radius:8px;border:none;font-size:.84rem;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s; }
#natgeoImportModal .im-btn-cancel { background:#f0f0f0;color:#555; }
#natgeoImportModal .im-btn-cancel:hover { background:#e4e4e4; }
#natgeoImportModal .im-btn-send { background:#1a4731;color:#fff; }
#natgeoImportModal .im-btn-send:hover { background:#153a27; }
#natgeoImportModal .im-btn-send:disabled { opacity:.45;cursor:default; }
#natgeoImportModal .im-msg { margin-top:12px;font-size:.78rem;border-radius:8px;padding:8px 12px;display:none; }
#natgeoImportModal .im-msg.ok  { background:#f0faf4;color:#1a4731;display:block; }
#natgeoImportModal .im-msg.err { background:#fff1f0;color:#a8071a;display:block; }
.btn-import { display:inline-flex;align-items:center;gap:6px;background:#f0f9f4;color:#1a4731;border:1px solid #c3e6d4;border-radius:8px;padding:6px 14px;font-size:.76rem;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s; }
.btn-import:hover { background:#d9f0e7; }
`;

  function injectCSS() {
    if (document.getElementById('natgeoImportCSS')) return;
    var s = document.createElement('style');
    s.id = 'natgeoImportCSS';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Templates HTML ─────────────────────────────────────────────────────────
  var MODULES = [
    { value: 'auto',        label: 'Detectar automaticamente' },
    { value: 'clientes',    label: 'Clientes (Cadastros)' },
    { value: 'produtos',    label: 'Produtos (Cadastros)' },
    { value: 'fornecedores',label: 'Fornecedores (Cadastros)' },
    { value: 'pedidos',     label: 'Pedidos de Venda' },
    { value: 'orcamentos',  label: 'Orçamentos' },
    { value: 'lancamentos', label: 'Lançamentos Financeiros' },
    { value: 'estoque',     label: 'Movimentos de Estoque' },
    { value: 'metas',       label: 'Metas por Vendedor' },
    { value: 'nfe',         label: 'NF-e (XML / Planilha)' },
  ];

  function buildModal() {
    var opts = MODULES.map(function (m) {
      return '<option value="' + m.value + '">' + m.label + '</option>';
    }).join('');

    var el = document.createElement('div');
    el.id = MODAL_ID;
    el.innerHTML =
      '<div class="im-overlay"></div>' +
      '<div class="im-box">' +
        '<button class="im-close" id="imClose" title="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '<div class="im-title"><i class="fa-solid fa-file-arrow-up" style="color:#1a4731;margin-right:6px"></i>Importar dados</div>' +
        '<div class="im-sub">Arraste um arquivo CSV ou Excel (.xlsx) ou clique para selecionar</div>' +
        '<div class="im-drop" id="imDrop">' +
          '<i class="fa-solid fa-cloud-arrow-up"></i>' +
          '<p><strong>Clique aqui</strong> ou arraste o arquivo</p>' +
          '<small>CSV, XLS ou XLSX · máx. 20 MB</small>' +
        '</div>' +
        '<input class="im-file-inp" id="imFileInp" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />' +
        '<div class="im-preview" id="imPreview"></div>' +
        '<div class="im-opts" id="imOpts">' +
          '<label>Tipo de dados a importar</label>' +
          '<select id="imModule">' + opts + '</select>' +
        '</div>' +
        '<div id="imMsg" class="im-msg"></div>' +
        '<div class="im-actions">' +
          '<button class="im-btn im-btn-cancel" id="imCancel">Cancelar</button>' +
          '<button class="im-btn im-btn-send" id="imSend" disabled>Importar</button>' +
        '</div>' +
      '</div>';
    return el;
  }

  // ── Lógica do modal ────────────────────────────────────────────────────────
  var _file = null;

  function open() {
    if (document.getElementById(MODAL_ID)) return;
    injectCSS();
    var modal = buildModal();
    document.body.appendChild(modal);
    _file = null;

    var drop    = document.getElementById('imDrop');
    var inp     = document.getElementById('imFileInp');
    var preview = document.getElementById('imPreview');
    var opts    = document.getElementById('imOpts');
    var msg     = document.getElementById('imMsg');
    var sendBtn = document.getElementById('imSend');

    function showFile(file) {
      _file = file;
      var size = (file.size / 1024).toFixed(1) + ' KB';
      if (file.size > 1024 * 1024) size = (file.size / 1024 / 1024).toFixed(1) + ' MB';
      preview.innerHTML = '<b>' + file.name + '</b> &nbsp;·&nbsp; ' + size;
      preview.style.display = 'block';
      opts.style.display = 'block';
      sendBtn.disabled = false;
      msg.className = 'im-msg';
      msg.textContent = '';
    }

    // drag & drop
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      drop.classList.remove('over');
      var f = e.dataTransfer.files[0];
      if (f) showFile(f);
    });

    // click to pick
    drop.addEventListener('click', function () { inp.click(); });
    inp.addEventListener('change', function () { if (inp.files[0]) showFile(inp.files[0]); });

    // send
    sendBtn.addEventListener('click', function () {
      if (!_file) return;
      sendBtn.disabled = true;
      sendBtn.textContent = 'Enviando…';
      msg.className = 'im-msg';

      var module = document.getElementById('imModule').value;
      var fd = new FormData();
      fd.append('file', _file);
      fd.append('module', module);

      var headers = {};
      if (global.__authToken) headers['Authorization'] = 'Bearer ' + global.__authToken;

      fetch('/api/import', { method: 'POST', headers: headers, body: fd })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Erro HTTP ' + r.status); });
          return r.json();
        })
        .then(function (data) {
          msg.className = 'im-msg ok';
          msg.textContent = '✓ ' + (data.message || (data.inserted + ' registros importados com sucesso!'));
          sendBtn.textContent = 'Importar';
          sendBtn.disabled = false;
        })
        .catch(function (e) {
          msg.className = 'im-msg err';
          msg.textContent = '✗ ' + e.message;
          sendBtn.textContent = 'Tentar novamente';
          sendBtn.disabled = false;
        });
    });

    // close
    function close() {
      var m = document.getElementById(MODAL_ID);
      if (m) m.remove();
      _file = null;
    }
    document.getElementById('imClose').addEventListener('click', close);
    document.getElementById('imCancel').addEventListener('click', close);
    modal.querySelector('.im-overlay').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }

  global.NatGeoImport = { open: open };
}(window));
