import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@systems': resolve(__dirname, 'src/systems'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@config': resolve(__dirname, 'src/config'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Phaser needs this to avoid issues with top-level await
    target: 'es2020',
  },
});
