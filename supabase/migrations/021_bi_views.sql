-- Migration 021: BI Views — performance de representantes, fluxo de caixa consolidado,
--                            ranking de produtos, KPIs operacionais

-- ── Performance de Representantes ────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_sales_rep_performance AS
SELECT
  so.tenant_id,
  sr.id                                                         AS sales_rep_id,
  sr.name                                                       AS sales_rep_name,
  sr.region,
  DATE_TRUNC('month', so.order_date)                            AS month,
  COUNT(so.id)                                                  AS total_orders,
  COUNT(DISTINCT so.customer_id)                                AS unique_customers,
  SUM(so.total_amount)                                          AS total_revenue,
  AVG(so.total_amount)                                          AS avg_order_value,
  SUM(so.total_amount) / NULLIF(COUNT(DISTINCT so.customer_id),0) AS revenue_per_customer,
  COUNT(*) FILTER (WHERE so.status = 'cancelled')               AS cancelled_orders,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE so.status = 'delivered')
    / NULLIF(COUNT(*),0), 2
  )                                                             AS delivery_rate_pct
FROM sales_orders so
JOIN sales_reps sr ON sr.id = so.sales_rep_id
WHERE so.status NOT IN ('draft')
GROUP BY so.tenant_id, sr.id, sr.name, sr.region, DATE_TRUNC('month', so.order_date);

-- ── Ranking de Produtos ───────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_product_ranking AS
SELECT
  soi.tenant_id,
  p.id                             AS product_id,
  p.name                           AS product_name,
  p.sku,
  p.category_id,
  DATE_TRUNC('month', so.order_date) AS month,
  SUM(soi.quantity)                AS total_qty_sold,
  SUM(soi.total_price)             AS total_revenue,
  COUNT(DISTINCT so.id)            AS order_count,
  COUNT(DISTINCT so.customer_id)   AS customer_count,
  RANK() OVER (
    PARTITION BY soi.tenant_id, DATE_TRUNC('month', so.order_date)
    ORDER BY SUM(soi.total_price) DESC
  )                                AS revenue_rank
FROM sales_order_items soi
JOIN sales_orders so ON so.id = soi.order_id
JOIN products p       ON p.id  = soi.product_id
WHERE so.status NOT IN ('cancelled','draft')
GROUP BY soi.tenant_id, p.id, p.name, p.sku, p.category_id,
         DATE_TRUNC('month', so.order_date);

-- ── Ranking de Clientes ───────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_customer_ranking AS
SELECT
  so.tenant_id,
  c.id                              AS customer_id,
  c.name                            AS customer_name,
  c.document,
  DATE_TRUNC('month', so.order_date) AS month,
  COUNT(so.id)                      AS total_orders,
  SUM(so.total_amount)              AS total_revenue,
  AVG(so.total_amount)              AS avg_ticket,
  MAX(so.order_date)                AS last_order_date,
  RANK() OVER (
    PARTITION BY so.tenant_id, DATE_TRUNC('month', so.order_date)
    ORDER BY SUM(so.total_amount) DESC
  )                                 AS revenue_rank
FROM sales_orders so
JOIN customers c ON c.id = so.customer_id
WHERE so.status NOT IN ('cancelled','draft')
GROUP BY so.tenant_id, c.id, c.name, c.document,
         DATE_TRUNC('month', so.order_date);

-- ── KPIs Operacionais Diários ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_daily_kpis AS
SELECT
  so.tenant_id,
  so.order_date                                                 AS kpi_date,
  COUNT(so.id)                                                  AS new_orders,
  SUM(so.total_amount)                                          AS gross_revenue,
  COUNT(*) FILTER (WHERE so.status = 'cancelled')               AS cancelled_orders,
  SUM(so.total_amount) FILTER (WHERE so.status = 'cancelled')   AS cancelled_revenue,
  COUNT(DISTINCT so.customer_id)                                AS active_customers,
  (SELECT COUNT(*) FROM deliveries d
   WHERE d.tenant_id = so.tenant_id
     AND d.scheduled_date = so.order_date
     AND d.status = 'delivered')                                AS deliveries_done,
  (SELECT COUNT(*) FROM deliveries d
   WHERE d.tenant_id = so.tenant_id
     AND d.scheduled_date < so.order_date
     AND d.status NOT IN ('delivered','returned','failed'))     AS pending_deliveries
FROM sales_orders so
GROUP BY so.tenant_id, so.order_date;

-- ── Aging de Contas a Receber (extendido) ─────────────────────────────────────
CREATE OR REPLACE VIEW vw_ar_aging AS
SELECT
  ar.tenant_id,
  ar.id,
  ar.customer_id,
  c.name                                           AS customer_name,
  ar.document_number,
  ar.amount,
  ar.amount_paid,
  ar.amount - ar.amount_paid                       AS balance,
  ar.due_date,
  CURRENT_DATE - ar.due_date                       AS days_overdue,
  CASE
    WHEN ar.status = 'paid'                        THEN 'paid'
    WHEN ar.due_date >= CURRENT_DATE               THEN 'current'
    WHEN CURRENT_DATE - ar.due_date <= 30          THEN '1-30'
    WHEN CURRENT_DATE - ar.due_date <= 60          THEN '31-60'
    WHEN CURRENT_DATE - ar.due_date <= 90          THEN '61-90'
    ELSE '90+'
  END                                              AS aging_bucket,
  ar.status
FROM accounts_receivable ar
JOIN customers c ON c.id = ar.customer_id
WHERE ar.status != 'paid';

-- ── Resumo de Metas × Realizado ───────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_goals_vs_actual AS
SELECT
  g.tenant_id,
  g.sales_rep_id,
  sr.name                                                   AS sales_rep_name,
  g.period_year,
  g.period_month,
  g.target_revenue,
  g.target_orders,
  COALESCE(SUM(so.total_amount), 0)                         AS actual_revenue,
  COALESCE(COUNT(so.id), 0)                                 AS actual_orders,
  ROUND(
    100.0 * COALESCE(SUM(so.total_amount),0)
    / NULLIF(g.target_revenue, 0), 2
  )                                                         AS revenue_attainment_pct,
  ROUND(
    100.0 * COALESCE(COUNT(so.id),0)
    / NULLIF(g.target_orders, 0), 2
  )                                                         AS orders_attainment_pct
FROM goals g
JOIN sales_reps sr ON sr.id = g.sales_rep_id
LEFT JOIN sales_orders so
  ON  so.sales_rep_id = g.sales_rep_id
  AND so.tenant_id    = g.tenant_id
  AND EXTRACT(YEAR  FROM so.order_date)::INT = g.period_year
  AND EXTRACT(MONTH FROM so.order_date)::INT = g.period_month
  AND so.status NOT IN ('cancelled','draft')
GROUP BY g.tenant_id, g.sales_rep_id, sr.name,
         g.period_year, g.period_month,
         g.target_revenue, g.target_orders;

-- ── Resumo de Estoque Crítico ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_critical_stock AS
SELECT
  sp.tenant_id,
  p.id          AS product_id,
  p.name        AS product_name,
  p.sku,
  sp.warehouse,
  sp.quantity   AS current_stock,
  p.min_stock,
  p.max_stock,
  CASE
    WHEN sp.quantity = 0           THEN 'out_of_stock'
    WHEN sp.quantity < p.min_stock THEN 'critical'
    WHEN sp.quantity < p.min_stock * 1.5 THEN 'low'
    ELSE 'ok'
  END           AS stock_status,
  p.min_stock - sp.quantity AS qty_to_reorder
FROM stock_positions sp
JOIN products p ON p.id = sp.product_id
WHERE sp.quantity <= p.min_stock OR sp.quantity = 0;
