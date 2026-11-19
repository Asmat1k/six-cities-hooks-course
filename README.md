# Six Cities - КТ1 (этапы 1-3)

Учебный проект «Шесть городов» на Next.js 16 (App Router). Этот репозиторий -
контрольная точка 1: актуальный стек, все страницы из готовой вёрстки
[docs/markup/](docs/markup/) на моках, маршрутизация, приватная страница и 404.
Что должно появиться дальше - в [docs/TASKS.md](docs/TASKS.md); границы КТ1 - ниже.

## Стек

| Инструмент | Версия | Назначение |
|------------|---------|------------|
| Next.js (App Router, Turbopack) | 16.4 | сборка, маршрутизация, серверные компоненты |
| React | 19.3 | UI |
| TypeScript | 7.0 (`typescript7`) - проверка типов; пакет `typescript` = `@typescript/typescript6` 6.0 для ESLint/Next | по [docs/SETUP.md](docs/SETUP.md), раздел 0.1: `typescript-eslint` пока не поддерживает API TS 7 |
| ESLint | 10 + `eslint-config-htmlacademy` 11 + `eslint-plugin-react-hooks` 7 + `@next/eslint-plugin-next` | правила курса + Next |
| Vitest + React Testing Library + jsdom | 5 / 16 / 31 | юнит-тесты компонентов |
| Playwright (Chromium) | 1.65 | браузерные проверки реального production-сервера |

Node.js 24 (см. `.nvmrc`): `nvm use`.

## Структура

```
src/
  app/                     маршруты App Router: /, /login, /favorites, /offer/[id], not-found
  components/              шапка, подвал, карточка, рейтинг, детали предложения, избранное, схема карты
  lib/                     форматирование: capitalize, склонения, дата отзыва
  mocks/                   предложения (4 шт., одна выборка для карточек и страниц), отзывы, заглушка статуса
  styles/                  стили из вёрстки (общие + по страницам), пути картинок /img/...
  types/                   доменные типы по PROJECT.md §9.2
tests/e2e/                 браузерные проверки КТ1 (Playwright)
public/img/                ассеты вёрстки + источники фото (SOURCES.md)
```

## Запуск

Штатный режим (гость):

```bash
npm ci
npm run dev            # разработка, http://localhost:3000
npm run build          # production-сборка
npm run start          # production-сервер
```

Отдельная demo-сборка (без настоящих учётных данных - это просто мок-статус,
**не** механизм безопасности): показывает, как выглядит приложение для
авторизованного пользователя - шапка с email и числом избранного, открытые
`/favorites`, редирект с `/login` на `/`. Флаг задаётся и при сборке,
и при запуске: статические страницы выпекаются на этапе `next build`.

```bash
SIX_CITIES_MOCK_AUTH=1 npm run build
SIX_CITIES_MOCK_AUTH=1 npm run start -- --hostname 127.0.0.1 --port 3100
```

Вернуться к штатному режиму - пересобрать без переменной: `env -u SIX_CITIES_MOCK_AUTH npm run build`.

## Проверки

```bash
npm run lint          # ESLint: правила курса + Next + react-hooks/exhaustive-deps
npm run typecheck     # next typegen + TypeScript 7 (tsgo)
npm test              # Vitest: карточка, округление рейтинга, склонения, группировка избранного
```

Браузерные проверки гоняются против production-сервера (конфиг его не
поднимает сам):

```bash
# один раз; PLAYWRIGHT_BROWSERS_PATH обязателен: он кладёт браузер в каталог
# проекта .playwright-browsers/, где его затем ищет `npm run test:e2e`
# (тот же путь по умолчанию задан в playwright.config.ts). Без переменной
# браузер уйдёт в системный кэш, и тесты его не найдут.
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" npm exec -- playwright install chromium

npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
npm run test:e2e -- --grep @guest         # штатная сборка

SIX_CITIES_MOCK_AUTH=1 npm run build && SIX_CITIES_MOCK_AUTH=1 npm run start -- --hostname 127.0.0.1 --port 3100
npm run test:e2e -- --grep @demo          # demo-сборка
```

Обе серии прогоняют применимые страницы на ширинах 320, 375, 768, 1024, 1280
и 1440: HTTP-статус, заголовок вкладки, отсутствие горизонтального скролла,
битых картинок и ошибок в консоли. Контрольные скриншоты (375/768/1440)
кладутся в `test-results/screenshots/<серия>/` - сверяйте их с
[docs/markup/SCREENS.md](docs/markup/SCREENS.md).

Ожидаемое поведение маршрутов для гостя: `/`, `/login`, `/offer/1`-`/offer/4` -
200; `/favorites` - 307 на `/login`; `/offer`, `/offer/<неизвестный id>`,
любой другой адрес - 404.

## Границы КТ1

Реализовано (этапы 1-3):

- страницы `/`, `/login`, `/favorites`, `/offer/:id`, экран 404 - из вёрстки,
  данные приходят через типизированные props из `src/mocks/`;
- маршрутизация Next.js: `generateStaticParams` для четырёх известных id
  (`dynamicParams = false`), `notFound()` для остальных;
- приватная страница `/favorites`: гостя перенаправляет серверный
  `redirect('/login')` до рендера - без разметки списка;
- заголовки вкладок через Metadata API (адаптация M4): `Six Cities - Amsterdam`,
  `… - Login`, `… - Favorites (N)`, `… - <название>`, `… - 404`;
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
- `@next/next/no-img-element` отключён осознанно: КТ1 переносит готовую
  вёрстку с обычными `<img>` на локальные ассеты; переход на `next/image` -
  решение будущих этапов;
- файл `src/types/react-css.d.ts` добавляет к `React.CSSProperties`
  CSS-переменные (`--rating`) через module augmentation - без `as`;
- [docs/JOURNAL.md](docs/JOURNAL.md) и [docs/QUESTIONS.md](docs/QUESTIONS.md)
  не заполнялись - по условию КТ1.
