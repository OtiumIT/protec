import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { query, getClient } from '../db/client';

const MIGRATIONS_DIR = join(__dirname, '../db/migrations');

interface Migration {
  filename: string;
  version: number;
  sql: string;
}

/**
 * Executar todas as migrations pendentes
 */
async function runMigrations() {
  console.log('🚀 Iniciando migrations...');

  try {
    // Criar tabela de controle de migrations
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Buscar migrations já executadas
    const executedMigrations = await query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version'
    );

    const executedVersions = new Set(executedMigrations.rows.map(m => m.version));

    // Ler arquivos de migration
    const files = await readdir(MIGRATIONS_DIR);
    const migrations: Migration[] = [];

    for (const file of files.sort()) {
      if (file.endsWith('.sql')) {
        const version = parseInt(file.split('_')[0]);
        if (!executedVersions.has(version)) {
          const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
          migrations.push({ filename: file, version, sql });
        }
      }
    }

    if (migrations.length === 0) {
      console.log('✅ Nenhuma migration pendente');
      return;
    }

    console.log(`📦 ${migrations.length} migration(s) pendente(s)`);

    // Executar migrations em ordem
    for (const migration of migrations) {
      console.log(`⏳ Executando: ${migration.filename}`);
      
      // Executar em transação
      const client = await getClient();
      try {
        await client.query('BEGIN');
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
          [migration.version, migration.filename]
        );
        await client.query('COMMIT');
        console.log(`✅ ${migration.filename} executada com sucesso`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('✅ Todas as migrations foram executadas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { runMigrations };
