import dotenv from 'dotenv';
dotenv.config();

if (!process.env.SYNC_DEFAULT_TENANT_ID) {
  console.error('[FATAL] SYNC_DEFAULT_TENANT_ID não definido. Configure o .env e reinicie.');
  process.exit(1);
}

import app from './app';
import { logger } from './logger';

const PORT = parseInt(process.env.PORT ?? '3001');

app.listen(PORT, () => {
  logger.info('API iniciada', {
    port: PORT,
    env: process.env.NODE_ENV ?? 'development',
    tenant: process.env.SYNC_DEFAULT_TENANT_ID,
  });
});

export default app;
