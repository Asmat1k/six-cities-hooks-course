import {fileURLToPath} from 'node:url';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

// Сборка SPA «Шесть городов» (КТ1): React 19.3 + Vite 8 + React Router 8.
// Алиас `@/*` повторяет paths из tsconfig.json, поэтому исходники импортируют
// срезы FSD абсолютными путями: `@/entities/offer`, `@/shared/ui/...`.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
