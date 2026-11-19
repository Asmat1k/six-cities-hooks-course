import type {ReactElement, ReactNode} from 'react';
import {MemoryRouter} from 'react-router';
import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {FavoritesList} from './favorites-list';
import type {City, OfferPreview} from '@/entities/offer';

// Тесты избранных (этап 2-3): группировка по городам, компактная карточка
// и повторное использование карточки предложения. Срез pages не зависит от
// src/mocks (FSD: моки подключает только app), поэтому данные объявлены
// здесь и повторяют выборку моков - два избранных предложения в Амстердаме;
// группировка по нескольким городам проверяется на локальных данных.
// Интеграцию с моками проверяет routes.test.tsx.

function makeOffer(id: string, cityName: string, title: string): OfferPreview {
  const city: City = {
    name: cityName,
    location: {latitude: 52.38333, longitude: 4.9, zoom: 10},
  };

  return {
    id,
    title,
    type: 'apartment',
    price: 100,
    previewImage: `/img/offers/${id}.jpg`,
    city,
    location: {latitude: 52.38333, longitude: 4.9, zoom: 12},
    isFavorite: true,
    isPremium: false,
    rating: 4,
  };
}

// Два избранных мока: комната и апартаменты в Амстердаме.
const favoriteOffers: OfferPreview[] = [
  {...makeOffer('2', 'Amsterdam', 'Wood and stone place'), type: 'room', price: 80},
  makeOffer('4', 'Amsterdam', 'Nice, cozy, warm big bed apartment'),
];

// Список содержит <Link> - нужен контекст роутера.
function renderFavoritesList(ui: ReactElement) {
  function RouterWrapper({children}: {children: ReactNode}) {
    return <MemoryRouter>{children}</MemoryRouter>;
  }

  return render(ui, {wrapper: RouterWrapper});
}

describe('FavoritesList', () => {
  it('groups favorite offers into a single Amsterdam section', () => {
    renderFavoritesList(<FavoritesList offers={favoriteOffers} />);

    expect(screen.getByRole('heading', {level: 1, name: 'Saved listing'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Amsterdam'})).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('renders compact row cards that link to their offers', () => {
    const {container} = renderFavoritesList(<FavoritesList offers={favoriteOffers} />);

    const cards = container.querySelectorAll('.place-card');
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.classList.contains('place-card--row')).toBe(true);
    }

    expect(screen.getByRole('link', {name: 'Wood and stone place'})).toHaveAttribute(
      'href',
      '/offer/2',
    );
    expect(screen.getByRole('link', {name: 'Nice, cozy, warm big bed apartment'})).toHaveAttribute(
      'href',
      '/offer/4',
    );
  });

  it('groups offers by city in first-appearance order', () => {
    const offers = [
      makeOffer('10', 'Amsterdam', 'Keizersgracht loft'),
      makeOffer('11', 'Cologne', 'Riverside room'),
      makeOffer('12', 'Amsterdam', 'Jordaan studio'),
      makeOffer('13', 'Paris', 'Montmartre flat'),
    ];

    const {container} = renderFavoritesList(<FavoritesList offers={offers} />);

    const groups = container.querySelectorAll('.favorites__group');
    expect(groups).toHaveLength(3);

    const cityTitles = screen.getAllByRole('heading', {level: 2});
    expect(cityTitles.map((title) => title.textContent)).toEqual([
      'Amsterdam',
      'Cologne',
      'Paris',
    ]);

    const firstGroup = groups[0];
    expect(firstGroup.querySelectorAll('.place-card')).toHaveLength(2);
  });

  it('reuses the row card layout with the bookmark button beside the info', () => {
    const {container} = renderFavoritesList(<FavoritesList offers={favoriteOffers} />);

    for (const card of Array.from(container.querySelectorAll('.place-card'))) {
      expect(card.querySelector('.bookmark')).not.toBeNull();
    }
  });
});
