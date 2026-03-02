#!/usr/bin/env node
/**
 * Build usando Vercel Build Output API v3.
 * Controle total: função index em /, sem rewrites.
 */
import * as esbuild from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, copyFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outputDir = join(root, '.vercel', 'output');
const funcDir = join(outputDir, 'functions', 'index.func');

const external = [
  'pg', 'bcrypt', 'pdf-parse', 'pdfjs-dist',
  '@supabase/supabase-js', 'stripe', 'openai', 'jsonwebtoken', 'dotenv',
];

mkdirSync(funcDir, { recursive: true });

// 1. Bundle
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
writeFileSync(join(funcDir, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs20.x',
  handler: 'index.js',
  launcherType: 'Nodejs',
  shouldAddHelpers: false,
  maxDuration: 30,
  memory: 1024,
}, null, 2));

// 3. config.json - rota tudo para index
writeFileSync(join(outputDir, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/' }
  ],
}, null, 2));

// 4. static vazio (obrigatório)
const staticDir = join(outputDir, 'static');
mkdirSync(staticDir, { recursive: true });
if (!existsSync(join(staticDir, '.gitkeep'))) {
  writeFileSync(join(staticDir, '.gitkeep'), '');
}

console.log('Build Output API: .vercel/output created');
