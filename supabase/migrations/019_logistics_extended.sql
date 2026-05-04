-- Migration 019: Logística Estendida — entregas, eventos de rastreamento

-- ── Entregas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_id        UUID REFERENCES delivery_routes(id),
  order_id        UUID REFERENCES sales_orders(id),
  driver_id       UUID REFERENCES drivers(id),
  vehicle_id      UUID REFERENCES vehicles(id),
  carrier_id      UUID REFERENCES carriers(id),
  tracking_code   TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','pickup','in_transit','out_for_delivery','delivered','failed','returned')),
  scheduled_date  DATE,
  delivered_at    TIMESTAMPTZ,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  proof_url       TEXT,        -- foto ou assinatura
  notes           TEXT,
  recipient_name  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_deliveries_order   ON deliveries(order_id);
CREATE INDEX idx_deliveries_route   ON deliveries(route_id);
CREATE INDEX idx_deliveries_driver  ON deliveries(driver_id);
CREATE INDEX idx_deliveries_status  ON deliveries(tenant_id, status);

-- ── Eventos de Rastreamento ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_id   UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN (
                  'created','dispatched','in_hub','in_transit','out_for_delivery',
                  'delivery_attempt','delivered','failed','returned','cancelled')),
  description   TEXT,
  latitude      NUMERIC(10,7),
  longitude     NUMERIC(10,7),
  location_name TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT DEFAULT 'system'  -- 'system' | 'carrier_api' | 'manual'
);
CREATE INDEX idx_shipping_events_delivery ON shipping_events(delivery_id);
CREATE INDEX idx_shipping_events_occurred ON shipping_events(tenant_id, occurred_at DESC);

-- ── Views de Logística ────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_deliveries_summary AS
SELECT
  d.tenant_id,
  d.status,
  COUNT(*)                                                 AS total,
  COUNT(*) FILTER (WHERE d.scheduled_date < CURRENT_DATE
                     AND d.status NOT IN ('delivered','returned'))
                                                           AS overdue,
  AVG(EXTRACT(EPOCH FROM (d.delivered_at - d.created_at))/3600)
    FILTER (WHERE d.status = 'delivered')                  AS avg_delivery_hours
FROM deliveries d
GROUP BY d.tenant_id, d.status;

-- ── Rastrear tracking_code único globalmente ──────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_tracking
  ON deliveries(tracking_code) WHERE tracking_code IS NOT NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE deliveries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_events  ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliveries_tenant      ON deliveries      USING (tenant_id = get_user_tenant_id());
CREATE POLICY shipping_events_tenant ON shipping_events USING (tenant_id = get_user_tenant_id());
