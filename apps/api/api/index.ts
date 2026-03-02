/**
 * Entry point Vercel-native.
 * Bundled com esbuild em api/index.js (único arquivo).
 * Vercel Hono: export default app (zero-config).
 */
import '../src/dns-ipv4';
import path from 'path';
import { config } from 'dotenv';
import app from '../src/modules/index';

if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(process.cwd(), '../../.env') });
}

export default app;
