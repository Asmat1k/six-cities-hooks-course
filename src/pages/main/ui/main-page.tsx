import {useEffect, useMemo, useState} from 'react';
import {ViewTransition} from 'react';
import type {ViewTransitionClassPerType} from 'react';
import type {City, OfferPreview} from '@/entities/offer';
import {OfferCardList} from '@/entities/offer';
import {CityMap} from '@/shared/ui/city-map/city-map';
import {useDebouncedCallback} from '@/hooks/use-debounced-callback/use-debounced-callback';
import {useUrlState} from '@/hooks/use-url-state/use-url-state';
import {useMediaQuery} from '@/hooks/use-media-query/use-media-query';
import {PHONE_ONLY_QUERY} from '@/shared/lib/breakpoints';
import {SEARCH_DEBOUNCE_MS} from '@/shared/config/variant';
import {
  DEFAULT_SORT_VALUE,
  parseSortValue,
  sortOffers,
  type SortValue,
} from '../model/sort-offers';
import {SortMenu} from './sort-menu';
import './main.css';

// Главная страница (этапы 4-6). Слой app передаёт сюда выбранный город из
// Redux (selectedCityName), отображаемый город для анимации (displayedCity),
// все предложения и обработчик смены города.
//
// Источник правды для сортировки и поиска - адресная строка (H4): `sort` и
// `q` читаются только из URL, Redux хранит лишь город и список предложений.
// Ввод в поиск обновляет поле сразу, а применяется с дебаунсом (500 мс -
// вариант 3) записью с replace; Enter применяет сразу, очистка отменяет
// таймер и стирает параметр. Смена сортировки пишет с push.
//
// Анимация смены города (M3): заголовок и список обёрнуты в ViewTransition
// с ключом города; поле поиска и карта остаются снаружи, чтобы не
// перемонтироваться и не терять фокус. Карта получает ВСЕ предложения
// отображаемого города - фильтр поиска на неё не влияет.

// Классы переходов по направлениям (M3): типы city-forward / city-back
// проставляет MainRoute в слое app через addTransitionType.
const CITY_TITLE_ENTER_CLASSES: ViewTransitionClassPerType = {
  'city-forward': 'vt-city-enter-forward',
  'city-back': 'vt-city-enter-back',
  'default': 'none',
};

const CITY_TITLE_EXIT_CLASSES: ViewTransitionClassPerType = {
  'city-forward': 'vt-city-exit-forward',
  'city-back': 'vt-city-exit-back',
  'default': 'none',
};

const CITY_LIST_ENTER_CLASSES: ViewTransitionClassPerType = {
  'city-forward': 'vt-city-enter-forward',
  'city-back': 'vt-city-enter-back',
  'default': 'none',
};

const CITY_LIST_EXIT_CLASSES: ViewTransitionClassPerType = {
  'city-forward': 'vt-city-exit-forward',
  'city-back': 'vt-city-exit-back',
  'default': 'none',
};

const NO_TRANSITION_CLASSES: ViewTransitionClassPerType = {default: 'none'};

function parseSearchQuery(raw: string | null): string {
  return raw ?? '';
}

function filterByTitle(offers: readonly OfferPreview[], query: string): OfferPreview[] {
  if (query === '') {
    return [...offers];
  }

  const needle = query.toLowerCase();

  return offers.filter((offer) => offer.title.toLowerCase().includes(needle));
}

interface MainPageProps {
  cityNames: readonly string[];
  selectedCityName: string;
  displayedCity: City;
  offers: readonly OfferPreview[];
  onCityChange: (cityName: string) => void;
}

export function MainPage({
  cityNames,
  selectedCityName,
  displayedCity,
  offers,
  onCityChange,
}: MainPageProps) {
  const [sortValue, setSortValue] = useUrlState<SortValue>('sort', DEFAULT_SORT_VALUE, parseSortValue);
  const [appliedQuery, setQuery] = useUrlState('q', '', parseSearchQuery);

  // Локально живёт только ещё не применённый текст. Пока он есть, поле
  // показывает его; как только URL меняется «извне» (Back/Forward), событие
  // popstate сбрасывает его - и поле снова выводится из URL. Так поле
  // восстанавливается из адреса на каждом POP-переходе, даже если q в
  // соседних записях совпадает: набранный, но не применённый текст не имеет
  // права пережить переход.
  const [pendingText, setPendingText] = useState<string | null>(null);
  const searchText = pendingText ?? appliedQuery;
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  const isPhoneLayout = useMediaQuery(PHONE_ONLY_QUERY);

  // Дебаунс поиска (H1): сработать должна последняя версия сеттера с
  // актуальными параметрами адреса - useDebouncedCallback держит свежий fn,
  // поэтому «q» дописывается в запись, где уже стоит новая сортировка.
  const applySearch = useDebouncedCallback((text: string) => {
    setQuery(text === '' ? undefined : text, {replace: true, preventScrollReset: true});
  }, SEARCH_DEBOUNCE_MS);

  // Back/Forward отменяет отложенный поиск синхронно, в самом событии, до
  // того как роутер обновит состояние: иначе таймер, доживший до нового
  // адреса, дописал бы «своё» q в чужую запись истории. Здесь же поле
  // отпускает набранный текст и дальше следует за URL.
  useEffect(() => {
    function handlePopState() {
      applySearch.cancel();
      setPendingText(null);
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applySearch]);

  const cityOffers = useMemo(
    () => offers.filter((offer) => offer.city.name === displayedCity.name),
    [offers, displayedCity.name],
  );

  const visibleOffers = useMemo(
    () => sortOffers(filterByTitle(cityOffers, appliedQuery), sortValue),
    [cityOffers, appliedQuery, sortValue],
  );

  // Маркеры карты те же, пока не сменился город или список: массив точек
  // мемоизирован, иначе каждое наведение на карточку (новый рендер)
  // пересобирало бы все маркеры. Хук H5 обновляет маркеры только при
  // смене offers - поиск и сортировка карту не трогают.
  const mapPoints = useMemo(
    () => cityOffers.map((offer) => ({id: offer.id, location: offer.location})),
    [cityOffers],
  );

  // Телефон: показывается только выбранное - карта в режиме «Список» не
  // монтируется вовсе (H12), а не прячется через CSS.
  const isMapVisible = !isPhoneLayout || mobileView === 'map';
  const isListVisible = !isPhoneLayout || mobileView === 'list';

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    const text = event.currentTarget.value;

    setPendingText(text);
    applySearch(text);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      applySearch.flush();
    }
  }

  function handleSearchClear() {
    applySearch.cancel();
    setPendingText(null);
    setQuery(undefined, {replace: true, preventScrollReset: true});
  }

  function handleSortChange(nextSortValue: SortValue) {
    // Смена сортировки - новая запись истории (push): по ней можно вернуться
    // кнопкой «назад».
    setSortValue(nextSortValue);
  }

  const displayedCityName = displayedCity.name;

  return (
    <>
      <title>{`Six Cities - ${displayedCityName}`}</title>

      <main className="page__main">
        <h1 className="visually-hidden">Cities</h1>
        <nav className="cities" aria-label="Cities">
          <div className="container">
            <ul className="cities__list">
              {cityNames.map((cityName) => {
                const isActive = cityName === selectedCityName;
                const linkClassName = isActive ? 'cities__link cities__link--active' : 'cities__link';

                return (
                  <li key={cityName}>
                    <button
                      type="button"
                      className={linkClassName}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        onCityChange(cityName);
                      }}
                    >
                      {cityName}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="container places-layout">
          {isPhoneLayout ? (
            <div className="view-switch" role="radiogroup" aria-label="View">
              <input
                className="view-switch__input"
                type="radio"
                name="view"
                id="view-list"
                checked={mobileView === 'list'}
                onChange={() => {
                  setMobileView('list');
                }}
              />
              <label className="view-switch__label" htmlFor="view-list">List</label>
              <input
                className="view-switch__input"
                type="radio"
                name="view"
                id="view-map"
                checked={mobileView === 'map'}
                onChange={() => {
                  setMobileView('map');
                }}
              />
              <label className="view-switch__label" htmlFor="view-map">Map</label>
            </div>
          ) : null}

          {isMapVisible ? (
            <section className="places-layout__map" aria-label="Map">
              {/* Стабильный сосед анимируемой области: не размонтируется при
                  смене города - по ТЗ меняются центр и маркеры, не карта. */}
              <CityMap
                city={displayedCity}
                points={mapPoints}
                activePointId={activeOfferId}
              />
            </section>
          ) : null}

          {isListVisible ? (
            <section className="places places-layout__list">
              <div className="places__head">
                <ViewTransition
                  name="city-title"
                  key={displayedCityName}
                  enter={CITY_TITLE_ENTER_CLASSES}
                  exit={CITY_TITLE_EXIT_CLASSES}
                  update={NO_TRANSITION_CLASSES}
                >
                  <h2 className="places__title">
                    {visibleOffers.length} places to stay in {displayedCityName}
                  </h2>
                </ViewTransition>

                <div className="places__tools">
                  <label className="search">
                    <span className="visually-hidden">Search by title</span>
                    <svg className="search__icon" aria-hidden="true"><use href="#icon-search" /></svg>
                    <input
                      className="field search__input"
                      type="search"
                      placeholder="Search by title"
                      value={searchText}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                    />
                  </label>
                  {searchText !== '' ? (
                    <button
                      className="search__clear"
                      type="button"
                      aria-label="Clear search"
                      onClick={handleSearchClear}
                    >
                      <svg aria-hidden="true"><use href="#icon-close" /></svg>
                    </button>
                  ) : null}
                  <SortMenu value={sortValue} onChange={handleSortChange} />
                </div>
              </div>

              <ViewTransition
                name="city-list"
                key={displayedCityName}
                enter={CITY_LIST_ENTER_CLASSES}
                exit={CITY_LIST_EXIT_CLASSES}
                update={NO_TRANSITION_CLASSES}
              >
                <div className="places-grid">
                  <OfferCardList
                    offers={visibleOffers}
                    activeOfferId={activeOfferId}
                    onActiveChange={setActiveOfferId}
                  />
                </div>
              </ViewTransition>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
