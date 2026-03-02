/**
 * Entry point Vercel-native.
 * Bundled com esbuild em api/index.js (único arquivo).
 * api/ exige handler Node.js; handle() adapta req/res para Hono.
 */
import '../src/dns-ipv4';
import path from 'path';
import { config } from 'dotenv';
import { handle } from '@hono/node-server/vercel';
import app from '../src/modules/index';

if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(process.cwd(), '../../.env') });
}

export default handle(app);
