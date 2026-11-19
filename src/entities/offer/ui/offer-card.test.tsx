import type {ReactElement, ReactNode} from 'react';
import {MemoryRouter} from 'react-router';
import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {OfferCard} from './offer-card';
import type {OfferPreview} from '../model/domain';

// Тесты карточки предложения (этап 2): название, цена, тип, метка Premium,
// кнопка «Избранное» и ширина звёзд рейтинга при разных значениях.
//
// Срез entities не зависит от src/mocks (FSD: моки подключает только app),
// поэтому данные объявлены здесь и повторяют выборку моков: рейтинги
// 4.8 -> 5 -> 100%, 4.3 -> 4 -> 80%, 3.1 -> 3 -> 60%, 4.5 -> 5 -> 100%.
// Интеграцию карточки с настоящими моками проверяет routes.test.tsx.

function makeOffer(overrides: Partial<OfferPreview> = {}): OfferPreview {
  return {
    id: '1',
    title: 'Beautiful & luxurious apartment at great location',
    type: 'apartment',
    price: 120,
    previewImage: '/img/offers/1.jpg',
    city: {name: 'Amsterdam', location: {latitude: 52.38333, longitude: 4.9, zoom: 10}},
    location: {latitude: 52.3909553943508, longitude: 4.85309666406198, zoom: 12},
    isFavorite: false,
    isPremium: true,
    rating: 4.8,
    ...overrides,
  };
}

const premiumApartment = makeOffer();
const favoriteRoom = makeOffer({
  id: '2',
  title: 'Wood and stone place',
  type: 'room',
  price: 80,
  previewImage: '/img/offers/2.jpg',
  isFavorite: true,
  isPremium: false,
  rating: 4.3,
});
const canalView = makeOffer({
  id: '3',
  title: 'Canal View Prinsengracht',
  price: 132,
  previewImage: '/img/offers/3.jpg',
  isPremium: false,
  rating: 3.1,
});
const cozyApartment = makeOffer({
  id: '4',
  title: 'Nice, cozy, warm big bed apartment',
  price: 180,
  previewImage: '/img/offers/5.jpg',
  isFavorite: true,
  rating: 4.5,
});

// Заголовок карточки - <Link>, для него нужен контекст роутера.
function renderWithRouter(ui: ReactElement) {
  function RouterWrapper({children}: {children: ReactNode}) {
    return <MemoryRouter>{children}</MemoryRouter>;
  }

  return render(ui, {wrapper: RouterWrapper});
}

function getRatingPercent(container: HTMLElement): string {
  const fill = container.querySelector<HTMLElement>('.rating__fill');
  const style = fill?.getAttribute('style') ?? '';
  return /--rating:\s*([^;]+)/.exec(style)?.[1] ?? '';
}

describe('OfferCard', () => {
  it('renders data from mocks: title, price per night, type', () => {
    renderWithRouter(<OfferCard offer={premiumApartment} />);

    expect(screen.getByRole('heading', {name: premiumApartment.title})).toBeInTheDocument();
    expect(screen.getByText('€120')).toBeInTheDocument();
    expect(screen.getByText('/ night')).toBeInTheDocument();
    expect(screen.getByText('apartment')).toBeInTheDocument();
  });

  it('links the card title to its offer page', () => {
    renderWithRouter(<OfferCard offer={premiumApartment} />);

    expect(screen.getByRole('link', {name: premiumApartment.title})).toHaveAttribute(
      'href',
      '/offer/1',
    );
  });

  it('shows the Premium badge only for premium offers', () => {
    const {rerender} = renderWithRouter(<OfferCard offer={premiumApartment} />);
    expect(screen.getByText('Premium')).toBeInTheDocument();

    rerender(<OfferCard offer={favoriteRoom} />);
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });

  it('renders the bookmark disabled, pressed only for favorite offers', () => {
    const {rerender, container} = renderWithRouter(<OfferCard offer={premiumApartment} />);
    const addBookmark = screen.getByRole('button', {name: 'Add to favorites'});
    expect(addBookmark).toHaveAttribute('aria-pressed', 'false');
    // Переключение избранного - вне КТ1: кнопка недоступна для действия.
    expect(addBookmark).toBeDisabled();
    expect(container.querySelector('.bookmark--active')).not.toBeInTheDocument();

    rerender(<OfferCard offer={favoriteRoom} />);
    const removeBookmark = screen.getByRole('button', {name: 'Remove from favorites'});
    expect(removeBookmark).toHaveAttribute('aria-pressed', 'true');
    expect(removeBookmark).toBeDisabled();
    expect(container.querySelector('.bookmark--active')).toBeInTheDocument();
  });

  it('fills 100% of stars for rating 4.8 (rounds to 5)', () => {
    const {container} = renderWithRouter(<OfferCard offer={premiumApartment} />);

    expect(getRatingPercent(container)).toBe('100%');
    expect(screen.getByLabelText('Rating 5 of 5')).toBeInTheDocument();
  });

  it('fills 80% of stars for rating 4.3 (rounds to 4)', () => {
    const {container} = renderWithRouter(<OfferCard offer={favoriteRoom} />);

    expect(getRatingPercent(container)).toBe('80%');
    expect(screen.getByLabelText('Rating 4 of 5')).toBeInTheDocument();
  });

  it('fills 60% of stars for rating 3.1 (rounds to 3)', () => {
    const {container} = renderWithRouter(<OfferCard offer={canalView} />);

    expect(getRatingPercent(container)).toBe('60%');
    expect(screen.getByLabelText('Rating 3 of 5')).toBeInTheDocument();
  });

  it('fills 100% of stars for rating 4.5 (rounds to 5)', () => {
    const {container} = renderWithRouter(<OfferCard offer={cozyApartment} />);

    expect(getRatingPercent(container)).toBe('100%');
    expect(screen.getByLabelText('Rating 5 of 5')).toBeInTheDocument();
  });
});
