import { query, getClient } from './client';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { PoolClient } from 'pg';
import { TENANT_MIGRATION_FILES, getTenantMigrationVersion } from './tenant-migrations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, './migrations');

/**
 * Schema Manager
 * Gerencia criação, remoção e migrations de schemas de tenant
 */

/**
 * Criar schema para um tenant
 * @param companyId - ID da empresa/tenant
 * @param client - Client opcional para usar em transação
 */
export async function createTenantSchema(companyId: string, client?: PoolClient): Promise<void> {
  // Substituir hífens por underscores (PostgreSQL não aceita hífens em nomes de schema)
  const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
  
  try {
    // Criar schema (usar aspas para garantir que caracteres especiais sejam tratados corretamente)
    if (client) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    } else {
      await query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    }
    console.log(`✅ Schema ${schemaName} criado com sucesso`);
  } catch (error) {
    console.error(`❌ Erro ao criar schema ${schemaName}:`, error);
    throw error;
  }
}

/**
 * Aplicar todas as migrations de tenant em um schema específico
 * @param companyId - ID da empresa/tenant
 * @param client - Client opcional para usar em transação
 */
export async function applyTenantMigrations(companyId: string, client?: PoolClient): Promise<void> {
  // Substituir hífens por underscores (PostgreSQL não aceita hífens em nomes de schema)
  const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
  
  const useClient = client || await getClient();
  const shouldRelease = !client;
  
  try {
    // Criar tabela de controle de migrations no schema do tenant
    await useClient.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".schema_migrations (
        version INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Buscar migrations já executadas neste schema
    const executedMigrations = await useClient.query<{ version: number }>(
      `SELECT version FROM "${schemaName}".schema_migrations ORDER BY version`
    );

    const executedVersions = new Set(executedMigrations.rows.map(m => m.version));

    // Usar lista única de migrations de tenant (mesma do migrate.ts)
    const tenantMigrations: Array<{ filename: string; version: number; sql: string }> = [];
    for (const file of TENANT_MIGRATION_FILES) {
      const version = getTenantMigrationVersion(file);
      if (!executedVersions.has(version)) {
        const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
        tenantMigrations.push({ filename: file, version, sql });
      }
    }

    if (tenantMigrations.length === 0) {
      console.log(`✅ Nenhuma migration de tenant pendente para ${schemaName}`);
      return;
    }

    console.log(`📦 ${tenantMigrations.length} migration(s) de tenant pendente(s) para ${schemaName}`);

    // Se não foi passado client, iniciar transação
    if (!client) {
      await useClient.query('BEGIN');
    }
    
    try {
      // Setar search_path para o schema do tenant
      await useClient.query(`SET search_path TO "${schemaName}", public`);

      for (const migration of tenantMigrations) {
        console.log(`⏳ Executando: ${migration.filename} no schema ${schemaName}`);
        
        // Executar migration no schema do tenant
        await useClient.query(migration.sql);
        
        // Registrar migration executada
        await useClient.query(
          `INSERT INTO "${schemaName}".schema_migrations (version, filename) VALUES ($1, $2)`,
          [migration.version, migration.filename]
        );
        
        console.log(`✅ ${migration.filename} executada com sucesso no schema ${schemaName}`);
      }

      if (!client) {
        await useClient.query('COMMIT');
      }
      console.log(`✅ Todas as migrations de tenant foram aplicadas no schema ${schemaName}`);
    } catch (error) {
      if (!client) {
        await useClient.query('ROLLBACK');
      }
      throw error;
    } finally {
      if (shouldRelease) {
        useClient.release();
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao aplicar migrations de tenant no schema ${schemaName}:`, error);
    throw error;
  }
}

/**
 * Remover schema de um tenant (para exclusão)
 * @param companyId - ID da empresa/tenant
 */
export async function dropTenantSchema(companyId: string): Promise<void> {
  const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
  
  try {
    await query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    console.log(`✅ Schema ${schemaName} removido com sucesso`);
  } catch (error) {
    console.error(`❌ Erro ao remover schema ${schemaName}:`, error);
    throw error;
  }
}

/**
 * Listar todos os schemas de tenant
 */
export async function listTenantSchemas(): Promise<string[]> {
  try {
    const result = await query<{ schema_name: string }>(
      `SELECT schema_name 
       FROM information_schema.schemata 
       WHERE schema_name LIKE 'tenant_%' 
       ORDER BY schema_name`
    );
    return result.rows.map(row => row.schema_name);
  } catch (error) {
    console.error('❌ Erro ao listar schemas de tenant:', error);
    throw error;
  }
}

/**
 * Aplicar uma migration específica em todos os schemas de tenant
 * @param migrationFile - Nome do arquivo de migration (ex: '009_client_tax_regime.sql')
 */
export async function applyTenantMigrationToAll(migrationFile: string): Promise<void> {
  const schemas = await listTenantSchemas();
  
  if (schemas.length === 0) {
    console.log('⚠️  Nenhum schema de tenant encontrado');
    return;
  }

  console.log(`📦 Aplicando migration ${migrationFile} em ${schemas.length} schema(s) de tenant`);

  const migrationPath = join(MIGRATIONS_DIR, migrationFile);
  const sql = await readFile(migrationPath, 'utf-8');
  const version = parseInt(migrationFile.split('_')[0]);

  const client = await getClient();
  
  try {
    for (const schemaName of schemas) {
      await client.query('BEGIN');
      try {
        // Setar search_path para o schema do tenant
        await client.query(`SET search_path TO "${schemaName}", public`);
        
        // Verificar se migration já foi executada
        const checkResult = await client.query(
          `SELECT version FROM "${schemaName}".schema_migrations WHERE version = $1`,
          [version]
        );
        
        if (checkResult.rows.length > 0) {
          console.log(`⏭️  Migration ${migrationFile} já executada no schema ${schemaName}`);
          await client.query('COMMIT');
          continue;
        }
        
        console.log(`⏳ Executando: ${migrationFile} no schema ${schemaName}`);
        
        // Executar migration
        await client.query(sql);
        
        // Registrar migration executada
        await client.query(
          `INSERT INTO "${schemaName}".schema_migrations (version, filename) VALUES ($1, $2)`,
          [version, migrationFile]
        );
        
        await client.query('COMMIT');
        console.log(`✅ ${migrationFile} executada com sucesso no schema ${schemaName}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Erro ao aplicar migration no schema ${schemaName}:`, error);
        throw error;
      }
    }
  } finally {
    client.release();
  }
  
  console.log(`✅ Migration ${migrationFile} aplicada em todos os schemas de tenant`);
}
