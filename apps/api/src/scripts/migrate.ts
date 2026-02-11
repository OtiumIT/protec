import { config } from 'dotenv';
import { resolve } from 'path';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query, getClient } from '../db/client';
import { listTenantSchemas } from '../db/schema-manager';
import { isTenantMigration, getTenantMigrationVersion, TENANT_MIGRATION_FILES } from '../db/tenant-migrations';

// Carregar .env da raiz do projeto
config({ path: resolve(process.cwd(), '../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
        
        // Ignorar 008_clients.sql (antiga, substituída por 008_tenant_clients.sql)
        if (file === '008_clients.sql') {
          console.log(`⏭️  Ignorando ${file} (substituída por 008_tenant_clients.sql)`);
          continue;
        }
        
        // Migrations de tenant não rodam no schema public; rodam em cada tenant existente depois
        if (isTenantMigration(file)) {
          console.log(`⏭️  Pulando ${file} (migration de tenant, será aplicada nos tenants existentes)`);
          continue;
        }
        
        if (!executedVersions.has(version)) {
          const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
          migrations.push({ filename: file, version, sql });
        }
      }
    }

    if (migrations.length === 0) {
      console.log('✅ Nenhuma migration (public) pendente');
    } else {
      console.log(`📦 ${migrations.length} migration(s) (public) pendente(s)`);
    }

    // Executar migrations públicas em ordem
    for (const migration of migrations) {
      console.log(`⏳ Executando: ${migration.filename}`);
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

    if (migrations.length > 0) {
      console.log('✅ Todas as migrations (public) foram executadas com sucesso');
    }
    await runTenantMigrationsForExistingTenants();
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    process.exit(1);
  }
}

/**
 * Aplica migrations de tenant pendentes em todos os schemas tenant_* existentes.
 * Assim, novos arquivos de migration de tenant passam a valer para tenants já criados.
 */
async function runTenantMigrationsForExistingTenants(): Promise<void> {
  const schemas = await listTenantSchemas();
  if (schemas.length === 0) {
    console.log('ℹ️  Nenhum schema de tenant existente; nada a aplicar.');
    return;
  }
  console.log(`\n📦 Aplicando migrations de tenant em ${schemas.length} tenant(s) existente(s)...`);
  const client = await getClient();
  try {
    for (const schemaName of schemas) {
      await ensureTenantMigrationsTable(client, schemaName);
      const executedVersions = await getExecutedTenantVersions(client, schemaName);
      const pending = TENANT_MIGRATION_FILES.filter(
        (file) => !executedVersions.has(getTenantMigrationVersion(file))
      );
      if (pending.length === 0) {
        console.log(`  ✅ ${schemaName}: já está em dia`);
        continue;
      }
      for (const file of pending) {
        const version = getTenantMigrationVersion(file);
        const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
        await client.query('BEGIN');
        try {
          await client.query(`SET search_path TO "${schemaName}", public`);
          await client.query(sql);
          await client.query(
            `INSERT INTO "${schemaName}".schema_migrations (version, filename) VALUES ($1, $2)`,
            [version, file]
          );
          await client.query('COMMIT');
          console.log(`  ✅ ${schemaName}: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }
    }
    console.log('✅ Migrations de tenant aplicadas em todos os tenants existentes.');
  } finally {
    client.release();
  }
}

async function ensureTenantMigrationsTable(client: import('pg').PoolClient, schemaName: string): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schemaName}".schema_migrations (
      version INTEGER PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function getExecutedTenantVersions(
  client: import('pg').PoolClient,
  schemaName: string
): Promise<Set<number>> {
  const result = await client.query<{ version: number }>(
    `SELECT version FROM "${schemaName}".schema_migrations ORDER BY version`
  );
  return new Set(result.rows.map((r) => r.version));
}

// Executar se chamado diretamente
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('migrate.ts') ||
                     process.argv[1]?.endsWith('migrate.js');

if (isMainModule) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { runMigrations };
