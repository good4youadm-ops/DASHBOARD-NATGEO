-- Migration 017: Financeiro Estendido — categorias, contas bancárias, transações, fluxo de caixa

-- ── Categorias Financeiras ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES financial_categories(id),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('revenue','expense','transfer')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE TRIGGER trg_financial_categories_updated_at
  BEFORE UPDATE ON financial_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_financial_categories_parent ON financial_categories(parent_id);

-- ── Contas Bancárias ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  bank_name     TEXT NOT NULL,
  bank_code     TEXT,
  agency        TEXT,
  account       TEXT,
  account_type  TEXT NOT NULL CHECK (account_type IN ('checking','savings','investment','cash')),
  currency      TEXT NOT NULL DEFAULT 'BRL',
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Transações Financeiras ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_account_id   UUID NOT NULL REFERENCES bank_accounts(id),
  category_id       UUID REFERENCES financial_categories(id),
  cost_center_id    UUID REFERENCES cost_centers(id),
  receivable_id     UUID REFERENCES accounts_receivable(id),
  payable_id        UUID REFERENCES accounts_payable(id),
  type              TEXT NOT NULL CHECK (type IN ('credit','debit','transfer')),
  amount            NUMERIC NOT NULL CHECK (amount > 0),
  balance_after     NUMERIC,
  description       TEXT NOT NULL,
  reference         TEXT,
  transaction_date  DATE NOT NULL,
  reconciled        BOOLEAN NOT NULL DEFAULT false,
  reconciled_at     TIMESTAMPTZ,
  created_by        UUID REFERENCES user_profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_transactions_account  ON transactions(bank_account_id);
CREATE INDEX idx_transactions_date     ON transactions(tenant_id, transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category_id);

-- ── Adicionar category_id e cost_center_id em AR/AP ──────────────────────────
ALTER TABLE accounts_receivable
  ADD COLUMN IF NOT EXISTS category_id    UUID REFERENCES financial_categories(id),
  ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id),
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);

ALTER TABLE accounts_payable
  ADD COLUMN IF NOT EXISTS category_id    UUID REFERENCES financial_categories(id),
  ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id),
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);

-- ── Supplier FK em accounts_payable ──────────────────────────────────────────
ALTER TABLE accounts_payable
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

-- ── Views de Fluxo de Caixa ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_cash_flow AS
WITH daily AS (
  SELECT
    t.tenant_id,
    t.bank_account_id,
    t.transaction_date                                              AS flow_date,
    SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END)      AS credits,
    SUM(CASE WHEN t.type = 'debit'  THEN t.amount ELSE 0 END)      AS debits,
    SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END) AS net
  FROM transactions t
  GROUP BY t.tenant_id, t.bank_account_id, t.transaction_date
)
SELECT
  d.*,
  ba.name AS account_name,
  SUM(d.net) OVER (
    PARTITION BY d.tenant_id, d.bank_account_id
    ORDER BY d.flow_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_balance
FROM daily d
JOIN bank_accounts ba ON ba.id = d.bank_account_id;

CREATE OR REPLACE VIEW vw_financial_summary AS
SELECT
  ar.tenant_id,
  DATE_TRUNC('month', ar.due_date)                             AS month,
  SUM(ar.face_value)                                           AS total_receivable,
  SUM(ar.paid_amount)                                          AS total_received,
  SUM(ar.balance)                                              AS balance_receivable,
  COUNT(*) FILTER (WHERE ar.status = 'overdue')                AS overdue_count,
  SUM(ar.face_value) FILTER (WHERE ar.status = 'overdue')      AS overdue_amount
FROM accounts_receivable ar
GROUP BY ar.tenant_id, DATE_TRUNC('month', ar.due_date);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;

CREATE POLICY financial_categories_tenant ON financial_categories USING (tenant_id = get_user_tenant_id());
CREATE POLICY bank_accounts_tenant        ON bank_accounts        USING (tenant_id = get_user_tenant_id());
CREATE POLICY transactions_tenant         ON transactions         USING (tenant_id = get_user_tenant_id());
