/**
 * Gerado em tempo de build por scripts/build-vercel-output.mjs.
 * Migrations de tenant embutidas (para Vercel/serverless, onde arquivos .sql não existem).
 * Em dev local, fica vazio e o schema-manager usa readFile.
 */
export const EMBEDDED_TENANT_MIGRATIONS: Record<string, string> = {};
