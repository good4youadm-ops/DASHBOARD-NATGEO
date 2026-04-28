-- =============================================================================
-- MIGRATION 007: Views para Dashboards
-- =============================================================================

-- =============================================================================
-- VIEW: vw_dashboard_sales_summary
-- Resumo de vendas para o card principal do dashboard
-- =============================================================================
CREATE OR REPLACE VIEW vw_dashboard_sales_summary AS
SELECT
  so.tenant_id,
  DATE_TRUNC('month', so.order_date)::DATE        AS month,
  COUNT(DISTINCT so.id)                            AS total_orders,
  COUNT(DISTINCT so.customer_id)                   AS unique_customers,
  SUM(so.total_amount)                             AS gross_revenue,
  SUM(so.discount_amount)                          AS total_discounts,
  SUM(so.total_amount - so.discount_amount)        AS net_revenue,
  SUM(so.freight_amount)                           AS total_freight,
  AVG(so.total_amount)                             AS avg_ticket,
  COUNT(DISTINCT so.id) FILTER (WHERE so.status = 'delivered')  AS delivered_orders,
  COUNT(DISTINCT so.id) FILTER (WHERE so.status = 'cancelled')  AS cancelled_orders,
  COUNT(DISTINCT so.id) FILTER (WHERE so.status = 'pending')    AS pending_orders
FROM sales_orders so
GROUP BY so.tenant_id, DATE_TRUNC('month', so.order_date);

-- =============================================================================
-- VIEW: vw_sales_by_day
-- Vendas agrupadas por dia (últimos 90 dias)
-- =============================================================================
CREATE OR REPLACE VIEW vw_sales_by_day AS
SELECT
  so.tenant_id,
  so.order_date,
  COUNT(DISTINCT so.id)             AS orders_count,
  SUM(so.total_amount)              AS revenue,
  SUM(so.discount_amount)           AS discounts,
  AVG(so.total_amount)              AS avg_ticket
FROM sales_orders so
WHERE so.order_date >= CURRENT_DATE - INTERVAL '90 days'
  AND so.status NOT IN ('cancelled')
GROUP BY so.tenant_id, so.order_date
ORDER BY so.order_date DESC;

-- =============================================================================
-- VIEW: vw_sales_by_customer
-- Ranking de clientes por faturamento
-- =============================================================================
CREATE OR REPLACE VIEW vw_sales_by_customer AS
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
LEFT JOIN customers c ON c.id = so.customer_id
WHERE so.status NOT IN ('cancelled')
GROUP BY so.tenant_id, so.customer_id, c.name, c.document, c.classification, c.segment;

-- =============================================================================
-- VIEW: vw_sales_by_product
-- Ranking de produtos por quantidade e faturamento
-- =============================================================================
CREATE OR REPLACE VIEW vw_sales_by_product AS
SELECT
  soi.tenant_id,
  soi.product_id,
  p.sku,
  p.name                            AS product_name,
  p.category,
  p.brand,
  p.abc_curve,
  SUM(soi.quantity)                 AS total_qty_sold,
  SUM(soi.total_amount)             AS total_revenue,
  AVG(soi.unit_price)               AS avg_unit_price,
  COUNT(DISTINCT soi.sales_order_id) AS order_count
FROM sales_order_items soi
LEFT JOIN products p ON p.id = soi.product_id
LEFT JOIN sales_orders so ON so.id = soi.sales_order_id
WHERE so.status NOT IN ('cancelled')
GROUP BY soi.tenant_id, soi.product_id, p.sku, p.name, p.category, p.brand, p.abc_curve;

-- =============================================================================
-- VIEW: vw_dashboard_inventory_summary
-- Resumo de estoque para o dashboard
-- =============================================================================
CREATE OR REPLACE VIEW vw_dashboard_inventory_summary AS
SELECT
  sp.tenant_id,
  sp.warehouse,
  COUNT(DISTINCT sp.product_id)                                          AS sku_count,
  SUM(sp.qty_available)                                                  AS total_qty_available,
  SUM(sp.qty_reserved)                                                   AS total_qty_reserved,
  SUM(sp.qty_blocked)                                                    AS total_qty_blocked,
  SUM(sp.total_cost)                                                     AS total_inventory_value,
  COUNT(DISTINCT sp.product_id) FILTER (WHERE sp.ruptura = true)        AS ruptura_count,
  COUNT(DISTINCT sp.product_id) FILTER (WHERE sp.abc_curve = 'A')       AS sku_a_count,
  COUNT(DISTINCT sp.product_id) FILTER (WHERE sp.abc_curve = 'B')       AS sku_b_count,
  COUNT(DISTINCT sp.product_id) FILTER (WHERE sp.abc_curve = 'C')       AS sku_c_count,
  AVG(sp.coverage_days)                                                  AS avg_coverage_days
FROM stock_positions sp
GROUP BY sp.tenant_id, sp.warehouse;

-- =============================================================================
-- VIEW: vw_stock_by_product
-- Estoque detalhado por produto (posição atual)
-- =============================================================================
CREATE OR REPLACE VIEW vw_stock_by_product AS
SELECT
  sp.tenant_id,
  sp.product_id,
  p.sku,
  p.name                            AS product_name,
  p.category,
  p.brand,
  p.abc_curve,
  p.min_stock,
  p.max_stock,
  p.reorder_point,
  sp.warehouse,
  sp.qty_available,
  sp.qty_reserved,
  sp.qty_blocked,
  sp.qty_in_transit,
  sp.qty_physical,
  sp.avg_cost,
  sp.total_cost,
  sp.coverage_days,
  sp.ruptura,
  sp.position_date,
  CASE
    WHEN sp.qty_available <= 0                         THEN 'sem_estoque'
    WHEN p.reorder_point IS NOT NULL
      AND sp.qty_available <= p.reorder_point          THEN 'ponto_pedido'
    WHEN p.min_stock IS NOT NULL
      AND sp.qty_available <= p.min_stock              THEN 'estoque_minimo'
    ELSE 'normal'
  END                               AS stock_alert
FROM stock_positions sp
LEFT JOIN products p ON p.id = sp.product_id;

-- =============================================================================
-- VIEW: vw_expiring_lots
-- Lotes próximos ao vencimento (90 dias)
-- =============================================================================
CREATE OR REPLACE VIEW vw_expiring_lots AS
SELECT
  sl.tenant_id,
  sl.product_id,
  p.sku,
  p.name                            AS product_name,
  p.category,
  sl.lot_number,
  sl.warehouse,
  sl.expiry_date,
  sl.days_to_expiry,
  sl.qty_current,
  sl.unit_cost,
  sl.total_cost,
  sl.status,
  CASE
    WHEN sl.days_to_expiry < 0     THEN 'vencido'
    WHEN sl.days_to_expiry <= 7    THEN 'critico'
    WHEN sl.days_to_expiry <= 30   THEN 'urgente'
    WHEN sl.days_to_expiry <= 90   THEN 'atencao'
    ELSE 'ok'
  END                               AS expiry_alert
FROM stock_lots sl
LEFT JOIN products p ON p.id = sl.product_id
WHERE sl.status IN ('available', 'open_box')
  AND sl.qty_current > 0
  AND sl.expiry_date IS NOT NULL
  AND sl.days_to_expiry <= 90
ORDER BY sl.days_to_expiry ASC;

-- =============================================================================
-- VIEW: vw_dashboard_finance_summary
-- Resumo financeiro para o dashboard
-- =============================================================================
CREATE OR REPLACE VIEW vw_dashboard_finance_summary AS
WITH ar AS (
  SELECT
    tenant_id,
    COUNT(*) FILTER (WHERE status IN ('open','overdue','partial','negotiating')) AS open_count,
    SUM(balance) FILTER (WHERE status IN ('open','overdue','partial','negotiating')) AS open_balance,
    SUM(balance) FILTER (WHERE status = 'overdue' OR (status = 'open' AND due_date < CURRENT_DATE)) AS overdue_balance,
    SUM(paid_amount) FILTER (WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)) AS received_this_month,
    COUNT(*) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS due_next_30_days_count,
    SUM(balance) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS due_next_30_days_balance
  FROM accounts_receivable
  GROUP BY tenant_id
),
ap AS (
  SELECT
    tenant_id,
    COUNT(*) FILTER (WHERE status IN ('open','overdue','partial')) AS open_count,
    SUM(balance) FILTER (WHERE status IN ('open','overdue','partial')) AS open_balance,
    SUM(balance) FILTER (WHERE status = 'overdue' OR (status = 'open' AND due_date < CURRENT_DATE)) AS overdue_balance,
    SUM(paid_amount) FILTER (WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)) AS paid_this_month,
    COUNT(*) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS due_next_30_days_count,
    SUM(balance) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS due_next_30_days_balance
  FROM accounts_payable
  GROUP BY tenant_id
)
SELECT
  COALESCE(ar.tenant_id, ap.tenant_id)            AS tenant_id,
  COALESCE(ar.open_balance, 0)                     AS ar_open_balance,
  COALESCE(ar.overdue_balance, 0)                  AS ar_overdue_balance,
  COALESCE(ar.received_this_month, 0)              AS ar_received_this_month,
  COALESCE(ar.due_next_30_days_balance, 0)         AS ar_due_next_30,
  COALESCE(ap.open_balance, 0)                     AS ap_open_balance,
  COALESCE(ap.overdue_balance, 0)                  AS ap_overdue_balance,
  COALESCE(ap.paid_this_month, 0)                  AS ap_paid_this_month,
  COALESCE(ap.due_next_30_days_balance, 0)         AS ap_due_next_30,
  COALESCE(ar.open_balance, 0) - COALESCE(ap.open_balance, 0) AS net_position
FROM ar
FULL OUTER JOIN ap ON ar.tenant_id = ap.tenant_id;

-- =============================================================================
-- VIEW: vw_accounts_receivable_open
-- Títulos a receber em aberto com aging
-- =============================================================================
CREATE OR REPLACE VIEW vw_accounts_receivable_open AS
SELECT
  ar.tenant_id,
  ar.id,
  ar.document_number,
  ar.parcel,
  ar.customer_id,
  c.name                            AS customer_name,
  c.document                        AS customer_document,
  ar.invoice_id,
  ar.issue_date,
  ar.due_date,
  ar.days_overdue,
  ar.status,
  ar.face_value,
  ar.paid_amount,
  ar.interest_amount,
  ar.discount_amount,
  ar.balance,
  ar.payment_method,
  CASE
    WHEN ar.days_overdue = 0       THEN 'em_dia'
    WHEN ar.days_overdue <= 15     THEN 'atraso_1_15'
    WHEN ar.days_overdue <= 30     THEN 'atraso_16_30'
    WHEN ar.days_overdue <= 60     THEN 'atraso_31_60'
    WHEN ar.days_overdue <= 90     THEN 'atraso_61_90'
    ELSE                                'atraso_90_mais'
  END                               AS aging_bucket
FROM accounts_receivable ar
LEFT JOIN customers c ON c.id = ar.customer_id
WHERE ar.status IN ('open','overdue','partial','negotiating')
ORDER BY ar.days_overdue DESC;

-- =============================================================================
-- VIEW: vw_accounts_payable_open
-- Títulos a pagar em aberto com aging
-- =============================================================================
CREATE OR REPLACE VIEW vw_accounts_payable_open AS
SELECT
  ap.tenant_id,
  ap.id,
  ap.document_number,
  ap.parcel,
  ap.supplier_name,
  ap.supplier_document,
  ap.category,
  ap.cost_center,
  ap.issue_date,
  ap.due_date,
  ap.days_overdue,
  ap.status,
  ap.face_value,
  ap.paid_amount,
  ap.interest_amount,
  ap.discount_amount,
  ap.balance,
  ap.payment_method,
  CASE
    WHEN ap.days_overdue = 0       THEN 'em_dia'
    WHEN ap.days_overdue <= 15     THEN 'atraso_1_15'
    WHEN ap.days_overdue <= 30     THEN 'atraso_16_30'
    WHEN ap.days_overdue <= 60     THEN 'atraso_31_60'
    WHEN ap.days_overdue <= 90     THEN 'atraso_61_90'
    ELSE                                'atraso_90_mais'
  END                               AS aging_bucket
FROM accounts_payable ap
WHERE ap.status IN ('open','overdue','partial')
ORDER BY ap.days_overdue DESC;
