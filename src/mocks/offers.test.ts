import {describe, expect, it} from 'vitest';
import type {OfferPreview} from '@/entities/offer';
import {getNearbyOffers, getOffers} from './offers';

// Форма моков предложений: «соседи» - краткие OfferPreview без полных данных,
// ID выборки - 1..4. Эти проверки раньше жили в тесте деталей предложения;
// после разнесения моков (src/mocks) и срезов FSD они проверяют сами моки
// и живут рядом с ними.

describe('offer mocks', () => {
  it('provide preview-shaped nearby offers and ids 1-4', () => {
    const previews: OfferPreview[] = getNearbyOffers('1');

    expect(previews).toHaveLength(3);
    expect(previews.every((preview) => !('host' in preview))).toBe(true);
    expect(getOffers().map((preview) => preview.id)).toEqual(['1', '2', '3', '4']);
  });
});
