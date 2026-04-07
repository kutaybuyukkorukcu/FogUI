import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const foguiReactRoot = resolve(__dirname, '../../packages/react');
const foguiReactEntry = resolve(foguiReactRoot, 'src/index.ts');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@fogui/react': foguiReactEntry,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
  },
});