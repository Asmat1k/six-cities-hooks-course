# Six Cities - КТ1 (этапы 1-3)

Учебный проект «Шесть городов»: React SPA на Vite, код организован по
Feature-Sliced Design. Этот репозиторий - контрольная точка 1: актуальный
стек, все страницы из готовой вёрстки [docs/markup/](docs/markup/) на моках,
маршрутизация, приватная страница и 404.
Что должно появиться дальше - в [docs/TASKS.md](docs/TASKS.md); границы КТ1 - ниже.

## Стек

| Инструмент | Версия | Назначение |
|------------|---------|------------|
| React | 19.3 | UI, нативный `<title>` в компонентах страниц (M4) |
| Vite + @vitejs/plugin-react | 8.3 / 6.3 | сборка SPA, dev-сервер, `vite preview` |
| React Router | 8.5 (пакет `react-router`, без `react-router-dom`) | маршрутизация в Data Mode: `createBrowserRouter` + `RouterProvider` |
| TypeScript | 7.0 (`typescript7`) - проверка типов; пакет `typescript` = `@typescript/typescript6` 6.0 для ESLint | по [docs/SETUP.md](docs/SETUP.md), раздел 0.1: `typescript-eslint` пока не поддерживает API TS 7 |
| ESLint | 10 + `eslint-config-htmlacademy` 11 + `eslint-plugin-react-hooks` 7 | правила курса (Next.js и его плагин удалены) |
| Vitest + React Testing Library + jsdom | 5 / 16 / 31 | юнит-тесты компонентов и маршрутов |
| Playwright (Chromium) | 1.65 | браузерные проверки production-сборки |

Node.js 24 (см. `.nvmrc`): `nvm use`.

## Структура (Feature-Sliced Design)

Слои по [feature-sliced.design/docs/reference/layers](https://feature-sliced.design/docs/reference/layers):
`app` -> `pages` -> `entities` -> `shared`. Пустые слои (`features`, `widgets`)
для КТ1 не заводятся. Внешние импорты срезов - только через их публичный API
(`index.ts`, см. [Public API](https://feature-sliced.design/docs/reference/public-api)),
внутренние - относительные. Сущность `offer` берёт тип `Host` у сущности
`user` через cross-import API `@x` (узкий публичный API для соседнего среза).

```
src/
  app/                     слой приложения: композиция и подключение моков
    entrypoint/main.tsx    монтирование App в #root (createRoot)
    routes/routes.tsx     таблица маршрутов + guard-ы: /, /login, /favorites, /offer/:id, *
    styles/main.css        общие стили вёрстки
    ui/                    App (RouterProvider), каркас страницы, шапка, подвал
  entities/
    offer/                 типы предложения/города/отзыва + карточка OfferCard
    user/                 типы Host/AuthInfo; @x/offer.ts - Host для сущности offer
  pages/
    main/ login/ favorites/ offer/ not-found/   страницы, каждая - срез FSD со своим index.ts
  shared/ui/               UI-кит: Logo, Rating, MapScheme, Icons, react-css.d.ts
  mocks/                   данные КТ1: предложения (4 шт.), отзывы, заглушка статуса
  test/setup.ts            очистка DOM для Vitest
tests/e2e/                 браузерные проверки КТ1 (Playwright)
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

SPA использует history-навигацию, поэтому production-раздача должна
отдавать `dist/index.html` на любой вложенный адрес (SPA fallback).
`vite preview` делает это сам; собственный nginx настраивается правилом
`try_files $uri /index.html;`.

Отдельная demo-сборка (без настоящих учётных данных - это просто
мок-статус, **не** механизм безопасности): показывает, как выглядит
приложение для авторизованного пользователя - шапка с email и числом
избранного, открытые `/favorites`, редирект с `/login` на `/`.
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
npm test              # Vitest: карточка, округление рейтинга, склонения, группировка, маршруты
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

npm run build
npm run preview -- --host 127.0.0.1 --port 3100
npm run test:e2e -- --grep @guest         # гостевая сборка

VITE_SIX_CITIES_MOCK_AUTH=1 npm run build
npm run preview -- --host 127.0.0.1 --port 3100
npm run test:e2e -- --grep @demo          # demo-сборка
```

Перед каждой серией останавливайте предыдущий `vite preview` (Ctrl+C):
порт 3100 один, а флаг при `preview` уже вшит в собранный JS - серию
отличает только пересборка `dist/`.

Обе серии проверяют применимые страницы на ширинах 320, 375, 768, 1024,
1280 и 1440: заголовок вкладки, отсутствие горизонтального скролла, битых
картинок и ошибок в консоли. Прямое открытие и `reload()` проверяются для
существующего `/offer/1` и вложенных 404 в обеих сериях; для гостя
`/favorites` проверяется вплоть до того, что блок «Saved listing» ни разу
не появляется в DOM. Контрольные скриншоты (375/768/1440) кладутся в
`test-results/screenshots/<серия>/` - сверяйте их с
[docs/markup/SCREENS.md](docs/markup/SCREENS.md).

Ожидаемое поведение маршрутов в SPA (серверных HTTP-статусов нет):
`/`, `/login`, `/offer/1`-`/offer/4` - свои страницы; `/favorites` для гостя -
редирект на `/login` без разметки списка; `/login` для demo-пользователя -
редирект на `/`; `/offer/<неизвестный id>`, `/offer`, любой другой адрес -
экран 404 (URL не меняется).

## Границы КТ1

Реализовано (этапы 1-3):

- страницы `/`, `/login`, `/favorites`, `/offer/:id`, экран 404 - из вёрстки,
  данные приходят через типизированные props из `src/mocks/`;
- маршрутизация React Router 8 в Data Mode: `createBrowserRouter` (один
  на приложение, создаётся вне рендера) и `RouterProvider`;
- приватная страница `/favorites`: guard возвращает гостю
  `<Navigate to="/login" replace />` вместо дерева избранного - список не
  рендерится; обратный guard уводит demo-пользователя с `/login` на `/`;
- заголовки вкладок нативным `<title>` (M4): `Six Cities - Amsterdam`,
  `… - Login`, `… - Favorites (N)`, `… - <название>`, `… - 404` - React
  поднимает их в `<head>`;
- звёзды рейтинга с округлением до целого (3.1 -> 60%, 4.5 -> 100%),
  склонения `Bedroom/Bedrooms`, `adult/adults`, даты отзывов `April 2019`;
- адаптив из вёрстки, включая переключатель «List / Map» на телефоне
  (штатный CSS-механизм вёрстки, без скриптов).

Сознательно НЕ реализовано (этапы 4-11 и бонусы):

- форма отзыва (H6/H8/M2), поиск (H1), сортировка и меню города (этап 6),
  подгрузка порций (H7), «Recently viewed» (H10);
- Яндекс Карты (H5) - вместо карты статичная схема из вёрстки;
- настоящий сервер и вход (этап 7): отправка формы `/login` отключена,
  «Sign out» не показан, избранное не переключается;
- пустые состояния главной и избранного (этап 8), Redux (этап 6).

Другие заметные решения:

- подписи городов на главной - не ссылки (в КТ1 город не переключается,
  вместо заглушек `href="#"` из макета - `span` с теми же классами);
- Next.js и всё, что он приносил (конфиги, плагины ESLint, `Metadata API`,
  `'use client'`, серверные редиректы/статусы), полностью убраны: приватность
  и 404 проверяются поведением SPA, а не HTTP-кодами;
- моки остаются в `src/mocks/` и подключаются только слоем `app` (см.
  раздел «Структура»), поэтому каталог из ТЗ сохранён без дублирования
  данных по срезам;
- файл `src/shared/ui/react-css.d.ts` добавляет к `React.CSSProperties`
  CSS-переменные (`--rating`) через module augmentation - без `as`;
- [docs/JOURNAL.md](docs/JOURNAL.md) и [docs/QUESTIONS.md](docs/QUESTIONS.md)
  не заполнялись - по условию КТ1.
