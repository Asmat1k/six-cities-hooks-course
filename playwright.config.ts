import path from 'node:path';
import {defineConfig} from '@playwright/test';

// Браузеры Playwright ставятся в рабочий каталог (не в системный кэш):
//   PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" \
//     npm exec -- playwright install chromium
// Задаём путь в конфиге, чтобы `npm run test:e2e` работал без экспорта
// переменной окружения руками. Конфиг - ESM ("type": "module"), поэтому
// вместо __dirname используем import.meta.dirname.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(import.meta.dirname, '.playwright-browsers');

// Playwright проверяет уже запущенный production-сервер Vite:
//   npm run build
//   npm run preview -- --host 127.0.0.1 --port 3100
//   npm run test:e2e -- --grep @guest   (или @demo для demo-сборки)
// Сервер НЕ поднимается конфигом автоматически.
export default defineConfig({
  testDir: 'tests/e2e',
  // Бюджет теста: несколько тестов ходят по 4-6 реальным переходам, а
  // screenshot-прогон адаптивности грузит машину параллельно. Дефолтных 30 с
  // не хватало: многостраничный тест успевал пройти только без соседей.
  timeout: 60_000,
  // Рабочие артефакты упавших тестов - вне test-results, чтобы контрольные
  // скриншоты из specs не стирались при старте следующего прогона.
  outputDir: '.playwright-artifacts',
  fullyParallel: true,
  // Одновременно - не больше двух Chromium: проверка 767 -> 768 (H12)
  // ждёт событие matchMedia change, а ViewTransition (M3) - update-колбэк
  // браузера; оба доставляются кадрами. На загруженной машине (8 ядер,
  // load > 15) четыре-шесть параллельных рендереров оттягивали кадры на
  // 5-13 с, и приложение, верное по контракту useSyncExternalStore,
  // выглядело «зависшим». Два воркера держат браузер отзывчивым; при
  // желании изолировать до конца - --workers=1.
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Полное приложение Chrome for Testing в headless-режиме, а не
        // chromium-headless-shell: в этой среде headless-shell падает
        // (GPU/ICU), а полноценный билд запускается стабильно.
        channel: 'chromium',
      },
    },
  ],
});
