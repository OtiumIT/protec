/**
 * Entry point para Vercel Serverless.
 * Usa handle do @hono/node-server/vercel para compatibilidade com o runtime.
 */
import path from 'path';
import { config } from 'dotenv';
import { handle } from '@hono/node-server/vercel';

// Carregar dns-ipv4 e dotenv antes do app
require(path.join(__dirname, '../dist/dns-ipv4.js'));
if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(process.cwd(), '../../.env') });
}

const app = require(path.join(__dirname, '../dist/modules/index.js')).default;
export default handle(app);
