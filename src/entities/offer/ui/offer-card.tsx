import {Link} from 'react-router';
import type {ReactNode} from 'react';
import type {OfferPreview} from '../model/domain';
import {Rating} from '@/shared/ui/rating/rating';

// Карточка предложения из вёрстки (markup/main.html). Данные - только через
// props; карточка переиспользуется на главной, в избранном и на странице
// предложения. Вариант `row` - компактная карточка для избранного: кнопка
// «Избранное» в ней, как в вёрстке, прямой потомок карточки, а не обёртки фото.
//
// Этап 4: главная передаёт onActiveChange - карточка сообщает свой id при
// наведении И при фокусе с клавиатуры (PROJECT.md, 10.2: подсветка маркера
// должна срабатывать и без мыши). isActive ставит класс --active: он
// подсвечивает карточку и служит для карты (H5) оранжевым маркером.

interface OfferCardProps {
  offer: OfferPreview;
  variant?: 'grid' | 'row';
  isActive?: boolean;
  onActiveChange?: (offerId: string | null) => void;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function OfferCard({offer, variant = 'grid', isActive = false, onActiveChange}: OfferCardProps) {
  const isRow = variant === 'row';
  const baseCardClassName = isRow ? 'place-card place-card--row' : 'place-card';
  const cardClassName = isActive ? `${baseCardClassName} place-card--active` : baseCardClassName;
  const bookmarkClassName = offer.isFavorite
    ? 'bookmark place-card__bookmark bookmark--active'
    : 'bookmark place-card__bookmark';
  const favoriteAction = offer.isFavorite ? 'Remove from favorites' : 'Add to favorites';
  const typeLabel = capitalize(offer.type);

  const handleActivate = () => {
    onActiveChange?.(offer.id);
  };

  const handleDeactivate = () => {
    onActiveChange?.(null);
  };

  // Закладка избранного в КТ1 не интерактивна: переключение появится в будущих
  // этапах. `disabled` сохраняет вид из вёрстки, но убирает кнопку из
  // табуляции - она не получает фокус и не обещает неработающее действие.
  const bookmark = (
    <button
      className={bookmarkClassName}
      type="button"
      aria-pressed={offer.isFavorite}
      disabled
    >
      <svg aria-hidden="true">
        <use href="#icon-bookmark" />
      </svg>
      <span className="visually-hidden">{favoriteAction}</span>
    </button>
  );

  const premiumBadge: ReactNode = offer.isPremium ? (
    <span className="badge place-card__badge">Premium</span>
  ) : null;

  return (
    <article
      className={cardClassName}
      onMouseEnter={handleActivate}
      onMouseLeave={handleDeactivate}
      onFocus={handleActivate}
      onBlur={handleDeactivate}
    >
      <div className="place-card__image-wrapper">
        <img
          className="place-card__image"
          src={offer.previewImage}
          width="400"
          height="300"
          alt={typeLabel}
        />
        {premiumBadge}
        {isRow ? null : bookmark}
      </div>
      <div className="place-card__info">
        <p className="place-card__price">
          <b>€{offer.price}</b> / night
        </p>
        <Rating value={offer.rating} />
        <h3 className="place-card__title">
          <Link to={`/offer/${offer.id}`}>{offer.title}</Link>
        </h3>
        <p className="place-card__type">{offer.type}</p>
      </div>
      {isRow ? bookmark : null}
    </article>
  );
}
