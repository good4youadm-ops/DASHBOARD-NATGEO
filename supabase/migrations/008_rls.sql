-- =============================================================================
-- MIGRATION 008: Row Level Security (RLS)
-- Garante isolamento total por tenant_id
-- =============================================================================

-- =============================================================================
-- Habilita RLS em todas as tabelas de negócio
-- =============================================================================
ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_sources         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_errors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_oracle_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_positions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_lots           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable  ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Função helper: retorna o tenant_id do usuário autenticado
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- =============================================================================
-- POLÍTICAS: tenants
-- Usuário vê apenas o próprio tenant
-- =============================================================================
CREATE POLICY tenant_isolation ON tenants
  FOR ALL
  USING (id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: user_profiles
-- =============================================================================
CREATE POLICY user_profiles_tenant ON user_profiles
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: sync_sources
-- =============================================================================
CREATE POLICY sync_sources_tenant ON sync_sources
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: sync_state
-- =============================================================================
CREATE POLICY sync_state_tenant ON sync_state
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: sync_runs
-- =============================================================================
CREATE POLICY sync_runs_tenant ON sync_runs
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: sync_errors
-- =============================================================================
CREATE POLICY sync_errors_tenant ON sync_errors
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: raw_oracle_records
-- =============================================================================
CREATE POLICY raw_oracle_tenant ON raw_oracle_records
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: customers
-- =============================================================================
CREATE POLICY customers_tenant ON customers
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: products
-- =============================================================================
CREATE POLICY products_tenant ON products
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: sales_orders
-- =============================================================================
CREATE POLICY sales_orders_tenant ON sales_orders
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: sales_order_items
-- =============================================================================
CREATE POLICY sales_items_tenant ON sales_order_items
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: invoices
-- =============================================================================
CREATE POLICY invoices_tenant ON invoices
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: stock_positions
-- =============================================================================
CREATE POLICY stock_positions_tenant ON stock_positions
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: stock_lots
-- =============================================================================
CREATE POLICY stock_lots_tenant ON stock_lots
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: inventory_movements
-- =============================================================================
CREATE POLICY inventory_movements_tenant ON inventory_movements
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: accounts_receivable
-- =============================================================================
CREATE POLICY ar_tenant ON accounts_receivable
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: accounts_payable
-- =============================================================================
CREATE POLICY ap_tenant ON accounts_payable
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- POLÍTICAS: audit_logs
-- =============================================================================
CREATE POLICY audit_logs_tenant ON audit_logs
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- SERVICE ROLE bypass (sync worker usa service_role key — bypassa RLS)
-- Não é necessário criar políticas separadas:
-- service_role já ignora RLS por design no Supabase
-- =============================================================================

-- =============================================================================
-- Acesso público anon às views (leitura somente, ainda filtrada por função)
-- Para o frontend usar anon key com RLS transparente
-- =============================================================================
GRANT SELECT ON vw_dashboard_sales_summary   TO anon, authenticated;
GRANT SELECT ON vw_sales_by_day              TO anon, authenticated;
GRANT SELECT ON vw_sales_by_customer         TO anon, authenticated;
GRANT SELECT ON vw_sales_by_product          TO anon, authenticated;
GRANT SELECT ON vw_dashboard_inventory_summary TO anon, authenticated;
GRANT SELECT ON vw_stock_by_product          TO anon, authenticated;
GRANT SELECT ON vw_expiring_lots             TO anon, authenticated;
GRANT SELECT ON vw_dashboard_finance_summary TO anon, authenticated;
GRANT SELECT ON vw_accounts_receivable_open  TO anon, authenticated;
GRANT SELECT ON vw_accounts_payable_open     TO anon, authenticated;
