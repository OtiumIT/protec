import { config } from 'dotenv';
import { resolve } from 'path';
import { AsyncLocalStorage } from 'async_hooks';
import dns from 'node:dns';
import { Pool } from 'pg';

// Evita ENETUNREACH quando a rede não tem IPv6: força resolução DNS a preferir IPv4
dns.setDefaultResultOrder('ipv4first');

// Carregar .env da raiz do projeto (se não estiver carregado)
if (!process.env.DATABASE_URL) {
  const envPath = resolve(process.cwd(), '../../.env');
  config({ path: envPath });
}

/**
 * Cliente PostgreSQL
 * Suporta PostgreSQL local e Supabase (conexão direta)
 * 
 * Connection strings:
 * - Local: postgresql://user:password@localhost:5432/database
 * - Supabase: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
 * - Supabase Pooler: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não está configurado!');
  console.error('💡 Configure no arquivo .env:');
  console.error('   DATABASE_URL=postgresql://postgres:SENHA@db.PROJECT_REF.supabase.co:5432/postgres');
  process.exit(1);
}

// Validar formato da connection string
if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
  console.error('❌ DATABASE_URL deve começar com postgresql:// ou postgres://');
  process.exit(1);
}

// SSL: ativar para qualquer host remoto (não localhost)
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
  ...(!isLocalhost && {
    ssl: { rejectUnauthorized: false },
  }),
});

// Tratamento de erros do pool
pool.on('error', (err: any) => {
  console.error('❌ Erro inesperado no pool de conexões:', err.message);
  console.error('   Tipo:', err.constructor.name);
  if (err.code === 'EHOSTUNREACH' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    console.error('\n💡 Possíveis soluções:');
    console.error('   1. Verifique sua conexão com a internet');
    console.error('   2. Verifique se a DATABASE_URL está correta no .env');
    console.error('   3. Se estiver usando Supabase, verifique se o projeto está ativo');
    console.error('   4. Tente usar IPv4 ao invés de IPv6 (verifique a connection string)');
    console.error('   5. Verifique se há firewall bloqueando a conexão');
  }
  // Não fazer exit automático em produção para evitar crashes
  if (process.env.NODE_ENV !== 'production') {
    console.error('\n⚠️  Continuando, mas conexões podem falhar...');
  }
});

/**
 * AsyncLocalStorage que guarda apenas o NOME do schema do tenant (não uma conexão).
 * Cada query individualmente adquire, usa e devolve a conexão ao pool imediatamente.
 * Isso evita manter conexões abertas durante chamadas externas longas (ex.: OpenAI).
 */
const tenantSchemaStorage = new AsyncLocalStorage<string>();

/**
 * Executa o callback com o schema do tenant ativo.
 * Cada query feita via query() dentro do callback usa automaticamente o schema correto.
 * A conexão NÃO é mantida aberta entre queries.
 * @param companyId - ID da empresa/tenant
 * @param fn - callback (ex.: next() do middleware)
 */
export async function runWithTenantClient<T>(
  companyId: string,
  fn: () => Promise<T>
): Promise<T> {
  const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
  return tenantSchemaStorage.run(schemaName, fn);
}

/**
 * Setar search_path dinâmico (legado; mantido para compatibilidade).
 */
export async function setTenantSchema(companyId: string): Promise<void> {
  const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
  await pool.query(`SET search_path TO "${schemaName}", public`);
}

/**
 * Tipo de resultado de query
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number | null;
}

/**
 * Executar query com retorno de resultado.
 * Se houver schema de tenant no contexto (runWithTenantClient), executa SET LOCAL search_path
 * dentro de uma transação e devolve a conexão imediatamente — sem manter conexões presas.
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const schemaName = tenantSchemaStorage.getStore();

  if (schemaName) {
    // Tenant context: adquire conexão, seta search_path, executa query, reseta e devolve
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schemaName}", public`);
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.log('Slow query:', { text, duration, rows: result.rowCount });
      }
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } finally {
      // Reseta search_path antes de devolver ao pool para evitar vazamento de contexto
      await client.query('RESET search_path').catch(() => {});
      client.release();
    }
  }

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.log('Slow query:', { text, duration, rows: result.rowCount });
    }
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } catch (error: any) {
    // Melhorar mensagens de erro de conexão
    if (error.code === 'EHOSTUNREACH' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      const maskedUrl = connectionString?.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@') || 'connection string não disponível';
      console.error('❌ Erro de conexão com o banco de dados:');
      console.error(`   Código: ${error.code}`);
      console.error(`   Mensagem: ${error.message}`);
      console.error(`   Connection String (mascarada): ${maskedUrl}`);
      console.error('\n💡 Possíveis soluções:');
      console.error('   1. Verifique sua conexão com a internet');
      console.error('   2. Verifique se a DATABASE_URL está correta no arquivo .env');
      console.error('   3. Se estiver usando Supabase, verifique se o projeto está ativo');
      console.error('   4. Tente usar a connection string do pooler (porta 6543) ao invés da direta');
      console.error('   5. Verifique se há firewall ou proxy bloqueando a conexão');
      console.error('   6. Se o erro mencionar IPv6, tente usar IPv4 ou o pooler do Supabase');
      console.error('\n📖 Veja COMO_ENCONTRAR_CONNECTION_STRING.md para mais informações');
      
      // Criar erro mais amigável
      const friendlyError = new Error(
        `Não foi possível conectar ao banco de dados. Verifique a configuração de DATABASE_URL no arquivo .env. ` +
        `Erro: ${error.code || error.message}`
      );
      (friendlyError as any).code = error.code || 'DATABASE_CONNECTION_ERROR';
      throw friendlyError;
    }
    
    console.error('Database query error:', { 
      code: error.code,
      message: error.message,
      query: text.substring(0, 100),
      paramsCount: params?.length || 0
    });
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
