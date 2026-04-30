-- =============================================================================
-- MIGRATION 010: Melhorias de schema (3.2)
-- - product_price_history
-- - user_profiles: campos de controle de acesso
-- - inventory_movements: FK para sales_order_items
-- - Índices GIN para buscas por nome
-- =============================================================================

-- ── product_price_history ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_price_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cost_price      NUMERIC(15,4),
  sale_price      NUMERIC(15,4),
  min_price       NUMERIC(15,4),
  effective_from  DATE NOT NULL,
  effective_to    DATE,
  source          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('oracle_sync','manual')),
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pph_tenant_id  ON product_price_history(tenant_id);
CREATE INDEX idx_pph_product_id ON product_price_history(product_id);
CREATE INDEX idx_pph_effective  ON product_price_history(effective_from DESC);

ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY pph_tenant ON product_price_history
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- ── user_profiles: controle de sessão ────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_login_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until        TIMESTAMPTZ;

-- ── inventory_movements: FK para sales_order_items ────────────────────────────
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS sales_order_item_id UUID REFERENCES sales_order_items(id);

CREATE INDEX IF NOT EXISTS idx_inv_mov_soi ON inventory_movements(sales_order_item_id)
  WHERE sales_order_item_id IS NOT NULL;

-- ── Índices GIN (pg_trgm) para buscas ilike eficientes ───────────────────────
-- Requer extensão pg_trgm (já ativa no Supabase por padrão)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_customers_name_trgm  ON customers  USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm   ON products   USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm  ON suppliers  USING gin(name gin_trgm_ops);
