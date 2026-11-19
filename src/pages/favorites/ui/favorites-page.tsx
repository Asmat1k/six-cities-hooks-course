import type {OfferPreview} from '@/entities/offer';
import {FavoritesList} from './favorites-list';
import './favorites.css';

// Избранное `/favorites` (этап 3). Приватность страницы обеспечивает guard
// в слое app: гость не попадает в этот компонент вообще. В КТ1 список -
// группировка моков, переданных через props; удаление и пустое состояние
// появятся на этапе 8.

interface FavoritesPageProps {
  offers: OfferPreview[];
}

export function FavoritesPage({offers}: FavoritesPageProps) {
  return (
    <>
      <title>{`Six Cities - Favorites (${String(offers.length)})`}</title>

      <main className="page__main">
        <div className="container">
          <FavoritesList offers={offers} />
        </div>
      </main>
    </>
  );
}
