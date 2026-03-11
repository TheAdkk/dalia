import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
  ],
  server: {
    fs: {
      // Allow access to the parent directory so we can import from dalia-core/pkg
      allow: [
        resolve(__dirname, '..'),
      ],
    },
  },
});
