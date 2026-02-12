import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../db/client';

const envPath = resolve(process.cwd(), '../../.env');
config({ path: envPath });

/**
 * Script para validar dados no banco (módulos, tenants, tenant_modules, plan_modules)
 */
async function validateDb() {
  console.log('🔍 Validando dados no banco...\n');

  try {
    // 1) Módulos – listar todos, destacar SIMULADOR_IN_2306
    const modules = await query<{ id: string; name: string; key: string }>(
      `SELECT id, name, key FROM modules ORDER BY name`
    );
    console.log('📦 MODULES');
    console.log('   Total:', modules.rows.length);
    const sim = modules.rows.find((r) => r.key === 'SIMULADOR_IN_2306');
    if (sim) {
      console.log('   ✅ SIMULADOR_IN_2306:', sim.id, '-', sim.name);
    } else {
      console.log('   ❌ SIMULADOR_IN_2306 não encontrado');
    }
    modules.rows.forEach((r) => console.log('   -', r.key, r.name));
    console.log('');

    // 2) Companies (tenants)
    const companies = await query<{ id: string; name: string }>(
      `SELECT id, name FROM companies ORDER BY name`
    );
    console.log('🏢 COMPANIES (tenants)');
    console.log('   Total:', companies.rows.length);
    companies.rows.forEach((r) => console.log('   -', r.id, r.name));
    console.log('');

    // 3) tenant_modules para SIMULADOR_IN_2306
    const tenantMods = await query<{ tenant_id: string; company_name: string }>(
      `SELECT tm.tenant_id, c.name AS company_name
       FROM tenant_modules tm
       JOIN modules m ON m.id = tm.module_id
       JOIN companies c ON c.id = tm.tenant_id
       WHERE m.key = 'SIMULADOR_IN_2306'
       ORDER BY c.name`
    );
    console.log('🔗 TENANT_MODULES (Simulador IN 2.306 ativo)');
    console.log('   Total:', tenantMods.rows.length);
    if (tenantMods.rows.length === 0) {
      console.log('   ❌ Nenhum tenant com o módulo ativo');
    } else {
      tenantMods.rows.forEach((r) => console.log('   -', r.company_name, r.tenant_id));
    }
    console.log('');

    // 4) plan_modules para SIMULADOR_IN_2306
    const planMods = await query<{ plan_id: string; plan_name: string }>(
      `SELECT pm.plan_id, p.name AS plan_name
       FROM plan_modules pm
       JOIN modules m ON m.id = pm.module_id
       JOIN plans p ON p.id = pm.plan_id
       WHERE m.key = 'SIMULADOR_IN_2306'
       ORDER BY p.name`
    );
    console.log('📋 PLAN_MODULES (Simulador IN 2.306 nos planos)');
    console.log('   Total:', planMods.rows.length);
    planMods.rows.forEach((r) => console.log('   -', r.plan_name, r.plan_id));
    console.log('');

    // 5) schema_migrations (últimas 5)
    const migrations = await query<{ version: number; filename: string; executed_at: string }>(
      `SELECT version, filename, executed_at::text FROM schema_migrations ORDER BY version DESC LIMIT 5`
    );
    console.log('📜 SCHEMA_MIGRATIONS (últimas 5)');
    migrations.rows.forEach((r) => console.log('   -', r.version, r.filename, r.executed_at));
    console.log('');

    console.log('✅ Validação concluída.');
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('validate-db.ts') ||
  process.argv[1]?.endsWith('validate-db.js');

if (isMain) {
  validateDb()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { validateDb };
