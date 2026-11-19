import {Outlet, ScrollRestoration} from 'react-router';
import type {AuthInfo} from '@/entities/user';
import {Icons} from '@/shared/ui/icons/icons';
import {getAuthInfo} from '@/mocks/auth';
import {getFavoriteOffers} from '@/mocks/offers';
import {Footer} from './footer';
import {Header} from './header';

// Каркас приложения (бывший Next.js layout): SVG-спрайт, контейнер `.page`,
// шапка, `<Outlet />` под текущий маршрут и подвал. Слой app - единственное
// место, где моки КТ1 подключаются к интерфейсу: отсюда же шапка получает
// заглушку статуса и число избранного. `ScrollRestoration` один на всё
// приложение: SPA-переход открывает новый экран с верхней точки, а «Назад»
// возвращает сохранённую позицию прокрутки исходной страницы.

export function AppLayout() {
  // Заглушка статуса из КТ1: гость по умолчанию, demo-пользователь - только
  // при сборке с VITE_SIX_CITIES_MOCK_AUTH=1 (см. src/mocks/auth.ts).
  const auth: AuthInfo | null = getAuthInfo();
  const favoritesCount = getFavoriteOffers().length;

  return (
    <>
      <Icons />
      <div className="page">
        <Header auth={auth} favoritesCount={favoritesCount} />
        <Outlet />
        <Footer />
      </div>
      <ScrollRestoration />
    </>
  );
}
