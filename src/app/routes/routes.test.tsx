import {RouterProvider, createMemoryRouter} from 'react-router';
import {render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {getAppRoutes} from './routes';

// Тесты маршрутов (этап 3) на рабочей таблице из routes.tsx: createMemoryRouter
// с реальными моками и реальными guard-ами. Здесь проверяется именно
// интеграция - одни и те же моки обслуживают пользовательские сценарии:
//   - гостевой режим (по умолчанию): `/`, `/login`, `/offer/:id`, 404,
//     `/favorites` -> редирект на `/login` без рендера защищённого экрана;
//   - demo-режим (VITE_SIX_CITIES_MOCK_AUTH=1): `/favorites` открыт,
//     `/login` -> редирект на `/`.
// Подменённый env восстанавливается после каждого теста.

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

describe('routes: guest mode', () => {
  it('renders the main page with mock offers and the Amsterdam title', () => {
    renderRoute('/');

    expect(screen.getByRole('heading', {name: '4 places to stay in Amsterdam'})).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(document.title).toBe('Six Cities - Amsterdam');
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

  it('redirects the guest from /favorites to /login without the protected screen', () => {
    const {router} = renderRoute('/favorites');

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

  it('redirects the demo user from /login to the main page', () => {
    vi.stubEnv(DEMO_ENV_FLAG, '1');
    const {router} = renderRoute('/login');

    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('heading', {name: '4 places to stay in Amsterdam'})).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });

  it('hides the review sign-in invite for the demo user', () => {
    vi.stubEnv(DEMO_ENV_FLAG, '1');
    renderRoute('/offer/1');

    expect(screen.queryByText('to leave a review')).not.toBeInTheDocument();
  });
});
