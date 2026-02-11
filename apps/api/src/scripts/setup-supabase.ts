import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { query } from '../db/client';

// Carregar .env da raiz do projeto
config({ path: resolve(process.cwd(), '../../.env') });

/**
 * Script para configurar Supabase Storage
 * Cria o bucket fiscal-files se não existir
 */
async function setupSupabaseStorage() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('⚠️  SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados');
    console.log('   Pulando configuração do Storage...');
    return;
  }

  console.log('📦 Configurando Supabase Storage...');

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const bucketName = 'fiscal-files';

    // Verificar se bucket já existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Erro ao listar buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some((b) => b.name === bucketName);

    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' já existe`);
      return;
    }

    // Criar bucket
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: false, // Bucket privado (usa signed URLs)
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['text/plain', 'application/xml', 'text/xml', 'application/pdf'],
    });

    if (error) {
      throw new Error(`Erro ao criar bucket: ${error.message}`);
    }

    console.log(`✅ Bucket '${bucketName}' criado com sucesso`);
  } catch (error) {
    console.error('❌ Erro ao configurar Supabase Storage:', error);
    throw error;
  }
}

/**
 * Verificar conexão com banco de dados
 */
async function checkDatabaseConnection() {
  console.log('🔌 Verificando conexão com banco de dados...');

  try {
    const result = await query('SELECT NOW() as current_time');
    console.log(`✅ Conexão estabelecida. Hora do servidor: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    console.error('\n💡 Verifique:');
    console.error('   1. DATABASE_URL está configurado no .env');
    console.error('   2. O banco de dados existe no Supabase');
    console.error('   3. As credenciais estão corretas');
    throw error;
  }
}

/**
 * Setup completo: verificar conexão, executar migrations e configurar storage
 */
async function setup() {
  console.log('🚀 Iniciando setup do banco de dados...\n');

  try {
    // 1. Verificar conexão
    await checkDatabaseConnection();
    console.log('');

    // 2. Executar migrations do schema public
    console.log('📋 Executando migrations do schema public...');
    const { runMigrations } = await import('./migrate');
    await runMigrations();
    console.log('');

    // 3. Configurar Supabase Storage (opcional)
    console.log('\n📦 Configurando Supabase Storage...');
    try {
      await setupSupabaseStorage();
    } catch (error) {
      console.log('⚠️  Não foi possível configurar Storage (pode ser configurado depois)');
      console.log('   Configure SUPABASE_SERVICE_KEY no .env para habilitar Storage');
      console.log('   Ou crie o bucket manualmente no dashboard do Supabase');
    }

    console.log('\n✅ Setup concluído com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Criar uma empresa (tenant) via API ou script seed');
    console.log('   2. As migrations de tenant serão aplicadas automaticamente');
    console.log('   3. Executar seed para criar dados iniciais (opcional)');
  } catch (error) {
    console.error('\n❌ Erro durante setup:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('setup-supabase.ts') ||
                     process.argv[1]?.endsWith('setup-supabase.js');

if (isMainModule) {
  setup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setup, setupSupabaseStorage, checkDatabaseConnection };
