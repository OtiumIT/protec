/**
 * Entry point para Vercel Serverless.
 * api/ na raiz do projeto - Vercel encontra automaticamente.
 * Carrega app do dist (paths via process.cwd()).
 */
import path from 'path';
import { config } from 'dotenv';
import { handle } from '@hono/node-server/vercel';

const root = process.cwd();
const distPath = path.join(root, 'dist');

require(path.join(distPath, 'dns-ipv4.js'));
if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(root, '../../.env') });
}

const app = require(path.join(distPath, 'modules', 'index.js')).default;
export default handle(app);
