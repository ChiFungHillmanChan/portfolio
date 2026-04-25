import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    fakeTimers: {
      toFake: [
        'setTimeout', 'clearTimeout',
        'setInterval', 'clearInterval',
        'setImmediate', 'clearImmediate',
        'Date', 'performance',
        'requestAnimationFrame', 'cancelAnimationFrame',
      ],
    },
  },
});
