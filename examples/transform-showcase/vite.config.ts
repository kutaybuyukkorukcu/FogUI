import { resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';

const appRoot = resolve(__dirname);
const foguiReactRoot = resolve(__dirname, '../../packages/react');
const foguiReactEntry = resolve(foguiReactRoot, 'src/index.ts');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@fogui/react': foguiReactEntry,
    },
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(appRoot), appRoot, foguiReactRoot],
    },
  },
  optimizeDeps: {
    exclude: ['@fogui/react'],
  },
});