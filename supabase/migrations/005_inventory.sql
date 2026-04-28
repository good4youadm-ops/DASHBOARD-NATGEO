-- =============================================================================
-- MIGRATION 005: Estoque
-- =============================================================================

-- =============================================================================
-- TABELA: stock_positions (Posições de estoque por produto/depósito)
-- =============================================================================
CREATE TABLE IF NOT EXISTS stock_positions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system       TEXT NOT NULL DEFAULT 'oracle',
  source_id           TEXT NOT NULL,

  -- Relacionamentos
  product_id          UUID REFERENCES products(id),
  product_source_id   TEXT,

  -- Localização
  warehouse           TEXT NOT NULL DEFAULT 'CD_PRINCIPAL',
  location            TEXT,

  -- Quantidades
  qty_available       NUMERIC(15,3) NOT NULL DEFAULT 0,
  qty_reserved        NUMERIC(15,3) NOT NULL DEFAULT 0,
  qty_blocked         NUMERIC(15,3) NOT NULL DEFAULT 0,
  qty_in_transit      NUMERIC(15,3) NOT NULL DEFAULT 0,
  qty_physical        NUMERIC(15,3) GENERATED ALWAYS AS
                        (qty_available + qty_reserved + qty_blocked) STORED,

  -- Valores
  avg_cost            NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_cost          NUMERIC(15,2) GENERATED ALWAYS AS
                        (qty_physical * avg_cost) STORED,

  -- Posição calculada
  coverage_days       NUMERIC(8,1),   -- cobertura em dias (preenchida pela sync)
  abc_curve           TEXT CHECK (abc_curve IN ('A','B','C','D')),
  ruptura             BOOLEAN NOT NULL DEFAULT false,

  -- Data de referência do snapshot
  position_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  extra               JSONB DEFAULT '{}',

  -- Controle
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at           TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_stock_positions_tenant_id ON stock_positions(tenant_id);
CREATE INDEX idx_stock_positions_source_id ON stock_positions(source_id);
CREATE INDEX idx_stock_positions_product_id ON stock_positions(product_id);
CREATE INDEX idx_stock_positions_warehouse ON stock_positions(warehouse);
CREATE INDEX idx_stock_positions_abc_curve ON stock_positions(abc_curve);
CREATE INDEX idx_stock_positions_ruptura ON stock_positions(ruptura);
CREATE INDEX idx_stock_positions_updated_at ON stock_positions(updated_at DESC);

CREATE TRIGGER trg_stock_positions_updated_at
  BEFORE UPDATE ON stock_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: stock_lots (Lotes de estoque — controle FEFO)
-- =============================================================================
CREATE TABLE IF NOT EXISTS stock_lots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system       TEXT NOT NULL DEFAULT 'oracle',
  source_id           TEXT NOT NULL,

  -- Relacionamentos
  product_id          UUID REFERENCES products(id),
  product_source_id   TEXT,

  -- Dados do lote
  lot_number          TEXT NOT NULL,
  warehouse           TEXT NOT NULL DEFAULT 'CD_PRINCIPAL',
  location            TEXT,
  manufacture_date    DATE,
  expiry_date         DATE,
  days_to_expiry      INTEGER GENERATED ALWAYS AS
                        (expiry_date::date - CURRENT_DATE) STORED,
  status              TEXT NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available','blocked','expired','consumed','open_box')),
  is_open_box         BOOLEAN NOT NULL DEFAULT false,
  units_per_box       INTEGER,

  -- Quantidades
  qty_initial         NUMERIC(15,3) NOT NULL DEFAULT 0,
  qty_current         NUMERIC(15,3) NOT NULL DEFAULT 0,
  qty_consumed        NUMERIC(15,3) NOT NULL DEFAULT 0,

  -- Valores
  unit_cost           NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_cost          NUMERIC(15,2) GENERATED ALWAYS AS (qty_current * unit_cost) STORED,

  fefo_compliant      BOOLEAN DEFAULT true,
  extra               JSONB DEFAULT '{}',

  -- Controle
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at           TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_stock_lots_tenant_id ON stock_lots(tenant_id);
CREATE INDEX idx_stock_lots_source_id ON stock_lots(source_id);
CREATE INDEX idx_stock_lots_product_id ON stock_lots(product_id);
CREATE INDEX idx_stock_lots_expiry_date ON stock_lots(expiry_date);
CREATE INDEX idx_stock_lots_status ON stock_lots(status);
CREATE INDEX idx_stock_lots_days_to_expiry ON stock_lots(days_to_expiry);
CREATE INDEX idx_stock_lots_updated_at ON stock_lots(updated_at DESC);

CREATE TRIGGER trg_stock_lots_updated_at
  BEFORE UPDATE ON stock_lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: inventory_movements (Movimentações de estoque)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_system       TEXT NOT NULL DEFAULT 'oracle',
  source_id           TEXT NOT NULL,

  -- Relacionamentos
  product_id          UUID REFERENCES products(id),
  product_source_id   TEXT,
  lot_source_id       TEXT,

  -- Dados do movimento
  movement_date       TIMESTAMPTZ NOT NULL,
  movement_type       TEXT NOT NULL
                        CHECK (movement_type IN (
                          'entrada','saida','ajuste','transferencia',
                          'devolucao','perda','avaria','inventario'
                        )),
  direction           TEXT NOT NULL CHECK (direction IN ('in','out')),
  warehouse_from      TEXT,
  warehouse_to        TEXT,
  document_ref        TEXT,         -- NF, OC, pedido referência
  quantity            NUMERIC(15,3) NOT NULL,
  unit_cost           NUMERIC(15,4),
  total_cost          NUMERIC(15,2),
  reason              TEXT,
  operator            TEXT,
  extra               JSONB DEFAULT '{}',

  -- Controle
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at           TIMESTAMPTZ,

  UNIQUE (tenant_id, source_system, source_id)
);

CREATE INDEX idx_inv_movements_tenant_id ON inventory_movements(tenant_id);
CREATE INDEX idx_inv_movements_source_id ON inventory_movements(source_id);
CREATE INDEX idx_inv_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inv_movements_movement_date ON inventory_movements(movement_date DESC);
CREATE INDEX idx_inv_movements_movement_type ON inventory_movements(movement_type);
CREATE INDEX idx_inv_movements_updated_at ON inventory_movements(updated_at DESC);

CREATE TRIGGER trg_inv_movements_updated_at
  BEFORE UPDATE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
