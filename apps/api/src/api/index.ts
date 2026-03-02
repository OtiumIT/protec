/**
 * Entry point para Vercel Serverless.
 * Compilado para dist/api/index.js - tudo fica junto no dist.
 */
import { handle } from '@hono/node-server/vercel';

// Carregar dns-ipv4 e dotenv antes do app (paths relativos a dist/api/)
require('../dns-ipv4.js');
if (!process.env.DATABASE_URL) {
  const path = require('path');
  const { config } = require('dotenv');
  config({ path: path.resolve(process.cwd(), '../../.env') });
}

const app = require('../modules/index.js').default;
export default handle(app);
