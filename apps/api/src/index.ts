import { config } from 'dotenv';
import { resolve } from 'path';
import { serve } from '@hono/node-server';
import app from './modules/index.js';

// Carregar .env apenas em dev (em produção o Render injeta variáveis pelo painel)
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '../../.env') });
}

const port = parseInt(process.env.PORT || '3001', 10);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 Server running on http://localhost:${info.port}`);
});

export default {
  port,
  fetch: app.fetch,
};
