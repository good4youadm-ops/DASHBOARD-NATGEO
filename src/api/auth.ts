import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const apiAuthToken = process.env.API_AUTH_TOKEN;
  if (!apiAuthToken) {
    res.status(500).json({ error: 'Servidor mal configurado: API_AUTH_TOKEN ausente' });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== apiAuthToken) {
    res.status(401).json({ error: 'Token de autenticação inválido' });
    return;
  }
  next();
}
