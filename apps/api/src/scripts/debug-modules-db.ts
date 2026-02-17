/**
 * Script para executar os SELECTs de diagnóstico de módulos/tenant no banco.
 * Uso: pnpm exec tsx src/scripts/debug-modules-db.ts (a partir de apps/api)
 * Carrega .env da raiz do monorepo.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../db/client';

config({ path: resolve(process.cwd(), '../../.env') });

async function main() {
  const [modulesRes, companiesRes, tenantModulesRes, simuladorRes] = await Promise.all([
    query<{ id: string; name: string; key: string; description: string | null }>(
      'SELECT id, name, key, description FROM modules ORDER BY name'
    ),
    query<{ id: string; name: string; domain: string | null }>(
      'SELECT id, name, domain FROM companies ORDER BY name'
    ),
    query<{ tenant_id: string; module_id: string; enabled_until: Date | null; module_key: string; module_name: string }>(
      `SELECT tm.tenant_id, tm.module_id, tm.enabled_until, m.key AS module_key, m.name AS module_name
       FROM tenant_modules tm
       JOIN modules m ON m.id = tm.module_id
       ORDER BY tm.tenant_id, m.key`
    ),
    query<{ tenant_id: string; company_name: string | null; enabled_until: Date | null }>(
      `SELECT tm.tenant_id, c.name AS company_name, tm.enabled_until
       FROM tenant_modules tm
       JOIN modules m ON m.id = tm.module_id
       LEFT JOIN companies c ON c.id = tm.tenant_id
       WHERE m.key = 'SIMULADOR_IN_2306'
       ORDER BY tm.tenant_id`
    ),
  ]);

  const out = {
    modules: modulesRes.rows,
    companies: companiesRes.rows,
    tenant_modules: tenantModulesRes.rows,
    simulador_in_2306_active_for: simuladorRes.rows,
    now: new Date().toISOString(),
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
