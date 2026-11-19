// ESLint 10, flat config. Состав конфигурации для КТ1:
// - правила курса: пресет `eslint-config-htmlacademy/react-typescript` 11
//   (typescript-eslint strict + @eslint-react + jsx-a11y академии + @stylistic);
// - `react-hooks/exhaustive-deps` и правила React Compiler: flat-пресет
//   `eslint-plugin-react-hooks` 7.
// Next.js из проекта убран, его плагин здесь больше не участвует.
import htmlacademy from 'eslint-config-htmlacademy/react-typescript';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  // Служебные каталоги не линтим: артефакты сборки Vite, тестовые артефакты,
  // скачанные бинарники Playwright, кэш npm и исходная вёрстка проекта
  // задания (docs/markup).
  {
    ignores: [
      'dist/**',
      'test-results/**',
      '.playwright-artifacts/**',
      '.playwright-browsers/**',
      '.npm-cache/**',
      'docs/**',
      'public/**',
    ],
  },

  // Правила курса.
  ...htmlacademy,

  // Правила React Hooks и React Compiler (в т.ч. react-hooks/exhaustive-deps).
  reactHooks.configs.flat.recommended,

  // Имена файлов задаёт курс: компоненты и модули строчными через дефис
  // (PROJECT.md, раздел 11), поэтому для tsx оставляем KEBAB_CASE вместо
  // PASCAL_CASE из пресета (main-page.tsx, offer-card.tsx).
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

  // Сегмент `@x` сущности user - служебное имя из методологии FSD
  // (feature-sliced.design, «Public API for cross-imports»): это узкий
  // публичный API сущности для сущности offer, а не «некебаб» имя папки
  // бизнес-кода. Правило имён папок для него отключено точечно.
  {
    files: ['src/entities/user/@x/**'],
    rules: {
      'check-file/folder-naming-convention': 'off',
    },
  },

  // Augmentация React.CSSProperties в src/shared/ui/react-css.d.ts добавляет
  // индекс-сигнатуру для CSS-переменных: в interface её нельзя заменить на
  // Record, а другой способ задать `--*-свойства` типу стилей отсутствует.
  {
    files: ['src/shared/ui/react-css.d.ts'],
    rules: {
      '@typescript-eslint/consistent-indexed-object-style': 'off',
    },
  },
];
