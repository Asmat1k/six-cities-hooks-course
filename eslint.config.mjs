// ESLint 10, flat config. Состав конфигурации для КТ1:
// - правила курса: пресет `eslint-config-htmlacademy/react-typescript` 11
//   (typescript-eslint strict + @eslint-react + jsx-a11y академии + @stylistic);
// - правила Next.js: официальный плагин `@next/eslint-plugin-next`;
// - `react-hooks/exhaustive-deps` и правила React Compiler: flat-пресет
//   `eslint-plugin-react-hooks` 7.
// Каждый плагин регистрируется ровно один раз - пресеты не пересекаются:
// у академии нет react-hooks, у Next-плагина только `@next/next`.
import htmlacademy from 'eslint-config-htmlacademy/react-typescript';
import next from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  // Служебные каталоги не линтим: артефакты сборки, тестовые артефакты,
  // скачанные бинарники Playwright, кэш npm и исходная вёрстка проекта
  // задания (docs/markup). next-env.d.ts генерирует сам Next - его править
  // нельзя (см. комментарий в файле), поэтому линтер его не читает.
  {
    ignores: [
      '.next/**',
      'out/**',
      'test-results/**',
      '.playwright-artifacts/**',
      '.playwright-browsers/**',
      '.npm-cache/**',
      'docs/**',
      'public/**',
      'next-env.d.ts',
    ],
  },

  // Правила курса.
  ...htmlacademy,

  // Правила Next.js.
  next.configs.recommended,

  // Правила React Hooks и React Compiler (в т.ч. react-hooks/exhaustive-deps).
  reactHooks.configs.flat.recommended,

  // Адаптация под Next.js App Router: имена файлов задаёт курс - компоненты
  // строчными через дефис (PROJECT.md, раздел 11), поэтому для tsx оставляем
  // KEBAB_CASE вместо PASCAL_CASE из пресета (page.tsx, offer-card.tsx).
  {
    files: ['**/*.{jsx,tsx}'],
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.{jsx,tsx,vue}': 'KEBAB_CASE',
        },
        {ignoreMiddleExtensions: true},
      ],
    },
  },

  // Папки внутри src/app именует Next.js: динамический сегмент [id] - это
  // синтаксис маршрута, а не «некебаб» имя. Разрешаем скобочные сегменты.
  {
    files: ['src/app/**'],
    rules: {
      'check-file/folder-naming-convention': [
        'error',
        {
          '**/': 'NEXT_JS_APP_ROUTER_CASE',
        },
      ],
    },
  },

  // КТ1 переносит готовую вёрстку как есть, с обычными <img> для локальных
  // картинок из public/img. Переход на next/image - решение будущих этапов,
  // поэтому одноимённое правило Next отключено осознанно.
  {
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },

  // Augmentация React.CSSProperties в src/types/react-css.d.ts добавляет
  // индекс-сигнатуру для CSS-переменных: в interface её нельзя заменить на
  // Record, а другой способ задать `--*-свойства` типу стилей отсутствует.
  {
    files: ['src/types/**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-indexed-object-style': 'off',
    },
  },
];
