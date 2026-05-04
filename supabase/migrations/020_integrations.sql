-- Migration 020: Integrações — jobs de importação, erros, webhooks log

-- ── Jobs de Importação ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity        TEXT NOT NULL,                -- 'customers' | 'products' | 'orders' | ...
  source        TEXT NOT NULL DEFAULT 'csv',  -- 'csv' | 'api' | 'oracle' | 'xlsx'
  status        TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','processing','completed','failed','cancelled')),
  file_name     TEXT,
  file_url      TEXT,
  total_rows    INTEGER,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  success_rows  INTEGER NOT NULL DEFAULT 0,
  error_rows    INTEGER NOT NULL DEFAULT 0,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  created_by    UUID REFERENCES user_profiles(id),
  options       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_import_jobs_tenant ON import_jobs(tenant_id, status);

-- ── Erros de Importação ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_errors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number  INTEGER,
  row_data    JSONB,
  error_code  TEXT,
  error_msg   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_import_errors_job ON import_errors(job_id);

-- ── Webhooks Log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source        TEXT NOT NULL,       -- 'stripe' | 'sefaz' | 'oracle' | 'crm' | ...
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  headers       JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received','processed','failed','ignored')),
  error_msg     TEXT,
  processed_at  TIMESTAMPTZ,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhooks_log_tenant  ON webhooks_log(tenant_id, created_at DESC);
CREATE INDEX idx_webhooks_log_source  ON webhooks_log(source, event_type);

-- ── API Keys para integrações externas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL UNIQUE,  -- SHA-256 hash, never store plain
  prefix        TEXT NOT NULL,         -- primeiros 8 chars para lookup rápido
  scopes        TEXT[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES user_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix) WHERE is_active = true;

-- ── Audit Log — INSERT funcional ──────────────────────────────────────────────
-- A tabela audit_logs já existe (migration 008). Criar função helper:
CREATE OR REPLACE FUNCTION log_audit(
  p_tenant_id UUID,
  p_user_id   UUID,
  p_action    TEXT,
  p_entity    TEXT,
  p_entity_id UUID,
  p_changes   JSONB DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, changes)
  VALUES (p_tenant_id, p_user_id, p_action, p_entity, p_entity_id, p_changes);
END;
$$;

-- ── Trigger genérico de auditoria ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_audit_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      OLD.tenant_id, auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id,
      jsonb_build_object('old', to_jsonb(OLD))
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit(
      NEW.tenant_id, auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSE
    PERFORM log_audit(
      NEW.tenant_id, auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id,
      jsonb_build_object('new', to_jsonb(NEW))
    );
    RETURN NEW;
  END IF;
END;
$$;

-- Aplicar auditoria às tabelas de negócio críticas
CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION trg_audit_changes();

CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION trg_audit_changes();

CREATE TRIGGER audit_sales_orders
  AFTER INSERT OR UPDATE OR DELETE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION trg_audit_changes();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION trg_audit_changes();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE import_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys      ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_jobs_tenant   ON import_jobs   USING (tenant_id = get_user_tenant_id());
CREATE POLICY import_errors_tenant ON import_errors USING (tenant_id = get_user_tenant_id());
CREATE POLICY webhooks_log_tenant  ON webhooks_log  USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);
CREATE POLICY api_keys_tenant      ON api_keys      USING (tenant_id = get_user_tenant_id());
