/**
 * NatGeoImport — modal de importação estilo Bling (3 passos).
 * Fluxo: Arquivo → Mapeamento de colunas → Confirmar
 * Uso: NatGeoImport.open()
 */
(function (global) {
  'use strict';

  var MODAL_ID = 'natgeoImportModal';

  var MODULE_MAP = {
    clientes:     'customers',
    produtos:     'products',
    fornecedores: 'suppliers',
    pedidos:      'orders',
    lancamentos:  'receivable',
  };

  var MODULES = [
    { value: 'clientes',     label: 'Clientes' },
    { value: 'produtos',     label: 'Produtos' },
    { value: 'fornecedores', label: 'Fornecedores' },
    { value: 'pedidos',      label: 'Pedidos de Venda' },
    { value: 'lancamentos',  label: 'Lançamentos Financeiros' },
  ];

  var ENTITY_FIELDS = {
    customers: [
      { key: 'nome',     label: 'Nome / Razão Social', required: true  },
      { key: 'cpf_cnpj', label: 'CPF / CNPJ',          required: true  },
      { key: 'email',    label: 'E-mail',               required: false },
      { key: 'telefone', label: 'Telefone',             required: false },
      { key: 'endereco', label: 'Endereço',             required: false },
      { key: 'cidade',   label: 'Cidade',               required: false },
      { key: 'estado',   label: 'UF',                   required: false },
      { key: 'cep',      label: 'CEP',                  required: false },
    ],
    products: [
      { key: 'codigo',    label: 'Código',         required: true  },
      { key: 'descricao', label: 'Descrição',      required: true  },
      { key: 'preco',     label: 'Preço Unitário', required: false },
      { key: 'unidade',   label: 'Unidade',        required: false },
      { key: 'categoria', label: 'Categoria',      required: false },
      { key: 'estoque',   label: 'Estoque Atual',  required: false },
      { key: 'ncm',       label: 'NCM',            required: false },
    ],
    suppliers: [
      { key: 'nome',     label: 'Nome / Razão Social', required: true  },
      { key: 'cpf_cnpj', label: 'CPF / CNPJ',          required: false },
      { key: 'email',    label: 'E-mail',               required: false },
      { key: 'telefone', label: 'Telefone',             required: false },
      { key: 'cidade',   label: 'Cidade',               required: false },
      { key: 'estado',   label: 'UF',                   required: false },
    ],
    orders: [
      { key: 'numero',   label: 'Nº do Pedido', required: true  },
      { key: 'data',     label: 'Data',         required: true  },
      { key: 'cliente',  label: 'Cliente',      required: true  },
      { key: 'total',    label: 'Valor Total',  required: true  },
      { key: 'status',   label: 'Status',       required: false },
      { key: 'vendedor', label: 'Vendedor',     required: false },
    ],
    receivable: [
      { key: 'descricao',  label: 'Descrição',  required: true  },
      { key: 'valor',      label: 'Valor',      required: true  },
      { key: 'vencimento', label: 'Vencimento', required: true  },
      { key: 'cliente',    label: 'Cliente',    required: false },
      { key: 'categoria',  label: 'Categoria',  required: false },
      { key: 'status',     label: 'Status',     required: false },
    ],
  };

  // ── CSS ─────────────────────────────────────────────────────────────────────
  var CSS = [
    '#natgeoImportModal{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center}',
    '#natgeoImportModal .im-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px)}',
    '#natgeoImportModal .im-box{position:relative;background:#fff;border-radius:16px;padding:28px 28px 24px;width:660px;max-width:96vw;max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.18);animation:imIn .18s ease}',
    '@keyframes imIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}',
    '#natgeoImportModal .im-close{position:absolute;top:14px;right:14px;background:none;border:none;cursor:pointer;font-size:1rem;color:#888;line-height:1}',
    '#natgeoImportModal .im-close:hover{color:#111}',
    '#natgeoImportModal .im-steps{display:flex;align-items:center;margin-bottom:22px}',
    '#natgeoImportModal .im-step{display:flex;align-items:center;gap:7px;font-size:.74rem;color:#b0b0b0;font-weight:600;white-space:nowrap}',
    '#natgeoImportModal .im-step-num{width:24px;height:24px;border-radius:50%;border:2px solid #d5d5d5;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#b0b0b0;background:#fff;flex-shrink:0;transition:all .2s}',
    '#natgeoImportModal .im-step.active{color:#1a4731}',
    '#natgeoImportModal .im-step.active .im-step-num{border-color:#1a4731;color:#1a4731}',
    '#natgeoImportModal .im-step.done{color:#555}',
    '#natgeoImportModal .im-step.done .im-step-num{border-color:#1a4731;background:#1a4731;color:#fff}',
    '#natgeoImportModal .im-step-line{flex:1;height:2px;background:#e8e8e8;margin:0 10px;transition:background .2s}',
    '#natgeoImportModal .im-step-line.done{background:#1a4731}',
    '#natgeoImportModal .im-title{font-size:1.05rem;font-weight:700;margin-bottom:4px;color:#1a1a1a}',
    '#natgeoImportModal .im-sub{font-size:.78rem;color:#888;margin-bottom:18px}',
    '#natgeoImportModal .im-drop{border:2px dashed #d0d0d0;border-radius:12px;padding:32px 20px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s}',
    '#natgeoImportModal .im-drop.over{border-color:#1a4731;background:#f0f9f4}',
    '#natgeoImportModal .im-drop i{font-size:2rem;color:#1a4731;margin-bottom:10px;display:block}',
    '#natgeoImportModal .im-drop p{font-size:.84rem;color:#555;margin:0}',
    '#natgeoImportModal .im-drop small{font-size:.72rem;color:#aaa}',
    '#natgeoImportModal .im-file-inp{display:none}',
    '#natgeoImportModal .im-filebadge{margin-top:12px;font-size:.8rem;color:#444;background:#f5f9f6;border:1px solid #c3e6d4;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px}',
    '#natgeoImportModal .im-filebadge b{color:#1a4731}',
    '#natgeoImportModal .im-module-wrap{margin-top:16px}',
    '#natgeoImportModal .im-module-wrap label{font-size:.8rem;color:#555;display:block;margin-bottom:6px;font-weight:600}',
    '#natgeoImportModal .im-module-wrap select{width:100%;padding:8px 10px;border:1px solid #d8d8d8;border-radius:8px;font-size:.82rem;font-family:inherit;color:#222}',
    '#natgeoImportModal .im-map-note{font-size:.76rem;color:#7c5e00;background:#fffbe6;border:1px solid #ffe58f;border-radius:8px;padding:9px 12px;margin-bottom:14px}',
    '#natgeoImportModal .im-map-hdr{display:grid;grid-template-columns:1fr 28px 1fr;gap:8px;font-size:.7rem;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;padding:0 2px}',
    '#natgeoImportModal .im-map-row{display:grid;grid-template-columns:1fr 28px 1fr;gap:8px;align-items:center;margin-bottom:7px}',
    '#natgeoImportModal .im-map-row select{padding:6px 8px;border:1px solid #d8d8d8;border-radius:8px;font-size:.79rem;font-family:inherit;color:#222;width:100%;background:#fff}',
    '#natgeoImportModal .im-map-arrow{text-align:center;color:#ccc;font-size:.85rem}',
    '#natgeoImportModal .im-map-field{font-size:.79rem;color:#333;padding:6px 10px;background:#f7f7f7;border-radius:8px;display:flex;align-items:center;gap:3px}',
    '#natgeoImportModal .im-req{color:#c0392b;font-weight:700;flex-shrink:0}',
    '#natgeoImportModal .im-xlsx-row{display:grid;grid-template-columns:1fr 28px 1fr;gap:8px;align-items:center;margin-bottom:7px}',
    '#natgeoImportModal .im-xlsx-inp{padding:6px 8px;border:1px solid #d8d8d8;border-radius:8px;font-size:.79rem;font-family:inherit;color:#222;width:100%;box-sizing:border-box}',
    '#natgeoImportModal .im-xlsx-inp::placeholder{color:#bbb}',
    '#natgeoImportModal .im-summary{background:#f8f8f8;border-radius:8px;padding:12px 14px;font-size:.8rem;color:#444;margin-bottom:14px}',
    '#natgeoImportModal .im-summary-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:5px;padding-bottom:5px;border-bottom:1px solid #eee}',
    '#natgeoImportModal .im-summary-row:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none}',
    '#natgeoImportModal .im-summary-row span{color:#888;flex-shrink:0}',
    '#natgeoImportModal .im-summary-row b{color:#1a4731;text-align:right;word-break:break-all}',
    '#natgeoImportModal .im-preview-lbl{font-size:.8rem;color:#555;margin:0 0 8px;font-weight:600}',
    '#natgeoImportModal .im-preview-scroll{overflow-x:auto;border-radius:8px;border:1px solid #e8e8e8}',
    '#natgeoImportModal .im-preview-table{border-collapse:collapse;font-size:.74rem;width:100%}',
    '#natgeoImportModal .im-preview-table th{background:#f2f2f2;padding:7px 10px;text-align:left;font-weight:700;color:#1a4731;border-bottom:1px solid #e0e0e0;white-space:nowrap}',
    '#natgeoImportModal .im-preview-table td{padding:6px 10px;color:#555;border-bottom:1px solid #f0f0f0;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis}',
    '#natgeoImportModal .im-preview-table tr:last-child td{border-bottom:none}',
    '#natgeoImportModal .im-msg{margin-top:12px;font-size:.78rem;border-radius:8px;padding:8px 12px;display:none}',
    '#natgeoImportModal .im-msg.ok{background:#f0faf4;color:#1a4731;display:block}',
    '#natgeoImportModal .im-msg.err{background:#fff1f0;color:#a8071a;display:block}',
    '#natgeoImportModal .im-actions{display:flex;gap:10px;margin-top:20px;justify-content:space-between;align-items:center}',
    '#natgeoImportModal .im-actions-right{display:flex;gap:10px}',
    '#natgeoImportModal .im-btn{padding:9px 20px;border-radius:8px;border:none;font-size:.84rem;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s,background .15s}',
    '#natgeoImportModal .im-btn-cancel{background:#f0f0f0;color:#555}',
    '#natgeoImportModal .im-btn-cancel:hover{background:#e4e4e4}',
    '#natgeoImportModal .im-btn-back{background:#f0f0f0;color:#555}',
    '#natgeoImportModal .im-btn-back:hover{background:#e4e4e4}',
    '#natgeoImportModal .im-btn-next{background:#1a4731;color:#fff}',
    '#natgeoImportModal .im-btn-next:hover:not(:disabled){background:#153a27}',
    '#natgeoImportModal .im-btn-next:disabled{opacity:.4;cursor:default}',
    '#natgeoImportModal .im-btn-send{background:#1a4731;color:#fff}',
    '#natgeoImportModal .im-btn-send:hover:not(:disabled){background:#153a27}',
    '#natgeoImportModal .im-btn-send:disabled{opacity:.4;cursor:default}',
    '.btn-import{display:inline-flex;align-items:center;gap:6px;background:#f0f9f4;color:#1a4731;border:1px solid #c3e6d4;border-radius:8px;padding:6px 14px;font-size:.76rem;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s}',
    '.btn-import:hover{background:#d9f0e7}',
  ].join('');

  function injectCSS() {
    if (document.getElementById('natgeoImportCSS')) return;
    var s = document.createElement('style');
    s.id = 'natgeoImportCSS';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function guessMatch(fileHeader, sysKey) {
    var h = fileHeader.toLowerCase().replace(/[^a-z0-9]/g, '');
    var k = sysKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!h || !k) return false;
    if (h === k || h.indexOf(k) !== -1 || k.indexOf(h) !== -1) return true;
    var ALIASES = {
      nome:      ['name','razaosocial','razao','fantasia','nomecliente','nomeforn','nomeprod'],
      cpfcnpj:   ['cpf','cnpj','documento','doc','inscricao'],
      email:     ['mail','emailcliente'],
      telefone:  ['tel','fone','celular','phone','whatsapp'],
      codigo:    ['cod','sku','ref','referencia','codprod'],
      descricao: ['desc','description','produto','item'],
      preco:     ['price','precovenda','precounit','vlunit','valorunit'],
      data:      ['date','datapedido','dataemissao','dtemissao','dtpedido'],
      numero:    ['num','numpedido','numeropedido','ordemvenda','pedido'],
      total:     ['valortotal','grandtotal','vlrtotal'],
      vencimento:['venc','datavenc','duedate','dtvcto'],
      valor:     ['value','amount','montante','vlr'],
      cidade:    ['city','municipio'],
      estado:    ['uf','state'],
      cep:       ['zipcode','postalcode'],
      unidade:   ['unit','und','uom'],
      categoria: ['cat','category','grupo'],
      estoque:   ['stock','qty','qtd','quantidade','saldo'],
      status:    ['situacao','situation'],
      vendedor:  ['seller','rep','representante'],
      cliente:   ['customer','client','nomecliente'],
    };
    return !!(ALIASES[k] && ALIASES[k].some(function (a) { return h.indexOf(a) !== -1; }));
  }

  // ── HTML do modal ───────────────────────────────────────────────────────────
  function buildModal() {
    var modOpts = MODULES.map(function (m) {
      return '<option value="' + m.value + '">' + m.label + '</option>';
    }).join('');

    var el = document.createElement('div');
    el.id = MODAL_ID;
    el.innerHTML =
      '<div class="im-overlay"></div>' +
      '<div class="im-box">' +
        '<button class="im-close" id="imClose" title="Fechar"><i class="fa-solid fa-xmark"></i></button>' +

        '<div class="im-steps">' +
          '<div class="im-step active" id="imStep1"><div class="im-step-num">1</div><span>Arquivo</span></div>' +
          '<div class="im-step-line" id="imLine1"></div>' +
          '<div class="im-step" id="imStep2"><div class="im-step-num">2</div><span>Mapeamento</span></div>' +
          '<div class="im-step-line" id="imLine2"></div>' +
          '<div class="im-step" id="imStep3"><div class="im-step-num">3</div><span>Confirmar</span></div>' +
        '</div>' +

        '<div class="im-title" id="imTitle"><i class="fa-solid fa-file-arrow-up" style="color:#1a4731;margin-right:6px"></i>Selecione o arquivo</div>' +
        '<div class="im-sub" id="imSub">Arraste um arquivo CSV ou Excel (.xlsx) ou clique para selecionar</div>' +

        '<div id="imS1">' +
          '<div class="im-drop" id="imDrop">' +
            '<i class="fa-solid fa-cloud-arrow-up"></i>' +
            '<p><strong>Clique aqui</strong> ou arraste o arquivo</p>' +
            '<small>CSV, XLS ou XLSX · máx. 20 MB</small>' +
          '</div>' +
          '<input class="im-file-inp" id="imFileInp" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />' +
          '<div class="im-filebadge" id="imFileBadge" style="display:none"><i class="fa-solid fa-file" id="imFileIcon"></i><span id="imFileBadgeTxt"></span></div>' +
          '<div class="im-module-wrap" id="imModuleWrap" style="display:none">' +
            '<label>Tipo de dados a importar</label>' +
            '<select id="imModule">' + modOpts + '</select>' +
          '</div>' +
        '</div>' +

        '<div id="imS2csv" style="display:none">' +
          '<div class="im-map-note"><i class="fa-solid fa-circle-info" style="margin-right:6px"></i>Associe cada <strong>coluna do arquivo</strong> ao campo correspondente. Campos com <strong>*</strong> são obrigatórios.</div>' +
          '<div class="im-map-hdr"><span>Coluna no arquivo</span><span></span><span>Campo do sistema</span></div>' +
          '<div id="imMapRows"></div>' +
        '</div>' +

        '<div id="imS2xlsx" style="display:none">' +
          '<div class="im-map-note"><i class="fa-solid fa-circle-info" style="margin-right:6px"></i>Arquivo Excel detectado. Informe exatamente como cada campo aparece no <strong>cabeçalho da planilha (linha 1)</strong>. Deixe em branco para ignorar.</div>' +
          '<div class="im-map-hdr"><span>Campo do sistema</span><span></span><span>Coluna no Excel</span></div>' +
          '<div id="imXlsxRows"></div>' +
        '</div>' +

        '<div id="imS3" style="display:none">' +
          '<div class="im-summary" id="imSummary"></div>' +
          '<div id="imPreviewWrap"></div>' +
        '</div>' +

        '<div id="imMsg" class="im-msg"></div>' +

        '<div class="im-actions">' +
          '<div><button class="im-btn im-btn-back" id="imBack" style="display:none"><i class="fa-solid fa-arrow-left" style="margin-right:5px"></i>Voltar</button></div>' +
          '<div class="im-actions-right">' +
            '<button class="im-btn im-btn-cancel" id="imCancel">Cancelar</button>' +
            '<button class="im-btn im-btn-next" id="imNext" disabled>Próximo <i class="fa-solid fa-arrow-right" style="margin-left:5px"></i></button>' +
            '<button class="im-btn im-btn-send" id="imSend" style="display:none" disabled>Importar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    return el;
  }

  // ── SheetJS — carregado dinamicamente só quando necessário ─────────────────
  var SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  function loadSheetJS(cb) {
    if (global.XLSX) { cb(); return; }
    var s = document.createElement('script');
    s.src     = SHEETJS_URL;
    s.onload  = function () { cb(); };
    s.onerror = function () { cb(new Error('CDN indisponível')); };
    document.head.appendChild(s);
  }

  // ── Estado ──────────────────────────────────────────────────────────────────
  var _file        = null;
  var _csvHdrs     = [];
  var _csvRows     = [];   // primeiras 5 linhas (prévia)
  var _csvRawText  = '';   // texto completo em formato CSV (enviado ao backend)
  var _csvSep      = ',';
  var _step        = 1;
  var _isCsv       = false;  // tipo original do arquivo
  var _xlsxReady   = false;  // true após SheetJS converter o XLSX

  // ── open() ──────────────────────────────────────────────────────────────────
  function open() {
    if (document.getElementById(MODAL_ID)) return;
    injectCSS();
    var modal = buildModal();
    document.body.appendChild(modal);
    _file = null; _csvHdrs = []; _csvRows = []; _csvRawText = ''; _csvSep = ','; _step = 1; _isCsv = false; _xlsxReady = false;

    var drop        = document.getElementById('imDrop');
    var inp         = document.getElementById('imFileInp');
    var fileBadge   = document.getElementById('imFileBadge');
    var fileIcon    = document.getElementById('imFileIcon');
    var badgeTxt    = document.getElementById('imFileBadgeTxt');
    var moduleWrap  = document.getElementById('imModuleWrap');
    var moduleEl    = document.getElementById('imModule');
    var s1          = document.getElementById('imS1');
    var s2csv       = document.getElementById('imS2csv');
    var s2xlsx      = document.getElementById('imS2xlsx');
    var s3          = document.getElementById('imS3');
    var mapRows     = document.getElementById('imMapRows');
    var xlsxRows    = document.getElementById('imXlsxRows');
    var summaryEl   = document.getElementById('imSummary');
    var previewWrap = document.getElementById('imPreviewWrap');
    var msgEl       = document.getElementById('imMsg');
    var backBtn     = document.getElementById('imBack');
    var nextBtn     = document.getElementById('imNext');
    var sendBtn     = document.getElementById('imSend');
    var titleEl     = document.getElementById('imTitle');
    var subEl       = document.getElementById('imSub');

    var TITLES = [
      ['Selecione o arquivo',   'Arraste um arquivo CSV ou Excel (.xlsx) ou clique para selecionar'],
      ['Mapeamento de colunas', 'Associe as colunas do arquivo aos campos do sistema'],
      ['Confirmar importação',  'Revise o resumo antes de iniciar o processamento'],
    ];

    function setMsg(cls, txt) {
      msgEl.className = 'im-msg' + (cls ? ' ' + cls : '');
      msgEl.textContent = txt || '';
    }

    // ── Navegação entre passos ────────────────────────────────────────────────
    function showStep(n) {
      _step = n;
      ['imStep1','imStep2','imStep3'].forEach(function (id, i) {
        document.getElementById(id).className =
          'im-step' + (i + 1 === n ? ' active' : (i + 1 < n ? ' done' : ''));
      });
      document.getElementById('imLine1').className = 'im-step-line' + (n > 1 ? ' done' : '');
      document.getElementById('imLine2').className = 'im-step-line' + (n > 2 ? ' done' : '');

      var t = TITLES[n - 1];
      titleEl.innerHTML = '<i class="fa-solid fa-file-arrow-up" style="color:#1a4731;margin-right:6px"></i>' + escHtml(t[0]);
      subEl.textContent = t[1];

      s1.style.display    = n === 1 ? '' : 'none';
      if (n !== 2) { s2csv.style.display = 'none'; s2xlsx.style.display = 'none'; }
      s3.style.display    = n === 3 ? '' : 'none';

      backBtn.style.display = n > 1 ? '' : 'none';
      nextBtn.style.display = n < 3 ? '' : 'none';
      sendBtn.style.display = n === 3 ? '' : 'none';
      sendBtn.disabled = true;

      setMsg('', '');
      if (n === 2) buildMappingUI();
      if (n === 3) buildConfirmUI();
    }

    // ── Passo 1 — seleção de arquivo ──────────────────────────────────────────
    function onFileSelected(file) {
      if (file.size > 20 * 1024 * 1024) {
        setMsg('err', '✗ Arquivo muito grande. Máx. 20 MB.');
        return;
      }
      _file  = file;
      _isCsv = /\.(csv|txt)$/i.test(file.name);
      var size = file.size < 1024 * 1024
        ? (file.size / 1024).toFixed(1) + ' KB'
        : (file.size / 1024 / 1024).toFixed(1) + ' MB';
      fileIcon.className = 'fa-solid ' + (_isCsv ? 'fa-file-csv' : 'fa-file-excel');
      badgeTxt.innerHTML = '<b>' + escHtml(file.name) + '</b>&nbsp;·&nbsp;' + size;
      fileBadge.style.display = 'flex';
      moduleWrap.style.display = 'block';
      nextBtn.disabled = false;
      setMsg('', '');
    }

    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault(); drop.classList.remove('over');
      var f = e.dataTransfer.files[0]; if (f) onFileSelected(f);
    });
    drop.addEventListener('click', function () { inp.click(); });
    inp.addEventListener('change', function () { if (inp.files[0]) onFileSelected(inp.files[0]); });

    // ── Passo 2 — mapeamento ──────────────────────────────────────────────────
    function showCsvMappingPanel(fields) {
      s2xlsx.style.display = 'none';
      s2csv.style.display  = '';
      renderCsvMapping(fields);
      nextBtn.disabled = false;
    }

    function showXlsxFallback(fields) {
      s2csv.style.display  = 'none';
      s2xlsx.style.display = '';
      renderXlsxMapping(fields);
      nextBtn.disabled = false;
    }

    function parseCsvText(text, fields) {
      _csvRawText = text;
      var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
      _csvSep  = (lines[0] || '').indexOf(';') !== -1 ? ';' : ',';
      _csvHdrs = (lines[0] || '').split(_csvSep).map(function (h) { return h.trim().replace(/^"|"$/g, ''); });
      _csvRows = lines.slice(1, 6).map(function (l) {
        return l.split(_csvSep).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
      });
      showCsvMappingPanel(fields);
    }

    function buildMappingUI() {
      var entity = MODULE_MAP[moduleEl.value];
      var fields = ENTITY_FIELDS[entity] || [];

      if (_isCsv) {
        // ── CSV: ler arquivo como texto ───────────────────────────────────────
        s2csv.style.display  = '';
        s2xlsx.style.display = 'none';
        mapRows.innerHTML = '<div style="text-align:center;padding:24px;color:#aaa;font-size:.8rem"><i class="fa-solid fa-spinner fa-spin" style="margin-right:6px"></i>Lendo colunas…</div>';
        nextBtn.disabled = true;
        var rdr = new FileReader();
        rdr.onload  = function (ev) { parseCsvText(ev.target.result || '', fields); };
        rdr.onerror = function () {
          mapRows.innerHTML = '<div style="color:#a8071a;font-size:.8rem">✗ Erro ao ler o arquivo.</div>';
          nextBtn.disabled = false;
        };
        rdr.readAsText(_file);

      } else if (_xlsxReady) {
        // ── XLSX já convertido (voltou ao passo 2) ────────────────────────────
        showCsvMappingPanel(fields);

      } else {
        // ── XLSX: converter com SheetJS ───────────────────────────────────────
        s2csv.style.display  = 'none';
        s2xlsx.style.display = '';
        xlsxRows.innerHTML = '<div style="text-align:center;padding:24px;color:#aaa;font-size:.8rem"><i class="fa-solid fa-spinner fa-spin" style="margin-right:6px"></i>Carregando leitor de Excel…</div>';
        nextBtn.disabled = true;

        loadSheetJS(function (loadErr) {
          if (loadErr || !global.XLSX) {
            // Fallback manual se CDN falhar
            showXlsxFallback(fields);
            return;
          }
          var rdr2 = new FileReader();
          rdr2.onload = function (ev) {
            try {
              var wb  = global.XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
              var ws  = wb.Sheets[wb.SheetNames[0]];
              var csv = global.XLSX.utils.sheet_to_csv(ws);
              _xlsxReady = true;
              parseCsvText(csv, fields);
            } catch (e) {
              xlsxRows.innerHTML =
                '<div style="color:#a8071a;font-size:.8rem">✗ Erro ao ler Excel: ' + escHtml(e.message) +
                '. Tente salvar como CSV (Arquivo → Salvar como → CSV UTF-8).</div>';
              nextBtn.disabled = false;
            }
          };
          rdr2.onerror = function () {
            xlsxRows.innerHTML = '<div style="color:#a8071a;font-size:.8rem">✗ Erro ao ler o arquivo.</div>';
            nextBtn.disabled = false;
          };
          rdr2.readAsArrayBuffer(_file);
        });
      }
    }

    function renderCsvMapping(fields) {
      if (!_csvHdrs.length) {
        mapRows.innerHTML = '<div style="color:#a8071a;font-size:.8rem">✗ Nenhuma coluna detectada. Verifique o formato do arquivo.</div>';
        return;
      }
      mapRows.innerHTML = fields.map(function (f) {
        var opts = '<option value="">— Ignorar —</option>' +
          _csvHdrs.map(function (h) {
            return '<option value="' + escHtml(h) + '"' + (guessMatch(h, f.key) ? ' selected' : '') + '>' + escHtml(h) + '</option>';
          }).join('');
        return '<div class="im-map-row">' +
          '<select data-field="' + f.key + '">' + opts + '</select>' +
          '<div class="im-map-arrow"><i class="fa-solid fa-arrow-right"></i></div>' +
          '<div class="im-map-field">' + escHtml(f.label) + (f.required ? '<span class="im-req">*</span>' : '') + '</div>' +
        '</div>';
      }).join('');
    }

    function renderXlsxMapping(fields) {
      xlsxRows.innerHTML = fields.map(function (f) {
        return '<div class="im-xlsx-row">' +
          '<div class="im-map-field">' + escHtml(f.label) + (f.required ? '<span class="im-req">*</span>' : '') + '</div>' +
          '<div class="im-map-arrow"><i class="fa-solid fa-arrow-right"></i></div>' +
          '<input class="im-xlsx-inp" data-field="' + f.key + '" type="text" placeholder="Ex: ' + escHtml(f.label) + '" />' +
        '</div>';
      }).join('');
    }

    function getMapping() {
      var mapping = {};
      if (_isCsv) {
        Array.prototype.forEach.call(mapRows.querySelectorAll('select[data-field]'), function (sel) {
          if (sel.value) mapping[sel.getAttribute('data-field')] = sel.value;
        });
      } else {
        Array.prototype.forEach.call(xlsxRows.querySelectorAll('input[data-field]'), function (el) {
          var v = el.value.trim();
          if (v) mapping[el.getAttribute('data-field')] = v;
        });
      }
      return mapping;
    }

    function validateMapping() {
      var entity = MODULE_MAP[moduleEl.value];
      var fields = ENTITY_FIELDS[entity] || [];
      var mapping = getMapping();
      return fields.filter(function (f) { return f.required && !mapping[f.key]; });
    }

    // ── Passo 3 — confirmação e prévia ────────────────────────────────────────
    function buildConfirmUI() {
      var entity   = MODULE_MAP[moduleEl.value];
      var fields   = ENTITY_FIELDS[entity] || [];
      var mapping  = getMapping();
      var modLabel = '';
      for (var i = 0; i < MODULES.length; i++) {
        if (MODULES[i].value === moduleEl.value) { modLabel = MODULES[i].label; break; }
      }
      var size = _file.size < 1024 * 1024
        ? (_file.size / 1024).toFixed(1) + ' KB'
        : (_file.size / 1024 / 1024).toFixed(1) + ' MB';
      var mappedKeys = Object.keys(mapping);

      summaryEl.innerHTML =
        '<div class="im-summary-row"><span>Arquivo</span><b>' + escHtml(_file.name) + ' (' + size + ')</b></div>' +
        '<div class="im-summary-row"><span>Módulo</span><b>' + escHtml(modLabel) + '</b></div>' +
        '<div class="im-summary-row"><span>Colunas mapeadas</span><b>' + mappedKeys.length + ' de ' + fields.length + '</b></div>' +
        (_isCsv && _csvRows.length > 0
          ? '<div class="im-summary-row"><span>Linhas detectadas</span><b>~' + _csvRows.length + '+ registros</b></div>'
          : '');

      previewWrap.innerHTML = '';
      if (_isCsv && _csvRows.length > 0 && mappedKeys.length > 0) {
        var sysLabels = {};
        fields.forEach(function (f) { sysLabels[f.key] = f.label; });
        var ths = mappedKeys.map(function (k) {
          return '<th>' + escHtml(sysLabels[k] || k) + '</th>';
        }).join('');
        var trs = _csvRows.map(function (row) {
          var tds = mappedKeys.map(function (k) {
            var ci  = _csvHdrs.indexOf(mapping[k]);
            var val = ci >= 0 ? (row[ci] || '') : '—';
            return '<td>' + escHtml(val) + '</td>';
          }).join('');
          return '<tr>' + tds + '</tr>';
        }).join('');
        previewWrap.innerHTML =
          '<p class="im-preview-lbl">Prévia — primeiras ' + _csvRows.length + ' linhas com o mapeamento aplicado</p>' +
          '<div class="im-preview-scroll"><table class="im-preview-table">' +
          '<thead><tr>' + ths + '</tr></thead><tbody>' + trs + '</tbody></table></div>';
      } else if (!_isCsv) {
        previewWrap.innerHTML =
          '<div style="font-size:.79rem;color:#888;background:#f9f9f9;border-radius:8px;padding:12px;margin-top:4px">' +
          '<i class="fa-solid fa-circle-info" style="margin-right:6px;color:#1a4731"></i>' +
          'Prévia não disponível para Excel. O conteúdo será validado e processado após o envio.</div>';
      }

      sendBtn.disabled = false;
    }

    // ── Botões de navegação ───────────────────────────────────────────────────
    nextBtn.addEventListener('click', function () {
      if (_step === 1) {
        if (!_file) { setMsg('err', '✗ Selecione um arquivo antes de continuar.'); return; }
        showStep(2);
      } else if (_step === 2) {
        var missing = validateMapping();
        if (missing.length) {
          setMsg('err', '✗ Campo obrigatório não mapeado: ' + missing.map(function (f) { return f.label; }).join(', ') + '.');
          return;
        }
        showStep(3);
      }
    });

    backBtn.addEventListener('click', function () {
      if (_step > 1) showStep(_step - 1);
    });

    // ── Envio ─────────────────────────────────────────────────────────────────
    sendBtn.addEventListener('click', function () {
      var entity  = MODULE_MAP[moduleEl.value];
      var mapping = getMapping();
      sendBtn.disabled    = true;
      sendBtn.textContent = 'Enviando…';
      setMsg('', '');

      var reqHdrs = { 'Content-Type': 'application/json' };
      if (global.__authToken) reqHdrs['Authorization'] = 'Bearer ' + global.__authToken;

      var payload = {
        entity:         entity,
        file_name:      _file.name,
        file_type:      _isCsv ? 'csv' : 'xlsx',
        column_mapping: mapping,
        options: {
          original_module: moduleEl.value,
          file_size:       _file.size,
          csv_headers:     _isCsv ? _csvHdrs : [],
          csv_row_count:   _isCsv ? _csvRows.length : 0,
          csv_separator:   _isCsv ? _csvSep : null,
          mapped_fields:   Object.keys(mapping).length,
          csv_data:        _isCsv ? _csvRawText : null,
        },
      };

      fetch('/api/import/csv', { method: 'POST', headers: reqHdrs, body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Erro HTTP ' + r.status); });
          return r.json();
        })
        .then(function (data) {
          var jobId = data.job && data.job.id ? ' (Job #' + String(data.job.id).substring(0, 8) + '…)' : '';
          setMsg('ok', '✓ Importação agendada' + jobId + '. O arquivo será processado com o mapeamento registrado.');
          sendBtn.textContent = 'Importar';
          sendBtn.disabled = false;
        })
        .catch(function (e) {
          setMsg('err', '✗ ' + e.message);
          sendBtn.textContent = 'Tentar novamente';
          sendBtn.disabled = false;
        });
    });

    // ── Fechar ────────────────────────────────────────────────────────────────
    function close() {
      var m = document.getElementById(MODAL_ID);
      if (m) m.remove();
      _file = null; _csvHdrs = []; _csvRows = []; _csvRawText = ''; _xlsxReady = false; _step = 1;
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
