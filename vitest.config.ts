import {defineConfig, mergeConfig} from 'vitest/config';
import viteConfig from './vite.config';

// Конфигурация Vitest поверх Vite: плагин React и алиас `@/*` берутся из
// vite.config.ts через mergeConfig, здесь - только тестовое окружение.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
);
