// Моки предложений для КТ1 (этапы 1-3). Каталог src/mocks/ требует ТЗ
// (TASKS.md, этап 2); по решению ревью он остаётся единственным хранилищем
// данных. Типы приходят через публичные API сущностей FSD, а сами моки
// подключает только слой app и передаёт страницам через props.
//
// Одна исходная выборка обслуживает и краткие карточки, и страницы
// предложений: название, цена, ID и рейтинг всегда совпадают.

import type {City, Location, Offer, OfferPreview} from '@/entities/offer';

const AMSTERDAM: City = {
  name: 'Amsterdam',
  location: {
    latitude: 52.38333,
    longitude: 4.9,
    zoom: 10,
  },
};

function amsterdamLocation(latitude: number, longitude: number): Location {
  return {
    latitude,
    longitude,
    zoom: 12,
  };
}

// Полное описание мока: Offer плюс превью-фото для карточек.
type MockOffer = Offer & {
  previewImage: string;
};

const MOCK_OFFERS: MockOffer[] = [
  {
    id: '1',
    title: 'Beautiful & luxurious apartment at great location',
    type: 'apartment',
    price: 120,
    previewImage: '/img/offers/1.jpg',
    city: AMSTERDAM,
    location: amsterdamLocation(52.3909553943508, 4.85309666406198),
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
  },
  {
    id: '2',
    title: 'Wood and stone place',
    type: 'room',
    price: 80,
    previewImage: '/img/offers/2.jpg',
    city: AMSTERDAM,
    location: amsterdamLocation(52.367633, 4.904139),
    isFavorite: true,
    isPremium: false,
    rating: 4.3,
    description:
      'A carefully restored room with wooden beams and stone walls in a historic canal house.\n\nFive minutes on foot from the central station, with a bakery and a cheese shop around the corner.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Towels'],
    host: {
      name: 'Max',
      avatarUrl: '/img/avatars/avatar-max.svg',
      isPro: false,
    },
    images: [
      '/img/offers/2.jpg',
      '/img/offers/7.jpg',
      '/img/offers/9.jpg',
      '/img/offers/11.jpg',
    ],
    maxAdults: 1,
  },
  {
    id: '3',
    title: 'Canal View Prinsengracht',
    type: 'apartment',
    price: 132,
    previewImage: '/img/offers/3.jpg',
    city: AMSTERDAM,
    location: amsterdamLocation(52.371933, 4.884893),
    isFavorite: false,
    isPremium: false,
    rating: 3.1,
    description:
      'An apartment with a balcony right above the Prinsengracht canal.\n\nBoats pass by slowly, and in the evening the water reflects the street lamps - the best view in the city.',
    bedrooms: 2,
    goods: ['Wifi', 'Heating', 'Washing machine', 'Coffee machine', 'Cable TV'],
    host: {
      name: 'Leon',
      avatarUrl: '/img/avatars/avatar-leon.svg',
      isPro: false,
    },
    images: [
      '/img/offers/3.jpg',
      '/img/offers/13.jpg',
      '/img/offers/16.jpg',
      '/img/offers/17.jpg',
      '/img/offers/18.jpg',
    ],
    maxAdults: 2,
  },
  {
    id: '4',
    title: 'Nice, cozy, warm big bed apartment',
    type: 'apartment',
    price: 180,
    previewImage: '/img/offers/5.jpg',
    city: AMSTERDAM,
    location: amsterdamLocation(52.380212, 4.875381),
    isFavorite: true,
    isPremium: true,
    rating: 4.5,
    description:
      'A spacious family apartment with a huge bed and a view of the old town rooftops.\n\nThe kitchen has everything for a lazy breakfast, and the living room sofa is deep enough to forget about the plans for the evening.',
    bedrooms: 4,
    goods: [
      'Wifi',
      'Heating',
      'Kitchen',
      'Dishwasher',
      'Towels',
      'Washing machine',
      'Baby seat',
      'Fridge',
    ],
    host: {
      name: 'Sophia',
      avatarUrl: '/img/avatars/avatar-sophia.svg',
      isPro: true,
    },
    images: [
      '/img/offers/5.jpg',
      '/img/offers/14.jpg',
      '/img/offers/15.jpg',
      '/img/offers/16.jpg',
      '/img/offers/10.jpg',
      '/img/offers/12.jpg',
    ],
    maxAdults: 6,
  },
];

function toPreview(offer: MockOffer): OfferPreview {
  return {
    id: offer.id,
    title: offer.title,
    type: offer.type,
    price: offer.price,
    previewImage: offer.previewImage,
    city: offer.city,
    location: offer.location,
    isFavorite: offer.isFavorite,
    isPremium: offer.isPremium,
    rating: offer.rating,
  };
}

// Все предложения - для списка на главной.
export function getOffers(): OfferPreview[] {
  return MOCK_OFFERS.map(toPreview);
}

// Полное предложение по точному ID; неизвестный ID - undefined (маршрут 404).
export function getOfferById(id: string): Offer | undefined {
  const found = MOCK_OFFERS.find((item) => item.id === id);

  if (!found) {
    return undefined;
  }

  const {previewImage: _previewImage, ...offer} = found;
  return offer;
}

// «Предложения неподалёку»: остальные моки без текущего (в КТ1 все моки -
// один город, соседями показываем их; настоящий /nearby - этап 5).
export function getNearbyOffers(currentOfferId: string, count = 3): OfferPreview[] {
  return MOCK_OFFERS
    .filter((item) => item.id !== currentOfferId)
    .slice(0, count)
    .map(toPreview);
}

// Избранное: пока без сервера - это предложения моков с isFavorite.
export function getFavoriteOffers(): OfferPreview[] {
  return MOCK_OFFERS
    .filter((item) => item.isFavorite)
    .map(toPreview);
}

// Шесть городов приложения; в КТ1 город фиксирован - Amsterdam.
export const CITY_NAMES: readonly string[] = [
  'Paris',
  'Cologne',
  'Brussels',
  'Amsterdam',
  'Hamburg',
  'Dusseldorf',
];

export const ACTIVE_CITY_NAME = 'Amsterdam';
