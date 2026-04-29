-- =============================================================================
-- MIGRATION 009: Fornecedores
-- Cria tabela suppliers e vincula accounts_payable + products a ela
-- =============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system   TEXT NOT NULL DEFAULT 'oracle',
  source_id       TEXT NOT NULL,

  -- Dados do fornecedor
  name            TEXT NOT NULL,
  trade_name      TEXT,
  document        TEXT,                    -- CNPJ ou CPF
  document_type   TEXT CHECK (document_type IN ('cpf','cnpj')),
  email           TEXT,
  phone           TEXT,
  address         JSONB DEFAULT '{}',
  category        TEXT,                    -- ex: 'matéria prima', 'serviços', 'embalagens'
  payment_terms   TEXT,
  credit_limit    NUMERIC(15,2),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  extra           JSONB DEFAULT '{}',

  -- Controle
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at       TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_suppliers_tenant_id  ON suppliers(tenant_id);
CREATE INDEX idx_suppliers_source_id  ON suppliers(source_id);
CREATE INDEX idx_suppliers_document   ON suppliers(document);
CREATE INDEX idx_suppliers_category   ON suppliers(category);
CREATE INDEX idx_suppliers_is_active  ON suppliers(is_active);
CREATE INDEX idx_suppliers_updated_at ON suppliers(updated_at DESC);

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vincula accounts_payable → suppliers (nullable para retrocompatibilidade)
ALTER TABLE accounts_payable
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

CREATE INDEX idx_ap_supplier_id ON accounts_payable(supplier_id);

-- Vincula products → suppliers (substitui supplier_name como texto livre)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_ref_id UUID REFERENCES suppliers(id);

CREATE INDEX idx_products_supplier_ref_id ON products(supplier_ref_id);

-- RLS: fornecedores isolados por tenant
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_tenant ON suppliers
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- Função auxiliar: encontra ou retorna null o supplier_id por source_id
CREATE OR REPLACE FUNCTION get_supplier_id(p_tenant_id UUID, p_source_system TEXT, p_source_id TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM suppliers
  WHERE tenant_id = p_tenant_id
    AND source_system = p_source_system
    AND source_id = p_source_id
  LIMIT 1;
$$;
