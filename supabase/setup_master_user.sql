-- =============================================================================
-- SETUP DO USUÁRIO MASTER — executar no Supabase SQL Editor
--
-- PRÉ-REQUISITO OBRIGATÓRIO (fazer ANTES de rodar este script):
--   1. Abrir Supabase Dashboard → Authentication → Users
--   2. Clicar em "Add user" → "Create new user"
--   3. E-mail: ferrerjoao2206@gmail.com
--   4. Definir uma senha segura (ex: NatGeo@2026!)
--   5. Desmarcar "Auto Confirm User" se quiser confirmar manualmente
--   6. Clicar em "Create User"
--
-- Só depois rodar este SQL completo no SQL Editor.
-- =============================================================================


-- ── DIAGNÓSTICO: verifica se o usuário foi criado no Auth ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'ferrerjoao2206@gmail.com'
  ) THEN
    RAISE EXCEPTION
      'USUÁRIO NÃO ENCONTRADO no Supabase Auth. '
      'Crie o usuário primeiro em: Authentication → Users → Add user. '
      'E-mail: ferrerjoao2206@gmail.com';
  END IF;
END $$;


-- ── DIAGNÓSTICO: verifica se o tenant padrão existe ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    RAISE EXCEPTION
      'TENANT PADRÃO NÃO ENCONTRADO. '
      'A migration 001_tenants_and_users.sql não foi aplicada corretamente.';
  END IF;
END $$;


-- ── PASSO 1: Cria perfil do usuário master ────────────────────────────────────
INSERT INTO user_profiles (id, tenant_id, full_name, role, is_active)
SELECT
  au.id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  COALESCE(au.raw_user_meta_data->>'full_name', 'João Ferrer'),
  'owner',
  true
FROM auth.users au
WHERE au.email = 'ferrerjoao2206@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  tenant_id  = EXCLUDED.tenant_id,
  full_name  = EXCLUDED.full_name,
  role       = 'owner',
  is_active  = true,
  updated_at = NOW();


-- ── PASSO 2: Cria permissões do sistema ───────────────────────────────────────
INSERT INTO permissions (code, resource, action, description) VALUES
  ('admin:settings',   'admin',   'settings', 'Acesso total de administrador'),
  ('dashboard:read',   'dashboard','read',     'Ver dashboards'),
  ('sales:read',       'sales',   'read',      'Ver vendas'),
  ('sales:create',     'sales',   'create',    'Criar pedidos de venda'),
  ('sales:update',     'sales',   'update',    'Editar pedidos de venda'),
  ('inventory:read',   'inventory','read',     'Ver estoque'),
  ('inventory:update', 'inventory','update',   'Ajustar estoque'),
  ('finance:read',     'finance', 'read',      'Ver financeiro'),
  ('finance:create',   'finance', 'create',    'Criar lançamentos'),
  ('finance:update',   'finance', 'update',    'Editar lançamentos'),
  ('customers:read',   'customers','read',     'Ver clientes'),
  ('customers:create', 'customers','create',   'Criar clientes'),
  ('products:read',    'products','read',      'Ver produtos'),
  ('products:create',  'products','create',    'Criar produtos'),
  ('reports:read',     'reports', 'read',      'Ver relatórios'),
  ('orders:export',    'orders',  'export',    'Exportar pedidos'),
  ('fiscal:read',      'fiscal',  'read',      'Ver fiscal / NF-e'),
  ('fiscal:create',    'fiscal',  'create',    'Emitir NF-e')
ON CONFLICT (code) DO NOTHING;


-- ── PASSO 3: Cria role de Owner (acesso total) ────────────────────────────────
INSERT INTO roles (tenant_id, name, display_name, description, is_system)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'owner',
  'Proprietário',
  'Acesso total ao sistema — sem restrições',
  true
)
ON CONFLICT (tenant_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_system    = true;


-- ── PASSO 4: Associa TODAS as permissões ao role owner ────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name       = 'owner'
  AND r.tenant_id  = '00000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT DO NOTHING;


-- ── PASSO 5: Associa o role owner ao usuário master ───────────────────────────
INSERT INTO user_roles (user_id, role_id)
SELECT
  up.id,
  r.id
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
CROSS JOIN roles r
WHERE au.email    = 'ferrerjoao2206@gmail.com'
  AND r.name      = 'owner'
  AND r.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT DO NOTHING;


-- ── VERIFICAÇÃO FINAL ─────────────────────────────────────────────────────────
-- Se tudo correu bem, este SELECT deve retornar 1 linha com os dados do usuário.
SELECT
  au.email,
  up.full_name,
  up.role                          AS profile_role,
  t.name                           AS tenant,
  COUNT(ur.id)                     AS roles_atribuidos,
  COUNT(rp.permission_id)          AS permissoes_totais
FROM auth.users au
JOIN user_profiles  up ON up.id         = au.id
JOIN tenants        t  ON t.id          = up.tenant_id
LEFT JOIN user_roles       ur ON ur.user_id  = up.id
LEFT JOIN role_permissions rp ON rp.role_id  = ur.role_id
WHERE au.email = 'ferrerjoao2206@gmail.com'
GROUP BY au.email, up.full_name, up.role, t.name;
