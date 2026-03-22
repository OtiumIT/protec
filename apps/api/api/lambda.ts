/**
 * Entry point AWS Lambda (API Gateway v2 / HTTP API).
 * Bundled com esbuild em dist-lambda/index.js.
 */
import '../src/dns-ipv4';
import path from 'path';
import { config } from 'dotenv';
import { handle } from 'hono/aws-lambda';
import app from '../src/modules/index';

if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(process.cwd(), '../../.env') });
}

export const handler = handle(app);
