-- =============================================================================
-- MIGRATION 022: Performance — Índices faltantes + Views materializadas
-- =============================================================================

-- ── Índices faltantes ────────────────────────────────────────────────────────

-- sales_orders: filtro por representante de vendas (usado em metas, comissões)
CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_rep
  ON sales_orders(tenant_id, sales_rep_id)
  WHERE sales_rep_id IS NOT NULL;

-- sales_orders: filtro combinado status + data (listagens com paginação)
CREATE INDEX IF NOT EXISTS idx_sales_orders_status_date
  ON sales_orders(tenant_id, status, order_date DESC);

-- accounts_receivable: filtro combinado status + vencimento (aging)
CREATE INDEX IF NOT EXISTS idx_ar_due_date_status
  ON accounts_receivable(tenant_id, status, due_date);

-- transactions: filtro por conta + data (fluxo de caixa)
CREATE INDEX IF NOT EXISTS idx_transactions_date_account
  ON transactions(tenant_id, bank_account_id, transaction_date DESC);

-- deliveries: filtro combinado status + data (logística)
CREATE INDEX IF NOT EXISTS idx_deliveries_status_date
  ON deliveries(tenant_id, status, created_at DESC);

-- goals: filtro por representante + período (metas)
CREATE INDEX IF NOT EXISTS idx_goals_rep_period
  ON goals(tenant_id, sales_rep_id, period_year, period_month);

-- quotes: filtro por status (orçamentos)
CREATE INDEX IF NOT EXISTS idx_quotes_status
  ON quotes(tenant_id, status, created_at DESC);

-- invoices: filtro por status + direção + data (fiscal)
CREATE INDEX IF NOT EXISTS idx_invoices_status_dir_date
  ON invoices(tenant_id, status, direction, issue_date DESC);

-- ── Views Materializadas ─────────────────────────────────────────────────────
-- Substitui as views normais que fazem full scan a cada requisição do dashboard.
-- Atualizar via: SELECT refresh_dashboard_views();
-- Em produção, agendar via pg_cron ou chamar após cada sync Oracle.

-- Resumo mensal de vendas (card principal do dashboard)
DROP VIEW IF EXISTS vw_dashboard_sales_summary CASCADE;
CREATE MATERIALIZED VIEW vw_dashboard_sales_summary AS
SELECT
  so.tenant_id,
  DATE_TRUNC('month', so.order_date)::DATE        AS month,
  COUNT(DISTINCT so.id)                            AS total_orders,
  COUNT(DISTINCT so.customer_id)                   AS unique_customers,
  SUM(so.total_amount)                             AS gross_revenue,
  SUM(so.discount_amount)                          AS total_discounts,
  SUM(so.total_amount - COALESCE(so.discount_amount, 0)) AS net_revenue,
  SUM(so.freight_amount)                           AS total_freight,
  AVG(so.total_amount)                             AS avg_ticket,
  COUNT(DISTINCT so.id) FILTER (WHERE so.status = 'delivered')  AS delivered_orders,
  COUNT(DISTINCT so.id) FILTER (WHERE so.status = 'cancelled')  AS cancelled_orders,
  COUNT(DISTINCT so.id) FILTER (WHERE so.status = 'pending')    AS pending_orders
FROM sales_orders so
GROUP BY so.tenant_id, DATE_TRUNC('month', so.order_date)
WITH NO DATA;

CREATE UNIQUE INDEX ON vw_dashboard_sales_summary(tenant_id, month);

-- Ranking de clientes por faturamento
DROP VIEW IF EXISTS vw_sales_by_customer CASCADE;
CREATE MATERIALIZED VIEW vw_sales_by_customer AS
SELECT
  so.tenant_id,
  so.customer_id,
  c.name                            AS customer_name,
  c.document                        AS customer_document,
  c.classification                  AS abc_curve,
  c.segment,
  COUNT(DISTINCT so.id)             AS total_orders,
  SUM(so.total_amount)              AS total_revenue,
  AVG(so.total_amount)              AS avg_ticket,
  MAX(so.order_date)                AS last_order_date,
  MIN(so.order_date)                AS first_order_date
FROM sales_orders so
JOIN customers c ON c.id = so.customer_id
WHERE so.status NOT IN ('cancelled')
GROUP BY so.tenant_id, so.customer_id, c.name, c.document, c.classification, c.segment
WITH NO DATA;

CREATE UNIQUE INDEX ON vw_sales_by_customer(tenant_id, customer_id);
CREATE INDEX ON vw_sales_by_customer(tenant_id, total_revenue DESC);

-- Ranking de produtos por faturamento
DROP VIEW IF EXISTS vw_sales_by_product CASCADE;
CREATE MATERIALIZED VIEW vw_sales_by_product AS
SELECT
  soi.tenant_id,
  soi.product_id,
  p.name                             AS product_name,
  p.sku,
  p.category,
  SUM(soi.quantity)                  AS total_quantity,
  SUM(soi.total_amount)              AS total_revenue,
  COUNT(DISTINCT soi.sales_order_id) AS total_orders,
  AVG(soi.unit_price)                AS avg_unit_price
FROM sales_order_items soi
JOIN products p ON p.id = soi.product_id
JOIN sales_orders so ON so.id = soi.sales_order_id
WHERE so.status NOT IN ('cancelled')
GROUP BY soi.tenant_id, soi.product_id, p.name, p.sku, p.category
WITH NO DATA;

CREATE UNIQUE INDEX ON vw_sales_by_product(tenant_id, product_id);
CREATE INDEX ON vw_sales_by_product(tenant_id, total_revenue DESC);

-- ── Função de refresh ────────────────────────────────────────────────────────
-- Chamada após cada sync Oracle bem-sucedido ou via cron.
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vw_dashboard_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY vw_sales_by_customer;
  REFRESH MATERIALIZED VIEW CONCURRENTLY vw_sales_by_product;
END;
$$;

-- Popula as views na primeira aplicação
SELECT refresh_dashboard_views();
