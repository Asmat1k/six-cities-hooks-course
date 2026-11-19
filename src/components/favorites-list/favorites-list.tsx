import Link from 'next/link';
import type {OfferPreview} from '@/types/domain';
import {OfferCard} from '@/components/offer-card/offer-card';

// Избранное из вёрстки (markup/favorites.html): список сгруппирован по
// городам, карточка та же, что на главной, но в компактном варианте `row`.
// Удаление из избранного и пустое состояние - этап 8, в КТ1 их нет.

interface CityGroup {
  city: string;
  offers: OfferPreview[];
}

function groupByCity(offers: OfferPreview[]): CityGroup[] {
  const groups: CityGroup[] = [];

  for (const offer of offers) {
    const existingGroup = groups.find((group) => group.city === offer.city.name);

    if (existingGroup) {
      existingGroup.offers.push(offer);
    } else {
      groups.push({city: offer.city.name, offers: [offer]});
    }
  }

  return groups;
}

interface FavoritesListProps {
  offers: OfferPreview[];
}

export function FavoritesList({offers}: FavoritesListProps) {
  const groups = groupByCity(offers);

  return (
    <div className="favorites">
      <h1 className="favorites__title">Saved listing</h1>
      <ul className="favorites__list">
        {groups.map((group) => (
          <li className="favorites__group" key={group.city}>
            <section
              className="favorites__city"
              aria-labelledby={`fav-${group.city.toLowerCase()}`}
            >
              <h2
                className="favorites__city-title"
                id={`fav-${group.city.toLowerCase()}`}
              >
                <Link className="favorites__city-link" href="/">
                  <svg className="favorites__city-icon" aria-hidden="true">
                    <use href="#icon-pin" />
                  </svg>
                  {group.city}
                </Link>
              </h2>
              <div className="favorites__places">
                {group.offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} variant="row" />
                ))}
              </div>
            </section>
          </li>
        ))}
      </ul>
    </div>
  );
}
