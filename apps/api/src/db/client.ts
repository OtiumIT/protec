import { Pool } from 'pg';

/**
 * Cliente PostgreSQL
 * Suporta PostgreSQL local e Supabase (conexão direta)
 * 
 * Connection strings:
 * - Local: postgresql://user:password@localhost:5432/database
 * - Supabase: postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
 * - Supabase Pooler: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Tratamento de erros do pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Setar search_path dinâmico para multitenancy (schema-level)
 * @param companyId - ID da empresa/tenant
 */
export async function setTenantSchema(companyId: string): Promise<void> {
  await pool.query(`SET search_path TO tenant_${companyId}, public`);
}

/**
 * Tipo de resultado de query
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

/**
 * Executar query com retorno de resultado
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log queries lentas (opcional, apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.log('Slow query:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', { text, params, error });
    throw error;
  }
}

/**
 * Obter cliente do pool para transações
 */
export function getClient() {
  return pool.connect();
}

export default pool;
