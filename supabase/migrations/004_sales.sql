-- =============================================================================
-- MIGRATION 004: Pedidos de Venda e Faturas
-- =============================================================================

-- =============================================================================
-- TABELA: sales_orders
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system     TEXT NOT NULL DEFAULT 'oracle',
  source_id         TEXT NOT NULL,

  -- Relacionamentos
  customer_id       UUID REFERENCES customers(id),
  customer_source_id TEXT,

  -- Dados do pedido
  order_number      TEXT,
  order_date        DATE NOT NULL,
  delivery_date     DATE,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','processing','shipped','delivered','cancelled','partial')),
  payment_terms     TEXT,
  payment_method    TEXT,
  salesperson       TEXT,
  branch            TEXT,
  channel           TEXT,

  -- Valores
  subtotal          NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  freight_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Notas
  notes             TEXT,
  extra             JSONB DEFAULT '{}',

  -- Controle
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at         TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_sales_orders_tenant_id ON sales_orders(tenant_id);
CREATE INDEX idx_sales_orders_source_id ON sales_orders(source_id);
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_order_date ON sales_orders(order_date DESC);
CREATE INDEX idx_sales_orders_delivery_date ON sales_orders(delivery_date);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_updated_at ON sales_orders(updated_at DESC);
CREATE INDEX idx_sales_orders_synced_at ON sales_orders(synced_at DESC);

CREATE TRIGGER trg_sales_orders_updated_at
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: sales_order_items
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales_order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system     TEXT NOT NULL DEFAULT 'oracle',
  source_id         TEXT NOT NULL,

  -- Relacionamentos
  sales_order_id    UUID REFERENCES sales_orders(id),
  order_source_id   TEXT,
  product_id        UUID REFERENCES products(id),
  product_source_id TEXT,

  -- Dados do item
  line_number       INTEGER,
  product_code      TEXT,
  product_name      TEXT,
  unit              TEXT DEFAULT 'UN',
  quantity          NUMERIC(15,3) NOT NULL DEFAULT 0,
  quantity_shipped  NUMERIC(15,3) NOT NULL DEFAULT 0,
  unit_price        NUMERIC(15,4) NOT NULL DEFAULT 0,
  discount_pct      NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  status            TEXT,
  extra             JSONB DEFAULT '{}',

  -- Controle
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at         TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_sales_items_tenant_id ON sales_order_items(tenant_id);
CREATE INDEX idx_sales_items_source_id ON sales_order_items(source_id);
CREATE INDEX idx_sales_items_sales_order_id ON sales_order_items(sales_order_id);
CREATE INDEX idx_sales_items_product_id ON sales_order_items(product_id);
CREATE INDEX idx_sales_items_updated_at ON sales_order_items(updated_at DESC);

CREATE TRIGGER trg_sales_items_updated_at
  BEFORE UPDATE ON sales_order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: invoices (Notas Fiscais)
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system     TEXT NOT NULL DEFAULT 'oracle',
  source_id         TEXT NOT NULL,

  -- Relacionamentos
  sales_order_id    UUID REFERENCES sales_orders(id),
  order_source_id   TEXT,
  customer_id       UUID REFERENCES customers(id),
  customer_source_id TEXT,

  -- Dados da NF
  invoice_number    TEXT,
  series            TEXT,
  issue_date        DATE NOT NULL,
  access_key        TEXT,             -- Chave NFe
  status            TEXT NOT NULL DEFAULT 'issued'
                      CHECK (status IN ('draft','issued','cancelled','returned')),

  -- Valores
  subtotal          NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  freight_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,

  extra             JSONB DEFAULT '{}',

  -- Controle
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at         TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_source_id ON invoices(source_id);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_updated_at ON invoices(updated_at DESC);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
