import {fileURLToPath} from 'node:url';
import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';
import {PHONE_MAX_WIDTH, TABLET_MIN_WIDTH} from './src/shared/lib/breakpoints';

// Сборка SPA «Шесть городов» (КТ1): React 19.3 + Vite 8 + React Router 8.
// Алиас `@/*` повторяет paths из tsconfig.json, поэтому исходники импортируют
// срезы FSD абсолютными путями: `@/entities/offer`, `@/shared/ui/...`.

// Граница телефона и планшета - общая для кода и CSS (TASKS.md, H12):
// matchMedia-запрос строится из тех же констант (src/shared/lib/breakpoints),
// а media-запросы CSS ссылаются на них токенами. Media-запросы не умеют
// читать CSS-переменные, поэтому число попадает в CSS текстовой подстановкой
// на этапе сборки - в собранном бандле байт-в-байт те же media-запросы.
const CSS_BREAKPOINT_TOKENS: Record<string, string> = {
  '{{PHONE_MAX_WIDTH}}': String(PHONE_MAX_WIDTH),
  '{{TABLET_MIN_WIDTH}}': String(TABLET_MIN_WIDTH),
};

const CSS_BREAKPOINT_TOKEN_PATTERN = /\{\{(PHONE_MAX_WIDTH|TABLET_MIN_WIDTH)\}\}/g;

function cssBreakpointTokens(): Plugin {
  return {
    name: 'css-breakpoint-tokens',
    // До vite:css, чтобы постобработка видела уже готовые media-запросы.
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0].endsWith('.css') || !code.includes('{{')) {
        return null;
      }

      return {
        code: code.replace(
          CSS_BREAKPOINT_TOKEN_PATTERN,
          (token) => CSS_BREAKPOINT_TOKENS[token] ?? token,
        ),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), cssBreakpointTokens()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
