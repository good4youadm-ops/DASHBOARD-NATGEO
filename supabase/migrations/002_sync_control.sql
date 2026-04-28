-- =============================================================================
-- MIGRATION 002: Controle de Sincronização
-- Tabelas: sync_sources, sync_runs, sync_errors, sync_state, raw_oracle_records
-- =============================================================================

-- =============================================================================
-- TABELA: sync_sources
-- Fontes de dados configuradas (ex: Oracle da distribuidora)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_sources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('oracle','postgres','mysql','api','csv')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  config      JSONB NOT NULL DEFAULT '{}',
  -- config exemplo: { "host": "...", "port": 1521, "service": "ORCL" }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_sync_sources_tenant_id ON sync_sources(tenant_id);
CREATE INDEX idx_sync_sources_is_active ON sync_sources(is_active);

CREATE TRIGGER trg_sync_sources_updated_at
  BEFORE UPDATE ON sync_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Source padrão para desenvolvimento
INSERT INTO sync_sources (tenant_id, name, type, config)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'oracle_distribuidora',
  'oracle',
  '{"host": "CONFIGURAR", "port": 1521, "service": "ORCL", "pool_min": 2, "pool_max": 10}'
) ON CONFLICT (tenant_id, name) DO NOTHING;

-- =============================================================================
-- TABELA: sync_state
-- Checkpoint de cada entidade — permite sync incremental
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_state (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_name             TEXT NOT NULL,
  entity_name             TEXT NOT NULL,
  last_synced_at          TIMESTAMPTZ,
  last_source_updated_at  TIMESTAMPTZ,
  last_source_id          TEXT,
  cursor                  JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_name, entity_name)
);

CREATE INDEX idx_sync_state_tenant_id ON sync_state(tenant_id);
CREATE INDEX idx_sync_state_entity_name ON sync_state(entity_name);

CREATE TRIGGER trg_sync_state_updated_at
  BEFORE UPDATE ON sync_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: sync_runs
-- Histórico de execuções de sincronização
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_name     TEXT NOT NULL,
  entity_name     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','success','failed','partial')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  rows_read       INTEGER NOT NULL DEFAULT 0,
  rows_inserted   INTEGER NOT NULL DEFAULT 0,
  rows_updated    INTEGER NOT NULL DEFAULT 0,
  rows_failed     INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_runs_tenant_id ON sync_runs(tenant_id);
CREATE INDEX idx_sync_runs_entity_name ON sync_runs(entity_name);
CREATE INDEX idx_sync_runs_status ON sync_runs(status);
CREATE INDEX idx_sync_runs_started_at ON sync_runs(started_at DESC);

-- =============================================================================
-- TABELA: sync_errors
-- Erros individuais por linha durante a sincronização
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_errors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_run_id     UUID NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_name     TEXT NOT NULL,
  source_id       TEXT,
  error_message   TEXT NOT NULL,
  raw_payload     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_errors_sync_run_id ON sync_errors(sync_run_id);
CREATE INDEX idx_sync_errors_tenant_id ON sync_errors(tenant_id);
CREATE INDEX idx_sync_errors_entity_name ON sync_errors(entity_name);
CREATE INDEX idx_sync_errors_created_at ON sync_errors(created_at DESC);

-- =============================================================================
-- TABELA: raw_oracle_records
-- Armazena o payload bruto do Oracle (útil para debug e reprocessamento)
-- =============================================================================
CREATE TABLE IF NOT EXISTS raw_oracle_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_name   TEXT NOT NULL,
  entity_name   TEXT NOT NULL,
  source_id     TEXT NOT NULL,
  payload       JSONB NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed     BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (tenant_id, source_name, entity_name, source_id)
);

CREATE INDEX idx_raw_oracle_tenant_id ON raw_oracle_records(tenant_id);
CREATE INDEX idx_raw_oracle_entity_name ON raw_oracle_records(entity_name);
CREATE INDEX idx_raw_oracle_source_id ON raw_oracle_records(source_id);
CREATE INDEX idx_raw_oracle_processed ON raw_oracle_records(processed);
