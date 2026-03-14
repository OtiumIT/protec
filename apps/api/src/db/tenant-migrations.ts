/**
 * Lista única de migrations que rodam no schema do tenant (tenant_{company_id}).
 * Usada por migrate.ts (não rodar no public) e schema-manager (aplicar em cada tenant).
 *
 * Ao adicionar nova migration de tenant:
 * 1. Crie o arquivo em db/migrations/NNN_nome.sql
 * 2. Adicione o filename aqui na ordem numérica
 */
export const TENANT_MIGRATION_FILES: readonly string[] = [
  '008_tenant_clients.sql',
  '009_client_tax_regime.sql',
  '010_fiscal_files.sql',
  '011_extracted_data.sql',
  '021_rating_validations.sql',
  '024_judicial_processes.sql',
  '025_in_2306_simulations.sql',
  '029_irpf_alta_renda.sql',
  '034_irpf_alta_renda_add_company_id.sql',
  '036_properties.sql',
  '038_property_monthly_totals.sql',
  '040_irpf_alta_renda_payload_json.sql',
  '045_clients_person_type.sql',
  '046_property_simulations.sql',
  '048_rating_parcelamento_pgfn.sql',
];

export function isTenantMigration(filename: string): boolean {
  return TENANT_MIGRATION_FILES.includes(filename);
}

export function getTenantMigrationVersion(filename: string): number {
  return parseInt(filename.split('_')[0], 10);
}
