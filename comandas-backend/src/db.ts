import { Pool } from 'pg';

let poolInstance: Pool | null = null;

export function getPool(): Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Falta DATABASE_URL');
    }
    console.log('🔗 [COMANDAS] Conectando a PostgreSQL...');
    poolInstance = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
    });
    poolInstance.on('error', (err) => {
      console.error('❌ [COMANDAS] Pool error:', err.message);
    });
    console.log('✅ [COMANDAS] Pool PostgreSQL creado');
  }
  return poolInstance;
}

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const dur = Date.now() - start;
    if (dur > 5000) console.warn(`⚠️ [COMANDAS DB] Query lenta (${dur}ms)`);
    return result;
  } catch (err: any) {
    console.error('❌ [COMANDAS DB] Error:', err.message, text.substring(0, 100));
    throw err;
  }
}
