-- Migration 016: Estoque Estendido — reservas, contagens, inventário

-- ── Reservas de Estoque ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_reservations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  quote_id      UUID REFERENCES quotes(id) ON DELETE CASCADE,
  warehouse     TEXT NOT NULL DEFAULT 'principal',
  reserved_qty  NUMERIC NOT NULL CHECK (reserved_qty > 0),
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','released','consumed','expired')),
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_stock_reservations_updated_at
  BEFORE UPDATE ON stock_reservations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_stock_reservations_product ON stock_reservations(product_id, status);
CREATE INDEX idx_stock_reservations_order   ON stock_reservations(order_id);

-- ── Contagens de Inventário (cabeçalho) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_counts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  count_number  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','in_progress','completed','cancelled')),
  warehouse     TEXT NOT NULL DEFAULT 'principal',
  notes         TEXT,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  created_by    UUID REFERENCES user_profiles(id),
  finished_by   UUID REFERENCES user_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, count_number)
);
CREATE TRIGGER trg_inventory_counts_updated_at
  BEFORE UPDATE ON inventory_counts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Itens da Contagem ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_count_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  count_id      UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  expected_qty  NUMERIC,
  counted_qty   NUMERIC,
  difference    NUMERIC GENERATED ALWAYS AS (
                  CASE WHEN counted_qty IS NOT NULL AND expected_qty IS NOT NULL
                    THEN counted_qty - expected_qty
                  ELSE NULL END
                ) STORED,
  notes         TEXT,
  counted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(count_id, product_id)
);
CREATE INDEX idx_inventory_count_items_count ON inventory_count_items(count_id);

-- ── Rastreabilidade: inventory_movements → sales_order_items (já em types.ts) ──
-- Coluna sales_order_item_id já adicionada pela migration anterior ao criar inventory_movements.
-- Se não existir:
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS sales_order_item_id UUID REFERENCES sales_order_items(id);

-- ── Views de Estoque Estendido ────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_stock_reservations_summary AS
SELECT
  sr.tenant_id,
  sr.product_id,
  p.name         AS product_name,
  p.sku          AS product_sku,
  sr.warehouse,
  SUM(sr.reserved_qty) AS total_reserved
FROM stock_reservations sr
JOIN products p ON p.id = sr.product_id
WHERE sr.status = 'active'
GROUP BY sr.tenant_id, sr.product_id, p.name, p.sku, sr.warehouse;

CREATE OR REPLACE VIEW vw_inventory_count_summary AS
SELECT
  ic.tenant_id,
  ic.id,
  ic.count_number,
  ic.status,
  ic.warehouse,
  ic.started_at,
  ic.finished_at,
  COUNT(ici.id)                   AS total_items,
  COUNT(ici.counted_qty)          AS counted_items,
  SUM(ABS(COALESCE(ici.difference,0))) AS total_divergence
FROM inventory_counts ic
LEFT JOIN inventory_count_items ici ON ici.count_id = ic.id
GROUP BY ic.tenant_id, ic.id, ic.count_number, ic.status, ic.warehouse, ic.started_at, ic.finished_at;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE stock_reservations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_reservations_tenant    ON stock_reservations    USING (tenant_id = get_user_tenant_id());
CREATE POLICY inventory_counts_tenant      ON inventory_counts      USING (tenant_id = get_user_tenant_id());
CREATE POLICY inventory_count_items_tenant ON inventory_count_items USING (tenant_id = get_user_tenant_id());
