# DATA SOURCES — NatGeo Dashboard

> Cada URL abaixo deve ser substituída pelo link real fornecido pela empresa.
> Procure por `https://PLACEHOLDER/` no arquivo `src/services/dataService.ts` e substitua.

## Requisito de CORS

Os arquivos JSON precisam ser servidos com o header:
```
Access-Control-Allow-Origin: *
```
Isso é de responsabilidade da empresa fornecedora. Sem esse header, o browser bloqueará as requisições (CORS policy).

---

## Arquivos esperados

### 📊 Dashboard — Somente leitura (gerados pelo sistema do fornecedor)

| Arquivo | URL Placeholder | Descrição |
|---------|----------------|-----------|
| `sales-summary.json` | `https://PLACEHOLDER/sales-summary.json` | Resumo mensal de vendas |
| `sales-by-day.json` | `https://PLACEHOLDER/sales-by-day.json` | Vendas agrupadas por dia |
| `sales-by-customer.json` | `https://PLACEHOLDER/sales-by-customer.json` | Ranking de clientes |
| `sales-by-product.json` | `https://PLACEHOLDER/sales-by-product.json` | Ranking de produtos |
| `inventory-summary.json` | `https://PLACEHOLDER/inventory-summary.json` | Resumo de estoque |
| `stock-by-product.json` | `https://PLACEHOLDER/stock-by-product.json` | Posição por produto |
| `expiring-lots.json` | `https://PLACEHOLDER/expiring-lots.json` | Lotes com vencimento próximo |
| `finance-summary.json` | `https://PLACEHOLDER/finance-summary.json` | Resumo financeiro |
| `sync-status.json` | `https://PLACEHOLDER/sync-status.json` | Status do último sync |
| `sync-errors.json` | `https://PLACEHOLDER/sync-errors.json` | Erros de sincronização |

### 🗃️ Cadastros — CRUD (leitura inicial via JSON; escrita em memória)

| Arquivo | URL Placeholder | Campos principais |
|---------|----------------|-------------------|
| `customers.json` | `https://PLACEHOLDER/customers.json` | id, name, document, email, phone, city, state, is_active |
| `products.json` | `https://PLACEHOLDER/products.json` | id, sku, name, category_id, unit, unit_cost, sale_price, min_stock, is_active |
| `categories.json` | `https://PLACEHOLDER/categories.json` | id, name, parent_id |
| `suppliers.json` | `https://PLACEHOLDER/suppliers.json` | id, name, document, email, phone, payment_term, is_active |
| `brands.json` | `https://PLACEHOLDER/brands.json` | id, name, is_active |
| `payment-methods.json` | `https://PLACEHOLDER/payment-methods.json` | id, name, installments, is_active |
| `sales-reps.json` | `https://PLACEHOLDER/sales-reps.json` | id, name, email, commission_pct, is_active |
| `carriers.json` | `https://PLACEHOLDER/carriers.json` | id, name, document, is_active |
| `cost-centers.json` | `https://PLACEHOLDER/cost-centers.json` | id, name, code, parent_id |
| `price-tables.json` | `https://PLACEHOLDER/price-tables.json` | id, name, valid_from, valid_to, is_active |
| `price-table-items.json` | `https://PLACEHOLDER/price-table-items.json` | id, price_table_id, product_id, price |

### 💰 Financeiro

| Arquivo | URL Placeholder | Campos principais |
|---------|----------------|-------------------|
| `accounts-receivable.json` | `https://PLACEHOLDER/accounts-receivable.json` | id, document_number, customer_id, due_date, status, face_value, balance, days_overdue |
| `accounts-payable.json` | `https://PLACEHOLDER/accounts-payable.json` | id, document_number, supplier_name, category, due_date, status, face_value, balance |
| `financial-categories.json` | `https://PLACEHOLDER/financial-categories.json` | id, name, type (income/expense), parent_id |
| `bank-accounts.json` | `https://PLACEHOLDER/bank-accounts.json` | id, name, bank, agency, account, balance, is_active |
| `transactions.json` | `https://PLACEHOLDER/transactions.json` | id, bank_account_id, category_id, type, amount, date, description |
| `cash-flow.json` | `https://PLACEHOLDER/cash-flow.json` | bank_account_id, month, opening_balance, inflow, outflow, closing_balance |

### 📦 Pedidos e Logística

| Arquivo | URL Placeholder | Campos principais |
|---------|----------------|-------------------|
| `orders.json` | `https://PLACEHOLDER/orders.json` | id, order_number, customer_id, order_date, status, total_value |
| `order-items.json` | `https://PLACEHOLDER/order-items.json` | id, order_id, product_id, sku, qty, unit_price, total_price |
| `drivers.json` | `https://PLACEHOLDER/drivers.json` | id, name, document, license_number, phone, is_active |
| `vehicles.json` | `https://PLACEHOLDER/vehicles.json` | id, plate, model, brand, year, capacity_kg, is_active |
| `delivery-routes.json` | `https://PLACEHOLDER/delivery-routes.json` | id, route_date, driver_id, vehicle_id, status, total_stops, total_km |

### 🏷️ Comercial

| Arquivo | URL Placeholder | Campos principais |
|---------|----------------|-------------------|
| `quotes.json` | `https://PLACEHOLDER/quotes.json` | id, quote_number, customer_id, status, total_value, valid_until |
| `quote-items.json` | `https://PLACEHOLDER/quote-items.json` | id, quote_id, product_id, qty, unit_price, total_price |
| `returns.json` | `https://PLACEHOLDER/returns.json` | id, return_number, order_id, customer_id, status, reason, total_value |
| `goals.json` | `https://PLACEHOLDER/goals.json` | id, year, month, sales_rep_id, target_revenue, target_orders |
| `commissions.json` | `https://PLACEHOLDER/commissions.json` | id, year, month, sales_rep_id, revenue, commission_pct, commission_value |
| `campaigns.json` | `https://PLACEHOLDER/campaigns.json` | id, name, status, start_date, end_date, discount_pct |
| `goals-vs-actual.json` | `https://PLACEHOLDER/goals-vs-actual.json` | year, month, sales_rep_id, target_revenue, actual_revenue, achievement_pct |
| `sales-rep-performance.json` | `https://PLACEHOLDER/sales-rep-performance.json` | sales_rep_id, sales_rep_name, month, revenue, orders, avg_ticket |

### 🧾 Fiscal

| Arquivo | URL Placeholder | Campos principais |
|---------|----------------|-------------------|
| `invoices.json` | `https://PLACEHOLDER/invoices.json` | id, invoice_number, series, order_id, customer_id, issue_date, status, total_value, access_key |
| `invoice-items.json` | `https://PLACEHOLDER/invoice-items.json` | id, invoice_id, product_id, qty, unit_price, cfop, ncm |
| `fiscal-config.json` | `https://PLACEHOLDER/fiscal-config.json` | tenant_id, cnpj, ie, crt, nfe_series, nfe_sequence, certificate_expiry |
| `tax-rules.json` | `https://PLACEHOLDER/tax-rules.json` | id, ncm, description, cst_icms, aliq_icms, cst_pis, aliq_pis |

### 📦 Estoque Estendido

| Arquivo | URL Placeholder | Campos principais |
|---------|----------------|-------------------|
| `critical-stock.json` | `https://PLACEHOLDER/critical-stock.json` | product_id, sku, product_name, warehouse, qty_available, min_stock, shortage |
| `stock-reservations.json` | `https://PLACEHOLDER/stock-reservations.json` | id, product_id, order_id, qty_reserved, status |
| `inventory-counts.json` | `https://PLACEHOLDER/inventory-counts.json` | id, status, warehouse, started_at, finished_at, created_by |
| `inventory-count-items.json` | `https://PLACEHOLDER/inventory-count-items.json` | id, count_id, product_id, system_qty, counted_qty, difference |
| `product-ranking.json` | `https://PLACEHOLDER/product-ranking.json` | product_id, sku, product_name, total_qty, total_revenue, rank |

### 🔗 Integrações

| Arquivo | URL Placeholder | Campos principais |
|---------|----------------|-------------------|
| `import-jobs.json` | `https://PLACEHOLDER/import-jobs.json` | id, entity, source, status, created_by, created_at, records_processed |
| `webhooks-log.json` | `https://PLACEHOLDER/webhooks-log.json` | id, source, event_type, status, received_at, ip_address |
| `api-keys.json` | `https://PLACEHOLDER/api-keys.json` | id, name, scopes, is_active, expires_at, created_by |

---

## Como substituir as URLs

1. Abra `src/services/dataService.ts`
2. Localize `export const DATA_SOURCES = {`
3. Substitua cada `'https://PLACEHOLDER/nome-do-arquivo.json'` pela URL real
4. Execute `npm run data:validate` para verificar se todas as URLs respondem

## Estrutura esperada dos JSONs

Todos os arquivos de **lista** devem retornar um **array JSON**:
```json
[
  { "id": "...", "campo1": "...", "campo2": "..." },
  { "id": "...", "campo1": "...", "campo2": "..." }
]
```

Os arquivos de **objeto único** (`sync-status.json`, `fiscal-config.json`, `inventory-summary.json`, `finance-summary.json`) podem retornar diretamente um objeto ou um array com um elemento:
```json
{ "tenant_id": "t1", "last_sync_at": "2024-05-18T10:00:00Z", ... }
```
