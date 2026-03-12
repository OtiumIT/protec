#!/usr/bin/env node
/**
 * Build usando Vercel Build Output API v3.
 * Módulos puramente JS são bundlados.
 * Módulos nativos (bcrypt) são copiados para .func/node_modules.
 */
import * as esbuild from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Gera version.generated.ts com versão e data de atualização
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version ?? '0.0.0';
const updatedAt = process.env.VERCEL_GIT_COMMIT_TIMESTAMP ?? new Date().toISOString();
writeFileSync(join(root, 'src', 'version.generated.ts'), `/**
 * Gerado em tempo de build por scripts/build-vercel-output.mjs
 */
export const API_VERSION = '${version}';
export const API_UPDATED_AT = '${updatedAt}';
`);

// Embutir SQL das migrations de tenant no bundle (Vercel não inclui arquivos .sql)
const migrationsDir = join(root, 'src', 'db', 'migrations');
const tenantMigrationsContent = readFileSync(join(root, 'src', 'db', 'tenant-migrations.ts'), 'utf8');
const tenantFiles = [...tenantMigrationsContent.matchAll(/'([^']+\.sql)'/g)].map((m) => m[1]);
const migrationsEmbedded = {};
for (const file of tenantFiles) {
  const p = join(migrationsDir, file);
  if (existsSync(p)) {
    migrationsEmbedded[file] = readFileSync(p, 'utf8');
  }
}
writeFileSync(
  join(root, 'src', 'db', 'migrations-embedded.ts'),
  `/**
 * Gerado em tempo de build - migrations de tenant embutidas (para Vercel/serverless).
 * NÃO editar manualmente.
 */
export const EMBEDDED_TENANT_MIGRATIONS: Record<string, string> = ${JSON.stringify(migrationsEmbedded, null, 2)};
`
);

const outputDir = join(root, '.vercel', 'output');
const funcDir = join(outputDir, 'functions', 'index.func');

// Nenhum módulo externo: tudo bundlado (bcryptjs é pure JS)
const external = [];

mkdirSync(funcDir, { recursive: true });

// 1. Bundle (inclui pg, supabase, stripe, openai, jsonwebtoken, pdf-parse, pdfjs-dist, dotenv)
await esbuild.build({
  entryPoints: [join(root, 'api', 'index.ts')],
  bundle: true,
  outfile: join(funcDir, 'index.js'),
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external,
  alias: {
    '@shared/core': join(root, '..', '..', 'packages', 'shared', 'src', 'index.ts'),
  },
  sourcemap: false,
  minify: false,
  logLevel: 'info',
}).catch(() => process.exit(1));

// 2. .vc-config.json
// maxDuration 120s: rating-validator/extract-from-ecd-pdf precisa de tempo para pdf-parse + OpenAI
// (planos Hobby: limitado a 10s; Pro: até 300s)
writeFileSync(join(funcDir, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs20.x',
  handler: 'index.js',
  launcherType: 'Nodejs',
  shouldAddHelpers: false,
  maxDuration: 120,
  memory: 1024,
}, null, 2));

// 3. config.json - rota tudo para index
writeFileSync(join(outputDir, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/' },
  ],
}, null, 2));

// 4. static (obrigatório)
const staticDir = join(outputDir, 'static');
mkdirSync(staticDir, { recursive: true });
if (!existsSync(join(staticDir, '.gitkeep'))) {
  writeFileSync(join(staticDir, '.gitkeep'), '');
}

console.log('Build Output API: .vercel/output created');
