import {mkdirSync} from 'node:fs';
import {expect, test, type Page, type ViewportSize} from '@playwright/test';

// Браузерные проверки КТ1 (этапы 1-3) для React SPA на production-сервере
// Vite (`vite preview`, 127.0.0.1:3100, конфиг его не поднимает):
//   - @guest: штатная сборка (`npm run build`);
//   - @demo:  сборка с VITE_SIX_CITIES_MOCK_AUTH=1.
// Серверных HTTP-статусов у SPA нет: приватность, редиректы и 404 проверяются
// поведением страницы - URL, содержимым и заголовком вкладки. В каждой серии
// проверяется прямое открытие вложенных адресов и их reload(): SPA fallback
// отдаёт index.html, клиентский роутер восстанавливает экран.
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
    __kt1FavoritesSeen?: number;
  }
}

interface ScreenPath {
  name: string;
  path: string;
  title: string;
}

const GUEST_SCREENS: readonly ScreenPath[] = [
  {name: 'main', path: '/', title: 'Six Cities - Amsterdam'},
  {name: 'login', path: '/login', title: 'Six Cities - Login'},
  {name: 'offer', path: '/offer/1', title: 'Six Cities - Beautiful & luxurious apartment at great location'},
  {name: 'offer-2', path: '/offer/2', title: 'Six Cities - Wood and stone place'},
  {name: 'offer-3', path: '/offer/3', title: 'Six Cities - Canal View Prinsengracht'},
  {name: 'offer-4', path: '/offer/4', title: 'Six Cities - Nice, cozy, warm big bed apartment'},
  {name: 'not-found', path: '/offer/missing', title: 'Six Cities - 404'},
];

const DEMO_SCREENS: readonly ScreenPath[] = [
  {name: 'main', path: '/', title: 'Six Cities - Amsterdam'},
  {name: 'offer', path: '/offer/1', title: 'Six Cities - Beautiful & luxurious apartment at great location'},
  {name: 'favorites', path: '/favorites', title: 'Six Cities - Favorites (2)'},
];

// Текущая вертикальная прокрутка окна - для проверок ScrollRestoration.
// Вынесена на верхний уровень, чтобы колбэки poll/evaluate не собирали
// лишнюю вложенность внутри test().
function getScrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

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
    await page.goto(screen.path, {waitUntil: 'networkidle'});

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

    // Ошибок консоли не фильтруем: «ожидаемых HTTP 404» у SPA больше нет,
    // любая ошибка - повод разбираться.
    expect(consoleErrors, `console errors on ${screen.path} at ${String(width)}px`).toEqual([]);

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
    await page.goto('/');

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
    await page.goto('/login');

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
      await page.goto(`/offer/${offer.id}`);

      await expect(page).toHaveTitle(`Six Cities - ${offer.title}`);
      await expect(page.getByRole('heading', {level: 1, name: offer.title})).toBeVisible();
      await expect(page.getByText(`${offer.price} / night`).first()).toBeVisible();
    }
  });

  test('offer page: direct open and reload restore the same screen', async ({page}) => {
    // Прямое открытие вложенного адреса: SPA fallback отдаёт index.html,
    // клиентский роутер восстанавливает страницу предложения.
    await page.goto('/offer/1');

    await expect(page).toHaveURL('/offer/1');
    await expect(page).toHaveTitle(`Six Cities - ${OFFERS[0].title}`);
    await expect(page.getByRole('heading', {level: 1, name: OFFERS[0].title})).toBeVisible();

    // Обновление страницы - тот же экран по тому же адресу.
    await page.reload();
    await expect(page).toHaveURL('/offer/1');
    await expect(page).toHaveTitle(`Six Cities - ${OFFERS[0].title}`);
    await expect(page.getByRole('heading', {level: 1, name: OFFERS[0].title})).toBeVisible();
  });

  test('nested 404 addresses: direct open and reload keep the 404 screen', async ({page}) => {
    for (const path of ['/offer/missing', '/missing/path']) {
      await page.goto(path);

      await expect(page).toHaveURL(path);
      await expect(page).toHaveTitle('Six Cities - 404');
      await expect(page.getByRole('heading', {name: '404 Not Found'})).toBeVisible();

      await page.reload();
      await expect(page).toHaveURL(path);
      await expect(page).toHaveTitle('Six Cities - 404');
      await expect(page.getByRole('heading', {name: '404 Not Found'})).toBeVisible();
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

  test('offer page: bottom nearby card opens the next offer at the top, back restores the scroll', async ({page}) => {
    // Прокрутка при SPA-переходах (ScrollRestoration): без неё после клика
    // по нижней карточке новая страница оставалась прокрученной вниз, а
    // «Назад» не возвращал исходную позицию. Маркер подтверждает, что оба
    // перехода прошли без перезагрузки документа.
    await page.setViewportSize({width: 375, height: 800});
    await page.goto('/offer/1');
    await page.evaluate(() => {
      window.__kt1NoReload = 1;
    });

    // Прокручиваем `/offer/1` к блоку соседних предложений - в самый низ.
    await page.locator('.near-places').scrollIntoViewIfNeeded();
    const savedScrollY = await page.evaluate(() => window.scrollY);
    expect(savedScrollY).toBeGreaterThan(0);

    // Переход по нижней карточке открывает новое предложение с верхней точки.
    await page.locator('.near-places').getByRole('link', {name: OFFERS[1].title}).click();
    await expect(page).toHaveURL('/offer/2');
    await expect(page).toHaveTitle(`Six Cities - ${OFFERS[1].title}`);
    await expect(page.getByRole('heading', {level: 1, name: OFFERS[1].title})).toBeInViewport();
    await expect.poll(() => getScrollY(page)).toBe(0);
    expect(await page.evaluate(() => window.__kt1NoReload)).toBe(1);

    // «Назад» возвращает исходное предложение и сохранённую позицию прокрутки:
    // страница снова стоит у блока соседних предложений, где был клик, -
    // заголовок предложения при этом законно выше видимой области.
    await page.goBack();
    await expect(page).toHaveURL('/offer/1');
    await expect(page.locator('.near-places')).toBeInViewport();
    await expect
      .poll(async () => Math.abs((await getScrollY(page)) - savedScrollY))
      .toBeLessThanOrEqual(4);
    expect(await page.evaluate(() => window.__kt1NoReload)).toBe(1);
  });

  test('guest /favorites: lands on /login without the favorites screen', async ({page}) => {
    // Фиксируем, что блок «Saved listing» ни разу не появился в DOM -
    // ни до редиректа, ни после: приватный экран не рендерится вообще.
    // Init-скрипт выполняется раньше создания documentElement: observe на
    // нём падал («parameter 1 is not of type 'Node'»), наблюдатель не
    // запускался, а `?? 0` превращал это в «успех». Подписываемся на сам
    // document - он доступен уже в init-скрипте и наблюдает всё дерево,
    // включая будущую вставку корневого <html>.
    await page.addInitScript(() => {
      const observer = new MutationObserver((records) => {
        // Вставку ловим по addedNodes записей мутаций, а не querySelector
        // в колбэке: так виден даже список, который вставили и тут же
        // удалили до срабатывания колбэка.
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (
              node instanceof Element &&
              (node.matches('.favorites') || node.querySelector('.favorites') !== null)
            ) {
              window.__kt1FavoritesSeen = 1;
              observer.disconnect();
            }
          }
        }
      });
      observer.observe(document, {childList: true, subtree: true});
      // Флаг обнуляется только после успешной подписки. Если observe
      // всё же упадёт, флаг останется undefined и проверка в конце
      // провалится громко, а не «пройдёт» из-за значения по умолчанию.
      window.__kt1FavoritesSeen = 0;
    });

    await page.goto('/favorites');

    await expect(page).toHaveURL('/login');
    await expect(page).toHaveTitle('Six Cities - Login');
    await expect(page.getByRole('heading', {name: 'Sign in'})).toBeVisible();

    expect(await page.evaluate(() => window.__kt1FavoritesSeen)).toBe(0);
    await expect(page.getByText('Saved listing')).toHaveCount(0);
    await expect(page.locator('.place-card')).toHaveCount(0);
  });

  test('unknown offer id, bare /offer, case-mismatched and unknown paths all show the 404 screen', async ({page}) => {
    // `/LOGIN` набран с другим регистром: маршруты объявлены caseSensitive,
    // поэтому такой адрес - тоже неизвестный и должен показать 404.
    for (const path of ['/offer/missing', '/offer', '/offer/', '/LOGIN', '/missing/path']) {
      await page.goto(path);

      // В SPA несуществующий адрес не меняет URL и не даёт серверного 404 -
      // проверяем экран и заголовок вкладки.
      await expect(page.getByRole('heading', {name: '404 Not Found'})).toBeVisible();
      await expect(page).toHaveTitle('Six Cities - 404');
    }
  });

  test('404 screen shows the markup and the tab title', async ({page}) => {
    await page.goto('/offer/missing');

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

  test('demo /favorites: grouped list, title count matches cards', async ({page}) => {
    await page.goto('/favorites');

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

  test('demo /favorites survives a page reload', async ({page}) => {
    await page.goto('/favorites');

    await expect(page).toHaveURL('/favorites');
    await expect(page.getByRole('heading', {name: 'Saved listing'})).toBeVisible();

    // Флаг встраивается при сборке, поэтому после перезагрузки demo-режим
    // сохраняется: страница по-прежнему открыта и заполнена.
    await page.reload();
    await expect(page).toHaveURL('/favorites');
    await expect(page).toHaveTitle('Six Cities - Favorites (2)');
    await expect(page.getByRole('heading', {name: 'Saved listing'})).toBeVisible();
    await expect(page.locator('.place-card')).toHaveCount(2);
  });

  test('demo /favorites cards open their offer pages', async ({page}) => {
    await page.goto('/favorites');
    await page.getByRole('link', {name: 'Wood and stone place'}).click();

    await expect(page).toHaveURL('/offer/2');
    await expect(page).toHaveTitle('Six Cities - Wood and stone place');
  });

  test('demo /login: the guard lands the user on the main page', async ({page}) => {
    // Серверного 307 у SPA нет: проверяем поведение в браузере.
    await page.goto('/login');

    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle('Six Cities - Amsterdam');
    await expect(page.getByRole('heading', {name: '4 places to stay in Amsterdam'})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Sign in'})).toHaveCount(0);
  });

  test('demo offer page: direct open and reload work, unknown id still 404', async ({page}) => {
    await page.goto('/offer/1');

    await expect(page).toHaveTitle(`Six Cities - ${OFFERS[0].title}`);
    await expect(page.getByRole('heading', {level: 1, name: OFFERS[0].title})).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL('/offer/1');
    await expect(page).toHaveTitle(`Six Cities - ${OFFERS[0].title}`);
    await expect(page.getByRole('heading', {level: 1, name: OFFERS[0].title})).toBeVisible();

    await page.goto('/offer/999');
    await expect(page).toHaveURL('/offer/999');
    await expect(page.getByRole('heading', {name: '404 Not Found'})).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL('/offer/999');
    await expect(page.getByRole('heading', {name: '404 Not Found'})).toBeVisible();
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
