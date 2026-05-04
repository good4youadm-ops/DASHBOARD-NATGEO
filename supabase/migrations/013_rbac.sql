-- Migration 013: RBAC completo — branches, roles, permissions, user_roles, sessions
-- Substitui o enum simples de role em user_profiles por RBAC granular

-- ── Filiais / Branches ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT,
  address     JSONB NOT NULL DEFAULT '{}',
  phone       TEXT,
  email       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_headquarters   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Permissions (recurso:ação) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,      -- 'orders:create'
  resource    TEXT NOT NULL,             -- 'orders'
  action      TEXT NOT NULL,             -- 'create' | 'read' | 'update' | 'delete' | 'export'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Roles (agora tabela, não enum) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = role de sistema
  name         TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description  TEXT,
  is_system    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Role ↔ Permissions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ── User ↔ Roles (muitos-para-muitos) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by  UUID REFERENCES user_profiles(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  UNIQUE(user_id, role_id)
);

-- ── Sessions (rastreamento de sessões de usuário) ─────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  ip_address        TEXT,
  user_agent        TEXT,
  login_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at         TIMESTAMPTZ,
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions(user_id, is_active);
CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);

-- ── Seed: permissions ────────────────────────────────────────────────────
INSERT INTO permissions (code, resource, action, description) VALUES
  -- Dashboard
  ('dashboard:read',       'dashboard',  'read',   'Ver dashboards analíticos'),
  -- Customers
  ('customers:read',       'customers',  'read',   'Ver clientes'),
  ('customers:create',     'customers',  'create', 'Criar clientes'),
  ('customers:update',     'customers',  'update', 'Editar clientes'),
  ('customers:delete',     'customers',  'delete', 'Excluir/desativar clientes'),
  ('customers:export',     'customers',  'export', 'Exportar lista de clientes'),
  -- Suppliers
  ('suppliers:read',       'suppliers',  'read',   'Ver fornecedores'),
  ('suppliers:create',     'suppliers',  'create', 'Criar fornecedores'),
  ('suppliers:update',     'suppliers',  'update', 'Editar fornecedores'),
  ('suppliers:delete',     'suppliers',  'delete', 'Excluir/desativar fornecedores'),
  -- Products
  ('products:read',        'products',   'read',   'Ver produtos'),
  ('products:create',      'products',   'create', 'Criar produtos'),
  ('products:update',      'products',   'update', 'Editar produtos'),
  ('products:delete',      'products',   'delete', 'Excluir/desativar produtos'),
  -- Orders
  ('orders:read',          'orders',     'read',   'Ver pedidos'),
  ('orders:create',        'orders',     'create', 'Criar pedidos'),
  ('orders:update',        'orders',     'update', 'Editar pedidos'),
  ('orders:delete',        'orders',     'delete', 'Cancelar pedidos'),
  ('orders:export',        'orders',     'export', 'Exportar pedidos'),
  -- Quotes
  ('quotes:read',          'quotes',     'read',   'Ver orçamentos'),
  ('quotes:create',        'quotes',     'create', 'Criar orçamentos'),
  ('quotes:update',        'quotes',     'update', 'Editar orçamentos'),
  ('quotes:delete',        'quotes',     'delete', 'Excluir orçamentos'),
  -- Finance
  ('finance:read',         'finance',    'read',   'Ver módulo financeiro'),
  ('finance:create',       'finance',    'create', 'Criar lançamentos financeiros'),
  ('finance:update',       'finance',    'update', 'Editar lançamentos financeiros'),
  ('finance:delete',       'finance',    'delete', 'Excluir lançamentos manuais'),
  ('finance:export',       'finance',    'export', 'Exportar dados financeiros'),
  -- Stock
  ('stock:read',           'stock',      'read',   'Ver estoque'),
  ('stock:write',          'stock',      'write',  'Registrar movimentos de estoque'),
  ('stock:export',         'stock',      'export', 'Exportar dados de estoque'),
  -- Logistics
  ('logistics:read',       'logistics',  'read',   'Ver logística'),
  ('logistics:write',      'logistics',  'write',  'Gerenciar rotas e entregas'),
  -- Fiscal
  ('fiscal:read',          'fiscal',     'read',   'Ver módulo fiscal'),
  ('fiscal:write',         'fiscal',     'write',  'Emitir/cancelar notas fiscais'),
  -- Sales reps / Goals / Commissions
  ('commercial:read',      'commercial', 'read',   'Ver metas e comissões'),
  ('commercial:write',     'commercial', 'write',  'Gerenciar metas e comissões'),
  -- Admin
  ('admin:users',          'admin',      'users',  'Gerenciar usuários e permissões'),
  ('admin:settings',       'admin',      'settings','Configurações do sistema'),
  ('admin:import',         'admin',      'import', 'Importar dados via CSV/API'),
  ('admin:export_all',     'admin',      'export', 'Exportar qualquer módulo')
ON CONFLICT (code) DO NOTHING;

-- ── Seed: system roles ────────────────────────────────────────────────────
INSERT INTO roles (tenant_id, name, display_name, description, is_system) VALUES
  (NULL, 'org_admin',   'Administrador',      'Acesso total ao tenant',                      true),
  (NULL, 'director',    'Diretor',             'Leitura estratégica completa, sem edição',    true),
  (NULL, 'commercial',  'Comercial',           'Pedidos, clientes, metas, cotações',          true),
  (NULL, 'salesperson', 'Representante',       'Apenas seus próprios pedidos e clientes',     true),
  (NULL, 'financial',   'Financeiro',          'Módulo financeiro completo',                  true),
  (NULL, 'stock',       'Estoque',             'Estoque, movimentações, inventário',          true),
  (NULL, 'purchasing',  'Compras',             'Fornecedores, compras, reposição',            true),
  (NULL, 'fiscal',      'Fiscal',              'Notas fiscais, CFOP, configurações fiscais',  true),
  (NULL, 'logistics',   'Logística',           'Rotas, entregas, motoristas, veículos',       true),
  (NULL, 'viewer',      'Visualizador',        'Somente leitura de dashboards',               true)
ON CONFLICT DO NOTHING;

-- ── Role ↔ Permission mappings ───────────────────────────────────────────
DO $$
DECLARE
  r_admin      UUID := (SELECT id FROM roles WHERE name='org_admin'   AND tenant_id IS NULL);
  r_director   UUID := (SELECT id FROM roles WHERE name='director'    AND tenant_id IS NULL);
  r_commercial UUID := (SELECT id FROM roles WHERE name='commercial'  AND tenant_id IS NULL);
  r_sales      UUID := (SELECT id FROM roles WHERE name='salesperson' AND tenant_id IS NULL);
  r_financial  UUID := (SELECT id FROM roles WHERE name='financial'   AND tenant_id IS NULL);
  r_stock      UUID := (SELECT id FROM roles WHERE name='stock'       AND tenant_id IS NULL);
  r_purchasing UUID := (SELECT id FROM roles WHERE name='purchasing'  AND tenant_id IS NULL);
  r_fiscal     UUID := (SELECT id FROM roles WHERE name='fiscal'      AND tenant_id IS NULL);
  r_logistics  UUID := (SELECT id FROM roles WHERE name='logistics'   AND tenant_id IS NULL);
  r_viewer     UUID := (SELECT id FROM roles WHERE name='viewer'      AND tenant_id IS NULL);

  PROCEDURE grant_all(role_id UUID, codes TEXT[]) AS $$
  BEGIN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, id FROM permissions WHERE code = ANY(codes)
    ON CONFLICT DO NOTHING;
  END;
BEGIN
  -- org_admin: all permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_admin, id FROM permissions ON CONFLICT DO NOTHING;

  -- director: read everything + export all
  CALL grant_all(r_director, ARRAY['dashboard:read','customers:read','customers:export',
    'products:read','suppliers:read','orders:read','orders:export','quotes:read',
    'finance:read','finance:export','stock:read','stock:export','logistics:read',
    'fiscal:read','commercial:read','admin:export_all']);

  -- commercial: orders, customers, quotes, goals, commissions
  CALL grant_all(r_commercial, ARRAY['dashboard:read','customers:read','customers:create',
    'customers:update','customers:export','products:read','orders:read','orders:create',
    'orders:update','orders:delete','orders:export','quotes:read','quotes:create',
    'quotes:update','quotes:delete','commercial:read','commercial:write']);

  -- salesperson: own orders and customers (row-level enforced separately)
  CALL grant_all(r_sales, ARRAY['dashboard:read','customers:read','products:read',
    'orders:read','orders:create','orders:update','quotes:read','quotes:create',
    'commercial:read']);

  -- financial: full finance module
  CALL grant_all(r_financial, ARRAY['dashboard:read','finance:read','finance:create',
    'finance:update','finance:delete','finance:export','customers:read',
    'orders:read','commercial:read']);

  -- stock: inventory full access
  CALL grant_all(r_stock, ARRAY['dashboard:read','stock:read','stock:write',
    'stock:export','products:read']);

  -- purchasing: suppliers, products, orders (read)
  CALL grant_all(r_purchasing, ARRAY['dashboard:read','suppliers:read','suppliers:create',
    'suppliers:update','products:read','products:update','orders:read','stock:read']);

  -- fiscal: invoices, tax rules, configs
  CALL grant_all(r_fiscal, ARRAY['dashboard:read','fiscal:read','fiscal:write',
    'orders:read','customers:read','products:read']);

  -- logistics: routes, deliveries, carriers
  CALL grant_all(r_logistics, ARRAY['dashboard:read','logistics:read','logistics:write',
    'orders:read','customers:read']);

  -- viewer: only read dashboards
  CALL grant_all(r_viewer, ARRAY['dashboard:read','customers:read','products:read',
    'orders:read','stock:read','finance:read']);
END;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE branches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions     ENABLE ROW LEVEL SECURITY;

CREATE POLICY branches_tenant   ON branches   USING (tenant_id = get_user_tenant_id());
CREATE POLICY roles_tenant      ON roles      USING (tenant_id IS NULL OR tenant_id = get_user_tenant_id());
CREATE POLICY user_roles_tenant ON user_roles USING (user_id IN (SELECT id FROM user_profiles WHERE tenant_id = get_user_tenant_id()));
CREATE POLICY sessions_tenant   ON sessions   USING (tenant_id = get_user_tenant_id());
