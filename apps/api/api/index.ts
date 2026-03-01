/**
 * Entry point para Vercel Serverless.
 * Importa o app Hono compilado e exporta para o runtime.
 */
import '../dist/dns-ipv4.js';
import { config } from 'dotenv';
import { resolve } from 'path';
import app from '../dist/modules/index.js';

if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '../../.env') });
}

export default app;
