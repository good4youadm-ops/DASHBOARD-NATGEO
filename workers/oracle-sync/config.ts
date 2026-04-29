import dotenv from 'dotenv';
dotenv.config();

// Lê argv aqui (antes de qualquer import que use config) para suporte a --dry-run CLI
const _argv = process.argv.slice(2);

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  return val;
}

export const oracleConfigured =
  !!process.env.ORACLE_USER &&
  !!process.env.ORACLE_PASSWORD &&
  !!process.env.ORACLE_CONNECT_STRING;

export const config = {
  oracle: {
    user: process.env.ORACLE_USER ?? '',
    password: process.env.ORACLE_PASSWORD ?? '',
    connectString: process.env.ORACLE_CONNECT_STRING ?? '',
    poolMin: parseInt(process.env.ORACLE_POOL_MIN ?? '2'),
    poolMax: parseInt(process.env.ORACLE_POOL_MAX ?? '10'),
    poolIncrement: parseInt(process.env.ORACLE_POOL_INCREMENT ?? '1'),
  },
  supabase: {
    url: required('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },
  sync: {
    tenantId: required('SYNC_DEFAULT_TENANT_ID'),
    sourceName: process.env.SYNC_SOURCE_NAME ?? 'oracle_distribuidora',
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE ?? '500'),
    // Aceita DRY_RUN=true (env) ou --dry-run (flag CLI)
    dryRun: process.env.DRY_RUN === 'true' || _argv.includes('--dry-run'),
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'info',
    file: process.env.LOG_FILE ?? 'logs/sync.log',
  },
};
