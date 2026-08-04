#!/usr/bin/env node
/**
 * Build para AWS Lambda.
 * Gera dist-lambda/index.js (bundle único) + package.json.
 * Reutiliza version.generated.ts e migrations-embedded.ts (compatível com build-vercel-output).
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
const updatedAt = process.env.VERCEL_GIT_COMMIT_TIMESTAMP ?? process.env.GITHUB_SHA ?? new Date().toISOString();
writeFileSync(join(root, 'src', 'version.generated.ts'), `/**
 * Gerado em tempo de build por scripts/build-lambda.mjs
 */
export const API_VERSION = '${version}';
export const API_UPDATED_AT = '${updatedAt}';
`);

// Embutir SQL das migrations de tenant no bundle (Lambda não inclui arquivos .sql)
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
 * Gerado em tempo de build - migrations de tenant embutidas (para Lambda/serverless).
 * NÃO editar manualmente.
 */
export const EMBEDDED_TENANT_MIGRATIONS: Record<string, string> = ${JSON.stringify(migrationsEmbedded, null, 2)};
`
);

const outputDir = join(root, 'dist-lambda');
mkdirSync(outputDir, { recursive: true });

// Nenhum módulo externo: tudo bundlado (bcryptjs é pure JS)
const external = [];

// 1. Bundle (inclui pg, supabase, stripe, openai, jsonwebtoken, pdf-parse, pdfjs-dist, dotenv)
await esbuild.build({
  entryPoints: [join(root, 'api', 'lambda.ts')],
  bundle: true,
  outfile: join(outputDir, 'index.js'),
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

// 2. Copiar pdf.worker.mjs (pdfjs-dist precisa dele como arquivo separado no fake worker mode)
import { copyFileSync } from 'fs';
const pdfWorkerSrc = join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
if (existsSync(pdfWorkerSrc)) {
  copyFileSync(pdfWorkerSrc, join(outputDir, 'pdf.worker.mjs'));
  console.log('Copied pdf.worker.mjs to dist-lambda');
}

// 3. package.json mínimo para Lambda
writeFileSync(join(outputDir, 'package.json'), JSON.stringify({
  name: 'protec-api-lambda',
  version: version,
  main: 'index.js',
  type: 'commonjs',
}, null, 2));

console.log('Build Lambda: dist-lambda created');
