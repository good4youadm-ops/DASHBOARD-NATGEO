import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { logger } from './logger';
import { requireAuth } from './auth';
import healthRouter from './routes/health';
import dashboardRouter from './routes/dashboard';
import entitiesRouter from './routes/entities';
import financeRouter from './routes/finance';
import catalogRouter from './routes/catalog';
import integrationsRouter from './routes/integrations';
import ingestRouter from './routes/ingest';

const app = express();

const publicDir = path.resolve('.');
app.use(express.static(publicDir, { index: 'dashboard-comercial.html' }));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
});
app.use('/api', apiLimiter);

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, query: req.query });
  next();
});

// /api/config é pública; todas as demais rotas /api/* exigem autenticação
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/config') return next();
  requireAuth(req, res, next);
});

app.use(healthRouter);
app.use(dashboardRouter);
app.use(entitiesRouter);
app.use(financeRouter);
app.use(catalogRouter);
app.use(integrationsRouter);
app.use(ingestRouter);

export default app;
