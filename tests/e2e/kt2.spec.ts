import {expect, test, type Page} from '@playwright/test';

// Браузерные проверки КТ2 (этапы 4-6). Две серии на разных сборках preview:
//
//   @kt2-no-key  - сборка VITE_YANDEX_MAPS_KEY= (пусто), VITE_SIX_CITIES_MOCK_AUTH=0:
//     - состояние в URL (H4): сортировка push, поиск replace, прямая ссылка,
//       некорректное значение, обе гонки с дебаунсом, Enter и очистка;
//     - поиск вместе со сменой города и сортировкой;
//     - сообщение вместо карты без ключа и ноль обращений к API;
//     - адаптив от 320 px: переключатель «Список / Карта», обе области
//       с 768 px, мобильные цели не меньше 44×44; 767 -> 768 в одном
//       документе монтирует карту без перезагрузки (H12);
//     - фактические React View Transition (M3): типы направления при смене
//       города и переходе на предложение, отсутствие перехода при вводе
//       поиска; prefers-reduced-motion не ломает навигацию.
//
//   @kt2-map-mock - сборка VITE_YANDEX_MAPS_KEY=kt2-mock: запрос к API v3
//     перехватывается и обслуживается локальной заглушкой (ключ не уходит
//     в сеть). Проверяется настоящая проводка хука H5: монтаж и уничтожение
//     карты по переключателю, маркеры и подсветка (в том числе та же самая
//     подсветка после пересборки маркеров и на странице предложения),
//     идентичность узлов маркеров при поиске, центр и маркеры при смене
//     города без пересоздания карты, ошибка загрузки скрипта.
//
//   @demo - сборка VITE_SIX_CITIES_MOCK_AUTH=1 (карта без ключа):
//     черновик отзыва синхронизируется между двумя настоящими вкладками
//     (H6: событие storage, перезагрузка, очистка после отправки).

const SEARCH_DELAY_MS = 500;
const API_URL_PATTERN = '**/api-maps.yandex.ru/v3/**';

// Бюджет ожидания для проверок, зависящих от ПЕРЕСЕЧЕНИЯ брейкпоинта
// (767 -> 768 -> 320). Приложение честно ждёт событие matchMedia change
// (useSyncExternalStore, H12) и перерисовывается в момент его доставки.
// Замеры на загруженной машине (8 ядер, load > 15): Chromium откладывает
// доставку события стилем «до следующего кадра» на 4-13 с, хотя само
// matches переворачивается сразу. Дефолтных 5 с хватает только на
// спокойной машине; здесь шаг ждёт событие, а не «прячет» проверку -
// проверяемый факт тот же: без перезагрузки переключатель исчезает,
// монтируются и список, и карта.
const MEDIA_FLIP_TIMEOUT_MS = 20_000;

async function selectSort(page: Page, optionName: string) {
  await page.getByRole('button', {name: /Sort by/}).click();
  await page.getByRole('option', {name: optionName}).click();
}

// Клик по пункту меню сортировки прямо из страницы: собственная механика
// клика Playwright занимает больше 500 мс и не помещается в окно дебаунса
// поиска, а проверяется именно гонка «сортировка до таймера». Клик
// настоящий - через делегированный слушатель React; пункт находится по
// стабильному id, который SortMenu проставляет каждому значению.
function findSortOptionAndClick(sortValue: string): void {
  const target = document.querySelector<HTMLElement>(`#sort-option-${sortValue}`);

  if (target === null) {
    throw new Error(`Sort option not found: ${sortValue}`);
  }

  target.click();
}

async function countApiRequests(page: Page): Promise<number> {
  return page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('api-maps.yandex.ru')).length,
  );
}

test.describe('KT2 @kt2-no-key', () => {
  test('sort pushes history, search replaces it, Back and Forward restore the state', async ({page}) => {
    await page.goto('/');

    // Сортировка - новая запись истории.
    await selectSort(page, 'Price: low to high');
    await expect(page).toHaveURL('/?sort=price-asc');

    // Поиск не создаёт записи на каждую букву: replace внутри записи.
    await page.getByPlaceholder('Search by title').fill('loft');
    await page.waitForTimeout(SEARCH_DELAY_MS + 200);
    await expect(page).toHaveURL('/?sort=price-asc&q=loft');
    await expect(page.getByPlaceholder('Search by title')).toHaveValue('loft');

    // Назад: состояние до сортировки и до поиска.
    await page.goBack();
    await expect(page).toHaveURL('/');
    await expect(page.getByPlaceholder('Search by title')).toHaveValue('');
    await expect(page.locator('#sort-current', {hasText: 'Popular'})).toBeVisible();

    // Вперёд: всё восстановлено из адреса.
    await page.goForward();
    await expect(page).toHaveURL('/?sort=price-asc&q=loft');
    await expect(page.getByPlaceholder('Search by title')).toHaveValue('loft');
    await expect(page.locator('#sort-current', {hasText: 'Price: low to high'})).toBeVisible();
    // «loft» в названиях моков Парижа - только «Bright loft near Montmartre».
    await expect(page.getByRole('heading', {name: '1 places to stay in Paris'})).toBeVisible();
    await expect(page.locator('.places-grid .place-card')).toHaveCount(1);
  });

  test('direct url restores sort and search, invalid sort means Popular', async ({page}) => {
    await page.goto('/?sort=price-desc&q=house');
    await expect(page).toHaveURL('/?sort=price-desc&q=house');
    await expect(page.locator('#sort-current', {hasText: 'Price: high to low'})).toBeVisible();
    await expect(page.getByPlaceholder('Search by title')).toHaveValue('house');
    await expect(page.getByRole('heading', {name: '1 places to stay in Paris'})).toBeVisible();

    // Некорректное значение - сортировка по умолчанию, адрес не переписывается.
    await page.goto('/?sort=abc');
    await expect(page.locator('#sort-current', {hasText: 'Popular'})).toBeVisible();
    await expect(page).toHaveURL('/?sort=abc');
  });

  test('Enter applies the search at once, Clear cancels and removes q', async ({page}) => {
    await page.goto('/');

    await page.getByPlaceholder('Search by title').fill('loft');
    await page.getByPlaceholder('Search by title').press('Enter');
    await expect(page).toHaveURL('/?q=loft');

    await page.getByRole('button', {name: 'Clear search'}).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByPlaceholder('Search by title')).toHaveValue('');
    await expect(page.getByRole('button', {name: 'Clear search'})).toHaveCount(0);
  });

  test('race: Back during the pending search cancels the flush', async ({page}) => {
    await page.goto('/');
    await selectSort(page, 'Top rated first');
    await expect(page).toHaveURL('/?sort=top-rated');

    // Ввод и «назад» до истечения 500 мс.
    await page.getByPlaceholder('Search by title').fill('house');
    await page.goBack();

    await expect(page).toHaveURL('/');
    await expect(page.getByPlaceholder('Search by title')).toHaveValue('');

    // Дожидаемся истечения задержки: отложенный поиск не дописал q.
    await page.waitForTimeout(SEARCH_DELAY_MS + 300);
    await expect(page).toHaveURL('/');

    // И «вперёд» показывает запись сортировки БЕЗ q - таймер был снят.
    await page.goForward();
    await expect(page).toHaveURL('/?sort=top-rated');
    await expect(page.getByPlaceholder('Search by title')).toHaveValue('');
  });

  test('race: a sort push before the timer keeps sort, q and the foreign param', async ({page}) => {
    await page.goto('/?utm=promo');

    // Меню сортировки открываем заранее, клик по пункту отправляем сразу за
    // вводом одним DOM-событием: собственная механика Playwright занимает
    // больше 500 мс и не помещается в окно дебаунса, а проверяется именно
    // гонка «сортировка до таймера». Клик настоящий - через делегированный
    // слушатель React.
    await page.getByRole('button', {name: /Sort by/}).click();

    await page.getByPlaceholder('Search by title').fill('loft');
    await page.evaluate(findSortOptionAndClick, 'price-asc');
    await expect(page).toHaveURL('/?utm=promo&sort=price-asc');

    // Таймер добил: q дописан в актуальную запись, посторонний параметр цел.
    await page.waitForTimeout(SEARCH_DELAY_MS + 300);
    await expect(page).toHaveURL('/?utm=promo&sort=price-asc&q=loft');

    // Назад - запись до сортировки: сортировка сброшена, поле из URL.
    await page.goBack();
    await expect(page).toHaveURL('/?utm=promo');
    await expect(page.getByPlaceholder('Search by title')).toHaveValue('');
    await expect(page.locator('#sort-current', {hasText: 'Popular'})).toBeVisible();
  });

  test('search works together with city and sort', async ({page}) => {
    await page.goto('/?q=loft');

    // «loft» в моках Парижа - один: «Bright loft near Montmartre».
    await expect(page.getByRole('heading', {name: '1 places to stay in Paris'})).toBeVisible();
    await expect(page.locator('.places-grid .place-card')).toHaveCount(1);

    // Смена города не трогает URL: поиск применяется к новому городу.
    await page.getByRole('button', {name: 'Amsterdam'}).click();
    await expect(page.getByRole('heading', {name: '0 places to stay in Amsterdam'})).toBeVisible();
    await expect(page.locator('.places-grid .place-card')).toHaveCount(0);
    await expect(page).toHaveURL('/?q=loft');

    // Возврат в Париж - та же выдача, адрес не менялся.
    await page.getByRole('button', {name: 'Paris'}).click();
    await expect(page.getByRole('heading', {name: '1 places to stay in Paris'})).toBeVisible();
    await expect(page.locator('.places-grid .place-card')).toHaveCount(1);
  });

  test('without a key the map shows a message and the app makes no API requests', async ({page}) => {
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('api-maps.yandex.ru')) {
        apiRequests.push(request.url());
      }
    });

    await page.goto('/');

    await expect(page.locator('.map__fallback')).toHaveCount(1);
    await expect(page.locator('.map__fallback')).toContainText('no Yandex Maps API key');

    // Список при этом живёт своей жизнью - поиск и сортировка работают.
    await selectSort(page, 'Price: low to high');
    await expect(page.locator('#sort-current', {hasText: 'Price: low to high'})).toBeVisible();

    expect(apiRequests).toEqual([]);
    expect(await countApiRequests(page)).toBe(0);
  });

  test('adaptive: 320-1440 without overflow, List default on phone, both areas from 768', async ({page}) => {
    test.setTimeout(120_000);

    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({width, height: 800});
      await page.goto('/', {waitUntil: 'networkidle'});

      const horizontalOverflow = await page.evaluate(() => {
        const scrollingElement = document.scrollingElement;

        if (scrollingElement === null) {
          return 0;
        }

        return scrollingElement.scrollWidth - scrollingElement.clientWidth;
      });
      expect(horizontalOverflow, `horizontal scroll at ${String(width)}px`).toBeLessThanOrEqual(0);

      const consoleErrors: string[] = [];
      page.removeAllListeners('console');
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });
      expect(consoleErrors, `console errors at ${String(width)}px`).toEqual([]);
    }

    // Телефон: List по умолчанию, карта НЕ смонтирована (не спрятана).
    await page.setViewportSize({width: 320, height: 800});
    await page.goto('/');
    await expect(page.locator('.view-switch')).toBeVisible();
    await expect(page.locator('.places-layout__map')).toHaveCount(0);
    await expect(page.locator('.places-grid')).toBeVisible();

    // Переключатель показывает сообщение вместо карты, а не пустоту.
    await page.locator('label[for="view-map"]').click();
    await expect(page.locator('.places-layout__map .map__fallback')).toBeVisible();
    await expect(page.locator('.places-grid')).toHaveCount(0);
    await page.locator('label[for="view-list"]').click();
    await expect(page.locator('.places-layout__map')).toHaveCount(0);

    // Планшет: обе области без переключателя.
    await page.setViewportSize({width: 768, height: 800});
    await expect(page.locator('.view-switch')).toBeHidden();
    await expect(page.locator('.places-layout__map .map__fallback')).toBeVisible();
    await expect(page.locator('.places-grid')).toBeVisible();
  });

  test('mobile targets are at least 44x44', async ({page}) => {
    await page.setViewportSize({width: 320, height: 800});
    await page.goto('/');

    // Измерение вынесено в функцию страницы, чтобы не растить вложенность.
    const measureTargets = page.evaluate(() => {
      const selectors = ['.cities__link', '.view-switch__label', '.sort__current'];
      const measurements: {selector: string; width: number; height: number}[] = [];

      for (const selector of selectors) {
        for (const element of document.querySelectorAll(selector)) {
          const rect = element.getBoundingClientRect();

          measurements.push({selector, width: rect.width, height: rect.height});
        }
      }

      return measurements;
    });

    for (const size of await measureTargets) {
      expect(size.width, `${size.selector} width`).toBeGreaterThanOrEqual(44);
      expect(size.height, `${size.selector} height`).toBeGreaterThanOrEqual(44);
    }
  });

  test('React View Transitions: city and offer get direction types, search input does not', async ({page}) => {
    await page.addInitScript(() => {
      const calls: string[][] = [];
      Object.defineProperty(window, '__vtCalls', {value: calls});

      if (typeof document.startViewTransition !== 'function') {
        return;
      }

      const nativeStart = document.startViewTransition.bind(document);

      document.startViewTransition = (argument) => {
        const descriptor = argument as {types?: string[]};
        calls.push([...(descriptor.types ?? [])]);
        return nativeStart(argument);
      };
    });

    await page.goto('/');
    const supportsTransitions = await page.evaluate(() =>
      typeof document.startViewTransition === 'function',
    );
    expect(supportsTransitions).toBe(true);

    // Смена города вперёд по порядку вкладок: city-forward.
    await page.getByRole('button', {name: 'Amsterdam'}).click();
    await expect(page.getByRole('heading', {name: '4 places to stay in Amsterdam'})).toBeVisible();

    // Возврат в Париж: city-back.
    await page.getByRole('button', {name: 'Paris'}).click();
    await expect(page.getByRole('heading', {name: '4 places to stay in Paris'})).toBeVisible();

    const afterCity = await page.evaluate(() => window.__vtCalls ?? []);
    expect(afterCity.some((types) => types.includes('city-forward'))).toBe(true);
    expect(afterCity.some((types) => types.includes('city-back'))).toBe(true);

    // Переход на предложение: offer-forward. Ждём КОНТЕНТ, а не URL: адрес
    // меняется на коммите роутера, а экран подменяется переходом задачей
    // позже - «назад» раньше этой замены отменил бы переход целиком.
    await page.getByRole('link', {name: 'Bright loft near Montmartre'}).click();
    await expect(page).toHaveURL(/\/offer\/p1/);
    await expect(
      page.getByRole('heading', {level: 1, name: 'Bright loft near Montmartre'}),
    ).toBeVisible();

    // Возврат по кнопке «назад»: offer-back.
    await page.goBack();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', {name: '4 places to stay in Paris'})).toBeVisible();

    const afterOffer = await page.evaluate(() => window.__vtCalls ?? []);
    expect(afterOffer.some((types) => types.includes('offer-forward'))).toBe(true);
    expect(afterOffer.some((types) => types.includes('offer-back'))).toBe(true);

    // Ввод в поиск не анимируется - и делается ПОСЛЕДНИМ, чтобы переходы
    // наблюдались без помех от дебаунса: срочное обновление не запускает
    // браузерный ViewTransition, длина списка вызовов не меняется.
    const baseline = (await page.evaluate(() => window.__vtCalls ?? [])).length;
    await page.getByPlaceholder('Search by title').fill('loft');
    await page.waitForTimeout(SEARCH_DELAY_MS + 200);
    expect(await page.evaluate(() => window.__vtCalls ?? [])).toHaveLength(baseline);
    await expect(page).toHaveURL('/?q=loft');
  });

  test('prefers-reduced-motion keeps the navigation working', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/');

    await page.getByRole('button', {name: 'Amsterdam'}).click();
    await expect(page.getByRole('heading', {name: '4 places to stay in Amsterdam'})).toBeVisible();

    await page.getByRole('link', {name: 'Beautiful & luxurious apartment at great location'}).click();
    await expect(page.getByRole('heading', {level: 1, name: 'Beautiful & luxurious apartment at great location'})).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', {name: '4 places to stay in Amsterdam'})).toBeVisible();
  });

  test('hovering a card highlights it (place-card--active)', async ({page}) => {
    await page.goto('/');

    const firstCard = page.locator('.places-grid .place-card').first();
    await firstCard.hover();
    await expect(firstCard).toHaveClass(/place-card--active/);
  });
});

// ---------- @kt2-map-mock: локальная заглушка JS API Яндекс Карт ----------
//
// Сборка embed-ит фиктивный ключ, но запрос к api-maps.yandex.ru/v3 никогда
// не уходит в сеть: он перехватывается и обслуживается заглушкой, которая
// реализует нужный хуку H5 поднабор API и пишет журнал событий в
// window.__kt2MapLog. Маркерные DOM-элементы заглушка вешает в контейнер
// карты - подсветку активного видно прямо в DOM.

interface Kt2MapEvent {
  type: string;
  offerId?: string | null;
  active?: boolean;
  center?: number[];
  zoom?: number;
}

const MAP_STUB_SCRIPT = `
(function () {
  const log = [];
  Object.defineProperty(window, '__kt2MapLog', {value: log});

  class FakeLayer {
    constructor() { this.children = []; }
    addChild(child) { this.children.push(child); }
    removeChild(child) { this.children = this.children.filter((item) => item !== child); }
  }

  class FakeMarker {
    constructor(props, element) {
      this.props = props;
      this.element = element;
      log.push({
        type: 'marker',
        offerId: element ? element.getAttribute('data-offer-id') : null,
        active: Boolean(element && element.classList.contains('marker--active')),
        coordinates: props.coordinates,
      });
    }
  }

  class FakeMap {
    constructor(container, props) {
      this.container = container;
      this.children = [];
      log.push({type: 'create', center: props.location.center, zoom: props.location.zoom});
    }
    update(props) { log.push({type: 'update', center: props.location.center, zoom: props.location.zoom}); }
    addChild(child) {
      this.children.push(child);
      if (child && child.element) { this.container.appendChild(child.element); }
    }
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
      if (child && child.element) { child.element.remove(); }
    }
    destroy() { log.push({type: 'destroy'}); }
  }

  window.ymaps3 = {
    ready: Promise.resolve(),
    YMap: FakeMap,
    YMapDefaultSchemeLayer: FakeLayer,
    YMapDefaultFeaturesLayer: FakeLayer,
    YMapMarker: FakeMarker,
  };
})();
`;

async function readMapLog(page: Page): Promise<Kt2MapEvent[]> {
  return page.evaluate(() =>
    (window.__kt2MapLog ?? []).map((event) => JSON.parse(JSON.stringify(event)) as Kt2MapEvent),
  );
}

async function mapEventsByType(page: Page, type: string): Promise<Kt2MapEvent[]> {
  const log = await readMapLog(page);
  return log.filter((event) => event.type === type);
}

// Идентичность маркеров: стабильное число узлов не доказывает, что это те
// же узлы. Метим текущие DOM-элементы и сверяем метки после поиска.
function tagMapMarkerNodes(): void {
  document
    .querySelectorAll('.places-layout__map .marker')
    .forEach((element, index) => {
      (element as HTMLElement & {__kt2MarkerTag?: number}).__kt2MarkerTag = index;
    });
}

function readMapMarkerTags(): (number | undefined)[] {
  return Array.from(document.querySelectorAll('.places-layout__map .marker')).map(
    (element) => (element as HTMLElement & {__kt2MarkerTag?: number}).__kt2MarkerTag,
  );
}

test.describe('KT2 @kt2-map-mock', () => {
  test.beforeEach(async ({page}) => {
    // Перехват ДО открытия страницы: фиктивный ключ не покидает localhost.
    await page.route(API_URL_PATTERN, (route) =>
      route.fulfill({contentType: 'application/javascript', body: MAP_STUB_SCRIPT}),
    );
  });

  test('desktop map is created once; hover highlights the marker; search does not touch the map', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await page.goto('/');

    await expect(page.locator('.places-layout__map .map')).toBeVisible();
    await expect(page.locator('.places-layout__map .marker')).toHaveCount(4);

    const creates = await mapEventsByType(page, 'create');
    expect(creates).toHaveLength(1);
    expect(creates[0]?.center).toEqual([2.35222, 48.85661]);
    expect(creates[0]?.zoom).toBe(10);

    // Наведение на карточку перекрашивает только маркер.
    await page.locator('.places-grid .place-card').first().hover();
    await expect(page.locator('.marker--active')).toHaveCount(1);
    await expect(page.locator('.marker--active')).toHaveAttribute('data-offer-id', 'p1');
    expect(await mapEventsByType(page, 'update')).toHaveLength(0);
    expect(await mapEventsByType(page, 'create')).toHaveLength(1);

    // Стабильное число маркеров ещё не доказывает стабильность экземпляров:
    // метим текущие DOM-узлы, чтобы после поиска сверить те же самые узлы.
    await page.evaluate(tagMapMarkerNodes);

    // Ввод и применение поиска не трогают карту: маркеры всех предложений
    // города остаются прежними узлами, никаких update/create.
    await page.getByPlaceholder('Search by title').fill('loft');
    await page.waitForTimeout(SEARCH_DELAY_MS + 200);
    await expect(page.getByRole('heading', {name: '1 places to stay in Paris'})).toBeVisible();
    await expect(page.locator('.places-layout__map .marker')).toHaveCount(4);

    const markerTags = await page.evaluate(readMapMarkerTags);
    expect(markerTags, 'marker nodes survive the search unchanged').toEqual([0, 1, 2, 3]);

    expect(await mapEventsByType(page, 'update')).toHaveLength(0);
    expect(await mapEventsByType(page, 'create')).toHaveLength(1);
  });

  test('city change moves center and markers without recreating the map', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await page.goto('/');

    await expect(page.locator('.places-layout__map .marker')).toHaveCount(4);

    await page.getByRole('button', {name: 'Cologne'}).click();
    await expect(page.getByRole('heading', {name: '4 places to stay in Cologne'})).toBeVisible();

    // Число маркеров совпадает (4 и 4), поэтому ждём сам пересбор:
    // пассивные эффекты карты едут в хвосте коммита анимированной
    // смены города (React ждёт кадры-блокеры свежих картинок карточек),
    // мгновенное чтение журнала ловило бы ещё Париж.
    await expect
      .poll(async () => page.locator('.places-layout__map .marker[data-offer-id="c1"]').count())
      .toBe(1);
    await expect(page.locator('.places-layout__map .marker[data-offer-id="c4"]')).toHaveCount(1);

    // Центр и маркеры обновились, но число созданий/уничтожений карты не
    // изменилось: карта - стабильный сосед анимируемой области (M3).
    await expect
      .poll(async () => (await mapEventsByType(page, 'update')).length)
      .toBe(1);
    const updates = await mapEventsByType(page, 'update');
    expect(updates[0]?.center).toEqual([6.959811, 50.938361]);
    expect(await mapEventsByType(page, 'create')).toHaveLength(1);
    expect(await mapEventsByType(page, 'destroy')).toHaveLength(0);
  });

  test('phone: List mounts no map at all; resize to 768 mounts both; reopen keeps one script load', async ({page}) => {
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('api-maps.yandex.ru')) {
        apiRequests.push(request.url());
      }
    });

    // Холодное открытие на 767: ещё телефон, List по умолчанию - карта не
    // смонтирована (не спрятана): ни узла, ни запроса, ни экземпляра.
    await page.setViewportSize({width: 767, height: 800});
    await page.goto('/');

    await expect(page.locator('.places-layout__map')).toHaveCount(0);
    await expect(page.locator('.view-switch')).toBeVisible();
    await expect(page.locator('.places-grid')).toBeVisible();
    expect(apiRequests).toEqual([]);
    expect(await readMapLog(page)).toEqual([]);

    // 768 в том же документе, без перезагрузки: переключателя нет в DOM,
    // видны и список, и карта; ровно один запрос к заглушке и один
    // экземпляр карты.
    await page.setViewportSize({width: 768, height: 800});
    await expect(page.locator('.view-switch')).toHaveCount(0, {timeout: MEDIA_FLIP_TIMEOUT_MS});
    await expect(page.locator('.places-grid')).toBeVisible();
    await expect(page.locator('.places-layout__map .marker')).toHaveCount(4, {timeout: MEDIA_FLIP_TIMEOUT_MS});
    expect(apiRequests).toHaveLength(1);
    expect(await mapEventsByType(page, 'create')).toHaveLength(1);

    // Обратно на телефон: карта уничтожена, переключатель вернулся.
    await page.setViewportSize({width: 320, height: 800});
    await expect(page.locator('.places-layout__map')).toHaveCount(0, {timeout: MEDIA_FLIP_TIMEOUT_MS});
    await expect(page.locator('.view-switch')).toBeVisible();
    expect(await mapEventsByType(page, 'destroy')).toHaveLength(1);

    // Map: скрипт запрошен один раз, карта создана.
    await page.locator('label[for="view-map"]').click();
    await expect(page.locator('.places-layout__map .marker')).toHaveCount(4);
    expect(apiRequests).toHaveLength(1);
    expect(await mapEventsByType(page, 'create')).toHaveLength(2);

    // Обратно в List: карта уничтожена.
    await page.locator('label[for="view-list"]').click();
    await expect(page.locator('.places-layout__map')).toHaveCount(0);
    expect(await mapEventsByType(page, 'destroy')).toHaveLength(2);

    // Повторное открытие: новый экземпляр, но без второго запроса скрипта -
    // загрузчик кэширует промис на всё приложение.
    await page.locator('label[for="view-map"]').click();
    await expect(page.locator('.places-layout__map .marker')).toHaveCount(4);
    expect(apiRequests).toHaveLength(1);
    expect(await mapEventsByType(page, 'create')).toHaveLength(3);
    expect(await mapEventsByType(page, 'destroy')).toHaveLength(2);
  });

  test('offer page /offer/c1: three neighbor cards, four markers, only c1 active', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await page.goto('/offer/c1');

    // Три соседних карточки (PROJECT.md, 4.4) и четыре маркера на карте:
    // соседи синие, текущее предложение - оранжевое.
    await expect(page.locator('.near-places .place-card')).toHaveCount(3);
    await expect(page.locator('.offer__map .marker')).toHaveCount(4);
    await expect(page.locator('.offer__map .marker--active')).toHaveCount(1);
    await expect(page.locator('.offer__map .marker--active')).toHaveAttribute('data-offer-id', 'c1');

    // Наведение на соседнюю карточку подсветку не меняет (ТЗ: перекраска
    // маркера по наведению - только на главной), и карту не трогает.
    await page.locator('.near-places .place-card').first().hover();
    await expect(page.locator('.offer__map .marker--active')).toHaveCount(1);
    await expect(page.locator('.offer__map .marker--active')).toHaveAttribute('data-offer-id', 'c1');
    expect(await mapEventsByType(page, 'create')).toHaveLength(1);
    expect(await mapEventsByType(page, 'update')).toHaveLength(0);
  });

  test('a failed script shows the error message instead of the map', async ({page}) => {
    await page.route(API_URL_PATTERN, (route) =>
      route.fulfill({status: 500, contentType: 'text/plain', body: 'stub is down'}),
    );

    await page.setViewportSize({width: 1280, height: 800});
    await page.goto('/');

    await expect(page.locator('.map__fallback')).toContainText('The map failed to load');
    expect(await mapEventsByType(page, 'create')).toHaveLength(0);

    // Приложение живёт: список, поиск и сортировка работают.
    await selectSort(page, 'Price: low to high');
    await expect(page.locator('#sort-current', {hasText: 'Price: low to high'})).toBeVisible();
  });
});

// ---------- @demo: черновик отзыва синхронизируется между вкладками (H6) ----------
//
// Сборка VITE_SIX_CITIES_MOCK_AUTH=1 (карта без ключа). Настоящее
// перекрёстное событие storage между двумя вкладками одного контекста:
// правки первой видны во второй, перезагрузка восстанавливает черновик,
// отправка в первой очищает поля второй и не создаёт ключ обратно.

test.describe('KT2 @demo', () => {
  test('two tabs: the draft syncs live, survives a reload, and clears after submit', async ({browser}) => {
    const draftKey = 'sc-charlie-draft-1';
    const typedText = 'A quiet cozy place with everything we needed for a quiet weekend.';
    const context = await browser.newContext();
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    try {
      await tabA.goto('/offer/1');
      await tabB.goto('/offer/1');

      // Первая вкладка: оценка и текст черновика.
      await tabA.getByRole('radio', {name: 'perfect'}).check();
      await tabA.getByLabel('Review text').fill(typedText);

      // Вторая подхватывает черновик событием storage (H6).
      await expect(tabB.getByRole('radio', {name: 'perfect'})).toBeChecked();
      await expect(tabB.getByLabel('Review text')).toHaveValue(typedText);

      // Перезагрузка второй: черновик восстановлен из localStorage.
      await tabB.reload();
      await expect(tabB.getByRole('radio', {name: 'perfect'})).toBeChecked();
      await expect(tabB.getByLabel('Review text')).toHaveValue(typedText);

      // Успешная отправка в первой удаляет черновик (заглушка этапа 4).
      await tabA.getByRole('button', {name: 'Submit'}).click();
      await expect(tabA.getByRole('status')).toHaveText('Your review has been posted.');

      // Вторая очищается по storage, ключ не создаётся обратно.
      await expect(tabB.getByRole('radio', {name: 'perfect'})).not.toBeChecked();
      await expect(tabB.getByLabel('Review text')).toHaveValue('');
      expect(await tabB.evaluate((key) => window.localStorage.getItem(key), draftKey)).toBeNull();
    } finally {
      await context.close();
    }
  });
});

declare global {
  interface Window {
    __vtCalls?: string[][];
    __kt2MapLog?: Record<string, unknown>[];
  }
}
