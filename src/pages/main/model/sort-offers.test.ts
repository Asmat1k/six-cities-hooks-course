import {describe, expect, it} from 'vitest';
import type {OfferPreview} from '@/entities/offer';
import {
  DEFAULT_SORT_VALUE,
  SORT_LABELS,
  SORT_VALUES,
  parseSortValue,
  sortOffers,
} from './sort-offers';

// Тесты модели сортировки (этап 6): все четыре порядка, отсутствие мутации
// входа и парсинг значения из URL - некорректное даёт Popular.

function makeOffer(id: string, price: number, rating: number): OfferPreview {
  return {
    id,
    title: `Offer ${id}`,
    type: 'apartment',
    price,
    previewImage: `/img/offers/${id}.jpg`,
    city: {
      name: 'Paris',
      location: {latitude: 48.85661, longitude: 2.35222, zoom: 10},
    },
    location: {latitude: 48.85661, longitude: 2.35222, zoom: 12},
    isFavorite: false,
    isPremium: false,
    rating,
  };
}

// Порядок «как пришло»: сначала дорогие, рейтинги вперемешку.
const offers: OfferPreview[] = [
  makeOffer('1', 180, 4.5),
  makeOffer('2', 70, 3.5),
  makeOffer('3', 210, 4.2),
  makeOffer('4', 150, 4.9),
  makeOffer('5', 95, 3.9),
];

describe('parseSortValue', () => {
  it('accepts all four allowed values', () => {
    expect(SORT_VALUES).toEqual(['popular', 'price-asc', 'price-desc', 'top-rated']);

    expect(parseSortValue('popular')).toBe('popular');
    expect(parseSortValue('price-asc')).toBe('price-asc');
    expect(parseSortValue('price-desc')).toBe('price-desc');
    expect(parseSortValue('top-rated')).toBe('top-rated');
  });

  it('falls back to Popular for a missing or incorrect value', () => {
    expect(parseSortValue(null)).toBe(DEFAULT_SORT_VALUE);
    expect(parseSortValue('abc')).toBe('popular');
    expect(parseSortValue('Price')).toBe('popular');
    expect(parseSortValue('')).toBe('popular');
  });

  it('labels every value for the menu', () => {
    expect(SORT_LABELS).toEqual({
      'popular': 'Popular',
      'price-asc': 'Price: low to high',
      'price-desc': 'Price: high to low',
      'top-rated': 'Top rated first',
    });
  });
});

describe('sortOffers', () => {
  it('keeps the source order for Popular', () => {
    expect(sortOffers(offers, 'popular').map((offer) => offer.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('sorts by price ascending', () => {
    expect(sortOffers(offers, 'price-asc').map((offer) => offer.price)).toEqual([
      70, 95, 150, 180, 210,
    ]);
  });

  it('sorts by price descending', () => {
    expect(sortOffers(offers, 'price-desc').map((offer) => offer.price)).toEqual([
      210, 180, 150, 95, 70,
    ]);
  });

  it('sorts by rating descending', () => {
    expect(sortOffers(offers, 'top-rated').map((offer) => offer.rating)).toEqual([
      4.9, 4.5, 4.2, 3.9, 3.5,
    ]);
  });

  it('does not mutate the input array', () => {
    const source = [...offers];

    sortOffers(offers, 'price-asc');
    sortOffers(offers, 'price-desc');
    sortOffers(offers, 'top-rated');

    expect(offers).toEqual(source);
  });

  it('keeps equal elements stable', () => {
    const tied = [
      makeOffer('a', 100, 4.0),
      makeOffer('b', 100, 5.0),
      makeOffer('c', 100, 3.0),
    ];

    expect(sortOffers(tied, 'price-asc').map((offer) => offer.id)).toEqual(['a', 'b', 'c']);
  });
});
