/**
 * Entry point para Vercel Serverless.
 * api/ na raiz do projeto - Vercel encontra automaticamente.
 * Usa __dirname para dist (api e dist são irmãos em apps/api).
 */
import path from 'path';
import { config } from 'dotenv';
import { handle } from '@hono/node-server/vercel';

// __dirname = .../apps/api/api, dist = .../apps/api/dist (irmão de api)
const distPath = path.join(__dirname, '..', 'dist');
require(path.join(distPath, 'dns-ipv4.js'));
if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(__dirname, '../../../.env') });
}
const app = require(path.join(distPath, 'modules', 'index.js')).default;
export default handle(app);
