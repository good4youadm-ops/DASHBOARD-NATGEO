-- =============================================================================
-- MIGRATION 006: Financeiro — Contas a Receber, Pagar e Logs de Auditoria
-- =============================================================================

-- =============================================================================
-- TABELA: accounts_receivable (Contas a Receber)
-- =============================================================================
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system       TEXT NOT NULL DEFAULT 'oracle',
  source_id           TEXT NOT NULL,

  -- Relacionamentos
  customer_id         UUID REFERENCES customers(id),
  customer_source_id  TEXT,
  invoice_id          UUID REFERENCES invoices(id),
  invoice_source_id   TEXT,

  -- Dados do título
  document_number     TEXT,
  parcel              TEXT,           -- 1/3, 2/3 etc
  issue_date          DATE NOT NULL,
  due_date            DATE NOT NULL,
  payment_date        DATE,
  days_overdue        INTEGER,               -- calculado pela view; CURRENT_DATE não é imutável

  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','paid','partial','overdue','written_off','negotiating')),

  -- Valores
  face_value          NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  interest_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance             NUMERIC(15,2) GENERATED ALWAYS AS
                        (face_value - paid_amount + interest_amount - discount_amount) STORED,

  -- Detalhes
  payment_method      TEXT,
  bank_account        TEXT,
  notes               TEXT,
  extra               JSONB DEFAULT '{}',

  -- Controle
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at           TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_ar_tenant_id ON accounts_receivable(tenant_id);
CREATE INDEX idx_ar_source_id ON accounts_receivable(source_id);
CREATE INDEX idx_ar_customer_id ON accounts_receivable(customer_id);
CREATE INDEX idx_ar_due_date ON accounts_receivable(due_date);
CREATE INDEX idx_ar_status ON accounts_receivable(status);
CREATE INDEX idx_ar_issue_date ON accounts_receivable(issue_date DESC);
CREATE INDEX idx_ar_updated_at ON accounts_receivable(updated_at DESC);

CREATE TRIGGER trg_ar_updated_at
  BEFORE UPDATE ON accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: accounts_payable (Contas a Pagar)
-- =============================================================================
CREATE TABLE IF NOT EXISTS accounts_payable (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system       TEXT NOT NULL DEFAULT 'oracle',
  source_id           TEXT NOT NULL,

  -- Dados do fornecedor
  supplier_source_id  TEXT,
  supplier_name       TEXT,
  supplier_document   TEXT,

  -- Dados do título
  document_number     TEXT,
  parcel              TEXT,
  category            TEXT,         -- tipo de despesa
  cost_center         TEXT,
  issue_date          DATE NOT NULL,
  due_date            DATE NOT NULL,
  payment_date        DATE,
  days_overdue        INTEGER,               -- calculado pela view; CURRENT_DATE não é imutável

  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','paid','partial','overdue','cancelled')),

  -- Valores
  face_value          NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  interest_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance             NUMERIC(15,2) GENERATED ALWAYS AS
                        (face_value - paid_amount + interest_amount - discount_amount) STORED,

  payment_method      TEXT,
  bank_account        TEXT,
  notes               TEXT,
  extra               JSONB DEFAULT '{}',

  -- Controle
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at           TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_ap_tenant_id ON accounts_payable(tenant_id);
CREATE INDEX idx_ap_source_id ON accounts_payable(source_id);
CREATE INDEX idx_ap_due_date ON accounts_payable(due_date);
CREATE INDEX idx_ap_status ON accounts_payable(status);
CREATE INDEX idx_ap_issue_date ON accounts_payable(issue_date DESC);
CREATE INDEX idx_ap_updated_at ON accounts_payable(updated_at DESC);

CREATE TRIGGER trg_ap_updated_at
  BEFORE UPDATE ON accounts_payable
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
