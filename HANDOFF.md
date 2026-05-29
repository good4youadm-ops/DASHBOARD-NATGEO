# HANDOFF — NatGeo Dashboard (Cockpit Gerencial Distribuidora)

> Leia este arquivo completo antes de tocar qualquer código.
> Ele contém o contexto completo do projeto, os problemas críticos a corrigir e o plano de refatoração validado pelo desenvolvedor.

---

## 1. O que é este projeto

Cockpit gerencial para uma distribuidora brasileira. O sistema exibe dados operacionais (vendas, estoque, financeiro, fiscal, logística) que vêm de um ERP Oracle, sincronizados para um banco Supabase/PostgreSQL e servidos por uma API Node.js/Express. O frontend é HTML + JavaScript puro (zero frameworks).

**Repositório:** `https://github.com/good4youadm-ops/DASHBOARD-NATGEO.git`
**Produção:** Coolify (self-hosted Docker) em `http://byy6u6lkrgic5tca4vlhvgy8.177.7.43.206.sslip.io`
**Deploy:** automático ao dar push na `main` (Coolify monitora o repo)
**Usuário master:** `ferrerjoao2206@gmail.com` (acesso irrestrito)

---

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript vanilla (IIFE modules) |
| Backend API | Node.js 20 + Express + TypeScript |
| Banco de dados | Supabase (PostgreSQL) |
| ERP fonte | Oracle (sincronização via worker separado) |
| Logger | Winston |
| Validação | Zod |
| Segurança | Helmet, CORS, rate-limit (express-rate-limit) |
| Build | tsc (TypeScript compiler) |
| Testes | Vitest (unit) + Playwright (e2e) |
| Container | Docker multi-stage (node:20-slim) |
| Deploy | Coolify (monitora GitHub main) |

**Porta padrão:** 3001
**Entry point produção:** `node dist/src/api/server.js`

---

## 3. Estrutura de diretórios

```
/
├── src/
│   ├── api/
│   │   └── server.ts          ← API Express principal (1420 linhas — PRECISA SER DIVIDIDO, ver seção 9)
│   ├── middleware/
│   │   └── rbac.ts            ← requireAuth() mais elaborado — NÃO está sendo usado pelo server.ts (código conflitante)
│   ├── repositories/          ← Acesso a dados (fetchJSON de DATA_SOURCES)
│   │   ├── sales.ts
│   │   ├── inventory.ts
│   │   ├── finance.ts
│   │   ├── finance-extended.ts
│   │   ├── customers.ts
│   │   ├── products.ts
│   │   ├── suppliers.ts
│   │   ├── orders.ts
│   │   ├── logistics.ts
│   │   ├── master-data.ts
│   │   ├── commercial.ts
│   │   ├── fiscal.ts
│   │   ├── stock-extended.ts
│   │   ├── integrations.ts
│   │   └── sync.ts
│   ├── services/
│   │   ├── dataService.ts     ← Centraliza DATA_SOURCES URLs + fetchJSON + cache 5min + CRUD em memória
│   │   └── api.ts
│   ├── hooks/                 ← Hooks de sincronização (useDashboard*, useSyncStatus)
│   ├── mappings/              ← Transformações Oracle → Supabase (customers, finance, inventory, products, sales-orders)
│   ├── mocks/                 ← Dados mock para dev/testes
│   └── types/
│       └── oracledb.d.ts
├── workers/
│   ├── oracle-sync/           ← Sincroniza Oracle → Supabase (clientes, produtos, pedidos, inventário, finanças)
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── entities/          ← customers.sync.ts, finance.sync.ts, inventory.sync.ts, products.sync.ts, sales-orders.sync.ts
│   │   ├── oracle/client.ts
│   │   ├── supabase/client.ts
│   │   └── utils/             ← checkpoint.ts, logger.ts, upsert.ts
│   └── import-worker/
│       └── index.ts           ← Processa jobs de importação CSV/XLSX
├── supabase/
│   └── migrations/            ← 22 arquivos SQL (001 a 022) + setup_master_user.sql
├── js/                        ← Frontend JavaScript (vanilla)
│   ├── api.js                 ← Cliente HTTP: apiFetch() + todos os endpoints organizados por módulo
│   ├── auth.js                ← Gestão de sessão via localStorage + token refresh Supabase
│   ├── nav.js                 ← NatGeoNav: navegação por querystring entre páginas
│   ├── sidebar.js             ← Sidebar responsiva
│   ├── access.js              ← Controle de acesso (overlay para módulos bloqueados)
│   └── import.js              ← UI de importação CSV/XLSX
├── css/
│   └── responsive.css
├── *.html                     ← 13 páginas de dashboard (ver seção 5)
├── e2e/                       ← Testes Playwright (comercial, dashboard, estoque, financeiro)
├── tests/repositories/        ← Testes Vitest (customers, finance, orders)
├── scripts/
│   └── seed-users.ts
├── docs/                      ← DATA_ARCHITECTURE.md, DATA_INTEGRATION_PLAN.md
├── Dockerfile                 ← Multi-stage: deps → builder → production
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── CLAUDE.md                  ← Config do deploy Coolify
└── package.json
```

### Arquivos mortos na raiz (podem ser deletados com segurança)

Estes arquivos não fazem parte do sistema e poluem o repositório:

- `fix_all.py`, `fix_sidebar.py`, `fix_sidebar2.py`, `fix_zeros.py` — scripts Python de manutenção pontual, já executados
- `dashboard_good4you.gs` — Google Apps Script, sem uso no projeto atual
- `link-bio.html` — página independente sem relação com o dashboard
- `README.md.local_backup` — backup manual desatualizado
- `RELATORIO_TECNICO_SINCRONIZACAO_DADOS.md` — documento pontual, obsoleto

---

## 4. Páginas HTML (frontend)

| Arquivo | Módulo | Status |
|---|---|---|
| `login.html` | Autenticação | Aberto |
| `reset-password.html` | Recuperação de senha | Aberto |
| `dashboard-distribuidora.html` | Visão geral | **Aberto** |
| `dashboard-comercial.html` | Comercial | **Aberto** |
| `financeiro.html` | Financeiro | **Aberto** |
| `estoque.html` | Estoque | **Aberto** |
| `pedidos.html` | Pedidos | Bloqueado |
| `logistica.html` | Logística | Bloqueado |
| `fiscal.html` | Fiscal | Bloqueado |
| `fluxo-caixa.html` | Fluxo de caixa | Bloqueado |
| `lancamentos.html` | Lançamentos | Bloqueado |
| `metas.html` | Metas | Bloqueado |
| `orcamentos.html` | Orçamentos | Bloqueado |
| `estatistica-vendas.html` | Estatísticas | Bloqueado |
| `cadastros.html` | Cadastros | Bloqueado |

**Módulos bloqueados** mostram overlay para usuários comuns. O usuário master (`ferrerjoao2206@gmail.com`) acessa tudo via `isMaster()` em `js/auth.js`.

---

## 5. Como a autenticação funciona

### Frontend (`js/auth.js`)

- Sessão armazenada no `localStorage` (access_token, refresh_token, expires_at, user)
- `requireAuth()` no frontend valida expiração e tenta refresh via endpoint Supabase antes de redirecionar para `login.html`
- `populateSidebarUser()` preenche nome/iniciais/cargo após evento `sidebarReady`
- `isMaster()` verifica se o email logado é o master — dá acesso aos módulos bloqueados

### Backend (`src/api/server.ts`)

- Todas as rotas `/api/*` (exceto `/api/config`) são protegidas por `requireAuth` inline no server.ts
- Autenticação via Bearer token: `Authorization: Bearer <API_AUTH_TOKEN>`
- **PROBLEMA CRÍTICO — ver seção 8**

### Frontend → Backend (`js/api.js`)

- `apiFetch()` faz todas as chamadas HTTP com timeout de 8s
- `Authorization: Bearer <global.__authToken>` em cada request
- Redireciona para `login.html` ao receber 401
- Base URL via `global.__API_URL__` ou `localhost:3001`

---

## 6. Banco de dados (Supabase)

22 migrations SQL em `supabase/migrations/`:

| Migration | Conteúdo |
|---|---|
| 001 | Tenants e usuários |
| 002 | Controle de sincronização |
| 003 | Clientes e produtos |
| 004 | Vendas |
| 005 | Inventário |
| 006 | Financeiro |
| 007 | Views |
| 008 | RLS (Row Level Security) |
| 009 | Fornecedores |
| 010 | Melhorias gerais |
| 011 | Audit triggers |
| 012 | Logística |
| 013 | RBAC |
| 014 | Dados mestres |
| 015 | Comercial |
| 016 | Estoque estendido |
| 017 | Financeiro estendido |
| 018 | Fiscal |
| 019 | Logística estendida |
| 020 | Integrações |
| 021 | Views BI |
| 022 | Performance (índices) |

**Nota:** Os repositórios em `src/repositories/` **não usam o client Supabase diretamente**. Eles consomem URLs JSON externas via `fetchJSON` de `src/services/dataService.ts`. O Supabase é alimentado pelo worker `oracle-sync` e usado pelo frontend via CDN do supabase-js apenas no login.

---

## 7. Workers

### `workers/oracle-sync/`

Sincroniza Oracle → Supabase. Entidades: clientes, produtos, pedidos de vendas, inventário, finanças.

```bash
npm run sync:oracle          # sincronização incremental
npm run sync:oracle:full     # sincronização completa
npm run sync:oracle:dry      # simulação sem gravar
```

Se `ORACLE_USER/PASSWORD/CONNECT_STRING` não estiverem configurados, o worker entra em modo de espera (não falha). Usa Oracle thin driver (JavaScript puro, sem Oracle Instant Client nativo).

### `workers/import-worker/`

Processa jobs de importação CSV/XLSX criados pelo endpoint `/api/import/csv`. Roda de forma assíncrona após o job ser enfileirado.

---

## 8. PROBLEMAS CRÍTICOS — DEVEM SER CORRIGIDOS

### Problema 1: `requireAuth` fail-open (SEGURANÇA CRÍTICA)

**Arquivo:** `src/api/server.ts`, linhas 143–152

**Código atual (perigoso):**
```typescript
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const apiAuthToken = process.env.API_AUTH_TOKEN;
  if (!apiAuthToken) { next(); return; }  // ← ABRE TUDO SE A ENV NÃO EXISTIR
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== apiAuthToken) {
    res.status(401).json({ error: 'Token de autenticação inválido' });
    return;
  }
  next();
}
```

**Por que é perigoso:** Se `API_AUTH_TOKEN` não estiver no `.env` de produção (erro humano, rollout de config, restart de container sem env injetado), a API fica **100% aberta** sem nenhuma autenticação. Dados financeiros ficam expostos.

**Correção obrigatória (fail-closed):**
```typescript
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const apiAuthToken = process.env.API_AUTH_TOKEN;
  if (!apiAuthToken) {
    res.status(500).json({ error: 'Servidor mal configurado: API_AUTH_TOKEN ausente' });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== apiAuthToken) {
    res.status(401).json({ error: 'Token de autenticação inválido' });
    return;
  }
  next();
}
```

**Também existe uma segunda implementação conflitante em `src/middleware/rbac.ts`** com o mesmo problema de fail-open (ver Problema 3 abaixo).

---

### Problema 2: `server.ts` com 1420 linhas (7 responsabilidades diferentes)

**Arquivo:** `src/api/server.ts`

O arquivo faz tudo junto: configura o Express, define o logger Winston, implementa o middleware de auth, define todos os Zod schemas, implementa todos os 60+ endpoints. Isso torna manutenção impossível.

**Plano de divisão em 7 módulos (sem mudar nenhum comportamento externo):**

```
src/api/
├── server.ts           ← Vira thin entry point: dotenv.config() + valida env + app.listen() (~15 linhas)
├── app.ts              ← Express setup: static files, helmet, cors, rate-limit, request logger, monta todas as rotas
├── logger.ts           ← Apenas a configuração do Winston (createLogger exportado)
├── auth.ts             ← requireAuth() corrigido (fail-closed) + middleware de rota /api
├── validators.ts       ← Todos os Zod schemas reutilizáveis + parseQuery() + errMsg()
└── routes/
    ├── health.ts       ← GET /health, GET /health/deep, GET /api/config
    ├── dashboard.ts    ← GET /api/dashboard/* (sales, inventory, finance) + /api/sync/*
    ├── entities.ts     ← CRUD /api/customers, /api/products, /api/suppliers, /api/orders, /api/stock/movements
    ├── finance.ts      ← /api/receivable, /api/payable, /api/bank-accounts, /api/transactions, /api/cash-flow,
    │                      /api/quotes, /api/goals, /api/commissions, /api/returns
    ├── catalog.ts      ← /api/drivers, /api/vehicles, /api/routes, /api/brands, /api/categories,
    │                      /api/payment-methods, /api/reps, /api/carriers, /api/cost-centers,
    │                      /api/invoices, /api/fiscal-configs, /api/tax-rules,
    │                      /api/stock/counts, /api/stock/critical
    └── integrations.ts ← /api/import/csv, /api/webhooks/*, /api/bi/*
```

**Regras para a refatoração:**
1. Nenhum endpoint muda de URL, método HTTP, parâmetros ou formato de resposta
2. Os repositórios (`src/repositories/`) não são tocados
3. O logger Winston exportado de `logger.ts` é importado por todos os outros módulos
4. Cada arquivo de rota exporta um `Router` do Express
5. `app.ts` monta todos os routers com `app.use()`
6. `server.ts` final tem ~15 linhas: dotenv, validação de env, import app, app.listen()

---

### Problema 3: Código conflitante — dois `requireAuth` diferentes

**Situação:** Existem duas implementações da mesma função:

- `src/api/server.ts` linha 143: versão simples inline, **É ESTA QUE ESTÁ EM USO**
- `src/middleware/rbac.ts`: versão mais elaborada com cache de permissões, `AuthRequest` type, `loadUserPermissions`, `invalidatePermissionCache` — **NÃO está sendo importada pelo server.ts**

O `rbac.ts` também tem o mesmo padrão fail-open (`if (!apiAuthToken) { ... next(); return; }` com usuário fictício).

**Decisão recomendada:** Deletar `src/middleware/rbac.ts` e consolidar tudo no novo `src/api/auth.ts` (após a refatoração). O RBAC elaborado do `rbac.ts` pressupõe um sistema de roles que não existe. Implementar quando/se houver múltiplos perfis reais.

---

### Problema 4: Arquivos mortos na raiz do projeto

Deletar os seguintes arquivos que não fazem parte do sistema:

```bash
git rm fix_all.py fix_sidebar.py fix_sidebar2.py fix_zeros.py
git rm dashboard_good4you.gs
git rm link-bio.html
git rm README.md.local_backup
git rm RELATORIO_TECNICO_SINCRONIZACAO_DADOS.md
```

---

## 9. Variáveis de ambiente

```bash
# App
NODE_ENV=production
PORT=3001

# Autenticação da API (OBRIGATÓRIO — sem isso a API retorna 500 após a correção)
API_AUTH_TOKEN=<token-longo-aleatorio>

# Tenant padrão (OBRIGATÓRIO — server faz process.exit(1) sem este)
SYNC_DEFAULT_TENANT_ID=<uuid-do-tenant>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Oracle (worker de sincronização)
ORACLE_USER=<usuario>
ORACLE_PASSWORD=<senha>
ORACLE_CONNECT_STRING=<host>:<porta>/<service>
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=10
ORACLE_POOL_INCREMENT=1
ORACLE_CONNECT_TIMEOUT=30

# Sincronização
SYNC_SOURCE_NAME=oracle
SYNC_BATCH_SIZE=500
SYNC_INTERVAL_SECONDS=300
DRY_RUN=false

# CORS (em produção restringir a origem real)
CORS_ORIGIN=*

# Logs
LOG_LEVEL=info
LOG_FILE=logs/api.log

# Segurança
API_SECRET_KEY=<gerar-chave-aleatoria>
INTEGRATION_ENCRYPTION_KEY=<gerar-chave-aleatoria>
```

---

## 10. Como rodar localmente

```bash
npm install
npm run dev          # desenvolvimento com ts-node watch
npm run build        # compila TypeScript para dist/
npm start            # roda produção compilado

npm run sync:oracle          # sync incremental
npm run sync:oracle:full     # sync completo
npm run sync:oracle:dry      # dry-run

npm test             # vitest
npm run test:e2e     # playwright
```

---

## 11. Regras imutáveis do projeto

Estas decisões foram tomadas deliberadamente e **não devem ser revertidas:**

1. **Zero frameworks no frontend** — HTML + CSS + JS vanilla. Sem React, Vue, Svelte.
2. **Sem FormData** — todas as chamadas HTTP usam JSON no body.
3. **Nunca deletar páginas HTML existentes** — mesmo as bloqueadas são placeholders intencionais.
4. **Zero dados fictícios visíveis ao usuário** — se não há dados reais, mostrar estado vazio.
5. **Multi-tenancy via `SYNC_DEFAULT_TENANT_ID`** — todos os repositórios filtram por tenant.
6. **Oracle thin driver** — sem dependência de Oracle Instant Client nativo.
7. **Servidor estático embutido** — o Express serve os HTMLs diretamente.

---

## 12. Estado atual do projeto

**Funciona em produção:**
- Navegação por querystring (`NatGeoNav`)
- Polling de dados a cada 60 segundos
- Status visual de atualização (`DashboardAPI.setUpdStatus`)
- Controle de acesso com overlay para usuários comuns
- Sidebar com usuário preenchido (race condition corrigida)
- Workers Oracle sem vulnerabilidades de SQL injection

**Pendente (intencional):**
- Dados reais do ERP Oracle (conexão Oracle não configurada em produção ainda)
- 9 módulos HTML ainda são placeholders visuais

**Pendente (correções técnicas — foco desta sessão):**
1. Corrigir `requireAuth` para fail-closed em `src/api/server.ts:143` — **prioridade máxima**
2. Dividir `src/api/server.ts` (1420 linhas) nos 7 módulos descritos na seção 8
3. Deletar `src/middleware/rbac.ts` (código conflitante não utilizado)
4. Deletar arquivos mortos da raiz

---

*Gerado em 2026-05-29*
