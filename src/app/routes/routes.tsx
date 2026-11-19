import {Navigate, useParams} from 'react-router';
import type {ReactNode} from 'react';
import type {RouteObject} from 'react-router';
import {FavoritesPage} from '@/pages/favorites';
import {LoginPage} from '@/pages/login';
import {MainPage} from '@/pages/main';
import {NotFoundPage} from '@/pages/not-found';
import {OfferPage} from '@/pages/offer';
import {AppLayout} from '@/app/ui/app-layout';
import {getAuthInfo} from '@/mocks/auth';
import {
  ACTIVE_CITY_NAME,
  CITY_NAMES,
  getFavoriteOffers,
  getNearbyOffers,
  getOfferById,
  getOffers,
} from '@/mocks/offers';
import {getReviewsByOfferId} from '@/mocks/reviews';

// Маршруты приложения (React Router 8, Data Mode): `/`, `/login`,
// `/favorites`, `/offer/:id` и `*` -> 404. Именованные маршруты объявлены
// caseSensitive: регистр адреса имеет значение, `/LOGIN` или `/OFFER/1`
// не совпадают с маршрутами и попадают на экран 404, как прочие неизвестные
// адреса. Слой app подключает моки КТ1 и передаёт данные страницам через
// props; сами страницы про источники данных не знают. Серверных
// HTTP-статусов в SPA нет: приватность и 404 проверяются поведением -
// редиректом или экраном 404 без смены адреса.

const LOGIN_PATH = '/login';
const MAIN_PATH = '/';

// Приватный маршрут: гостю вместо дерева избранного возвращается редирект
// на `/login` (replace - без записи в истории), список не рендерится.
function PrivateRoute({children}: {children: ReactNode}) {
  const auth = getAuthInfo();

  return auth ? children : <Navigate to={LOGIN_PATH} replace />;
}

// Обратный guard: авторизованному `/login` не показывается - его возвращает
// на главную вместо формы входа.
function GuestRoute({children}: {children: ReactNode}) {
  const auth = getAuthInfo();

  return auth ? <Navigate to={MAIN_PATH} replace /> : children;
}

// Адаптер страницы предложения: читает `:id` из адреса, находит мок и
// передаёт его вместе с отзывами, соседями и статусом авторизации.
// Неизвестный ID рендерит тот же экран 404, что и маршрут `*`, - URL при
// этом не меняется.
function OfferRoute() {
  const {id} = useParams();
  const offer = id !== undefined ? getOfferById(id) : undefined;

  if (!offer) {
    return <NotFoundPage />;
  }

  return (
    <OfferPage
      offer={offer}
      reviews={getReviewsByOfferId(offer.id)}
      nearbyOffers={getNearbyOffers(offer.id)}
      isAuthorized={getAuthInfo() !== null}
    />
  );
}

// Рабочая таблица маршрутов: `getAppRoutes()` вызывается при создании
// роутера (браузерного или тестового), поэтому demo-флаг и данные читаются
// в момент создания, а не на этапе импорта модуля.
export function getAppRoutes(): RouteObject[] {
  return [
    {
      element: <AppLayout />,
      children: [
        {
          path: '/',
          caseSensitive: true,
          element: (
            <MainPage
              cityNames={CITY_NAMES}
              activeCityName={ACTIVE_CITY_NAME}
              offers={getOffers()}
            />
          ),
        },
        {
          path: '/login',
          caseSensitive: true,
          element: (
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          ),
        },
        {
          path: '/favorites',
          caseSensitive: true,
          element: (
            <PrivateRoute>
              <FavoritesPage offers={getFavoriteOffers()} />
            </PrivateRoute>
          ),
        },
        {path: '/offer/:id', caseSensitive: true, element: <OfferRoute />},
        {path: '*', element: <NotFoundPage />},
      ],
    },
  ];
}
