import {ScrollRestoration, useLocation, useNavigationType, useOutlet} from 'react-router';
import {NavigationType} from 'react-router';
import {Provider} from 'react-redux';
import {useEffect, useLayoutEffect, useRef, useState, startTransition, addTransitionType} from 'react';
import type {ViewTransitionClassPerType} from 'react';
import {ViewTransition} from 'react';
import type {ReactNode} from 'react';
import type {AuthInfo} from '@/entities/user';
import {Icons} from '@/shared/ui/icons/icons';
import {getAuthInfo} from '@/mocks/auth';
import {getFavoriteOffers} from '@/mocks/offers';
import {appStore} from '@/app/store';
import {Footer} from './footer';
import {Header} from './header';

// Каркас приложения: SVG-спрайт, контейнер `.page`, шапка, анимируемое
// маршрутное содержимое и подвал. `ScrollRestoration` один на всё
// приложение: SPA-переход открывает новый экран с верхней точки, а «Назад»
// возвращает сохранённую позицию прокрутки исходной страницы.
//
// M3: смена экрана предложения анимируется через React ViewTransition.
// Отображаемый useOutlet переводится на новый pathname ТОЛЬКО переходным
// обновлением с типом offer-forward / offer-back (классы по типу); правки
// query (поиск, сортировка) состояние не трогают вовсе - тот же экран
// перечитывает свежие параметры из контекста роутера срочным рендером.
// Переходы без участия предложения идут той же дорогой, но без типа -
// классы 'none', видимой анимации нет. Собственный механизм React Router
// (viewTransition, useViewTransitionState) не используется: в React Router
// 8.5 он устарел.
//
// Направление POP-перехода определяется индексами записей Navigation API
// (`window.navigation.currentEntry.index`): Back - назад, Forward - вперёд;
// произвольный POP не считается «назад» автоматически. Если API недоступен
// или индекс не изменился - тип не проставляется, навигация без анимации.

const ROUTE_ENTER_CLASSES: ViewTransitionClassPerType = {
  'offer-forward': 'vt-route-enter-forward',
  'offer-back': 'vt-route-enter-back',
  'default': 'none',
};

const ROUTE_EXIT_CLASSES: ViewTransitionClassPerType = {
  'offer-forward': 'vt-route-exit-forward',
  'offer-back': 'vt-route-exit-back',
  'default': 'none',
};

const NO_TRANSITION_CLASSES: ViewTransitionClassPerType = {'default': 'none'};

type RouteTransitionType = 'offer-forward' | 'offer-back';

interface DisplayedRoute {
  pathname: string;
  element: ReactNode;
}

function isOfferPath(pathname: string): boolean {
  return pathname.startsWith('/offer/');
}

function readNavigationIndex(): number | null {
  if (typeof window.navigation === 'undefined') {
    return null;
  }

  return window.navigation.currentEntry?.index ?? null;
}

function resolveRouteTransitionType(
  previousPathname: string,
  nextPathname: string,
  navigationType: NavigationType,
  previousEntryIndex: number | null,
  currentEntryIndex: number | null,
): RouteTransitionType | null {
  const touchesOffer = isOfferPath(previousPathname) || isOfferPath(nextPathname);

  if (!touchesOffer) {
    // Предложение не участвует: login, избранное, 404 - без маршрутной
    // анимации (переход будет без типа, классы 'none').
    return null;
  }

  if (navigationType === NavigationType.Push || navigationType === NavigationType.Replace) {
    // Обычное открытие - вперёд.
    return 'offer-forward';
  }

  // POP: направление по индексам записей. Если Navigation API недоступен
  // или индексы не изменились - не угадываем, анимации не будет.
  if (previousEntryIndex === null || currentEntryIndex === null) {
    return null;
  }

  if (currentEntryIndex > previousEntryIndex) {
    return 'offer-forward';
  }

  if (currentEntryIndex < previousEntryIndex) {
    return 'offer-back';
  }

  return null;
}

// Отображаемый outlet: переводится на новый pathname переходным
// обновлением; тип offer-forward / offer-back добавляется только когда
// переход участвует со страницей предложения.
function useAnimatedOutlet(): DisplayedRoute {
  const outlet = useOutlet();
  const location = useLocation();
  const navigationType = useNavigationType();

  const [displayed, setDisplayed] = useState<DisplayedRoute>(() => ({
    pathname: location.pathname,
    element: outlet,
  }));

  // Индекс записи Navigation API на момент последней СМЕНЫ МАРШРУТА. Читается
  // только в ветке смены pathname: во время коммита перехода (внутри update
  // колбэка браузерного ViewTransition) navigation.currentEntry отдаёт
  // устаревший индекс, и обновление здесь затирало бы направление для
  // следующего POP. В ветке правок query индекс не нужен вовсе.
  const lastEntryIndexRef = useRef<number | null>(readNavigationIndex());

  useEffect(() => {
    if (location.pathname === displayed.pathname) {
      // Правки query: состояние не меняется, экран тот же; свежие
      // useSearchParams/useLocation приходят через контекста роутера.
      return undefined;
    }

    const currentEntryIndex = readNavigationIndex();
    const transitionType = resolveRouteTransitionType(
      displayed.pathname,
      location.pathname,
      navigationType,
      lastEntryIndexRef.current,
      currentEntryIndex,
    );

    lastEntryIndexRef.current = currentEntryIndex;

    // Переход на новый экран запускается отдельной задачей, а не сразу из
    // этого эффекта. Коммит роутера при POP идёт из события popstate, и
    // переход, запланированный в той же волне, получает смешанные с ним
    // приоритеты - React тогда не включает браузерный ViewTransition вовсе
    // (проверено на «назад» со страницы предложения: переход коммитился, но
    // без анимации). Свежая задача даёт переходу чистые transition-полосы;
    // задержка в один такт события на глаз не видна.
    const swapTask = window.setTimeout(() => {
      startTransition(() => {
        if (transitionType !== null) {
          addTransitionType(transitionType);
        }

        setDisplayed({pathname: location.pathname, element: outlet});
      });
    }, 0);

    return () => {
      window.clearTimeout(swapTask);
    };
  }, [location, displayed.pathname, outlet, navigationType]);

  return displayed;
}

// Восстановление прокрутки после переходной смены экрана. ScrollRestoration
// применяет сохранённую позицию на коммите адреса - когда отображаемый
// outlet ещё старый, и браузер зажимает высоту старой страницы. После
// перехода на новый экран позиция повторно применяется уже против нового
// DOM. Позицию пишет слушатель scroll - только пока экран соответствует
// адресу: «промежуточные» прокрутки во время перехода не сохраняются.
function useScrollPositionMemory(displayed: DisplayedRoute) {
  const location = useLocation();
  const navigationType = useNavigationType();

  const scrollPositionsRef = useRef(new Map<string, number>());
  const locationRef = useRef(location);
  const displayedRef = useRef(displayed);

  useLayoutEffect(() => {
    locationRef.current = location;
    displayedRef.current = displayed;
  }, [location, displayed]);

  useEffect(() => {
    function handleScroll() {
      if (displayedRef.current.pathname !== locationRef.current.pathname) {
        return;
      }

      scrollPositionsRef.current.set(locationRef.current.key, window.scrollY);
    }

    window.addEventListener('scroll', handleScroll, {passive: true});
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useLayoutEffect(() => {
    if (navigationType !== NavigationType.Pop) {
      return;
    }

    const savedScrollY = scrollPositionsRef.current.get(location.key);

    if (savedScrollY !== undefined) {
      window.scrollTo(0, savedScrollY);
    }
  }, [displayed, location, navigationType]);
}

export function AppLayout() {
  // Заглушка статуса из КТ1: гость по умолчанию, demo-пользователь - только
  // при сборке с VITE_SIX_CITIES_MOCK_AUTH=1 (см. src/mocks/auth.ts).
  const auth: AuthInfo | null = getAuthInfo();
  const favoritesCount = getFavoriteOffers().length;
  const displayed = useAnimatedOutlet();
  useScrollPositionMemory(displayed);


  return (
    <Provider store={appStore}>
      <Icons />
      <div className="page">
        <Header auth={auth} favoritesCount={favoritesCount} />
        <ViewTransition
          name="route"
          key={displayed.pathname}
          enter={ROUTE_ENTER_CLASSES}
          exit={ROUTE_EXIT_CLASSES}
          update={NO_TRANSITION_CLASSES}
        >
          {displayed.element}
        </ViewTransition>
        <Footer />
      </div>
      <ScrollRestoration />
    </Provider>
  );
}
