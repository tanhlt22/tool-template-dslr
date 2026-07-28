import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/slot-scan-tutorial/',
  server: {
    port: 5174,
    host: '0.0.0.0',
  },
});
