import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import { Pool } from 'pg';

let poolInstance: Pool | null = null;

function getPool(): Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.error('❌ Falta variable de entorno DATABASE_URL');
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database configuration missing',
      });
    }

    console.log('🔗 Conectando a PostgreSQL...');
    
    poolInstance = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
      query_timeout: 30000,
    });

    poolInstance.on('error', (err) => {
      console.error('❌ Error inesperado en pool de PostgreSQL:', err.message);
    });

    console.log('✅ Pool de PostgreSQL creado exitosamente');
  }

  return poolInstance;
}

export const createContext = async (opts: Partial<FetchCreateContextFnOptions>) => {
  const pool = getPool();
  
  return {
    req: opts.req!,
    db: {
      query: async (text: string, params?: any[]) => {
        const startTime = Date.now();
        try {
          const result = await pool.query(text, params);
          const duration = Date.now() - startTime;
          if (duration > 5000) {
            console.warn(`⚠️ [DB] Query lenta (${duration}ms):`, text.substring(0, 100));
          }
          return result;
        } catch (error: any) {
          const duration = Date.now() - startTime;
          console.error(`❌ [DB] Error en query (${duration}ms):`, text.substring(0, 100));
          console.error('❌ [DB] Detalle error:', error.message, error.code, error.detail);
          throw error;
        }
      },
    },
    pool,
  };
};

export function getPoolInstance(): Pool {
  return getPool();
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export { TRPCError };
