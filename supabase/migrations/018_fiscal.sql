-- Migration 018: Fiscal — itens de NF, configurações fiscais, regras de imposto

-- ── Itens de Nota Fiscal ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  order_item_id UUID REFERENCES sales_order_items(id),
  sequence      SMALLINT NOT NULL DEFAULT 1,
  description   TEXT NOT NULL,
  ncm           TEXT,
  cfop          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'UN',
  quantity      NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC NOT NULL CHECK (unit_price >= 0),
  total         NUMERIC NOT NULL DEFAULT 0,
  -- ICMS
  icms_cst      TEXT,
  icms_base     NUMERIC DEFAULT 0,
  icms_rate     NUMERIC DEFAULT 0,
  icms_value    NUMERIC DEFAULT 0,
  -- PIS
  pis_cst       TEXT,
  pis_rate      NUMERIC DEFAULT 0,
  pis_value     NUMERIC DEFAULT 0,
  -- COFINS
  cofins_cst    TEXT,
  cofins_rate   NUMERIC DEFAULT 0,
  cofins_value  NUMERIC DEFAULT 0,
  -- IPI
  ipi_cst       TEXT,
  ipi_rate      NUMERIC DEFAULT 0,
  ipi_value     NUMERIC DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);

-- ── Configurações Fiscais por Tenant ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiscal_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  cnpj          TEXT NOT NULL,
  ie            TEXT,
  crt           TEXT NOT NULL CHECK (crt IN ('1','2','3','4')), -- regime tributário
  ambiente      TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao','producao')),
  serie         TEXT NOT NULL DEFAULT '1',
  next_nfe_number INTEGER NOT NULL DEFAULT 1,
  certificado_validade DATE,
  logo_url      TEXT,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_fiscal_configs_updated_at
  BEFORE UPDATE ON fiscal_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Regras de Imposto por Produto/NCM ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ncm           TEXT,
  cfop          TEXT,
  uf_origin     TEXT,
  uf_dest       TEXT,
  icms_cst      TEXT,
  icms_rate     NUMERIC DEFAULT 0,
  pis_cst       TEXT,
  pis_rate      NUMERIC DEFAULT 0,
  cofins_cst    TEXT,
  cofins_rate   NUMERIC DEFAULT 0,
  ipi_cst       TEXT,
  ipi_rate      NUMERIC DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_tax_rules_updated_at
  BEFORE UPDATE ON tax_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_tax_rules_ncm ON tax_rules(tenant_id, ncm);

-- ── Campos extras em invoices (já existe, adicionar colunas ausentes) ──────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS series        TEXT DEFAULT '1',
  ADD COLUMN IF NOT EXISTS access_key    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS status        TEXT NOT NULL DEFAULT 'draft'
                                           CHECK (status IN ('draft','pending','authorized','rejected','cancelled','contingency')),
  ADD COLUMN IF NOT EXISTS direction     TEXT NOT NULL DEFAULT 'outgoing'
                                           CHECK (direction IN ('outgoing','incoming')),
  ADD COLUMN IF NOT EXISTS issue_date    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS xml_url       TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url       TEXT,
  ADD COLUMN IF NOT EXISTS protocol      TEXT,
  ADD COLUMN IF NOT EXISTS error_msg     TEXT,
  ADD COLUMN IF NOT EXISTS total_products NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_freight  NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tax      NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_invoice  NUMERIC DEFAULT 0;

-- ── NCM em products ───────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ncm     TEXT,
  ADD COLUMN IF NOT EXISTS cfop    TEXT,
  ADD COLUMN IF NOT EXISTS cest    TEXT;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE invoice_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rules      ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_items_tenant  ON invoice_items  USING (tenant_id = get_user_tenant_id());
CREATE POLICY fiscal_configs_tenant ON fiscal_configs USING (tenant_id = get_user_tenant_id());
CREATE POLICY tax_rules_tenant      ON tax_rules      USING (tenant_id = get_user_tenant_id());
