# Six Cities - КТ2 (этапы 4–6)

Учебный проект «Шесть городов»: React SPA на Vite, код организован по
Feature-Sliced Design. На основе КТ1 добавлены поиск и сортировка,
выбор города, интерактивная карта и форма отзыва. Данные по-прежнему
берутся из локальных моков.

Вариант 3: задержка поиска — **500 мс**, префикс ключей хранения —
**`sc-charlie`**. Требования курса — в [docs/TASKS.md](docs/TASKS.md).

## Стек

| Инструмент | Версия | Назначение |
|------------|---------|------------|
| React | 19.3 | UI, нативный `<title>` в компонентах страниц (M4) |
| Vite + @vitejs/plugin-react | 8.3 / 6.3 | сборка SPA, dev-сервер, `vite preview` |
| React Router | 8.5 (пакет `react-router`, без `react-router-dom`) | маршрутизация в Data Mode: `createBrowserRouter` + `RouterProvider` |
| Redux Toolkit + React Redux | 2.15 / 9.3 | состояние города и предложений |
| TypeScript | 7.0 (`typescript7`) - проверка типов; пакет `typescript` = `@typescript/typescript6` 6.0 для ESLint | по [docs/SETUP.md](docs/SETUP.md), раздел 0.1: `typescript-eslint` пока не поддерживает API TS 7 |
| ESLint | 10 + `eslint-config-htmlacademy` 11 + `eslint-plugin-react-hooks` 7 | правила курса (Next.js и его плагин удалены) |
| Vitest + React Testing Library + jsdom | 5 / 16 / 31 | юнит-тесты компонентов и маршрутов |
| Playwright (Chromium) | 1.65 | браузерные проверки production-сборки |

Node.js 24 (см. `.nvmrc`): `nvm use`.

## Структура (Feature-Sliced Design)

Слои по [feature-sliced.design/docs/reference/layers](https://feature-sliced.design/docs/reference/layers):
`app` -> `pages` -> `entities` -> `shared`. Пустые слои (`features`, `widgets`)
не заведены. Внешние импорты срезов - только через их публичный API
(`index.ts`, см. [Public API](https://feature-sliced.design/docs/reference/public-api)),
внутренние - относительные. Сущность `offer` берёт тип `Host` у сущности
`user` через cross-import API `@x` (узкий публичный API для соседнего среза).

```
src/
  app/                     слой приложения: композиция и подключение моков
    entrypoint/main.tsx    монтирование App в #root (createRoot)
    routes/routes.tsx     таблица маршрутов + guard-ы: /, /login, /favorites, /offer/:id, *
    store/                 Redux: город и предложения
    styles/main.css        общие стили вёрстки
    ui/                    App (RouterProvider), каркас страницы, шапка, подвал
  entities/
    offer/                 типы предложения/города/отзыва + карточка и общий список карточек
    user/                 типы Host/AuthInfo; @x/offer.ts - Host для сущности offer
  pages/
    main/ login/ favorites/ offer/ not-found/   страницы, каждая - срез FSD со своим index.ts
  hooks/                   хуки курса и их тесты
  shared/                  UI-кит, карта, брейкпоинты и параметры варианта
  mocks/                   предложения по городам, отзывы, заглушка статуса
  test/setup.ts            очистка DOM для Vitest
tests/e2e/                 браузерные проверки КТ1 и КТ2 (Playwright)
public/img/                ассеты вёрстки + источники фото (SOURCES.md)
```

Моки лежат в `src/mocks/` (как требует ТЗ, TASKS.md этап 2) и подключаются
только слоем `app`: маршруты и каркас берут данные из моков и передают их
страницам через props. Срезы `pages`, `entities` и `shared` про источники
данных не знают и `src/mocks` не импортируют - их тест-данные объявлены
рядом с тестами и повторяют выборку моков.

## Запуск

```bash
npm ci
npm run dev            # разработка (vite), http://localhost:5173
npm run build          # проверка типов (TS 7) + production-сборка в dist/
npm run preview        # раздача собранного dist/ (vite preview)
npm start              # то же, что npm run dev
```

Для живой карты скопируйте [.env.example](.env.example) в `.env.local`
и задайте `VITE_YANDEX_MAPS_KEY`. Перезапустите dev-сервер или пересоберите
приложение. Без ключа остальной интерфейс работает, а вместо карты
показывается сообщение. Не добавляйте `.env.local` в Git.

SPA использует history-навигацию, поэтому production-раздача должна
отдавать `dist/index.html` на любой вложенный адрес (SPA fallback).
`vite preview` делает это сам; собственный nginx настраивается правилом
`try_files $uri /index.html;`.

Отдельная demo-сборка (без настоящих учётных данных - это просто
мок-статус, **не** механизм безопасности): показывает, как выглядит
приложение для авторизованного пользователя - шапка с email и числом
избранного, открытые `/favorites` и форму отзыва, редирект с `/login` на `/`.
Флаг **встраивается при сборке**: `vite build` подставляет его значение в
бандл, поэтому переключить режим, не пересобрав проект, нельзя, а сам флаг
ничего не защищает - это переключатель мок-состояния.

```bash
npm run build                                     # гостевая сборка
VITE_SIX_CITIES_MOCK_AUTH=1 npm run build         # demo-сборка
npm run preview -- --host 127.0.0.1 --port 3100   # раздача той, что собрана
```

Вернуться к гостевому режиму - пересобрать без переменной.

## Проверки

```bash
npm run lint          # ESLint: правила курса + react-hooks/exhaustive-deps
npm run typecheck     # TypeScript 7 (tsgo): node_modules/typescript7/bin/tsc -p .
npm test              # Vitest: хуки, Redux, форма, компоненты и маршруты
```

Юнит-тесты маршрутов (`src/app/routes/routes.test.tsx`) гоняют рабочую
таблицу маршрутов через `createMemoryRouter` в обоих режимах: гостевом и
demo (env подменяется `vi.stubEnv` и восстанавливается после теста).

Браузерные проверки гоняются против production-сервера `vite preview`
(конфиг его не поднимает сам):

```bash
# один раз; PLAYWRIGHT_BROWSERS_PATH обязателен: он кладёт браузер в каталог
# проекта .playwright-browsers/, где его затем ищет `npm run test:e2e`
# (тот же путь по умолчанию задан в playwright.config.ts). Без переменной
# браузер уйдёт в системный кэш, и тесты его не найдут.
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" npm exec -- playwright install chromium

VITE_YANDEX_MAPS_KEY= VITE_SIX_CITIES_MOCK_AUTH=0 npm run build
npm run preview -- --host 127.0.0.1 --port 3100
npm run test:e2e -- --grep '@guest|@kt2-no-key'

VITE_YANDEX_MAPS_KEY=kt2-mock VITE_SIX_CITIES_MOCK_AUTH=0 npm run build
npm run preview -- --host 127.0.0.1 --port 3100
npm run test:e2e -- --grep @kt2-map-mock   # запросы к API перехватываются тестом

VITE_YANDEX_MAPS_KEY= VITE_SIX_CITIES_MOCK_AUTH=1 npm run build
npm run preview -- --host 127.0.0.1 --port 3100
npm run test:e2e -- --grep @demo          # demo-сборка
```

Перед каждой серией останавливайте предыдущий `vite preview` (Ctrl+C):
порт 3100 один, а флаг при `preview` уже вшит в собранный JS - серию
отличает только пересборка `dist/`.

Гостевая и demo-серии проверяют применимые страницы на ширинах 320, 375, 768, 1024,
1280 и 1440: заголовок вкладки, отсутствие горизонтального скролла, битых
картинок и ошибок в консоли. Прямое открытие и `reload()` проверяются для
существующего `/offer/1` и вложенных 404 в обеих сериях; для гостя
`/favorites` проверяется вплоть до того, что блок «Saved listing» ни разу
не появляется в DOM. Контрольные скриншоты (375/768/1440) кладутся в
`test-results/screenshots/<серия>/` - сверяйте их с
[docs/markup/SCREENS.md](docs/markup/SCREENS.md).

Ожидаемое поведение маршрутов в SPA (серверных HTTP-статусов нет):
`/`, `/login`, `/offer/:id` с существующим ID - свои страницы; `/favorites` для гостя -
редирект на `/login` без разметки списка; `/login` для demo-пользователя -
редирект на `/`; `/offer/<неизвестный id>`, `/offer`, любой другой адрес -
экран 404 (URL не меняется).

## Границы КТ2

Реализовано (этапы 4–6):

- На главной город и предложения хранятся в Redux. Доступны четыре
  варианта сортировки и поиск с задержкой 500 мс. Поиск и сортировка
  отражаются в URL; Back и Forward восстанавливают состояние.
- Яндекс Карты подсвечивают активную карточку. На телефоне в режиме List
  карта не монтируется; с 768 px список и карта видны одновременно.
- На странице предложения карта показывает текущее предложение и трёх
  соседей. Главная, детали и избранное используют общий список карточек.
- В demo-режиме форма отзыва сохраняет черновик между перезагрузками,
  синхронизирует его между вкладками и блокирует повторную отправку.
  Отправка имитируется локально, успешная отправка очищает черновик.
- Смена города и переходы со страницей предложения анимируются;
  ввод поискового запроса не запускает анимацию перехода.

Маршрутизация, гостевые ограничения и 404 сохранены из КТ1.
Настоящий сервер и авторизация, переключение избранного, подгрузка порций
и «Recently viewed» не входят в эту контрольную точку.

Сигнатуры хуков и обработанные граничные случаи — в [каталоге хуков](src/hooks/README.md).
