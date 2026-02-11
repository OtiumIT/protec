import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../db/client';

// Carregar .env da raiz do projeto
const envPath = resolve(process.cwd(), '../../.env');
config({ path: envPath });
console.log(`📁 Carregando .env de: ${envPath}`);

/**
 * Script para testar conexão com o banco de dados
 */
async function testConnection() {
  console.log('🔌 Testando conexão com banco de dados...\n');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não está configurado no .env');
    console.error('\n💡 Configure no arquivo .env:');
    console.error('   DATABASE_URL=postgresql://postgres:SENHA@db.PROJECT_REF.supabase.co:5432/postgres');
    process.exit(1);
  }

  // Mascarar senha na URL para exibir
  const maskedUrl = databaseUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  console.log(`📋 Connection String (mascarada): ${maskedUrl}\n`);

  try {
    // Teste 1: Conexão básica
    console.log('⏳ Testando conexão...');
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log(`   Hora do servidor: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}\n`);

    // Teste 2: Verificar se é Supabase
    try {
      const supabaseCheck = await query("SELECT current_database() as db_name, current_user as db_user");
      console.log(`📊 Banco de dados: ${supabaseCheck.rows[0].db_name}`);
      console.log(`👤 Usuário: ${supabaseCheck.rows[0].db_user}`);
      
      if (supabaseCheck.rows[0].db_name === 'postgres' && supabaseCheck.rows[0].db_user === 'postgres') {
        console.log('✅ Parece ser Supabase!\n');
      }
    } catch (e) {
      // Ignorar erro
    }

    // Teste 3: Verificar tabelas existentes
    try {
      const tables = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      if (tables.rows.length > 0) {
        console.log(`📋 Tabelas existentes (${tables.rows.length}):`);
        tables.rows.forEach((row: any) => {
          console.log(`   - ${row.table_name}`);
        });
      } else {
        console.log('📋 Nenhuma tabela encontrada (banco vazio)');
        console.log('   Execute: pnpm run migrate');
      }
    } catch (e) {
      console.log('⚠️  Não foi possível listar tabelas');
    }

    console.log('\n✅ Teste de conexão concluído com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Execute: pnpm run setup (para criar tabelas e storage)');
    console.log('   2. Ou execute: pnpm run migrate (apenas migrations)');
    
  } catch (error: any) {
    console.error('\n❌ Erro ao conectar:', error.message);
    
    if (error.code === '3D000') {
      console.error('\n💡 O banco de dados não existe.');
      console.error('   Verifique se o nome do banco está correto na connection string.');
    } else if (error.code === '28P01') {
      console.error('\n💡 Autenticação falhou.');
      console.error('   Verifique se a senha está correta na connection string.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Conexão recusada.');
      console.error('   Verifique se:');
      console.error('   - O host está correto');
      console.error('   - A porta está correta (5432)');
      console.error('   - O projeto Supabase está ativo');
    }
    
    console.error('\n📖 Consulte SETUP_DATABASE.md para mais ajuda');
    process.exit(1);
  }
}

// Executar se chamado diretamente
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('test-connection.ts') ||
                     process.argv[1]?.endsWith('test-connection.js');

if (isMainModule) {
  testConnection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testConnection };
