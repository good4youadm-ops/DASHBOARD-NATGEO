import { Request, Response, NextFunction } from 'express';

export type AuthRequest = Request & {
  user: { id: string; email?: string };
  tenantId: string;
  permissions: Set<string>;
};

// Supabase removido — permissões agora são estáticas via env ou liberadas em dev
// TODO: implementar RBAC definitivo quando a empresa fornecer solução de autenticação

const CACHE_TTL_MS = 5 * 60 * 1000;
const permCache = new Map<string, { perms: Set<string>; tenantId: string; expiresAt: number }>();

export async function loadUserPermissions(
  userId: string,
): Promise<{ perms: Set<string>; tenantId: string }> {
  const cached = permCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { perms: cached.perms, tenantId: cached.tenantId };
  }

  // Sem banco de dados: todas as permissões liberadas para o usuário autenticado
  const perms = new Set<string>(['admin:settings', 'data:read', 'data:write']);
  const tenantId = process.env.SYNC_DEFAULT_TENANT_ID ?? 'default';

  permCache.set(userId, { perms, tenantId, expiresAt: Date.now() + CACHE_TTL_MS });
  return { perms, tenantId };
}

export function invalidatePermissionCache(userId: string): void {
  permCache.delete(userId);
}

// Auth via API_AUTH_TOKEN — sem Supabase
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiAuthToken = process.env.API_AUTH_TOKEN;
    if (!apiAuthToken) {
      // Modo dev: sem token configurado, popula req com usuário fictício
      const r = req as AuthRequest;
      r.user = { id: 'dev-user', email: 'dev@local' };
      r.tenantId = process.env.SYNC_DEFAULT_TENANT_ID ?? 'default';
      r.permissions = new Set(['admin:settings', 'data:read', 'data:write']);
      next();
      return;
    }
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ') || auth.slice(7) !== apiAuthToken) {
      res.status(401).json({ error: 'Token de autenticação inválido' });
      return;
    }
    const r = req as AuthRequest;
    r.user = { id: 'api-user' };
    r.tenantId = process.env.SYNC_DEFAULT_TENANT_ID ?? 'default';
    r.permissions = new Set(['admin:settings', 'data:read', 'data:write']);
    next();
  };
}

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

export function requireAdmin() {
  return requirePermission('admin:settings');
}
