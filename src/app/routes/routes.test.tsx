import {RouterProvider, createMemoryRouter} from 'react-router';
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getAppRoutes} from './routes';
import {appStore, changeCity, DEFAULT_CITY_NAME} from '@/app/store';

// Тесты маршрутов (этапы 3-6) на рабочей таблице из routes.tsx:
// createMemoryRouter с реальными моками, реальными guard-ами и настоящим
// хранилищем Redux (город по умолчанию Paris, смена города кликом по
// вкладке). Здесь проверяется именно интеграция:
//   - гостевой режим (по умолчанию): `/`, `/login`, `/offer/:id`, 404,
//     `/favorites` -> редирект на `/login` без рендера защищённого экрана;
//   - demo-режим (VITE_SIX_CITIES_MOCK_AUTH=1): `/favorites` открыт,
//     `/login` -> редирект на `/`.
// Подменённый env восстанавливается после каждого теста. Хранилище -
// синглтон: состояние города течёт между тестами одного файла, поэтому
// сценарии с городом начинают с явного клика по своей вкладке.

const DEMO_ENV_FLAG = 'VITE_SIX_CITIES_MOCK_AUTH';

interface RenderRouteResult {
  router: ReturnType<typeof createMemoryRouter>;
}

function renderRoute(path: string): RenderRouteResult {
  const router = createMemoryRouter(getAppRoutes(), {initialEntries: [path]});
  render(<RouterProvider router={router} />);

  return {router};
}

afterEach(() => {
  vi.unstubAllEnvs();
});

// Хранилище - синглтон: город, выбранный в одном тесте, течёт в следующий.
// Каждый тест начинает с города по умолчанию, чтобы ожидания не зависели
// от порядка сценариев.
beforeEach(() => {
  appStore.dispatch(changeCity(DEFAULT_CITY_NAME));
});

describe('routes: guest mode', () => {
  it('renders the main page with Paris by default (ТЗ, раздел 3.1)', () => {
    renderRoute('/');

    expect(screen.getByRole('heading', {name: '4 places to stay in Paris'})).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(document.title).toBe('Six Cities - Paris');
    expect(screen.getByText('Paris', {selector: '.cities__link--active'})).toBeInTheDocument();
  });

  it('switches the city through Redux: Amsterdam shows its own four offers', async () => {
    renderRoute('/');

    await userEvent.click(screen.getByRole('button', {name: 'Amsterdam'}));

    expect(screen.getByRole('heading', {name: '4 places to stay in Amsterdam'})).toBeInTheDocument();
    expect(screen.getByText('Amsterdam', {selector: '.cities__link--active'})).toBeInTheDocument();
    expect(document.title).toBe('Six Cities - Amsterdam');
    expect(
      screen.getByRole('link', {name: 'Beautiful & luxurious apartment at great location'}),
    ).toBeInTheDocument();
  });

  it('renders the login page for the guest', () => {
    renderRoute('/login');

    expect(screen.getByRole('heading', {name: 'Sign in'})).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(document.title).toBe('Six Cities - Login');
  });

  it('renders the offer page by id and changes document.title', () => {
    renderRoute('/offer/1');

    expect(
      screen.getByRole('heading', {level: 1, name: 'Beautiful & luxurious apartment at great location'}),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Reviews · 4'})).toBeInTheDocument();
    expect(document.title).toBe('Six Cities - Beautiful & luxurious apartment at great location');
  });

  it('shows three nearby offer cards that link to their offers', () => {
    renderRoute('/offer/1');

    const nearbyOffers = [
      {id: '2', title: 'Wood and stone place'},
      {id: '3', title: 'Canal View Prinsengracht'},
      {id: '4', title: 'Nice, cozy, warm big bed apartment'},
    ];

    for (const nearbyOffer of nearbyOffers) {
      expect(screen.getByRole('link', {name: nearbyOffer.title})).toHaveAttribute(
        'href',
        `/offer/${nearbyOffer.id}`,
      );
    }
  });

  it('keeps the URL and renders 404 for an unknown offer id', () => {
    const {router} = renderRoute('/offer/missing');

    expect(screen.getByRole('heading', {name: /404\s*Not Found/i})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Back to main page'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/offer/missing');
    expect(document.title).toBe('Six Cities - 404');
  });

  it('renders 404 for an unknown path', () => {
    const {router} = renderRoute('/missing/path');

    expect(screen.getByRole('heading', {name: /404\s*Not Found/i})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/missing/path');
  });

  it('renders 404 for a case-mismatched address like /LOGIN', () => {
    // Маршруты объявлены caseSensitive: набранный с другим регистром адрес
    // не совпадает с `/login` и, как прочие неизвестные, попадает на 404.
    const {router} = renderRoute('/LOGIN');

    expect(screen.getByRole('heading', {name: /404\s*Not Found/i})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/LOGIN');
    expect(document.title).toBe('Six Cities - 404');
  });

  it('redirects the guest from /favorites to /login without the protected screen', async () => {
    const {router} = renderRoute('/favorites');

    // Редирект подменяет экран с переходной задержкой в одну задачу
    // (см. useAnimatedOutlet): промываем её перед проверками DOM.
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    });

    expect(router.state.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', {name: 'Sign in'})).toBeInTheDocument();
    // Защищённый экран не появился ни до, ни после редиректа.
    expect(screen.queryByText('Saved listing')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
});

describe('routes: demo mode (VITE_SIX_CITIES_MOCK_AUTH=1)', () => {
  it('renders /favorites with the grouped mock list', () => {
    vi.stubEnv(DEMO_ENV_FLAG, '1');
    renderRoute('/favorites');

    expect(screen.getByRole('heading', {level: 1, name: 'Saved listing'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Amsterdam'})).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(document.title).toBe('Six Cities - Favorites (2)');
  });

  it('redirects the demo user from /login to the main page', async () => {
    vi.stubEnv(DEMO_ENV_FLAG, '1');
    const {router} = renderRoute('/login');

    // Аналогично: экран после редиректа рисуется задачей анимации.
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    });

    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('heading', {name: '4 places to stay in Paris'})).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });

  it('hides the review sign-in invite for the demo user', () => {
    vi.stubEnv(DEMO_ENV_FLAG, '1');
    renderRoute('/offer/1');

    expect(screen.queryByText('to leave a review')).not.toBeInTheDocument();
  });
});
