import type {ReactElement, ReactNode} from 'react';
import {MemoryRouter} from 'react-router';
import {render, screen, within} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {OfferDetails} from './offer-details';
import type {Offer, OfferPreview, Review} from '@/entities/offer';

// Тесты страницы предложения (этап 2): рейтинг без округления, склонения
// Bedroom/Bedrooms и adult/adults, галерея до 6 фото, отзывы с датами,
// хозяин и соседние предложения. Срез pages не зависит от src/mocks (FSD:
// моки подключает только app), поэтому данные объявлены здесь и повторяют
// выборку моков; интеграцию с ней проверяет routes.test.tsx.

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: '1',
    title: 'Beautiful & luxurious apartment at great location',
    type: 'apartment',
    price: 120,
    city: {name: 'Amsterdam', location: {latitude: 52.38333, longitude: 4.9, zoom: 10}},
    location: {latitude: 52.3909553943508, longitude: 4.85309666406198, zoom: 12},
    isFavorite: false,
    isPremium: true,
    rating: 4.8,
    description:
      'A quiet cozy and picturesque that hides behind a river by the unique lightness of Amsterdam. The building is green and from 18th century.\n\nAn independent house, strategically located between Rembrand Square and National Opera, but where the bustle of the city comes to rest in this alley flowery and colorful.',
    bedrooms: 3,
    goods: [
      'Wifi',
      'Washing machine',
      'Towels',
      'Heating',
      'Coffee machine',
      'Baby seat',
      'Kitchen',
      'Dishwasher',
      'Cable TV',
      'Fridge',
    ],
    host: {
      name: 'Angelina',
      avatarUrl: '/img/avatars/avatar-angelina.svg',
      isPro: true,
    },
    images: [
      '/img/offers/1.jpg',
      '/img/offers/4.jpg',
      '/img/offers/6.jpg',
      '/img/offers/8.jpg',
      '/img/offers/10.jpg',
      '/img/offers/12.jpg',
    ],
    maxAdults: 4,
    ...overrides,
  };
}

function makeReview(id: string, name: string, date: string, rating: number): Review {
  return {
    id,
    date,
    user: {name, avatarUrl: `/img/avatars/${id}.svg`, isPro: false},
    comment: `Review from ${name}.`,
    rating,
  };
}

const offer: Offer = makeOffer();

const reviews: Review[] = [
  makeReview('r1', 'Max', '2019-04-24', 4),
  makeReview('r2', 'Sophie', '2019-04-12', 5),
  makeReview('r3', 'Christopher', '2019-04-03', 3),
  makeReview('r4', 'Oliver', '2018-08-14', 5),
];

function makePreview(id: string, title: string): OfferPreview {
  return {
    id,
    title,
    type: 'apartment',
    price: 100,
    previewImage: `/img/offers/${id}.jpg`,
    city: {name: 'Amsterdam', location: {latitude: 52.38333, longitude: 4.9, zoom: 10}},
    location: {latitude: 52.38333, longitude: 4.9, zoom: 12},
    isFavorite: false,
    isPremium: false,
    rating: 4,
  };
}

const nearbyOffers: OfferPreview[] = [
  makePreview('2', 'Wood and stone place'),
  makePreview('3', 'Canal View Prinsengracht'),
  makePreview('4', 'Nice, cozy, warm big bed apartment'),
];

// Экран содержит <Link> - нужен контекст роутера.
function renderOfferDetails(props: Partial<Parameters<typeof OfferDetails>[0]> = {}) {
  function RouterWrapper({children}: {children: ReactNode}) {
    return <MemoryRouter>{children}</MemoryRouter>;
  }

  const ui: ReactElement = (
    <OfferDetails
      offer={props.offer ?? offer}
      reviews={props.reviews ?? reviews}
      nearbyOffers={props.nearbyOffers ?? nearbyOffers}
      isAuthorized={props.isAuthorized ?? false}
    />
  );

  return render(ui, {wrapper: RouterWrapper});
}

describe('OfferDetails', () => {
  it('renders title, unrounded rating value, price and premium badge from mocks', () => {
    renderOfferDetails();

    expect(screen.getByRole('heading', {level: 1, name: offer.title})).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('€120')).toBeInTheDocument();
    // Метка Premium есть и на карточках соседей - проверяем именно шапку страницы.
    expect(screen.getByText('Premium', {selector: '.offer__badge'})).toBeInTheDocument();
  });

  it('renders the booking bookmark disabled (favorites toggle is out of KT1)', () => {
    renderOfferDetails();

    const booking = screen.getByRole('complementary', {name: 'Booking'});
    expect(within(booking).getByRole('button', {name: 'Add to favorites'})).toBeDisabled();
  });

  it('shows at most six gallery images', () => {
    renderOfferDetails();

    const gallery = screen.getByLabelText('Photos');
    expect(gallery.querySelectorAll('.gallery__item')).toHaveLength(6);
  });

  it('pluralizes bedrooms and adults: 3 Bedrooms, Max 4 adults', () => {
    renderOfferDetails();

    expect(screen.getByText('3 Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('Max 4 adults')).toBeInTheDocument();
    expect(screen.getByText('Apartment', {exact: true})).toBeInTheDocument();
  });

  it('pluralizes the singular form: 1 Bedroom, Max 1 adult', () => {
    const singularOffer: Offer = {
      ...offer,
      bedrooms: 1,
      maxAdults: 1,
    };

    renderOfferDetails({offer: singularOffer, reviews: [], nearbyOffers: []});

    expect(screen.getByText('1 Bedroom')).toBeInTheDocument();
    expect(screen.getByText('Max 1 adult')).toBeInTheDocument();
  });

  it('renders the review count, newest first, and Month Year dates', () => {
    renderOfferDetails();

    expect(screen.getByRole('heading', {name: 'Reviews · 4'})).toBeInTheDocument();

    const dates = screen.getAllByText(/^[A-Z][a-z]+ \d{4}$/);

    // Новые сверху: первый отзыв - 2019-04-24, последний - 2018-08-14.
    expect(dates).toHaveLength(4);
    expect(dates[0]).toHaveTextContent('April 2019');
    expect(dates.at(-1)).toHaveTextContent('August 2018');
  });

  it('shows goods, pro host with a star, and the guest sign-in invite', () => {
    const {container} = renderOfferDetails();

    expect(screen.getByText('Wifi')).toBeInTheDocument();
    expect(screen.getByText('Fridge')).toBeInTheDocument();
    expect(screen.getByText('Angelina')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(container.querySelector('.host--pro')).toBeInTheDocument();

    const signIn = screen.getByRole('link', {name: 'Sign in'});
    expect(signIn).toHaveAttribute('href', '/login');
    expect(screen.getByText('to leave a review')).toBeInTheDocument();
  });

  it('hides the sign-in invite for the authorized user', () => {
    renderOfferDetails({isAuthorized: true});

    expect(screen.queryByText('to leave a review')).not.toBeInTheDocument();
  });

  it('renders three nearby offers with their card links', () => {
    renderOfferDetails();

    for (const nearbyOffer of nearbyOffers) {
      expect(screen.getByRole('link', {name: nearbyOffer.title})).toHaveAttribute(
        'href',
        `/offer/${nearbyOffer.id}`,
      );
    }
  });
});
