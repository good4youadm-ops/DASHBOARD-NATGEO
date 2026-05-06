# Plano de Integração de Dados — NatGeo Distribuidora

*Última atualização:* 2026-05-06
*Status geral:* Infraestrutura pronta; aguardando credenciais Oracle e mapeamento de colunas reais

---

## 1. Status atual

### O que já está pronto

| Componente | Status |
|---|---|
| Banco de dados Supabase | ✅ Migrations 001–022 rodadas |
| RLS (isolamento por tenant) | ✅ Ativo em todas as tabelas |
| RBAC (10 perfis de acesso) | ✅ Seed completo na migration 013 |
| Endpoints de dados (API Express) | ✅ CRUD completo para todas as entidades |
| Endpoints de dashboard agregados | ✅ Vendas, estoque, financeiro |
| Worker Oracle (estrutura) | ✅ 5 entidades: clientes, produtos, pedidos, estoque, financeiro |
| Mapeamentos Oracle → Supabase | ✅ Arquivos em `src/mappings/` |
| Job de importação CSV/XLSX | ✅ Registro criado em `import_jobs` |
| Logs e sync status | ✅ Winston + tabelas `sync_runs`, `sync_errors` |
| Segurança SQL | ✅ Bind variables em todo o Oracle sync |

### O que ainda está pendente

| Componente | Bloqueio |
|---|---|
| Worker Oracle rodando | Credenciais Oracle de produção |
| Processamento real de CSV/XLSX | Mapeamento real das colunas da distribuidora |
| Loop automático de sync | Configurar cron no Coolify/Docker |
| RBAC aplicado por endpoint | Implementação futura no server.ts |
| Alertas de falha de sync | Decisão de canal (email, Slack, webhook) |
| Validação de números vs. ERP | Dados reais necessários |

---

## 2. Fontes possíveis de dados

### Fonte 1 — Oracle ERP (principal)
O worker Oracle está estruturado e aguarda conexão. O sistema Oracle é a fonte de verdade para dados históricos e operacionais em andamento.

```
# Variáveis necessárias no .env / Coolify:
ORACLE_USER=...
ORACLE_PASSWORD=...
ORACLE_CONNECT_STRING=HOST:1521/SERVICE_NAME
```

### Fonte 2 — CSV/XLSX (importação histórica ou backup)
Para carga inicial ou quando o Oracle não está acessível. O front já coleta os cabeçalhos do arquivo e cria um job de importação. O **processamento real do arquivo** requer um worker que leia o CSV e mapeie as colunas para o schema do Supabase.

### Fonte 3 — Lançamentos manuais via interface
Já funcional. O usuário pode criar registros manualmente em Financeiro, Pedidos, Estoque via API REST.

---

## 3. Mapeamento Oracle → Supabase

### 3.1 Clientes (`CLIENTES` → `customers`)

| Oracle (`CLIENTES`) | Supabase (`customers`) | Tipo | Obrigatório |
|---|---|---|---|
| `CLIENTE_ID` | `source_id` | TEXT | Sim |
| `COD_CLIENTE` | `code` | TEXT | Não |
| `NOME_CLIENTE` | `name` | TEXT | **Sim** |
| `NOME_FANTASIA` | `trade_name` | TEXT | Não |
| `CNPJ_CPF` | `document` | TEXT | Não |
| `TIPO_PESSOA` | `document_type` | TEXT | Não |
| `EMAIL` | `email` | TEXT | Não |
| `TELEFONE` | `phone` | TEXT | Não |
| `SEGMENTO` | `segment` | TEXT | Não |
| `CLASSIFICACAO` | `classification` | TEXT | Não |
| `LIMITE_CREDITO` | `credit_limit` | NUMERIC | Não |
| `PRAZO_PAGTO` | `payment_terms` | TEXT | Não |
| `ATIVO` | `is_active` | BOOLEAN | Não |
| `DT_ATUALIZACAO` | `updated_at_source` | TIMESTAMPTZ | **Sim (checkpoint)** |

### 3.2 Produtos (`PRODUTOS` → `products`)

| Oracle (`PRODUTOS`) | Supabase (`products`) | Tipo | Obrigatório |
|---|---|---|---|
| `PRODUTO_ID` | `source_id` | TEXT | Sim |
| `COD_PRODUTO` | `sku` | TEXT | Não |
| `DESCRICAO` | `name` | TEXT | **Sim** |
| `CATEGORIA` | `category` | TEXT | Não |
| `MARCA` | `brand` | TEXT | Não |
| `FORNECEDOR_ID` | `supplier_id` (source ref) | TEXT | Não |
| `UNIDADE` | `unit` | TEXT | Não |
| `PRECO_CUSTO` | `cost_price` | NUMERIC | Não |
| `PRECO_VENDA` | `sale_price` | NUMERIC | Não |
| `CURVA_ABC` | `abc_curve` | CHAR(1) | Não |
| `VALIDADE_DIAS` | `shelf_life_days` | INTEGER | Não |
| `ESTOQUE_MINIMO` | `min_stock` | NUMERIC | Não |
| `PONTO_PEDIDO` | `reorder_point` | NUMERIC | Não |
| `ATIVO` | `is_active` | BOOLEAN | Não |
| `DT_ATUALIZACAO` | `updated_at_source` | TIMESTAMPTZ | **Sim** |

### 3.3 Pedidos (`PEDIDOS_VENDA` → `sales_orders`)

| Oracle (`PEDIDOS_VENDA`) | Supabase (`sales_orders`) | Tipo | Obrigatório |
|---|---|---|---|
| `PEDIDO_ID` | `source_id` | TEXT | Sim |
| `NR_PEDIDO` | `order_number` | TEXT | Não |
| `CLIENTE_ID` | `customer_source_id` | TEXT | Não |
| `DT_PEDIDO` | `order_date` | DATE | **Sim** |
| `DT_ENTREGA` | `delivery_date` | DATE | Não |
| `STATUS` | `status` | TEXT | Não |
| `VL_TOTAL` | `total_amount` | NUMERIC | Não |
| `VL_DESCONTO` | `discount_amount` | NUMERIC | Não |
| `VL_FRETE` | `freight_amount` | NUMERIC | Não |
| `VENDEDOR` | `salesperson` | TEXT | Não |
| `DT_ATUALIZACAO` | `updated_at_source` | TIMESTAMPTZ | **Sim** |

### 3.4 Itens de Pedido (`ITENS_PEDIDO` → `sales_order_items`)

| Oracle (`ITENS_PEDIDO`) | Supabase (`sales_order_items`) | Tipo | Obrigatório |
|---|---|---|---|
| `PEDIDO_ID` | `sales_order_source_id` | TEXT | Sim |
| `PRODUTO_ID` | `product_source_id` | TEXT | Sim |
| `DESCRICAO` | `product_name` | TEXT | Não |
| `QUANTIDADE` | `quantity` | NUMERIC | **Sim** |
| `VL_UNITARIO` | `unit_price` | NUMERIC | Não |
| `VL_TOTAL` | `total_amount` | NUMERIC | Não |

### 3.5 Estoque (`ESTOQUE_POSICAO` → `stock_positions`)

| Oracle (`ESTOQUE_POSICAO`) | Supabase (`stock_positions`) | Tipo | Obrigatório |
|---|---|---|---|
| `ESTOQUE_ID` | `source_id` | TEXT | Sim |
| `PRODUTO_ID` | `product_source_id` | TEXT | Sim |
| `DEPOSITO` | `warehouse` | TEXT | Não |
| `QTDE_DISPONIVEL` | `qty_available` | NUMERIC | Não |
| `QTDE_RESERVADA` | `qty_reserved` | NUMERIC | Não |
| `COBERTURA_DIAS` | `coverage_days` | INTEGER | Não |
| `CURVA_ABC` | `abc_curve` | CHAR(1) | Não |
| `RUPTURA` | `is_rupture` | BOOLEAN | Não |
| `DT_ATUALIZACAO` | `updated_at_source` | TIMESTAMPTZ | **Sim** |

### 3.6 Financeiro — A Receber (`TITULOS_RECEBER` → `accounts_receivable`)

| Oracle (`TITULOS_RECEBER`) | Supabase (`accounts_receivable`) | Tipo | Obrigatório |
|---|---|---|---|
| `TITULO_ID` | `source_id` | TEXT | Sim |
| `CLIENTE_ID` | `customer_source_id` | TEXT | Não |
| `DT_EMISSAO` | `issue_date` | DATE | Sim |
| `DT_VENCIMENTO` | `due_date` | DATE | **Sim** |
| `DT_PAGAMENTO` | `payment_date` | DATE | Não |
| `VL_ORIGINAL` | `face_value` | NUMERIC | **Sim** |
| `VL_PAGO` | `paid_amount` | NUMERIC | Não |
| `STATUS` | `status` | TEXT | Não |
| `FORMA_PAGTO` | `payment_method` | TEXT | Não |
| `DT_ATUALIZACAO` | `updated_at_source` | TIMESTAMPTZ | **Sim** |

### 3.7 Financeiro — A Pagar (`TITULOS_PAGAR` → `accounts_payable`)

| Oracle (`TITULOS_PAGAR`) | Supabase (`accounts_payable`) | Tipo | Obrigatório |
|---|---|---|---|
| `TITULO_ID` | `source_id` | TEXT | Sim |
| `FORNECEDOR_ID` | `supplier_source_id` | TEXT | Não |
| `NOME_FORNECEDOR` | `supplier_name` | TEXT | Não |
| `DT_VENCIMENTO` | `due_date` | DATE | **Sim** |
| `VL_ORIGINAL` | `face_value` | NUMERIC | **Sim** |
| `VL_PAGO` | `paid_amount` | NUMERIC | Não |
| `STATUS` | `status` | TEXT | Não |
| `CATEGORIA` | `category` | TEXT | Não |
| `DT_ATUALIZACAO` | `updated_at_source` | TIMESTAMPTZ | **Sim** |

---

## 4. Mapeamento CSV/XLSX → Supabase

**Status:** A ser definido junto com a distribuidora. O sistema já coleta os cabeçalhos do CSV e cria um job de importação, mas o processamento real depende do mapeamento abaixo ser preenchido.

### Campos mínimos por entidade para importação via CSV

#### Clientes
```
campos_minimos = ['nome', 'cnpj_cpf']
campos_opcionais = ['email', 'telefone', 'segmento', 'limite_credito']
```

#### Produtos
```
campos_minimos = ['descricao']
campos_opcionais = ['sku', 'categoria', 'preco_venda', 'estoque_minimo']
```

#### Pedidos
```
campos_minimos = ['dt_pedido', 'vl_total']
campos_opcionais = ['nr_pedido', 'cnpj_cliente', 'vendedor', 'status']
```

#### Financeiro (A Receber)
```
campos_minimos = ['dt_vencimento', 'vl_original']
campos_opcionais = ['cnpj_cliente', 'dt_emissao', 'status', 'forma_pagto']
```

> **⚠️ Ação necessária:** Solicitar ao técnico da distribuidora um arquivo CSV de exemplo de cada entidade. O time de implementação irá mapear os nomes de colunas reais para os campos acima.

---

## 5. Como conectar o Oracle (passo a passo)

### Pré-requisitos
1. Acesso à rede onde o servidor Oracle está hospedado (VPN, se necessário)
2. Usuário Oracle com permissão `SELECT` nas tabelas: `CLIENTES`, `PRODUTOS`, `PEDIDOS_VENDA`, `ITENS_PEDIDO`, `ESTOQUE_POSICAO`, `ESTOQUE_LOTES`, `TITULOS_RECEBER`, `TITULOS_PAGAR`
3. Oracle Instant Client instalado no servidor onde o worker rodará

### Passo 1 — Testar conexão básica
```bash
# Usando sqlplus (Oracle Instant Client)
sqlplus usuario/senha@HOST:1521/SERVICE_NAME

# Alternativa com Easy Connect
sqlplus usuario/senha@//HOST:1521/SERVICE_NAME
```

### Passo 2 — Configurar variáveis no Coolify
No painel do Coolify, projeto DASHBOARD-NATGEO, adicionar em "Environment Variables":
```
ORACLE_USER=usuario_oracle
ORACLE_PASSWORD=senha_oracle
ORACLE_CONNECT_STRING=192.168.x.x:1521/NOME_SERVICE
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=5
```

### Passo 3 — Rodar sync de teste (dry-run)
```bash
# No container, sem gravar nada no banco:
npx ts-node workers/oracle-sync/index.ts --dry-run

# Se OK, rodar full sync real:
npx ts-node workers/oracle-sync/index.ts --full
```

### Passo 4 — Validar dados
Depois do primeiro sync, verificar no Supabase SQL Editor:
```sql
SELECT COUNT(*) FROM customers  WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
SELECT COUNT(*) FROM products   WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
SELECT COUNT(*) FROM sales_orders WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
```

### Passo 5 — Configurar sync automático
Adicionar cron job no Coolify ou no `docker-compose.yml`:
```yaml
# Exemplo com cron interno no container
command: >
  sh -c "while true; do
    npx ts-node workers/oracle-sync/index.ts;
    sleep ${SYNC_INTERVAL_SECONDS:-1800};
  done"
```

Ou criar um serviço separado com cron externo (recomendado para produção):
```bash
# Crontab — a cada 30 minutos
*/30 * * * * cd /app && npx ts-node workers/oracle-sync/index.ts >> /var/log/sync.log 2>&1
```

---

## 6. Checklist de sincronização confiável

### Antes do primeiro sync
- [ ] Credenciais Oracle testadas com sqlplus
- [ ] Permissões SELECT confirmadas nas tabelas Oracle
- [ ] Variáveis de ambiente configuradas no Coolify
- [ ] Dry-run executado sem erros
- [ ] Backup do Supabase feito (pelo painel Supabase → Database → Backups)

### Após cada sync
- [ ] Verificar `/api/sync/status` — todas as entidades com `last_synced_at` recente
- [ ] Verificar `/api/sync/errors` — zero erros ou erros esperados documentados
- [ ] Checar `/health/deep` — `sync.ok === true`
- [ ] Comparar contagens no Supabase vs. contagens no Oracle (ver seção 7)

### Sinais de alerta
| Sinal | Causa provável | Ação |
|---|---|---|
| `sync_errors` com `error_msg` "ORA-12170" | Timeout de rede Oracle | Verificar VPN/firewall |
| `sync_errors` com "ORA-01017" | Senha Oracle incorreta | Atualizar variável no Coolify |
| `sync_errors` com "upsert failed" | Constraint violation no Supabase | Verificar mapeamento de campos |
| `last_synced_at` parado há >2h | Cron parou ou worker crashou | Reiniciar container do worker |

---

## 7. Checklist de validação de números

Após o primeiro sync real, comparar os valores abaixo entre o sistema Oracle e o Supabase:

| KPI | Query Oracle | Query Supabase | Tolerância |
|---|---|---|---|
| Total clientes ativos | `SELECT COUNT(*) FROM CLIENTES WHERE ATIVO='S'` | `SELECT COUNT(*) FROM customers WHERE is_active=true` | = |
| Total produtos ativos | `SELECT COUNT(*) FROM PRODUTOS WHERE ATIVO='S'` | `SELECT COUNT(*) FROM products WHERE is_active=true` | = |
| Faturamento mês atual | `SELECT SUM(VL_TOTAL) FROM PEDIDOS_VENDA WHERE ...` | `GET /api/dashboard/sales/summary?months=1` | ≤ 0.01% diff |
| A Receber em aberto | `SELECT SUM(VL_ORIGINAL) FROM TITULOS_RECEBER WHERE STATUS='A'` | `GET /api/dashboard/finance/receivable` | ≤ 0.01% diff |
| A Pagar em aberto | `SELECT SUM(VL_ORIGINAL) FROM TITULOS_PAGAR WHERE STATUS='A'` | `GET /api/dashboard/finance/payable` | ≤ 0.01% diff |
| Estoque (qty disponível) | `SELECT SUM(QTDE_DISPONIVEL) FROM ESTOQUE_POSICAO` | `SELECT SUM(qty_available) FROM stock_positions` | ≤ 1% diff |
| Pedidos mês atual | `SELECT COUNT(*) FROM PEDIDOS_VENDA WHERE ...` | `GET /api/orders?dateFrom=...` | = |

> **Nota:** Diferenças pequenas são esperadas se o sync ainda está em andamento ou se o Oracle usa timezone diferente. Diferenças >1% indicam problema de mapeamento.

---

## 8. Riscos e pendências

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Nomes de tabelas Oracle diferentes | Alta | Alto | Confirmar nomes reais com DBA antes do sync |
| Dados históricos muito grandes (>1M rows) | Média | Médio | Usar `--full` com `SYNC_BATCH_SIZE=100` e checkpoint incremental |
| Fuso horário Oracle ≠ UTC | Alta | Médio | Mapear `DT_ATUALIZACAO` com `AT TIME ZONE` se necessário |
| CSVs com separador diferente de `,` ou `;` | Alta | Baixo | Import.js detecta separador automaticamente |
| XLSX com múltiplas abas | Média | Médio | Worker CSV precisa de biblioteca (xlsx, exceljs) e instrução de qual aba |
| Campo Oracle sem correspondência direta | Média | Médio | Usar coluna `options JSONB` em cada tabela para campos extras |

---

## 9. Deploy e monitoramento

### Infraestrutura atual
- **Repositório:** `https://github.com/good4youadm-ops/DASHBOARD-NATGEO.git`
- **Deploy:** Coolify — auto-deploy por push no `main`
- **Banco:** Supabase (PostgreSQL gerenciado)
- **Logs:** Winston → `logs/api.log` dentro do container

### Verificações pós-deploy
```bash
# Health básico
curl https://SEU_DOMINIO/health

# Health profundo (Supabase + sync)
curl https://SEU_DOMINIO/health/deep

# Status do sync
curl -H "Authorization: Bearer TOKEN" https://SEU_DOMINIO/api/sync/status
```

### Pendências de infraestrutura
- [ ] Configurar SSL/domínio personalizado no Coolify
- [ ] Configurar backup automático no Supabase (painel → Database → Backups)
- [ ] Configurar monitoramento de uptime (UptimeRobot, Better Uptime, etc.) no endpoint `/health`
- [ ] Definir canal de alerta de falha de sync (email, webhook, Slack)
- [ ] Documentar processo de rollback (git revert + redeploy)

---

## 10. O que ainda depende de ação externa

| Item | Depende de |
|---|---|
| Sync Oracle real | Credenciais Oracle + acesso de rede |
| Mapeamento CSV/XLSX real | Amostras de arquivo da distribuidora |
| Validação de números | Dados reais + acesso ao Oracle para comparação |
| Loop automático de sync | Configuração de cron no Coolify |
| Alertas de falha | Decisão de canal de notificação |
| RBAC por endpoint | Implementação técnica futura (rbac.ts já existe, não conectado ao server.ts) |
| SSL/domínio | Configuração no Coolify |
