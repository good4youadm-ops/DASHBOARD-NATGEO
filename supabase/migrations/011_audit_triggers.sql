-- =============================================================================
-- MIGRATION 011: Triggers de auditoria automática
-- Insere em audit_logs a cada INSERT/UPDATE/DELETE nas tabelas de negócio
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    COALESCE(
      (NEW.tenant_id)::uuid,
      (OLD.tenant_id)::uuid
    ),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplica trigger nas tabelas principais de negócio
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','products','suppliers',
    'sales_orders','sales_order_items',
    'accounts_receivable','accounts_payable',
    'stock_positions','inventory_movements'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_%1$s ON %1$s;
       CREATE TRIGGER trg_audit_%1$s
         AFTER INSERT OR UPDATE OR DELETE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION fn_audit_log();',
      t
    );
  END LOOP;
END;
$$;
