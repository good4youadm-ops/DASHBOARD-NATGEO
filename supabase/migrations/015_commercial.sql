-- Migration 015: Comercial — orçamentos, devoluções, metas, comissões, campanhas

-- ── Orçamentos (Quotes) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  sales_rep_id    UUID REFERENCES sales_reps(id),
  price_table_id  UUID REFERENCES price_tables(id),
  quote_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  subtotal        NUMERIC NOT NULL DEFAULT 0,
  discount_pct    NUMERIC NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  discount_value  NUMERIC NOT NULL DEFAULT 0,
  total           NUMERIC NOT NULL DEFAULT 0,
  valid_until     DATE,
  notes           TEXT,
  converted_to    UUID REFERENCES sales_orders(id),
  created_by      UUID REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, quote_number)
);
CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status   ON quotes(tenant_id, status);

CREATE TABLE IF NOT EXISTS quote_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC NOT NULL CHECK (unit_price >= 0),
  discount_pct NUMERIC NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  total       NUMERIC NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

-- ── Devoluções ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES sales_orders(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  return_number   TEXT NOT NULL,
  reason          TEXT NOT NULL CHECK (reason IN ('defect','wrong_item','excess','customer_request','other')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','completed','refunded')),
  total           NUMERIC NOT NULL DEFAULT 0,
  refund_method   TEXT CHECK (refund_method IN ('credit','cash','exchange')),
  notes           TEXT,
  approved_by     UUID REFERENCES user_profiles(id),
  approved_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, return_number)
);
CREATE TRIGGER trg_returns_updated_at
  BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_returns_customer ON returns(customer_id);
CREATE INDEX idx_returns_order    ON returns(order_id);

CREATE TABLE IF NOT EXISTS return_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  return_id   UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC NOT NULL DEFAULT 0,
  total       NUMERIC NOT NULL DEFAULT 0,
  condition   TEXT CHECK (condition IN ('good','damaged','destroyed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_return_items_return ON return_items(return_id);

-- ── Metas de Venda ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_rep_id  UUID REFERENCES sales_reps(id),
  branch_id     UUID REFERENCES branches(id),
  period_type   TEXT NOT NULL CHECK (period_type IN ('monthly','quarterly','yearly')),
  period_year   SMALLINT NOT NULL,
  period_month  SMALLINT CHECK (period_month BETWEEN 1 AND 12),
  period_quarter SMALLINT CHECK (period_quarter BETWEEN 1 AND 4),
  target_revenue NUMERIC NOT NULL DEFAULT 0,
  target_orders  INTEGER,
  target_customers INTEGER,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sales_rep_id, period_type, period_year, period_month, period_quarter)
);
CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Comissões ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_rep_id    UUID NOT NULL REFERENCES sales_reps(id),
  order_id        UUID REFERENCES sales_orders(id),
  period_year     SMALLINT NOT NULL,
  period_month    SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  base_amount     NUMERIC NOT NULL DEFAULT 0,
  commission_pct  NUMERIC NOT NULL DEFAULT 0,
  commission_value NUMERIC NOT NULL DEFAULT 0,
  bonus_value     NUMERIC NOT NULL DEFAULT 0,
  total_value     NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_commissions_updated_at
  BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_commissions_rep    ON commissions(sales_rep_id);
CREATE INDEX idx_commissions_period ON commissions(tenant_id, period_year, period_month);

-- ── Campanhas Comerciais ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL CHECK (type IN ('discount','bonus','cashback','gift','points')),
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','paused','finished','cancelled')),
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ,
  min_order_value NUMERIC,
  discount_pct  NUMERIC CHECK (discount_pct BETWEEN 0 AND 100),
  discount_value NUMERIC,
  conditions    JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Bônus de Campanha ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonuses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id   UUID REFERENCES campaigns(id),
  sales_rep_id  UUID NOT NULL REFERENCES sales_reps(id),
  order_id      UUID REFERENCES sales_orders(id),
  value         NUMERIC NOT NULL DEFAULT 0,
  type          TEXT NOT NULL CHECK (type IN ('cash','product','points')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','paid','cancelled')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_bonuses_updated_at
  BEFORE UPDATE ON bonuses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE quotes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonuses       ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotes_tenant       ON quotes       USING (tenant_id = get_user_tenant_id());
CREATE POLICY quote_items_tenant  ON quote_items  USING (tenant_id = get_user_tenant_id());
CREATE POLICY returns_tenant      ON returns      USING (tenant_id = get_user_tenant_id());
CREATE POLICY return_items_tenant ON return_items USING (tenant_id = get_user_tenant_id());
CREATE POLICY goals_tenant        ON goals        USING (tenant_id = get_user_tenant_id());
CREATE POLICY commissions_tenant  ON commissions  USING (tenant_id = get_user_tenant_id());
CREATE POLICY campaigns_tenant    ON campaigns    USING (tenant_id = get_user_tenant_id());
CREATE POLICY bonuses_tenant      ON bonuses      USING (tenant_id = get_user_tenant_id());
