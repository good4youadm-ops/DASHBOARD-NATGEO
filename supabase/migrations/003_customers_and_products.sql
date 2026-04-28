-- =============================================================================
-- MIGRATION 003: Clientes e Produtos
-- =============================================================================

-- =============================================================================
-- TABELA: customers
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system   TEXT NOT NULL DEFAULT 'oracle',
  source_id       TEXT NOT NULL,

  -- Dados do cliente
  code            TEXT,
  name            TEXT NOT NULL,
  trade_name      TEXT,
  document        TEXT,           -- CNPJ ou CPF
  document_type   TEXT CHECK (document_type IN ('cpf','cnpj','outros')),
  email           TEXT,
  phone           TEXT,
  address         JSONB DEFAULT '{}',
  segment         TEXT,
  classification  TEXT,           -- A, B, C (curva ABC)
  credit_limit    NUMERIC(15,2),
  payment_terms   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  extra           JSONB DEFAULT '{}',

  -- Controle
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at       TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_source_id ON customers(source_id);
CREATE INDEX idx_customers_document ON customers(document);
CREATE INDEX idx_customers_is_active ON customers(is_active);
CREATE INDEX idx_customers_updated_at ON customers(updated_at DESC);
CREATE INDEX idx_customers_synced_at ON customers(synced_at DESC);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: products
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system     TEXT NOT NULL DEFAULT 'oracle',
  source_id         TEXT NOT NULL,

  -- Dados do produto
  sku               TEXT,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT,
  subcategory       TEXT,
  brand             TEXT,
  supplier_id       TEXT,
  supplier_name     TEXT,
  unit              TEXT DEFAULT 'UN',
  unit_weight       NUMERIC(10,4),
  units_per_box     INTEGER,
  cost_price        NUMERIC(15,4),
  sale_price        NUMERIC(15,4),
  min_price         NUMERIC(15,4),
  ncm               TEXT,
  ean               TEXT,
  abc_curve         TEXT CHECK (abc_curve IN ('A','B','C','D')),
  is_fractionable   BOOLEAN DEFAULT false,
  requires_cold     BOOLEAN DEFAULT false,
  shelf_life_days   INTEGER,
  min_stock         NUMERIC(15,3),
  max_stock         NUMERIC(15,3),
  reorder_point     NUMERIC(15,3),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  extra             JSONB DEFAULT '{}',

  -- Controle
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at         TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_source_id ON products(source_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_abc_curve ON products(abc_curve);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_updated_at ON products(updated_at DESC);
CREATE INDEX idx_products_synced_at ON products(synced_at DESC);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
