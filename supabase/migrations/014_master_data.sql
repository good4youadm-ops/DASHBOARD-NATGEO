-- Migration 014: Master Data — marcas, categorias, SKUs, tabelas de preço,
--                              formas de pagamento, representantes, transportadoras, centros de custo

-- ── Marcas ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT,
  logo_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Categorias (árvore) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES categories(id),
  name        TEXT NOT NULL,
  code        TEXT,
  level       SMALLINT NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ── SKUs / variações de produto ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_skus (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_code    TEXT NOT NULL,
  barcode     TEXT,
  name        TEXT NOT NULL,
  attributes  JSONB NOT NULL DEFAULT '{}',   -- {"cor":"azul","tamanho":"G"}
  stock_qty   NUMERIC NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku_code)
);
CREATE TRIGGER trg_product_skus_updated_at
  BEFORE UPDATE ON product_skus FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_product_skus_product ON product_skus(product_id);

-- ── Tabelas de preço ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_tables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT,
  description TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  valid_from  DATE,
  valid_to    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE TRIGGER trg_price_tables_updated_at
  BEFORE UPDATE ON price_tables FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS price_table_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  price_table_id UUID NOT NULL REFERENCES price_tables(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_price     NUMERIC NOT NULL CHECK (unit_price >= 0),
  min_qty        NUMERIC NOT NULL DEFAULT 1,
  discount_pct   NUMERIC NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(price_table_id, product_id, min_qty)
);
CREATE TRIGGER trg_price_table_items_updated_at
  BEFORE UPDATE ON price_table_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_price_table_items_table ON price_table_items(price_table_id);
CREATE INDEX idx_price_table_items_product ON price_table_items(product_id);

-- ── Formas de Pagamento ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('cash','bank_transfer','credit_card','debit_card','boleto','pix','check','other')),
  installments  SMALLINT NOT NULL DEFAULT 1,
  grace_days    SMALLINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Representantes de Venda ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_reps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  code          TEXT,
  email         TEXT,
  phone         TEXT,
  region        TEXT,
  commission_pct NUMERIC NOT NULL DEFAULT 0 CHECK (commission_pct BETWEEN 0 AND 100),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE TRIGGER trg_sales_reps_updated_at
  BEFORE UPDATE ON sales_reps FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Transportadoras ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carriers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT,
  document    TEXT,
  email       TEXT,
  phone       TEXT,
  modality    TEXT CHECK (modality IN ('road','air','sea','express','own')),
  api_key     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE TRIGGER trg_carriers_updated_at
  BEFORE UPDATE ON carriers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Centros de Custo ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_centers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES cost_centers(id),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE TRIGGER trg_cost_centers_updated_at
  BEFORE UPDATE ON cost_centers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_cost_centers_parent ON cost_centers(parent_id);

-- ── Fornecedores (migration 009 já criou, adicionar brand_id e category_id a products) ──
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand_id     UUID REFERENCES brands(id),
  ADD COLUMN IF NOT EXISTS category_id  UUID REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS sku_default  TEXT;

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS sales_rep_id      UUID REFERENCES sales_reps(id),
  ADD COLUMN IF NOT EXISTS carrier_id        UUID REFERENCES carriers(id),
  ADD COLUMN IF NOT EXISTS price_table_id    UUID REFERENCES price_tables(id),
  ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id),
  ADD COLUMN IF NOT EXISTS branch_id         UUID REFERENCES branches(id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE brands              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_skus        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tables        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_table_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_reps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE carriers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers        ENABLE ROW LEVEL SECURITY;

CREATE POLICY brands_tenant            ON brands            USING (tenant_id = get_user_tenant_id());
CREATE POLICY categories_tenant        ON categories        USING (tenant_id = get_user_tenant_id());
CREATE POLICY product_skus_tenant      ON product_skus      USING (tenant_id = get_user_tenant_id());
CREATE POLICY price_tables_tenant      ON price_tables      USING (tenant_id = get_user_tenant_id());
CREATE POLICY price_table_items_tenant ON price_table_items USING (tenant_id = get_user_tenant_id());
CREATE POLICY payment_methods_tenant   ON payment_methods   USING (tenant_id = get_user_tenant_id());
CREATE POLICY sales_reps_tenant        ON sales_reps        USING (tenant_id = get_user_tenant_id());
CREATE POLICY carriers_tenant          ON carriers          USING (tenant_id = get_user_tenant_id());
CREATE POLICY cost_centers_tenant      ON cost_centers      USING (tenant_id = get_user_tenant_id());
