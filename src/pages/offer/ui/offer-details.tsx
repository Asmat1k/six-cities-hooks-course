import {Link} from 'react-router';
import type {Offer, OfferPreview, Review} from '@/entities/offer';
import {OfferCardList} from '@/entities/offer';
import {CityMap} from '@/shared/ui/city-map/city-map';
import type {YandexMapPoint} from '@/shared/ui/city-map/city-map';
import {Rating} from '@/shared/ui/rating/rating';
import {capitalize, formatReviewDate, pluralize} from '../lib/format';
import {ReviewForm} from './review-form';

// Страница предложения по макету (markup/offer.html): галерея (до 6 фото),
// цена, детали, хозяин, отзывы (не больше 10, новые сверху - порядок даёт
// источник данных), форма отзыва для авторизованного (H8), карта с тремя
// соседями и текущим предложением и карточки соседей. Наведение на карточки
// здесь цвет маркера не меняет - по ТЗ подсветка только на главной.

const GALLERY_MAX_IMAGES = 6;
const REVIEWS_MAX_COUNT = 10;

interface OfferDetailsProps {
  offer: Offer;
  reviews: Review[];
  nearbyOffers: OfferPreview[];
  isAuthorized: boolean;
}

export function OfferDetails({offer, reviews, nearbyOffers, isAuthorized}: OfferDetailsProps) {
  const galleryImages = offer.images.slice(0, GALLERY_MAX_IMAGES);
  const visibleReviews = reviews.slice(0, REVIEWS_MAX_COUNT);
  const descriptionParagraphs = offer.description.split('\n\n');
  const hostClassName = offer.host.isPro ? 'host host--pro' : 'host';
  const favoriteAction = offer.isFavorite ? 'Remove from favorites' : 'Add to favorites';

  // Карта «неподалёку»: три соседних предложения синим и текущее - оранжевым.
  const nearbyMapPoints: readonly YandexMapPoint[] = [
    ...nearbyOffers.map((nearbyOffer) => ({
      id: nearbyOffer.id,
      location: nearbyOffer.location,
    })),
    {id: offer.id, location: offer.location},
  ];

  return (
    <main className="page__main offer">
      <div className="container">
        <ul className="gallery" aria-label="Photos">
          {galleryImages.map((image, index) => (
            <li className="gallery__item" key={image}>
              <img
                className="gallery__image"
                src={image}
                width="800"
                height="600"
                alt={`${offer.title} - view ${String(index + 1)}`}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="container offer__layout">
        <div className="offer__head">
          {offer.isPremium ? <span className="badge offer__badge">Premium</span> : null}
          <h1 className="offer__title">{offer.title}</h1>
          <div className="offer__rating">
            <Rating value={offer.rating} large labeled={false} />
            <span className="offer__rating-value">
              <span className="visually-hidden">Rating </span>
              {offer.rating}
            </span>
          </div>
          <ul className="offer__features">
            <li className="offer__feature offer__feature--type">{capitalize(offer.type)}</li>
            <li className="offer__feature offer__feature--bedrooms">
              {offer.bedrooms} {pluralize(offer.bedrooms, 'Bedroom', 'Bedrooms')}
            </li>
            <li className="offer__feature offer__feature--adults">
              Max {offer.maxAdults} {pluralize(offer.maxAdults, 'adult', 'adults')}
            </li>
          </ul>
        </div>

        <aside className="offer__aside" aria-label="Booking">
          <div className="offer-summary">
            <p className="offer-summary__price">
              <b>€{offer.price}</b> / night
            </p>
            {/* Как и в карточке: переключение избранного - будущий этап,
                поэтому закладка отключена - вид из вёрстки сохранён. */}
            <button
              className="bookmark offer-summary__bookmark"
              type="button"
              aria-pressed={offer.isFavorite}
              disabled
            >
              <svg aria-hidden="true">
                <use href="#icon-bookmark" />
              </svg>
              <span className="visually-hidden">{favoriteAction}</span>
            </button>
          </div>
        </aside>

        <div className="offer__details">
          <section className="offer__section" aria-labelledby="goods-title">
            <h2 className="offer__section-title" id="goods-title">What’s inside</h2>
            <ul className="goods">
              {offer.goods.map((good) => (
                <li className="goods__item" key={good}>{good}</li>
              ))}
            </ul>
          </section>

          <section className="offer__section" aria-labelledby="host-title">
            <h2 className="offer__section-title" id="host-title">Meet the host</h2>
            <div className={hostClassName}>
              <div className="host__user">
                <div className="host__avatar-wrapper">
                  <img
                    className="host__avatar"
                    src={offer.host.avatarUrl}
                    width="74"
                    height="74"
                    alt=""
                  />
                  {offer.host.isPro ? (
                    <svg className="host__pro-icon" aria-hidden="true">
                      <use href="#icon-star" />
                    </svg>
                  ) : null}
                </div>
                <div>
                  <p className="host__name">{offer.host.name}</p>
                  {offer.host.isPro ? <p className="host__status">Pro</p> : null}
                </div>
              </div>
              <div className="host__description">
                {descriptionParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="offer__section reviews" aria-labelledby="reviews-title">
            <h2 className="offer__section-title" id="reviews-title">
              Reviews · <span className="reviews__amount">{reviews.length}</span>
            </h2>
            <ul className="reviews__list">
              {visibleReviews.map((review) => (
                <li className="review" key={review.id}>
                  <img
                    className="review__avatar"
                    src={review.user.avatarUrl}
                    width="54"
                    height="54"
                    alt=""
                  />
                  <div className="review__body">
                    <div className="review__head">
                      <p className="review__name">{review.user.name}</p>
                      <time className="review__date" dateTime={review.date}>
                        {formatReviewDate(review.date)}
                      </time>
                    </div>
                    <Rating value={review.rating} />
                    <p className="review__text">{review.comment}</p>
                  </div>
                </li>
              ))}
            </ul>
            {isAuthorized ? (
              // Ключ обязателен: при переходе к другому предложению форма
              // монтируется заново и перечитывает чужой черновик (H6/H8).
              <ReviewForm key={offer.id} offerId={offer.id} />
            ) : (
              <p className="reviews__login">
                <Link to="/login">Sign in</Link> to leave a review
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="container offer__map" aria-label="Map of places nearby">
        <CityMap city={offer.city} points={nearbyMapPoints} activePointId={offer.id} />
      </section>

      <section className="container near-places" aria-labelledby="near-title">
        <h2 className="near-places__title" id="near-title">
          Other places in the neighbourhood
        </h2>
        <div className="places-grid near-places__list">
          <OfferCardList offers={nearbyOffers} />
        </div>
      </section>
    </main>
  );
}
