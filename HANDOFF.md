# Handoff: NatGeo Dashboard — Cockpit Gerencial Distribuidora

*Data:* 2026-05-06
*Status:* Em andamento — cockpit gerencial 10 fases concluídas; próxima etapa é conectar dados reais da API e expandir módulos bloqueados

---

## 1. Objetivo

Transformar o NatGeo Dashboard (ERP estático de distribuidora de alimentos) num cockpit gerencial profissional com 4 áreas: **Dashboard**, **Financeiro**, **Comercial** e **Estoque**. O trabalho está organizado em 10 fases, todas concluídas. O frontend é vanilla HTML/JS/CSS (sem framework) rodando sobre um backend Node.js + Express + Supabase/PostgreSQL que sincroniza dados do Oracle ERP via workers TypeScript.

---

## 2. Contexto essencial

### Stack
| Camada | Tecnologia |
|---|---|
| Frontend | HTML5 + CSS3 + vanilla JS (Chart.js para gráficos) |
| Backend | Node.js + Express — `src/api/server.ts` |
| Banco | Supabase / PostgreSQL |
| ERP fonte | Oracle — sincronizado via `workers/oracle-sync/` |
| Deploy | Docker + Coolify (auto-deploy por push no `main`) |
| Repositório | `https://github.com/good4youadm-ops/DASHBOARD-NATGEO.git` |

### Diretório local
```
c:\Users\Natgeo50\Documents\dashboardnatgeo\
```

### Restrições inegociáveis
- **Nunca deletar** páginas existentes (pedidos, orcamentos, fiscal, metas, fluxo-caixa, logistica, cadastros, lancamentos, estatistica-vendas)
- **Sem frameworks** — vanilla JS puro em todo o frontend
- **Sem multer** instalado — importação via JSON no body, nunca FormData
- O usuário master é `ferrerjoao2206@gmail.com` — tem acesso irrestrito a todas as páginas

### Decisões arquiteturais tomadas
- Navegação entre páginas via querystring (`NatGeoNav` em `js/nav.js`)
- Polling de dados a cada 60 segundos (`setInterval`) em todas as 4 áreas abertas
- `DashboardAPI.setUpdStatus(state, text)` como padrão único de feedback visual (verde/âmbar/vermelho)
- Dados fictícios eliminados: KPIs mostram estado vazio (`null`) enquanto API não retorna valores reais
- Controle de acesso: páginas "bloqueadas" mostram overlay + cadeado para usuários comuns; `sidebar.js` gera o cadeado dinamicamente
- Sessão armazenada em `localStorage` sob a chave `natgeo_auth` (objeto com `access_token`, `refresh_token`, `expires_at`, `user`)

---

## 3. O que já foi feito

### FASE 1 — Navegação por querystring
- Criado `js/nav.js` com o helper `NatGeoNav` (funções: `getParam`, `navTo`, `updateParam`, `applyFromURL`)
- Adicionado como `<script src="js/nav.js">` em todas as 4 páginas abertas, antes de `import.js`

### FASE 2 — Alinhamento do endpoint de importação
- Corrigido `js/import.js`: chamava `/api/import` com FormData; agora chama `/api/import/csv` com JSON
- Adicionado `MODULE_MAP` para converter nomes de módulo frontend (`clientes`) em entidades backend (`customers`)
- Mensagem honesta ao usuário: "Job criado — será processado em segundo plano"
- Módulos sem suporte no backend mostram erro claro ao invés de falhar silenciosamente

### FASE 3 — Status visual unificado
- Adicionado `DashboardAPI.setUpdStatus(state, text)` em `js/api.js`
- Três estados: `ok` (#34c759 verde), `loading` (#ff9f0a âmbar), `error` (#ff3b30 vermelho)
- Funciona via `id="updDot"` e `id="updText"` presentes em todas as páginas

### FASE 4 — Dashboard principal (`dashboard-distribuidora.html`)
- KPI cards clicáveis com querystring contextual:
  - Faturamento / Ticket Médio → `dashboard-comercial.html?periodo=mes_atual`
  - Pedidos → `pedidos.html`
  - Clientes Ativos → `cadastros.html`
- Pills dinâmicos: alertas de estoque (`id="alertasPill"`), validade (`id="validadePill"`), status de pedidos (`id="ordPillEntregue"`, `id="ordPillTransito"`, `id="ordPillSepara"`)
- Top Produtos clicável → `estoque.html?produto=NAME`
- Top Clientes clicável → `dashboard-comercial.html?cliente=NAME&periodo=mes_atual`
- Alertas de estoque clicáveis → `estoque.html?filtro=critico&produto=NAME`
- Fetch real de `/api/orders` substituindo proxy de clientes para tabela de pedidos recentes
- Polling 60s + `setUpdStatus` integrado

### FASE 5 — Dashboard Comercial (`dashboard-comercial.html`)
- Convertido de IIFE anônima para função nomeada `initComercial()` + polling
- `NatGeoNav.applyFromURL`: `?periodo=mes_atual` → seleciona período; `?cliente=NAME` → preenche campo de drill-down
- Todos os dados hardcoded limpos: `fat.c = null` em todos os períodos (hoje, 7d, 15d, 1m, tri, sem, ano)
- Arrays de vendedores e canais esvaziados para não exibir nomes inventados
- `setUpdStatus` integrado

### FASE 6 — Financeiro (`financeiro.html`)
- Badges dinâmicos nas abas Recebíveis e Pagamentos (contagem de títulos vencidos)
- `NatGeoNav.applyFromURL`: `?status=vencido` → abre aba recebíveis; `?bloco=X` → navega para bloco X
- `setUpdStatus` integrado

### FASE 7 — Estoque (`estoque.html`)
- Pills todos dinâmicos substituindo hardcode: `pillRuptura`, `pillEvitavel`, `pillTotalSkus`, `pillCobCrit`, `pillVencidos`, `pillD7`, `pillD30`
- `NatGeoNav.applyFromURL`: `?filtro=critico` → aba disponibilidade; `?produto=NAME` → toast + aba
- `setUpdStatus` integrado

### FASE 8 — Dados honestos (transversal)
- Nenhum número inventado visível ao usuário; tudo em estado vazio até API retornar dados reais
- Removido o "proxy" onde dados de clientes eram usados como dados de pedidos

### FASE 9 — Interligação entre áreas (transversal)
- Links contextuais entre todas as 4 páginas com querystring preservada

### FASE 10 — Auditoria de segurança SQL
- Auditados: `customers.sync.ts`, `products.sync.ts`, `finance.sync.ts`, `inventory.sync.ts`, `sales-orders.sync.ts`, `oracle/client.ts`
- **Resultado: nenhuma vulnerabilidade** — todos usam bind variables nativas do oracledb (`:since`, `:batchSize`, `:id0..idN`)
- O aviso anterior sobre "linha 66-85" referia-se ao bloco de placeholders dinâmicos em `sales-orders.sync.ts`, que já estava corretamente parametrizado

### Bug fix pós-fases — Sidebar usuário stuck em "Carregando..."
- **Problema:** race condition entre `sidebar.js` (dispara `sidebarReady` no DOMContentLoaded) e `auth.js` (adiciona listener dentro de `requireAuth()`, chamado por `initDashboard()`). O evento podia ser perdido se disparado antes do listener ser registrado.
- **Solução:** `sidebar.js` lê `localStorage.getItem('natgeo_auth')` diretamente após injetar o HTML e preenche nome/iniciais/role sem depender de evento cruzado com `auth.js`.
- **Commit:** `3a736ce` — já em produção

---

## 4. Estado atual

### O que funciona
- As 4 páginas abertas (Dashboard, Comercial, Financeiro, Estoque) com navegação por querystring, polling 60s, status visual e dados honestos
- Controle de acesso: 4 abertas para todos; 9 bloqueadas com overlay para usuários comuns
- Sidebar unificada com usuário preenchido corretamente (fix do race condition em produção)
- Import CSV/Excel alinhado com endpoint correto do backend
- Oracle sync workers sem vulnerabilidades SQL
- GitHub e Coolify atualizados (último commit: `3a736ce`)

### O que está pendente / incompleto
- **Dados reais não chegam:** Oracle sync não está conectado a um Oracle real — páginas mostram estado vazio (pills zerados, tabelas sem linhas). Intencional, mas precisa de conexão Oracle para produção.
- **9 módulos bloqueados** são ainda placeholders com overlay.
- **Arquivos Python lixo na raiz** (nunca commitados): `fix_all.py`, `fix_sidebar.py`, `fix_sidebar2.py`, `fix_zeros.py`
- **Diretórios de teste não commitados:** `e2e/report/`, `e2e/screenshots/`, `test-results/`

---

## 5. Próximos passos

1. **Conectar Oracle ERP:** configurar variáveis de ambiente `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING` no Coolify e rodar o sync worker com `fullSync: true`
2. **Verificar `/api/config`:** confirmar que o endpoint retorna `supabaseUrl` e `supabaseAnonKey` corretamente em produção (usado por `auth.js` para refresh de token)
3. **Confirmar rota `/api/orders`:** checar em `src/api/server.ts` se `GET /api/orders` está roteado (repositório `src/repositories/orders.ts` existe, rota não verificada)
4. **Testar as 4 áreas com dados reais** após primeiro sync — verificar pills, gráficos e tabelas
5. **Implementar módulos bloqueados** em ordem de prioridade (sugestão: pedidos → cadastros → lancamentos → logistica)
6. **Limpar lixo:** deletar `fix_all.py`, `fix_sidebar.py`, `fix_sidebar2.py`, `fix_zeros.py` e adicionar `e2e/`, `test-results/` ao `.gitignore`

---

## 6. Perguntas em aberto

- **Oracle connection string:** qual é o `ORACLE_CONNECT_STRING` de produção? Está configurado no Coolify?
- **Supabase user metadata:** os usuários têm `full_name` e `role` em `user_metadata`? Se não, a sidebar sempre mostrará "Administrador" como role padrão. Avaliar se mudar o default ou configurar no painel Supabase.
- **Coolify webhook:** confirmado que está em auto-deploy por push no `main`? (Aparenta que sim, mas não foi testado explicitamente)
- **Rota `/api/orders`:** está exposta no server.ts? Não foi verificada nesta sessão.
- **Prioridade dos módulos bloqueados:** qual o próximo a implementar?

---

## 7. Artefatos relevantes

### Arquivos-chave do frontend
```
c:\Users\Natgeo50\Documents\dashboardnatgeo\
├── dashboard-distribuidora.html   # Dashboard principal
├── dashboard-comercial.html       # Área comercial
├── financeiro.html                # Financeiro (AR/AP)
├── estoque.html                   # Gestão de estoque
└── js/
    ├── api.js          # DashboardAPI + setUpdStatus
    ├── auth.js         # NatGeoAuth (sessão, requireAuth, signOut)
    ├── sidebar.js      # Sidebar injetada + preenchimento de usuário (fix race condition)
    ├── access.js       # Overlay de acesso para páginas bloqueadas
    ├── nav.js          # NatGeoNav (querystring helper) — NOVO nesta sessão
    └── import.js       # Upload CSV/Excel → /api/import/csv (corrigido nesta sessão)
```

### Arquivos-chave do backend
```
src/api/server.ts                          # Express server + todas as rotas
src/repositories/                          # Repositórios Supabase por entidade
workers/oracle-sync/entities/              # Sync workers Oracle → Supabase
  ├── customers.sync.ts
  ├── products.sync.ts
  ├── sales-orders.sync.ts
  ├── finance.sync.ts
  └── inventory.sync.ts
workers/oracle-sync/oracle/client.ts       # Pool Oracle + queryOracle()
```

### Padrão de sessão (`localStorage` key: `natgeo_auth`)
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1234567890,
  "user": {
    "email": "usuario@empresa.com",
    "user_metadata": {
      "full_name": "Nome Completo",
      "role": "Gerente"
    }
  }
}
```

### Padrão de navegação por querystring
```javascript
// Navegar para outra área com contexto
NatGeoNav.navTo('dashboard-comercial.html', { periodo: 'mes_atual', cliente: 'NomeCliente' });

// Ler parâmetros na página de destino
NatGeoNav.applyFromURL({
  periodo: function(v) { updateDashboard(v); },
  cliente: function(v) { document.getElementById('drillInp').value = v; }
});
```

### Padrão de status visual
```javascript
DashboardAPI.setUpdStatus('loading', 'Atualizando…');   // âmbar
DashboardAPI.setUpdStatus('ok', 'Atualizado às 14:32'); // verde
DashboardAPI.setUpdStatus('error', 'Erro ao atualizar'); // vermelho
```

### Ordem dos scripts no `<head>` de todas as páginas
```html
<script src="js/api.js"></script>
<script src="js/auth.js"></script>
<script src="js/access.js"></script>
<script src="js/sidebar.js"></script>
```
E no final do `<body>`, antes de `</body>`:
```html
<script src="js/nav.js"></script>
<script src="js/import.js"></script>
```

### Commits recentes
```
3a736ce fix: sidebar preenche usuário direto do localStorage sem race condition
717efa8 feat: cockpit gerencial completo — fases 1 a 10
d071a77 fix: period-bar comercial — remove zeroing block que quebrava troca de período
3465e5e feat: testes E2E Playwright + script de setup do usuário master
1c93dd1 feat: controle de acesso master/usuário + fix sidebar distribuidora
```

### Comandos úteis
```powershell
# Backend local
cd "c:\Users\Natgeo50\Documents\dashboardnatgeo"
npm run dev

# Oracle sync full
npx ts-node workers/oracle-sync/index.ts --full

# Ver status git
git log --oneline -10
git status
```

---

## 8. Instruções pra próxima sessão

- **Responder sempre em português** — o usuário é brasileiro
- **Não introduzir frameworks** — vanilla JS puro, sem React/Vue/Alpine/Svelte
- **Não deletar páginas existentes** — mesmo as 9 bloqueadas ficam intactas
- **Ler o arquivo antes de editar** — sempre usar Read antes de Edit (evita erro "File has not been read yet")
- **Commits descritivos** — padrão `feat:`, `fix:`, `style:`, `chore:`; push direto no `main`
- **Não inventar dados** — se API não retornar, mostrar estado vazio; zero tolerância a números fictícios no frontend
- **Arquivos Python na raiz** (`fix_all.py` etc.) são lixo de sessões antigas — podem ser deletados
- **`nav.js` vem antes de `import.js`** no final do body — manter essa ordem
- **Respostas curtas** — o usuário prefere ações concretas sem explicações longas
