import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared/core': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  optimizeDeps: {
    include: ['@shared/core'],
  },
  server: {
    port: 5174,
  },
});
