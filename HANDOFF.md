# Handoff: NatGeo Dashboard — Controle de Acesso, E2E e API Integration

*Data:* 2026-05-06
*Status:* Em andamento — API calls ainda não implementadas nas 3 abas estáticas

---

## 1. Objetivo

Sistema de gestão para uma distribuidora de alimentos/produtos naturais (NatGeo).
Frontend: 15 arquivos HTML estáticos + vanilla JS + Chart.js.
Backend: Express + Supabase (PostgreSQL), deployado via Docker no Coolify.

As sessões anteriores focaram em: unificação de sidebar, dados zerados, botão importar.
Esta sessão focou em: controle de acesso master/usuário, suite E2E Playwright, e início
da integração de API real nas abas estáticas.

---

## 2. Contexto essencial

### Stack
- **Frontend:** HTML estático + vanilla JS + Chart.js — SEM React/Next.js
- **Backend:** Node.js + Express (`src/api/server.ts`)
- **Banco:** Supabase (PostgreSQL). Migrations em `supabase/migrations/` — **22 arquivos SQL**
- **Sync:** Worker Oracle ERP → Supabase em `workers/oracle-sync/` (não conectado ainda)
- **Deploy:** Coolify self-hosted, Docker multi-stage build. Push ao GitHub aciona rebuild.
- **URL produção:** `http://byy6u6lkrgic5tca4vlhvgy8.177.7.43.206.sslip.io`
- **Repo GitHub:** `good4youadm-ops/DASHBOARD-NATGEO` (branch `main`)
- **Diretório local:** `c:\Users\Natgeo50\Documents\dashboardnatgeo`

### Decisões arquiteturais vigentes
- **sidebar.js canônico:** `js/sidebar.js` injeta toda a sidebar via `DOMContentLoaded`.
  Cada página tem apenas `<aside class="sidebar"></aside>`. Página ativa detectada pelo URL.
- **Evento `sidebarReady`:** Disparado após injeção. `auth.js` escuta para popular nome/iniciais.
- **Módulos abertos vs. bloqueados:** Apenas 4 módulos funcionam para usuários comuns.
  `js/access.js` bloqueia os 9 restantes com overlay.
- **isMaster():** Apenas `ferrerjoao2206@gmail.com` tem acesso irrestrito.
- **Sem fallback para mocks:** Se API falhar (banco vazio ou erro), dashboards mostram `—`.
  Isso é correto e intencional.

### Módulos abertos (todos os usuários)
`dashboard-distribuidora`, `dashboard-comercial`, `financeiro`, `estoque`

### Módulos bloqueados (só master vê, outros veem cadeado + overlay)
`orcamentos`, `metas`, `lancamentos`, `fluxo-caixa`, `logistica`, `pedidos`,
`cadastros`, `fiscal`, `estatistica-vendas`

---

## 3. O que já foi feito

### Sessões anteriores
1. Criação dos 15 arquivos HTML de dashboard
2. Correção de build Docker (`workers/oracle-sync/index.ts` — import ausente)
3. `js/sidebar.js` criado — sidebar canônica em todas as páginas
4. `js/auth.js` refatorado — aguarda `sidebarReady` para popular usuário
5. `js/import.js` criado — modal drag-and-drop CSV/XLS/XLSX para `/api/import`
6. Dados zerados em `dashboard-comercial.html`, `financeiro.html`, `estoque.html`
7. Links cruzados entre KPI cards (financeiro ↔ lancamentos, comercial ↔ estoque)
8. URL tab routing em `lancamentos.html` (`?tab=ar`, `?tab=ap`)

### Esta sessão (2026-05-06)
9. **Bug de CSS da sidebar** em `dashboard-distribuidora.html` **CORRIGIDO:**
   - `.sidebar { background: rgba(255,255,255,.85) }` → `background: var(--accent)`
   - `.u-name`, `.u-role`, `.logout-btn`, `.avatar` convertidos para cores de sidebar escura

10. **Sistema de controle de acesso implementado:**
    - `js/auth.js`: adicionados `MASTER_EMAIL` e `isMaster()`:
      ```javascript
      var MASTER_EMAIL = 'ferrerjoao2206@gmail.com';
      function isMaster() {
        var session = getSession();
        return !!(session && session.user && session.user.email === MASTER_EMAIL);
      }
      ```
    - `js/sidebar.js` reescrito: módulos bloqueados renderizam `<span class="nav-locked">`
      com ícone de cadeado (`fa-lock`) e opacity 0.38 para usuários comuns.
    - `js/access.js` CRIADO: overlay bloqueador em páginas restritas. Injeta
      `#natgeo-access-overlay` (position:fixed, left:var(--sidebar-w), z-index:9990).
      Também intercepta `window.fetch` para bloquear chamadas `/api/*` (exceto `/api/config`).

11. **Correções de scripts faltando em páginas bloqueadas:**
    - `pedidos.html`: adicionados `auth.js` e `access.js` (estava chamando `NatGeoAuth.requireAuth()` sem ter auth.js)
    - `logistica.html`: adicionados `auth.js` e `access.js` (não tinha nenhum dos dois)
    - `orcamentos.html`, `fiscal.html`, `metas.html`, `fluxo-caixa.html`, `cadastros.html`,
      `lancamentos.html`, `estatistica-vendas.html`: adicionado `access.js`

12. **21 de 22 migrations aplicadas no Supabase pelo usuário.**
    Migration 022 é apenas índices de performance — não crítica para funcionamento.

13. **`supabase/setup_master_user.sql` CRIADO:**
    Script completo para configurar o usuário master após criar o auth user.
    Inclui: INSERT em `user_profiles` (role `owner`), 18 permissions, role `owner`,
    `role_permissions` e `user_roles`. Inclui blocos `DO $$` de diagnóstico que falham
    explicitamente se o auth user não existir.

14. **Suite E2E Playwright CRIADA — 43/43 testes passando:**
    - `playwright.config.ts` — configuração (porta 8788, chromium, screenshots on failure)
    - `e2e/static-server.mjs` — servidor HTTP estático para os testes
    - `e2e/helpers.ts` — utilitários: `MASTER_SESSION`, `COMMON_SESSION`, `injectSession`,
      `attachAuditListeners`, `shot`, `waitSidebar`, `checkClickable`, `tryClick`
    - `e2e/dashboard.spec.ts`, `e2e/comercial.spec.ts`, `e2e/financeiro.spec.ts`,
      `e2e/estoque.spec.ts` — 4 arquivos de spec

15. **Diagnóstico crítico confirmado por Playwright:**
    `dashboard-distribuidora.html`, `dashboard-comercial.html` e `financeiro.html`
    fazem **ZERO chamadas de API**. Todos os KPIs mostram `—` ou valores hardcoded
    porque nunca há `fetch()` para os endpoints. A integração de API real ainda
    **não foi implementada** nessas 3 páginas.

---

## 4. Estado atual

### O que funciona ✅
- **15 páginas** com sidebar verde escura idêntica
- Controle de acesso: master vê tudo, usuários comuns veem cadeado em 9 módulos
- Overlay bloqueador em todas as páginas restritas (JS + CSS)
- 21 migrations aplicadas no Supabase — tabelas e views existem
- Suite E2E: 43/43 testes passando localmente
- `supabase/setup_master_user.sql` pronto para rodar
- `auth.js` popula nome/iniciais após sidebarReady
- Modal de importação (frontend) funciona visualmente

### Login (requer ação manual do usuário)
O usuário precisa:
1. Supabase Dashboard → Authentication → Users → **Add user**
   - Email: `ferrerjoao2206@gmail.com`
   - Senha: ex. `NatGeo@2026!`
2. Depois rodar `supabase/setup_master_user.sql` no SQL Editor

### O que está incompleto ❌
- **`dashboard-distribuidora.html`** — KPIs mostram `—` ou valores fixos. Zero chamadas
  de API. Precisa chamar: `/api/dashboard/sales/summary`, `/api/dashboard/inventory/summary`,
  `/api/dashboard/finance/summary`, `/api/dashboard/sales/by-day`, `/api/sync/status`
- **`dashboard-comercial.html`** — Mesmo problema. Precisa chamar:
  `/api/dashboard/sales/summary`, `/api/dashboard/sales/by-day`,
  `/api/dashboard/sales/customers`, `/api/dashboard/sales/products`
- **`financeiro.html`** — Mesmo problema. Precisa chamar:
  `/api/dashboard/finance/summary`, `/api/dashboard/finance/receivable`,
  `/api/dashboard/finance/payable`
- **`estoque.html`** — Maioria integrada, mas ainda há valores hardcoded:
  KPIs header (`khSaldoDisp`, `khRuptura`, `khCobertura`, `khValidadeCrit`),
  "acurácia 96,4%" (sem ID), footer com valores em R$
- **`/api/import`** — Endpoint não implementado no backend (modal existe no frontend)
- **SQL Injection** em `workers/oracle-sync/entities/sales-orders.sync.ts` linha ~66-85
  (template string com variáveis Oracle diretamente em SQL). Corrigir antes de conectar Oracle.
- **SSL/Domínio:** Ainda em `sslip.io`, browser exibe "Inseguro"

---

## 5. Próximos passos

### Prioridade 1 — API integration (3 abas estáticas)
Esta é a tarefa principal que ficou pendente nesta sessão.

**Abordagem:** Adicionar um bloco `<script>` em cada página que, após `sidebarReady`,
chama `NatGeoApi.get(...)` e popula os elementos pelo ID com os dados reais.
Usar `try/catch` com fallback para `—` se a API falhar.

**Endpoints disponíveis (todos precisam de Bearer token do `localStorage`):**
```
GET /api/dashboard/sales/summary?months=12
GET /api/dashboard/sales/by-day
GET /api/dashboard/sales/customers?limit=20
GET /api/dashboard/sales/products?limit=20
GET /api/dashboard/finance/summary
GET /api/dashboard/finance/receivable
GET /api/dashboard/finance/payable
GET /api/dashboard/inventory/summary
GET /api/dashboard/inventory/products
GET /api/dashboard/inventory/expiring?daysAhead=90
GET /api/sync/status
```

**Shapes de dados por endpoint:**
```javascript
// /api/dashboard/sales/summary → array de meses
{ month, total_orders, unique_customers, gross_revenue, net_revenue,
  avg_ticket, delivered_orders, cancelled_orders, pending_orders }

// /api/dashboard/sales/by-day → array de dias
{ order_date, orders_count, revenue, discounts, avg_ticket }

// /api/dashboard/sales/customers
{ customer_name, total_orders, total_revenue, avg_ticket,
  last_order_date, abc_curve, segment }

// /api/dashboard/sales/products
{ product_name, sku, category, brand, abc_curve,
  total_qty_sold, total_revenue, avg_unit_price }

// /api/dashboard/finance/summary → objeto único
{ ar_open_balance, ar_overdue_balance, ar_received_this_month, ar_due_next_30,
  ap_open_balance, ap_overdue_balance, ap_paid_this_month, ap_due_next_30, net_position }

// /api/dashboard/inventory/summary → array por depósito
{ warehouse, sku_count, total_qty_available, total_inventory_value,
  ruptura_count, sku_a_count, sku_b_count, sku_c_count, avg_coverage_days }

// /api/dashboard/inventory/expiring → array de lotes
{ product_name, lot_number, expiry_date, days_to_expiry, qty_current, expiry_alert }
```

**Padrão de implementação (usar em todas as 3 páginas):**
```javascript
document.addEventListener('sidebarReady', async function() {
  var token = (NatGeoAuth.getSession() || {}).access_token;
  if (!token) return;
  var headers = { 'Authorization': 'Bearer ' + token };

  try {
    var r = await fetch('/api/dashboard/sales/summary?months=12', { headers });
    if (!r.ok) throw new Error(r.status);
    var rows = await r.json(); // array, índice 0 = mês mais recente
    var cur = rows[0] || {};
    var prev = rows[1] || {};
    document.getElementById('kpiGrossRevenue').textContent = fmt(cur.gross_revenue);
    // ... popular todos os KPIs
  } catch(e) {
    console.warn('sales/summary:', e);
  }
});
```

**Antes de implementar:** Ler cada página para mapear os IDs dos elementos KPI.
O Playwright identificou que os IDs dos KPIs existem mas estão com valores estáticos.

### Prioridade 2 — Login do usuário master
Passos manuais (usuário deve fazer):
1. Supabase → Authentication → Users → Add user → `ferrerjoao2206@gmail.com`
2. SQL Editor → rodar `supabase/setup_master_user.sql` completo

### Prioridade 3 — estoque.html KPIs restantes
Mapear e popular: `khSaldoDisp`, `khRuptura`, `khCobertura`, `khValidadeCrit`,
"acurácia 96,4%" e footer. Chamar `/api/dashboard/inventory/summary`.

### Prioridade 4 — Fix SQL Injection no Oracle worker
Em `workers/oracle-sync/entities/sales-orders.sync.ts` linha ~66-85:
substituir template strings SQL por consultas parametrizadas antes de conectar Oracle.

### Prioridade 5 — Implementar `/api/import` no backend
```typescript
app.post('/api/import', upload.single('file'), async (req, res) => {
  const { module } = req.body; // 'customers' | 'products' | 'orders' | etc.
  const file = req.file;
  // parse CSV/XLSX → upsert no Supabase
});
```
Usar `multer` para upload e `xlsx` ou `csv-parse` para leitura.

---

## 6. Perguntas em aberto

1. **Credenciais do Oracle ERP disponíveis?** O worker está implementado mas nunca
   rodou com dados reais. Há SQL Injection que precisa ser corrigido antes.

2. **Formato de CSV para importação?** Template fixo por módulo ou formato livre?

3. **Domínio próprio?** Atualmente em `sslip.io` sem SSL. Browser exibe "Inseguro".

---

## 7. Artefatos relevantes

### Arquivos-chave
| Arquivo | Descrição |
|---|---|
| `js/sidebar.js` | Sidebar canônica — injeta HTML, controla módulos bloqueados |
| `js/auth.js` | Sessão, `isMaster()`, `MASTER_EMAIL`, aguarda `sidebarReady` |
| `js/access.js` | Overlay bloqueador para módulos restritos |
| `js/import.js` | Modal drag-and-drop CSV/XLS/XLSX |
| `js/api.js` | Cliente HTTP para API Express |
| `src/api/server.ts` | Express — todos os endpoints `/api/*` |
| `src/repositories/sales.ts` | Queries de vendas → views Supabase |
| `src/repositories/finance.ts` | Queries financeiras → views Supabase |
| `supabase/migrations/` | 22 migrations SQL — 21 aplicadas, 022 é só índices |
| `supabase/migrations/007_views.sql` | Views de dashboard (sales, finance, inventory) |
| `supabase/setup_master_user.sql` | Script de setup do usuário master |
| `playwright.config.ts` | Config Playwright E2E |
| `e2e/` | Suite de testes — 4 specs, 43 testes, todos passando |
| `workers/oracle-sync/` | Worker Oracle → Supabase (não conectado, SQL Injection presente) |

### Endpoints de API — referência rápida
```
GET  /api/config                        → sem auth, retorna URL do Supabase
GET  /api/dashboard/sales/summary       → ?months=N
GET  /api/dashboard/sales/by-day        →
GET  /api/dashboard/sales/customers     → ?limit=N
GET  /api/dashboard/sales/products      → ?limit=N
GET  /api/dashboard/finance/summary     →
GET  /api/dashboard/finance/receivable  →
GET  /api/dashboard/finance/payable     →
GET  /api/dashboard/inventory/summary   →
GET  /api/dashboard/inventory/products  →
GET  /api/dashboard/inventory/expiring  → ?daysAhead=N
GET  /api/sync/status                   →
POST /api/import                        → NÃO IMPLEMENTADO
```
Todos (exceto `/api/config`) exigem `Authorization: Bearer <token>`.
Token vem de `NatGeoAuth.getSession().access_token`.

### Sessão fake para Playwright (injetada via addInitScript)
```javascript
// MASTER_SESSION em e2e/helpers.ts
{
  access_token: 'fake-master-token',
  expires_at: Date.now() + 3600000,
  user: { id: 'master-uuid', email: 'ferrerjoao2206@gmail.com' }
}
// COMMON_SESSION — mesmo mas com email diferente
{ user: { email: 'user@example.com' } }
```

### Ordem correta de scripts em cada página
```html
<!-- No <head> ou antes do </body>: -->
<script src="js/api.js"></script>
<script src="js/auth.js"></script>
<script src="js/access.js"></script>
<script src="js/sidebar.js"></script>
<!-- scripts específicos da página... -->
<script src="js/import.js"></script>
```
`access.js` deve vir antes de `sidebar.js` (ambos dependem de `auth.js`).

### Deploy
```bash
cd "c:\Users\Natgeo50\Documents\dashboardnatgeo"
git add arquivo.html js/arquivo.js
git commit -m "feat: descrição"
git push origin main
# Coolify rebuilda (~3 min). Verificar aba Deployments.
# Ctrl+Shift+R para reload sem cache no browser.
```

### Rodar E2E localmente
```bash
cd "c:\Users\Natgeo50\Documents\dashboardnatgeo"
npx playwright test          # todos os testes
npx playwright test e2e/dashboard.spec.ts  # só o dashboard
npx playwright test --ui     # interface visual
```

---

## 8. Instruções para a próxima sessão

### Tom e abordagem
- Respostas em **português**.
- Execute e mostre — não explique demais antes de fazer.
- Para bugs óbvios, vai direto. Para mudanças grandes, confirme o plano primeiro.
- O objetivo visual é parecer com o **Bling ERP**: coeso, profissional, dados reais.

### Armadilhas a evitar

1. **TypeScript break no build Docker.** Antes de qualquer push que toque `.ts`,
   rodar `npx tsc --noEmit`. Se falhar, o app não sobe no Coolify.

2. **O `NatGeoApi` de `js/api.js` já cuida do Bearer token?** Verificar antes de
   duplicar a lógica de autenticação nas páginas. Se `NatGeoApi.get(path)` já injeta
   o header, usar ele em vez de `fetch()` manual.

3. **Não use `git add -A`** — pode incluir arquivos temporários, `.env`, etc.
   Sempre adicionar arquivos específicos.

4. **Não há fallback para mocks.** Se a API falhar (banco sem dados), os dashboards
   mostram `—`. Isso é correto — não confundir com bug.

5. **`sidebar.js` usa `DOMContentLoaded`.** Se adicionar código que depende da sidebar,
   escute o evento `sidebarReady`, não `DOMContentLoaded`.

6. **Migration 022** é apenas índices de performance. Pode ser aplicada a qualquer
   momento sem risco. As 21 aplicadas cobrem toda a funcionalidade.

7. **Supabase Auth ≠ migrations.** As migrations criam tabelas e views, mas não criam
   usuários no Auth. O usuário precisa ser criado manualmente no Supabase Dashboard.

8. **SQL Injection no Oracle worker.** Não conectar o Oracle antes de corrigir.
   O arquivo é `workers/oracle-sync/entities/sales-orders.sync.ts` linha ~66-85.
