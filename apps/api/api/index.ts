/**
 * Entry point para Vercel Serverless.
 * api/ na raiz do projeto - Vercel encontra automaticamente.
 * Carrega app do dist (paths via process.cwd()).
 */
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import { handle } from '@hono/node-server/vercel';

let app: ReturnType<typeof require>;

try {
  const root = process.cwd();
  const distPath = path.join(root, 'dist');
  const dnsPath = path.join(distPath, 'dns-ipv4.js');
  const modulesPath = path.join(distPath, 'modules', 'index.js');

  console.error('[Vercel API] cwd:', root, '| distPath:', distPath);
  console.error('[Vercel API] dns exists:', fs.existsSync(dnsPath), '| modules exists:', fs.existsSync(modulesPath));

  require(dnsPath);
  if (!process.env.DATABASE_URL) {
    config({ path: path.resolve(root, '../../.env') });
  }
  app = require(modulesPath).default;
} catch (e) {
  console.error('[Vercel API] Load error:', e);
  throw e;
}

export default handle(app);
