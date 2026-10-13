import { build, preview } from '../../frontend/node_modules/vite/dist/node/index.js';
import { resolve } from 'node:path';

// Test-only bundle avoids hundreds of development-module connections per context.
// Production builds retain their existing development-token stripping.
const buildDir = resolve('data/e2e/ui');
await build({
  root: 'frontend', configFile: resolve('frontend/vite.config.ts'),
  define: {
    'import.meta.env.DEV': 'true',
    'import.meta.env.VITE_DEV_TOKEN': JSON.stringify(process.env.DALEEL_E2E_TOKEN),
  },
  build: { outDir: buildDir, emptyOutDir: true }, logLevel: 'warn',
});
await preview({
  root: 'frontend', configFile: resolve('frontend/vite.config.ts'),
  build: { outDir: buildDir },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8000' } },
});
console.log('Disposable Daleel test UI ready on http://127.0.0.1:5173');
