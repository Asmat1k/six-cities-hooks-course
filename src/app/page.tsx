import type {Metadata} from 'next';
import {MapScheme} from '@/components/map-scheme/map-scheme';
import {OfferCard} from '@/components/offer-card/offer-card';
import {ACTIVE_CITY_NAME, CITY_NAMES, getOffers} from '@/mocks/offers';
import '@/styles/pages/main.css';

// Главная по макету (markup/main.html): города, список предложений и
// статичная схема карты. Границы КТ1: смена города, поиск, сортировка,
// подгрузка порций и «Recently viewed» НЕ реализованы - это этапы 4-11.
// Переключатель «List / Map» на телефоне оставлен штатным из вёрстки -
// он работает чисто на CSS (:has), без скриптов.

// Заголовок вкладки (адаптация M4 под Next.js). Шаблон из layout применяется
// только к дочерним сегментам, а `/` лежит в том же сегменте, что и layout, -
// поэтому полный заголовок задаётся здесь явно, через `absolute`.
export const metadata: Metadata = {
  title: {
    absolute: `Six Cities - ${ACTIVE_CITY_NAME}`,
  },
};

export default function MainPage() {
  const offers = getOffers();

  return (
    <main className="page__main">
      <h1 className="visually-hidden">Cities</h1>
      <nav className="cities" aria-label="Cities">
        <div className="container">
          <ul className="cities__list">
            {CITY_NAMES.map((cityName) => {
              const isActive = cityName === ACTIVE_CITY_NAME;
              const linkClassName = isActive ? 'cities__link cities__link--active' : 'cities__link';

              return (
                <li key={cityName}>
                  {/* В КТ1 подписи городов не переключаются (смена города - этап 6),
                      поэтому это span, а не ссылка-заглушка с href="#". */}
                  <span className={linkClassName} aria-current={isActive ? 'page' : undefined}>
                    {cityName}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="container places-layout">
        <div className="view-switch" role="radiogroup" aria-label="View">
          <input
            className="view-switch__input"
            type="radio"
            name="view"
            id="view-list"
            defaultChecked
          />
          <label className="view-switch__label" htmlFor="view-list">List</label>
          <input className="view-switch__input" type="radio" name="view" id="view-map" />
          <label className="view-switch__label" htmlFor="view-map">Map</label>
        </div>

        <section className="places-layout__map" aria-label="Map">
          <MapScheme pinCount={offers.length} />
        </section>

        <section className="places places-layout__list">
          <div className="places__head">
            <h2 className="places__title">
              {offers.length} places to stay in {ACTIVE_CITY_NAME}
            </h2>
          </div>
          <div className="places-grid">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
