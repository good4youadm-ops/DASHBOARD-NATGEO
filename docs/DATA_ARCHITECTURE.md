# Arquitetura de Dados — Dashboard Natgeo

## Visão Geral

```
Oracle (ERP)
    │
    │  node-oracledb (pool)
    ▼
workers/oracle-sync   ◄── incremental via sync_state checkpoint
    │
    │  supabase-js (service_role)
    ▼
Supabase / PostgreSQL ── RLS por tenant_id
    │
    │  Views SQL agregadas
    ▼
src/api (Express)     ◄── porta 3001
    │
    │  fetch()
    ▼
HTML Dashboards       ◄── Chart.js 4.4.0
```

---

## Camadas

### 1. Migrations (`supabase/migrations/`)

| Arquivo | Conteúdo |
|---|---|
| 001_tenants_and_users.sql | Multi-tenant base, user_profiles, trigger updated_at |
| 002_sync_control.sql | sync_sources, sync_state, sync_runs, sync_errors, raw_oracle_records |
| 003_customers_and_products.sql | customers, products |
| 004_sales.sql | sales_orders, sales_order_items, invoices |
| 005_inventory.sql | stock_positions, stock_lots, inventory_movements |
| 006_finance.sql | accounts_receivable, accounts_payable, audit_logs |
| 007_views.sql | 10 views agregadas para os dashboards |
| 008_rls.sql | Row Level Security em todas as tabelas, função get_user_tenant_id() |

**Total: 18 tabelas + 10 views**

### 2. Oracle Sync Worker (`workers/oracle-sync/`)

Executa sincronização incremental do Oracle para Supabase.

**Fluxo por entidade:**
1. Lê checkpoint de `sync_state` (último `DT_ATUALIZACAO` processado)
2. Query Oracle com filtro `WHERE DT_ATUALIZACAO > :since`
3. Mapeia campos Oracle → Supabase via `src/mappings/`
4. Upsert via `UNIQUE(tenant_id, source_system, source_id)`
5. Salva novo checkpoint em `sync_state`

**Entidades sincronizadas:**
- `customers` ← tabela `CLIENTES`
- `products` ← tabela `PRODUTOS`
- `sales_orders` + `sales_order_items` ← `PEDIDOS_VENDA` + `PEDIDOS_VENDA_ITENS`
- `stock_positions` + `stock_lots` ← `ESTOQUE_POSICAO` + `ESTOQUE_LOTES`
- `accounts_receivable` ← `TITULOS_RECEBER`
- `accounts_payable` ← `TITULOS_PAGAR`

**Comandos:**
```bash
npm run sync:oracle          # sync incremental de tudo
npm run sync:oracle:full     # sync completo (ignora checkpoint)
npm run sync:oracle:dry      # dry run (não grava)
npm run sync:oracle:customers  # só clientes
npm run sync:oracle:products   # só produtos
npm run sync:oracle:sales      # só pedidos
npm run sync:oracle:inventory  # só estoque
npm run sync:oracle:finance    # só financeiro
```

### 3. Supabase Client (`src/lib/supabase/`)

| Arquivo | Uso |
|---|---|
| `client.ts` | Frontend (anon key, RLS ativo, sessão do usuário) |
| `server.ts` | Server-side com access token forward |
| `admin.ts` | Sync worker e API server (service_role, bypassa RLS) |
| `types.ts` | Tipos TypeScript manuais (gerar definitivo com `npm run db:types`) |

### 4. Mappings (`src/mappings/`)

Convertem o formato Oracle (nomes em maiúsculas, tipos variados) para o schema Supabase.

Regras de conversão:
- `'S'/'N'` → `boolean`
- Campos `DT_*` → `DATE` string `'YYYY-MM-DD'`
- Status Oracle (`'A'`, `'P'`, `'V'`...) → enum Supabase (`'open'`, `'paid'`, `'overdue'`...)
- `CNPJ_CPF` + `TIPO_PESSOA` → `document` + `document_type` ('cpf'|'cnpj'|'outros')

### 5. Repository Layer (`src/repositories/`)

Encapsula queries ao Supabase. Cada função recebe o cliente e o `tenantId`, retornando dados das views.

### 6. API Express (`src/api/server.ts`)

REST API que expõe os dados para o frontend HTML.

**Endpoints:**
```
GET /health
GET /api/dashboard/sales/summary?months=12
GET /api/dashboard/sales/by-day
GET /api/dashboard/sales/customers?limit=20
GET /api/dashboard/sales/products?limit=20
GET /api/dashboard/inventory/summary
GET /api/dashboard/inventory/products?warehouse=&abcCurve=&alertOnly=
GET /api/dashboard/inventory/expiring?daysAhead=90
GET /api/dashboard/finance/summary
GET /api/dashboard/finance/receivable?bucket=
GET /api/dashboard/finance/payable?bucket=&category=
GET /api/sync/status
GET /api/sync/errors?limit=50
```

### 7. Frontend (`src/hooks/` + `src/services/api.ts`)

Os dashboards HTML chamam `src/services/api.ts` que faz `fetch()` para a API Express.
Em dev sem API, usar `src/mocks/` para simular os dados.

---

## Multi-Tenant

Todas as tabelas têm `tenant_id UUID NOT NULL`. O RLS garante que cada usuário autenticado veja apenas os dados do seu tenant (via `get_user_tenant_id()` que faz lookup em `user_profiles`).

O sync worker usa `service_role` key que bypassa RLS, gravando sempre com o `SYNC_DEFAULT_TENANT_ID` do `.env`.

---

## Deploy (VPS)

```bash
cp .env.example .env
# Preencher variáveis Oracle, Supabase, etc.

docker compose up -d

# Rodar migrations no Supabase (via dashboard ou CLI):
# supabase db push

# Sync full inicial:
docker compose run --rm sync-worker npx tsx workers/oracle-sync/index.ts all --full
```

O `docker-compose.yml` sobe dois serviços:
- `api` — Express na porta 3001
- `sync-worker` — loop de sync a cada `SYNC_INTERVAL_SECONDS` (padrão 1800s = 30min)

---

## Colunas Geradas (PostgreSQL)

Campos calculados automaticamente pelo banco, não precisam ser enviados no upsert:

| Tabela | Coluna | Cálculo |
|---|---|---|
| accounts_receivable | `balance` | face_value - paid_amount + interest_amount - discount_amount |
| accounts_receivable | `days_overdue` | GREATEST(0, CURRENT_DATE - due_date) quando não pago |
| accounts_payable | `balance` | idem |
| accounts_payable | `days_overdue` | idem |
| stock_positions | `qty_physical` | qty_available + qty_reserved + qty_blocked |
| stock_positions | `total_cost` | qty_physical * avg_cost |
| stock_lots | `days_to_expiry` | expiry_date - CURRENT_DATE |
| stock_lots | `total_cost` | qty_current * unit_cost |
