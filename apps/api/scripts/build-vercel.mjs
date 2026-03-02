#!/usr/bin/env node
/**
 * Build Vercel-native: bundle api/index.ts + src/ em um único api/index.js
 */
import * as esbuild from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Pacotes nativos/complexos que devem ficar externos
const external = [
  'pg',
  'bcrypt',
  'pdf-parse',
  'pdfjs-dist',
  '@supabase/supabase-js',
  'stripe',
  'openai',
  'jsonwebtoken',
  'dotenv',
];

await esbuild.build({
  entryPoints: [join(root, 'api', 'index.ts')],
  bundle: true,
  outfile: join(root, 'api', 'index.js'),
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external,
  alias: {
    '@shared/core': join(root, '..', '..', 'packages', 'shared', 'src', 'index.ts'),
  },
  sourcemap: true,
  minify: false,
  logLevel: 'info',
}).catch(() => process.exit(1));
