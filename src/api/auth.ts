import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const apiAuthToken = process.env.API_AUTH_TOKEN;
  if (!apiAuthToken) {
    res.status(500).json({ error: 'Servidor mal configurado: API_AUTH_TOKEN ausente' });
    return;
  }

  // Aceita token via header Authorization: Bearer <token>
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ') && auth.slice(7) === apiAuthToken) {
    next();
    return;
  }

  // Aceita token via query string ?api_key=<token>
  const qk = req.query['api_key'];
  if (typeof qk === 'string' && qk === apiAuthToken) {
    next();
    return;
  }

  res.status(401).json({ error: 'Token de autenticação inválido' });
}
