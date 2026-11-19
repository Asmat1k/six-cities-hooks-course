import {render, screen, within} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {OfferDetails} from './offer-details';
import type {Offer, OfferPreview} from '@/types/domain';
import {getNearbyOffers, getOfferById, getOffers} from '@/mocks/offers';
import {getReviewsByOfferId} from '@/mocks/reviews';

// Тесты страницы предложения (этап 2): рейтинг без округления, склонения
// Bedroom/Bedrooms и adult/adults, галерея до 6 фото, отзывы с датами,
// хозяин и соседние предложения. Данные - из моков.

const offerFromMocks = getOfferById('1');

if (!offerFromMocks) {
  throw new Error('mock offer with id 1 is required for these tests');
}

// Отдельная константа с объявленным типом: сужение `if` выше не должно
// проникать в замыкания через контроль-флоу, тип фиксируем явно.
const offer: Offer = offerFromMocks;

const reviews = getReviewsByOfferId('1');
const nearbyOffers = getNearbyOffers('1');

function renderOfferDetails(props: Partial<Parameters<typeof OfferDetails>[0]> = {}) {
  return render(
    <OfferDetails
      offer={props.offer ?? offer}
      reviews={props.reviews ?? reviews}
      nearbyOffers={props.nearbyOffers ?? nearbyOffers}
      isAuthorized={props.isAuthorized ?? false}
    />,
  );
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

    // Новые сверху: первый отзыв в моках - 2019-04-24, последний - 2018-08-14.
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

describe('offer mocks', () => {
  it('provide preview-shaped nearby offers and ids 1-4', () => {
    const previews: OfferPreview[] = getNearbyOffers('1');

    expect(previews).toHaveLength(3);
    expect(previews.every((preview) => !('host' in preview))).toBe(true);
    expect(getOffers().map((preview) => preview.id)).toEqual(['1', '2', '3', '4']);
  });
});
