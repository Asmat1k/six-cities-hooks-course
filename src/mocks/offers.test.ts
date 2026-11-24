import {describe, expect, it} from 'vitest';
import type {OfferPreview} from '@/entities/offer';
import {CITIES, CITY_NAMES, getNearbyOffers, getOffers} from './offers';

// Форма моков предложений (КТ2): «соседи» - краткие OfferPreview того же
// города без полных данных; предложения раскиданы по всем шести городам ТЗ,
// амстердамские ID - по-прежнему 1-4.

describe('offer mocks', () => {
  it('provide preview-shaped nearby offers of the same city', () => {
    const previews: OfferPreview[] = getNearbyOffers('1');

    expect(previews).toHaveLength(3);
    expect(previews.every((preview) => !('host' in preview))).toBe(true);
    expect(previews.map((preview) => preview.id)).toEqual(['2', '3', '4']);
    expect(previews.every((preview) => preview.city.name === 'Amsterdam')).toBe(true);
  });

  it('keep the original Amsterdam ids 1-4', () => {
    const amsterdamIds = getOffers()
      .filter((preview) => preview.city.name === 'Amsterdam')
      .map((preview) => preview.id);

    expect(amsterdamIds).toEqual(['1', '2', '3', '4']);
  });

  it('give every offer exactly three unique same-city neighbors without itself', () => {
    // Страница предложения показывает трёх соседей (PROJECT.md, 4.4) -
    // инвариант держится для каждого мока: в каждом городе не меньше
    // четырёх предложений.
    for (const offer of getOffers()) {
      const nearby = getNearbyOffers(offer.id);
      const nearbyIds = nearby.map((preview) => preview.id);

      expect(nearbyIds, `${offer.id} neighbor count`).toHaveLength(3);
      expect(new Set(nearbyIds).size, `${offer.id} neighbor ids are unique`).toBe(3);
      expect(nearbyIds, `${offer.id} excludes itself`).not.toContain(offer.id);
      expect(
        nearby.every((preview) => preview.city.name === offer.city.name),
        `${offer.id} neighbors are same-city`,
      ).toBe(true);
    }
  });

  it('cover all six cities so the city filter is meaningful', () => {
    const offers = getOffers();
    const usedCities = new Set(offers.map((preview) => preview.city.name));

    for (const cityName of CITY_NAMES) {
      expect(usedCities.has(cityName), `${cityName} has no mock offers`).toBe(true);
    }
  });

  it('give every city a center for the map', () => {
    for (const cityName of CITY_NAMES) {
      const city = CITIES[cityName];

      expect(city.name).toBe(cityName);
      expect(typeof city.location.latitude).toBe('number');
      expect(typeof city.location.longitude).toBe('number');
    }
  });
});
