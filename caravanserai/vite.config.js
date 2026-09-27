import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained index.html that runs over file:// with no network.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    target: 'es2020',
    chunkSizeWarningLimit: 4000,
  },
});
