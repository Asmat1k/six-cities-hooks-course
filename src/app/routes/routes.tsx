import {Navigate, useParams} from 'react-router';
import {useEffect, useRef, useState} from 'react';
import {addTransitionType, startTransition} from 'react';
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
  CITIES,
  CITY_NAMES,
  DEFAULT_CITY_NAME,
  getFavoriteOffers,
  getNearbyOffers,
  getOfferById,
} from '@/mocks/offers';
import {getReviewsByOfferId} from '@/mocks/reviews';
import {changeCity, selectCityName, selectOffers} from '@/app/store';
import {useAppDispatch, useAppSelector, useAppStore} from '@/app/store/hooks';

// Маршруты приложения (React Router 8, Data Mode): `/`, `/login`,
// `/favorites`, `/offer/:id` и `*` -> 404. Именованные маршруты объявлены
// caseSensitive: регистр адреса имеет значение, `/LOGIN` или `/OFFER/1`
// не совпадают с маршрутами и попадают на экран 404, как прочие неизвестные
// адреса.
//
// КТ2 (этап 6): выбранный город и список предложений живут в Redux. Слой
// app по-прежнему единственное место, где моки подключаются к интерфейсу:
// хранилище наполняется при старте (app/store/singleton.ts), а здесь
// страница главной получает пропсы из store. Серверных HTTP-статусов в SPA
// нет: приватность и 404 проверяются поведением - редиректом или экраном
// 404 без смены адреса.

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

// Направление анимации смены города (M3): вперёд или назад по порядку
// вкладок. Один и тот же город - no-op (подписка это проверяет раньше).
type CityTransitionType = 'city-forward' | 'city-back';

function getCityTransitionType(previousCityName: string, nextCityName: string): CityTransitionType {
  return CITY_NAMES.indexOf(nextCityName) > CITY_NAMES.indexOf(previousCityName)
    ? 'city-forward'
    : 'city-back';
}

// Главная в состоянии «выбранное в Redux, отображаемое анимировано»
// (M3). Клик по вкладке меняет город в store срочно (вкладка подсвечивается
// сразу), а содержимое переводится на новый город переходным обновлением:
// подписка читает свежий снапшот store, помечает переход типом
// city-forward / city-back и обновляет отображаемую проекцию внутри
// startTransition. Список отображаемого города выбирается из тех же
// данных Redux - без дублирования.
function MainRoute() {
  const store = useAppStore();
  const dispatch = useAppDispatch();
  const selectedCityName = useAppSelector(selectCityName);

  const [displayedCityName, setDisplayedCityName] = useState(selectedCityName);
  const displayedCityNameRef = useRef(displayedCityName);

  useEffect(() => {
    function handleStoreChange() {
      const nextCityName = selectCityName(store.getState());
      const previousCityName = displayedCityNameRef.current;

      if (previousCityName === nextCityName) {
        return;
      }

      displayedCityNameRef.current = nextCityName;

      startTransition(() => {
        addTransitionType(getCityTransitionType(previousCityName, nextCityName));
        setDisplayedCityName(nextCityName);
      });
    }

    return store.subscribe(handleStoreChange);
  }, [store]);

  const displayedCity = CITIES[displayedCityName] ?? CITIES[DEFAULT_CITY_NAME];
  const offers = useAppSelector(selectOffers);

  return (
    <MainPage
      cityNames={CITY_NAMES}
      selectedCityName={selectedCityName}
      displayedCity={displayedCity}
      offers={offers}
      onCityChange={(cityName) => {
        dispatch(changeCity(cityName));
      }}
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
          element: <MainRoute />,
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
