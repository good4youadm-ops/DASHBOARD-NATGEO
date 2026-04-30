-- =============================================================================
-- MIGRATION 012: Módulo de Logística
-- Tabelas: drivers, vehicles, delivery_routes, route_stops
-- =============================================================================

-- ── Motoristas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  document      TEXT,                     -- CPF
  cnh           TEXT,                     -- Número da CNH
  cnh_category  TEXT,                     -- A, B, C, D, E
  cnh_expiry    DATE,
  phone         TEXT,
  email         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_tenant_id ON drivers(tenant_id);
CREATE INDEX idx_drivers_is_active ON drivers(is_active);

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY drivers_tenant ON drivers FOR ALL USING (tenant_id = get_user_tenant_id());

-- ── Veículos ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plate         TEXT NOT NULL,
  model         TEXT,
  brand         TEXT,
  year          INTEGER,
  type          TEXT CHECK (type IN ('caminhao','van','moto','carro','utilitario')),
  capacity_kg   NUMERIC(10,2),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, plate)
);

CREATE INDEX idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_is_active ON vehicles(is_active);

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicles_tenant ON vehicles FOR ALL USING (tenant_id = get_user_tenant_id());

-- ── Rotas de Entrega ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_routes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_date    DATE NOT NULL,
  driver_id     UUID REFERENCES drivers(id),
  vehicle_id    UUID REFERENCES vehicles(id),
  status        TEXT NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned','in_progress','completed','cancelled')),
  total_stops   INTEGER NOT NULL DEFAULT 0,
  total_weight_kg NUMERIC(10,2),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_tenant_id  ON delivery_routes(tenant_id);
CREATE INDEX idx_routes_route_date ON delivery_routes(route_date DESC);
CREATE INDEX idx_routes_driver_id  ON delivery_routes(driver_id);
CREATE INDEX idx_routes_status     ON delivery_routes(status);

CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON delivery_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY routes_tenant ON delivery_routes FOR ALL USING (tenant_id = get_user_tenant_id());

-- ── Paradas da Rota ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_stops (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_id        UUID NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  sales_order_id  UUID REFERENCES sales_orders(id),
  stop_order      INTEGER NOT NULL DEFAULT 1,
  customer_name   TEXT,
  address         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','delivered','failed','skipped')),
  delivered_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stops_tenant_id ON route_stops(tenant_id);
CREATE INDEX idx_stops_route_id  ON route_stops(route_id);
CREATE INDEX idx_stops_order_id  ON route_stops(sales_order_id);

CREATE TRIGGER trg_stops_updated_at
  BEFORE UPDATE ON route_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY stops_tenant ON route_stops FOR ALL USING (tenant_id = get_user_tenant_id());
