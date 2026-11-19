import {describe, expect, it} from 'vitest';
import type {OfferPreview} from '@/entities/offer';
import {
  DEFAULT_CITY_NAME,
  appReducer,
  changeCity,
  fillOffers,
  selectCityName,
  selectOffers,
  type AppStoreState,
} from './app-slice';

// Тесты редьюсера этапа 6 (TASKS.md): смена города и заполнение списка.
// Редьюсер - чистая функция, проверяется напрямую.

function makeOffer(id: string, cityName: string): OfferPreview {
  return {
    id,
    title: `Offer ${id}`,
    type: 'apartment',
    price: 100,
    previewImage: `/img/offers/${id}.jpg`,
    city: {
      name: cityName,
      location: {latitude: 48.85661, longitude: 2.35222, zoom: 10},
    },
    location: {latitude: 48.85661, longitude: 2.35222, zoom: 12},
    isFavorite: false,
    isPremium: false,
    rating: 4,
  };
}

const offers: OfferPreview[] = [makeOffer('1', 'Paris'), makeOffer('2', 'Amsterdam')];

function sliceStateWith(overrides: Partial<AppStoreState['app']> = {}): AppStoreState['app'] {
  return {
    cityName: DEFAULT_CITY_NAME,
    offers: [],
    ...overrides,
  };
}

function stateWith(overrides: Partial<AppStoreState['app']> = {}): AppStoreState {
  return {
    app: sliceStateWith(overrides),
  };
}

describe('app reducer', () => {
  it('starts with Paris and an empty offer list', () => {
    const state = appReducer(undefined, {type: 'app/unknown'});

    expect(state.cityName).toBe('Paris');
    expect(state.offers).toEqual([]);
  });

  it('changes the selected city', () => {
    const state = appReducer(sliceStateWith(), changeCity('Amsterdam'));

    expect(state.cityName).toBe('Amsterdam');
  });

  it('fills the offer list', () => {
    const state = appReducer(sliceStateWith(), fillOffers(offers));

    expect(state.offers).toHaveLength(2);
    expect(state.offers[1].city.name).toBe('Amsterdam');
  });

  it('keeps the city when the list is filled', () => {
    const state = appReducer(sliceStateWith({cityName: 'Cologne'}), fillOffers(offers));

    expect(state.cityName).toBe('Cologne');
    expect(selectOffers(stateWith({offers: state.offers}))).toHaveLength(2);
  });

  it('replaces the list on repeated fillOffers', () => {
    const filled = appReducer(sliceStateWith(), fillOffers(offers));
    const refilled = appReducer(filled, fillOffers([makeOffer('9', 'Paris')]));

    expect(refilled.offers.map((offer) => offer.id)).toEqual(['9']);
  });

  it('exposes city and offers through selectors', () => {
    const state = stateWith({cityName: 'Brussels'});

    expect(selectCityName(state)).toBe('Brussels');
    expect(selectOffers(state)).toEqual([]);
  });
});
