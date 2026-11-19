import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {FavoritesList} from '@/components/favorites-list/favorites-list';
import {getAuthInfo} from '@/mocks/auth';
import {getFavoriteOffers} from '@/mocks/offers';
import '@/styles/pages/favorites.css';

// Приватная страница (этап 3): гостя до рендера перенаправляет серверный
// redirect('/login') - HTTP 307, без разметки списка. Проверка выполняется
// на каждый запрос, поэтому страница динамическая. В demo-сборке
// (SIX_CITIES_MOCK_AUTH=1) здесь сгруппированный по городам список из моков.
// Удаление из избранного и пустое состояние - этап 8, в КТ1 их нет.

export const dynamic = 'force-dynamic';

const favoritesCount = getFavoriteOffers().length;

export const metadata: Metadata = {
  title: `Favorites (${String(favoritesCount)})`,
};

export default function FavoritesPage() {
  if (!getAuthInfo()) {
    redirect('/login');
  }

  const favoriteOffers = getFavoriteOffers();

  return (
    <main className="page__main">
      <div className="container">
        <FavoritesList offers={favoriteOffers} />
      </div>
    </main>
  );
}
