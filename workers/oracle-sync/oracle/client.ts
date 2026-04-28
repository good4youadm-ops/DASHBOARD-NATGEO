import oracledb from 'oracledb';
import { config } from '../config';
import { logger } from '../utils/logger';

let pool: oracledb.Pool | null = null;

export async function initOraclePool(): Promise<void> {
  if (pool) return;
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.fetchAsString = [oracledb.CLOB];
  pool = await oracledb.createPool({
    user: config.oracle.user,
    password: config.oracle.password,
    connectString: config.oracle.connectString,
    poolMin: config.oracle.poolMin,
    poolMax: config.oracle.poolMax,
    poolIncrement: config.oracle.poolIncrement,
  });
  logger.info('Oracle connection pool criado');
}

export async function closeOraclePool(): Promise<void> {
  if (pool) {
    await pool.close(10);
    pool = null;
    logger.info('Oracle connection pool fechado');
  }
}

export async function queryOracle<T = Record<string, unknown>>(
  sql: string,
  binds: Record<string, unknown> = {},
): Promise<T[]> {
  if (!pool) throw new Error('Oracle pool não inicializado');
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute<T>(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return (result.rows ?? []) as T[];
  } finally {
    await conn.close();
  }
}
