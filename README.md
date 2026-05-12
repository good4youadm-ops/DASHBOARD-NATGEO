# NatGeo Distribuidora — Dashboard de Gestão

Sistema de gestão SaaS para distribuidoras. Consolida dados do ERP Oracle em dashboards modernos, com sincronização automática, importação CSV/Excel e controle financeiro, comercial, de estoque e logística.

---

## Visão Geral

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5 + Vanilla JS + Chart.js |
| Backend | Node.js + Express + TypeScript |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (JWT) |
| ERP Legado | Oracle (sync via workers) |
| Deploy | Docker + Coolify |

---

## Módulos

| Módulo | Acesso | Status |
|--------|--------|--------|
| Dashboard Comercial | Todos | Ativo |
| Financeiro (AR/AP) | Todos | Ativo |
| Estoque | Todos | Ativo |
| Cadastros (Clientes, Produtos, Fornecedores) | Master | Ativo |
| Pedidos de Venda | Master | Ativo |
| Orçamentos | Master | Ativo |
| Fiscal (NF-e) | Master | Ativo |
| Fluxo de Caixa | Master | Ativo |
| Logística | Master | Ativo |
| Metas & Comissões | Master | Ativo |
| Estatísticas de Vendas | Master | Ativo |

---

## Pré-requisitos

- Node.js >= 20.0.0
- Docker + Docker Compose
- Conta Supabase (projeto criado)
- Oracle (opcional — necessário para sincronização automática)

---

## Configuração

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd dashboardnatgeo
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencher `.env`:

```env
# Aplicação
NODE_ENV=development
PORT=3001

# Supabase
SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Tenant padrão
SYNC_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001

# Oracle (opcional — necessário para sincronização)
ORACLE_USER=usuario
ORACLE_PASSWORD=senha
ORACLE_CONNECT_STRING=192.168.x.x:1521/ORCL

# CORS (em produção, definir o domínio real)
CORS_ORIGIN=*
```

### 3. Aplicar migrations no banco

```bash
npm run db:migrate
```

### 4. Criar usuário master

```bash
# Executar o script no painel SQL do Supabase
# supabase/setup_master_user.sql
```

---

## Desenvolvimento

```bash
# API em modo watch
npm run dev

# Import worker em modo watch
npm run import:worker:watch

# Sync Oracle (todas as entidades)
npm run sync:oracle

# Sync por entidade
npm run sync:oracle:customers
npm run sync:oracle:products
npm run sync:oracle:sales
npm run sync:oracle:inventory
npm run sync:oracle:finance

# Sync completo (ignora checkpoint)
npm run sync:oracle:full

# Sync em dry-run (não grava dados)
npm run sync:oracle:dry
```

---

## Deploy com Docker

### Produção

```bash
# Subir os 3 serviços (api + sync-worker + import-worker)
npm run docker:prod

# Acompanhar logs
npm run docker:logs

# Parar
npm run docker:down
```

### Serviços Docker

| Serviço | Descrição |
|---------|-----------|
| `api` | Servidor Express na porta 3001 |
| `sync-worker` | Sincronização com Oracle ERP |
| `import-worker` | Processamento de importações CSV/Excel |

### Deploy via Coolify

1. Conectar o repositório no Coolify com o build pack **Docker Compose**
2. Apontar para `docker-compose.prod.yml`
3. Configurar as variáveis de ambiente no painel
4. Clicar em **Deploy**

---

## Healthcheck

```bash
# Status básico
curl http://localhost:3001/health

# Status detalhado (Supabase, Oracle, sync)
curl http://localhost:3001/health/deep
```

---

## Sincronização Oracle

O sistema possui workers de sincronização incremental para:

- **Clientes** → tabela `customers`
- **Produtos** → tabela `products`
- **Pedidos de Venda** → tabelas `sales_orders` + `sales_order_items` + `invoices`
- **Estoque** → tabelas `stock_positions` + `stock_lots` + `inventory_movements`
- **Financeiro** → tabelas `accounts_receivable` + `accounts_payable`

O sync usa `source_id` (ID do Oracle) como chave de idempotência — registros são inseridos ou atualizados sem duplicação.

Após cada sync, as views materializadas são atualizadas automaticamente.

---

## Importação de dados (CSV/Excel)

A importação está disponível em qualquer dashboard via botão **Importar**.

- Formatos suportados: `.csv`, `.xlsx`
- Separadores detectados automaticamente (`,` ou `;`)
- Mapeamento de colunas via interface 3 passos
- Processamento assíncrono via `import-worker`
- Entidades suportadas: clientes, produtos, fornecedores, pedidos, contas a receber

---

## Testes

```bash
# Testes unitários
npm run test

# Testes em modo watch
npm run test:watch

# Cobertura
npm run test:coverage

# Testes E2E (Playwright)
npx playwright test
```

---

## Banco de Dados

```bash
# Aplicar migrations pendentes
npm run db:migrate

# Resetar banco (dev only)
npm run db:reset

# Regenerar tipos TypeScript
npm run db:types
```

### Migrations

22 migrations em `supabase/migrations/`. Cobertura completa:

- Multi-tenant com RLS
- Clientes, produtos, fornecedores
- Pedidos, notas fiscais
- Estoque (posições, lotes, movimentações)
- Financeiro (AR, AP)
- RBAC (roles, permissões)
- Master data (marcas, categorias, tabelas de preço, vendedores)
- Comercial (orçamentos, devoluções, metas, comissões)
- Logística (motoristas, veículos, rotas)
- Fiscal (NF-e, regras de imposto)
- Integrações (import jobs, webhooks, API keys)
- Views materializadas para dashboard

---

## Estrutura do Projeto

```
├── src/
│   ├── api/server.ts          # Servidor Express (126 rotas REST)
│   ├── middleware/rbac.ts     # Middleware de permissões por role
│   ├── repositories/          # Acesso ao banco por domínio (14 arquivos)
│   ├── lib/supabase/          # Clients Supabase (admin + browser)
│   └── mappings/              # Mapeamento de campos Oracle → banco
├── workers/
│   ├── oracle-sync/           # Workers de sincronização com Oracle
│   └── import-worker/         # Worker de importação CSV/Excel
├── supabase/
│   └── migrations/            # 22 migrations SQL
├── js/                        # Frontend vanilla JS
│   ├── api.js                 # Namespace DashboardAPI (todas as chamadas HTTP)
│   ├── auth.js                # Gerenciamento de sessão JWT
│   ├── access.js              # Controle de acesso por página
│   ├── sidebar.js             # Sidebar dinâmica
│   └── import.js              # Modal de importação 3 passos
├── *.html                     # 15 dashboards
├── Dockerfile
├── docker-compose.prod.yml
└── .env.example
```

---

## API

Todas as rotas `/api/*` requerem autenticação JWT via header:

```
Authorization: Bearer <access_token>
```

Exceções públicas: `GET /health`, `GET /health/deep`, `GET /api/config`

Documentação completa em [`RELATORIO_TECNICO_SINCRONIZACAO_DADOS.md`](./RELATORIO_TECNICO_SINCRONIZACAO_DADOS.md).

---

## Licença

Privado — NatGeo Distribuidora. Todos os direitos reservados.
