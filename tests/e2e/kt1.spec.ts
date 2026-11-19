import {mkdirSync} from 'node:fs';
import {expect, test, type Page, type ViewportSize} from '@playwright/test';

// Браузерные проверки КТ1 (этапы 1-3). Две серии на одном production-сервере
// (127.0.0.1:3100, конфиг его не поднимает):
//   - @guest: штатная сборка (`env -u SIX_CITIES_MOCK_AUTH npm run build`);
//   - @demo:  сборка и запуск с SIX_CITIES_MOCK_AUTH=1.
// В каждой серии прогоняются применимые страницы на ширинах 320, 375, 768,
// 1024, 1280 и 1440: нет горизонтального скролла, нет битых картинок, нет
// ошибок в консоли. Контрольные скриншоты (375/768/1440) пишутся в
// test-results/screenshots/<серия>/ для визуальной сверки с docs/markup.

const WIDTHS: readonly number[] = [320, 375, 768, 1024, 1280, 1440];
const CONTROL_WIDTHS: readonly number[] = [375, 768, 1440];
const SCREENSHOT_DIR = 'test-results/screenshots';

// Данные моков, ожидаемые на страницах (дублируются здесь осознанно:
// e2e проверяет то, что реально видит пользователь).
const OFFERS = [
  {id: '1', title: 'Beautiful & luxurious apartment at great location', price: '€120'},
  {id: '2', title: 'Wood and stone place', price: '€80'},
  {id: '3', title: 'Canal View Prinsengracht', price: '€132'},
  {id: '4', title: 'Nice, cozy, warm big bed apartment', price: '€180'},
];

const CITY_TABS = ['Paris', 'Cologne', 'Brussels', 'Amsterdam', 'Hamburg', 'Dusseldorf'];

declare global {
  interface Window {
    __kt1NoReload?: number;
  }
}

interface ScreenPath {
  name: string;
  path: string;
  title: string;
  status?: number;
}

const GUEST_SCREENS: readonly ScreenPath[] = [
  {name: 'main', path: '/', title: 'Six Cities - Amsterdam'},
  {name: 'login', path: '/login', title: 'Six Cities - Login'},
  {name: 'offer', path: '/offer/1', title: 'Six Cities - Beautiful & luxurious apartment at great location'},
  {name: 'offer-2', path: '/offer/2', title: 'Six Cities - Wood and stone place'},
  {name: 'offer-3', path: '/offer/3', title: 'Six Cities - Canal View Prinsengracht'},
  {name: 'offer-4', path: '/offer/4', title: 'Six Cities - Nice, cozy, warm big bed apartment'},
  {name: 'not-found', path: '/offer/missing', title: 'Six Cities - 404', status: 404},
];

const DEMO_SCREENS: readonly ScreenPath[] = [
  {name: 'main', path: '/', title: 'Six Cities - Amsterdam'},
  {name: 'offer', path: '/offer/1', title: 'Six Cities - Beautiful & luxurious apartment at great location'},
  {name: 'favorites', path: '/favorites', title: 'Six Cities - Favorites (2)'},
];

async function checkScreenAtAllWidths(
  page: Page,
  screen: ScreenPath,
  series: string,
  withScreenshots: boolean,
) {
  for (const width of WIDTHS) {
    const consoleErrors: string[] = [];

    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      consoleErrors.push(String(error));
    });

    const viewport: ViewportSize = {width, height: 800};
    await page.setViewportSize(viewport);
    const response = await page.goto(screen.path, {waitUntil: 'networkidle'});

    expect(response?.status(), `HTTP status of ${screen.path} at ${String(width)}px`).toBe(
      screen.status ?? 200,
    );
    await expect(page).toHaveTitle(screen.title, {timeout: 10_000});

    const horizontalOverflow = await page.evaluate(() => {
      const scrollingElement = document.scrollingElement ?? document.documentElement;
      return scrollingElement.scrollWidth - scrollingElement.clientWidth;
    });
    expect(horizontalOverflow, `horizontal scroll on ${screen.path} at ${String(width)}px`).toBeLessThanOrEqual(0);

    const brokenImages = await page.evaluate(() =>
      Array.from(document.images)
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.getAttribute('src')),
    );
    expect(brokenImages, `broken images on ${screen.path} at ${String(width)}px`).toEqual([]);

    // Chromium сам пишет в консоль ошибку загрузки документа со статусом 4xx
    // (например, для экрана 404) - это ожидаемо, игнорируем только её.
    const expectedStatus = screen.status ?? 200;
    const unexpectedConsoleErrors = consoleErrors.filter(
      (message) => !(expectedStatus >= 400 && message.includes(`a status of ${String(expectedStatus)}`)),
    );
    expect(unexpectedConsoleErrors, `console errors on ${screen.path} at ${String(width)}px`).toEqual([]);

    if (withScreenshots && CONTROL_WIDTHS.includes(width)) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${series}/${screen.name}-${String(width)}.png`,
        fullPage: true,
      });
    }
  }
}

test.describe('KT1 @guest', () => {
  test.beforeAll(() => {
    mkdirSync(`${SCREENSHOT_DIR}/guest`, {recursive: true});
  });

  test('main page: title, four cards, six city tabs, places count', async ({page}) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Six Cities - Amsterdam');
    await expect(page.getByRole('heading', {name: '4 places to stay in Amsterdam'})).toBeVisible();
    await expect(page.locator('.places-grid .place-card')).toHaveCount(4);

    const tabs = page.locator('.cities__link');
    await expect(tabs).toHaveCount(6);
    for (const [index, cityName] of CITY_TABS.entries()) {
      await expect(tabs.nth(index)).toHaveText(cityName);
    }
    await expect(page.locator('.cities__link--active')).toHaveText('Amsterdam');
  });

  test('main page: list/map switch stays visible only on phone width', async ({page}) => {
    await page.setViewportSize({width: 375, height: 800});
    await page.goto('/');
    await expect(page.locator('.view-switch')).toBeVisible();

    await page.setViewportSize({width: 768, height: 800});
    await expect(page.locator('.view-switch')).toBeHidden();
  });

  test('card title, logo and header links navigate to expected routes', async ({page}) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.__kt1NoReload = 1;
    });

    // Карточка -> страница предложения, без перезагрузки документа.
    await page.getByRole('link', {name: OFFERS[0].title}).click();
    await expect(page).toHaveURL('/offer/1');
    await expect(page).toHaveTitle(`Six Cities - ${OFFERS[0].title}`);
    await expect(page.getByRole('heading', {level: 1, name: OFFERS[0].title})).toBeVisible();
    expect(await page.evaluate(() => window.__kt1NoReload)).toBe(1);

    // Логотип -> главная, тоже без перезагрузки.
    await page.getByRole('link', {name: 'Шесть городов - на главную'}).first().click();
    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle('Six Cities - Amsterdam');
    expect(await page.evaluate(() => window.__kt1NoReload)).toBe(1);
  });

  test('header sign-in link opens the login page', async ({page}) => {
    await page.goto('/');
    await page.getByRole('link', {name: 'Sign in'}).click();

    await expect(page).toHaveURL('/login');
    await expect(page).toHaveTitle('Six Cities - Login');
  });

  test('login page: mock form with email and password fields', async ({page}) => {
    const response = await page.goto('/login');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Six Cities - Login');
    await expect(page.getByRole('heading', {name: 'Sign in'})).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.getByText('does not sign you in yet')).toBeVisible();

    const cityLink = page.getByRole('link', {name: 'Explore Amsterdam'});
    await expect(cityLink).toHaveAttribute('href', '/');
  });

  test('offer pages: each mock id renders its own offer', async ({page}) => {
    for (const offer of OFFERS) {
      const response = await page.goto(`/offer/${offer.id}`);

      expect(response?.status(), `HTTP status of /offer/${offer.id}`).toBe(200);
      await expect(page).toHaveTitle(`Six Cities - ${offer.title}`);
      await expect(page.getByRole('heading', {level: 1, name: offer.title})).toBeVisible();
      await expect(page.getByText(`${offer.price} / night`).first()).toBeVisible();
    }
  });

  test('offer page: guest sees the sign-in invite for reviews', async ({page}) => {
    await page.goto('/offer/1');

    // Sign in есть и в шапке - проверяем именно приглашение у отзывов.
    const signInInvite = page.locator('.reviews__login').getByRole('link', {name: 'Sign in'});
    await expect(signInInvite).toHaveAttribute('href', '/login');
    await expect(page.getByText('to leave a review')).toBeVisible();
  });

  test('offer page: nearby offers reuse the card component', async ({page}) => {
    await page.goto('/offer/1');

    const nearbyCards = page.locator('.near-places .place-card');
    await expect(nearbyCards).toHaveCount(3);
    for (const offer of OFFERS.slice(1)) {
      await expect(page.locator('.near-places').getByRole('link', {name: offer.title})).toHaveAttribute(
        'href',
        `/offer/${offer.id}`,
      );
    }
  });

  test('guest /favorites: server-side 307 to /login without list markup', async ({request}) => {
    const response = await request.get('/favorites', {maxRedirects: 0});

    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe('/login');
    const body = await response.text();
    expect(body).not.toContain('Saved listing');
    expect(body).not.toContain('place-card');
  });

  test('guest /favorites in the browser: lands on /login', async ({page}) => {
    await page.goto('/favorites');

    await expect(page).toHaveURL('/login');
    await expect(page).toHaveTitle('Six Cities - Login');
  });

  test('unknown offer id, bare /offer and unknown path all return 404', async ({request}) => {
    for (const path of ['/offer/missing', '/offer', '/offer/', '/missing/path']) {
      const response = await request.get(path);

      expect(response.status(), `HTTP status of ${path}`).toBe(404);
    }
  });

  test('404 screen shows the markup and the tab title', async ({page}) => {
    const response = await page.goto('/offer/missing');

    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle('Six Cities - 404');
    await expect(page.getByRole('heading', {name: '404 Not Found'})).toBeVisible();
    await expect(page.getByText('We could not find this page.')).toBeVisible();
  });

  test('404 back link returns to the main page', async ({page}) => {
    await page.goto('/missing/path');
    await page.getByRole('link', {name: 'Back to main page'}).click();

    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle('Six Cities - Amsterdam');
  });

  test('every guest screen is adaptive from 320px with no overflow or broken images', async ({page}) => {
    test.setTimeout(180_000);

    for (const screen of GUEST_SCREENS) {
      await checkScreenAtAllWidths(page, screen, 'guest', true);
    }
  });
});

test.describe('KT1 @demo', () => {
  test.beforeAll(() => {
    mkdirSync(`${SCREENSHOT_DIR}/demo`, {recursive: true});
  });

  test('demo /favorites: 200, grouped list, title count matches cards', async ({page}) => {
    const response = await page.goto('/favorites');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Six Cities - Favorites (2)');
    await expect(page.getByRole('heading', {name: 'Saved listing'})).toBeVisible();

    const cards = page.locator('.place-card');
    await expect(cards).toHaveCount(2);

    const favoriteCountMatch = /Favorites \((\d+)\)/.exec(await page.title());
    expect(favoriteCountMatch?.[1]).toBe(String(await cards.count()));

    await expect(page.locator('.favorites__city-title')).toHaveCount(1);
    await expect(page.getByRole('heading', {level: 2, name: 'Amsterdam'})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Wood and stone place'})).toHaveAttribute('href', '/offer/2');
    await expect(page.getByRole('link', {name: 'Nice, cozy, warm big bed apartment'})).toHaveAttribute(
      'href',
      '/offer/4',
    );
  });

  test('demo /favorites cards open their offer pages', async ({page}) => {
    await page.goto('/favorites');
    await page.getByRole('link', {name: 'Wood and stone place'}).click();

    await expect(page).toHaveURL('/offer/2');
    await expect(page).toHaveTitle('Six Cities - Wood and stone place');
  });

  test('demo /login: server-side 307 to /', async ({request}) => {
    const response = await request.get('/login', {maxRedirects: 0});

    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe('/');
  });

  test('demo /login in the browser: lands on the main page', async ({page}) => {
    await page.goto('/login');

    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle('Six Cities - Amsterdam');
  });

  test('demo header: email, favorites count, no sign-in link', async ({page}) => {
    await page.goto('/');

    await expect(page.getByText('oliver.conner@gmail.com')).toBeVisible();
    await expect(page.locator('.user-nav__count')).toHaveText('2');
    await expect(page.getByRole('link', {name: 'Sign in'})).toHaveCount(0);
  });

  test('demo offer page: no review form invite', async ({page}) => {
    await page.goto('/offer/1');

    await expect(page.getByText('to leave a review')).toHaveCount(0);
  });

  test('every demo screen is adaptive from 320px with no overflow or broken images', async ({page}) => {
    test.setTimeout(120_000);

    for (const screen of DEMO_SCREENS) {
      await checkScreenAtAllWidths(page, screen, 'demo', true);
    }
  });
});
