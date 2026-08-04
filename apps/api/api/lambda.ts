/**
 * Entry point AWS Lambda (API Gateway v2 / HTTP API).
 * Bundled com esbuild em dist-lambda/index.js.
 */

// pdfjs-dist v5 requires DOMMatrix which doesn't exist in Node.js/Lambda
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    is2D = true; isIdentity = true;
    constructor(init?: any) {
      if (Array.isArray(init) && init.length === 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        this.m11 = this.a; this.m12 = this.b;
        this.m21 = this.c; this.m22 = this.d;
        this.m41 = this.e; this.m42 = this.f;
      }
    }
    inverse() { return new DOMMatrix(); }
    multiply() { return new DOMMatrix(); }
    translate() { return new DOMMatrix(); }
    scale() { return new DOMMatrix(); }
    transformPoint(p: any) { return p || { x: 0, y: 0 }; }
  } as any;
}

import '../src/dns-ipv4';
import path from 'path';
import { config } from 'dotenv';
import { handle } from 'hono/aws-lambda';
import app from '../src/modules/index';
import { processExtractionJobHandler } from '../src/modules/irpf-alta-renda/irpf-alta-renda.routes';

if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(process.cwd(), '../../.env') });
}

const honoHandler = handle(app);

export const handler = async (event: any, context: any) => {
  // Internal async invocation for background PDF extraction
  if (event.__extractionJob) {
    const { jobId, storagePath, fileName } = event.__extractionJob;
    await processExtractionJobHandler(jobId, storagePath, fileName);
    return { statusCode: 200 };
  }

  return honoHandler(event, context);
};
