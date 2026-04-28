// Declarações mínimas para oracledb (cobertura das APIs usadas no projeto).
// Em produção (Docker/Linux) o pacote compila nativamente e expõe tipos completos.
// Este arquivo permite typecheck local sem Oracle Instant Client instalado.
declare module 'oracledb' {
  const OUT_FORMAT_OBJECT: number;
  const CLOB: number;

  let outFormat: number;
  let fetchAsString: number[];

  interface PoolAttributes {
    user: string;
    password: string;
    connectString: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
  }

  interface ExecuteOptions {
    outFormat?: number;
  }

  interface Result<T> {
    rows?: T[];
  }

  interface Connection {
    execute<T = Record<string, unknown>>(
      sql: string,
      binds?: Record<string, unknown>,
      options?: ExecuteOptions,
    ): Promise<Result<T>>;
    close(): Promise<void>;
  }

  interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTime?: number): Promise<void>;
  }

  function createPool(attrs: PoolAttributes): Promise<Pool>;
}
