import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

export type AuthRequest = Request & {
  user: { id: string; email?: string };
  tenantId: string;
  permissions: Set<string>;
};

// Cache em memória por sessão (TTL 5 min) para evitar round-trip ao Supabase em cada request
const permCache = new Map<string, { perms: Set<string>; tenantId: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function loadUserPermissions(
  client: SupabaseClient,
  userId: string,
): Promise<{ perms: Set<string>; tenantId: string }> {
  const cached = permCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { perms: cached.perms, tenantId: cached.tenantId };
  }

  // Busca tenant do usuário
  const { data: profile } = await client
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  const tenantId = profile?.tenant_id ?? '';

  // Busca permissões via user_roles → roles → role_permissions → permissions
  const { data: rows } = await client
    .from('user_roles')
    .select('roles(role_permissions(permissions(code)))')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  const perms = new Set<string>();
  for (const ur of (rows ?? []) as Record<string, unknown>[]) {
    const role = (ur as { roles?: { role_permissions?: { permissions?: { code: string } }[] } }).roles;
    for (const rp of role?.role_permissions ?? []) {
      if (rp.permissions?.code) perms.add(rp.permissions.code);
    }
  }

  permCache.set(userId, { perms, tenantId, expiresAt: Date.now() + CACHE_TTL_MS });
  return { perms, tenantId };
}

// Invalida cache ao fazer logout ou alterar permissões
export function invalidatePermissionCache(userId: string): void {
  permCache.delete(userId);
}

// Middleware: valida JWT Supabase e carrega permissões
export function requireAuth(client: SupabaseClient) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de autenticação necessário' });
      return;
    }
    const token = auth.slice(7);
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return;
    }

    try {
      const { perms, tenantId } = await loadUserPermissions(client, user.id);
      const r = req as AuthRequest;
      r.user = { id: user.id, email: user.email };
      r.tenantId = tenantId;
      r.permissions = perms;
      next();
    } catch {
      res.status(500).json({ error: 'Erro ao carregar permissões do usuário' });
    }
  };
}

// Middleware de autorização por permissão
export function requirePermission(code: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const r = req as AuthRequest;
    if (!r.permissions?.has(code)) {
      res.status(403).json({ error: `Permissão necessária: ${code}` });
      return;
    }
    next();
  };
}

// Middleware: verifica se é org_admin (tem admin:settings)
export function requireAdmin() {
  return requirePermission('admin:settings');
}
