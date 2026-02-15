import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// STANDALONE_BUILD=1 → deployed to system-design.hillmanchan.com (base: /)
// Default (no flag)  → embedded in portfolio iframe at /games/system-design/
const isStandalone = process.env.STANDALONE_BUILD === '1';

export default defineConfig({
  plugins: [react()],
  base: isStandalone ? '/' : '/games/system-design/',
  build: {
    outDir: isStandalone ? 'dist' : 'dist-portfolio',
  },
});
