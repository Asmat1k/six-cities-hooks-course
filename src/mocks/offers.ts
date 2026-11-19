// Моки предложений для КТ (этапы 2-6). Каталог src/mocks/ требует ТЗ
// (TASKS.md, этап 2); по решению ревью он остаётся единственным хранилищем
// данных. Типы приходят через публичные API сущностей FSD, а сами моки
// подключает только слой app и передаёт дальше через props либо Redux.
//
// Одна исходная выборка обслуживает и краткие карточки, и страницы
// предложений: название, цена, ID и рейтинг всегда совпадают.
//
// КТ2 (этап 6): предложений больше четырёх - они раскиданы по всем шести
// городам ТЗ, поэтому фильтр по городу и карта меняют выдачу при смене
// вкладки. Амстердамские моки (ID 1-4) не менялись: на них завязаны тесты
// КТ1. По ТЗ город по умолчанию - Paris.

import type {City, Location, Offer, OfferPreview} from '@/entities/offer';

function makeCity(name: string, latitude: number, longitude: number): City {
  return {
    name,
    location: {
      latitude,
      longitude,
      zoom: 10,
    },
  };
}

// Шесть городов ТЗ с координатами для центра карты (Яндекс Карты ждут
// [долготу, широту] - конвертация в хуке H5).
const AMSTERDAM = makeCity('Amsterdam', 52.38333, 4.9);
const PARIS = makeCity('Paris', 48.85661, 2.35222);
const COLOGNE = makeCity('Cologne', 50.938361, 6.959811);
const BRUSSELS = makeCity('Brussels', 50.846557, 4.351697);
const HAMBURG = makeCity('Hamburg', 53.550341, 10.000654);
const DUSSELDORF = makeCity('Dusseldorf', 51.225401, 6.776313);

export const CITY_NAMES: readonly string[] = [
  'Paris',
  'Cologne',
  'Brussels',
  'Amsterdam',
  'Hamburg',
  'Dusseldorf',
];

// Города по имени: вкладки отдают только имя, а карте нужен центр - этот
// справочник соединяет их без дублирования координат в компонентах.
export const CITIES: Readonly<Record<string, City>> = {
  Paris: PARIS,
  Cologne: COLOGNE,
  Brussels: BRUSSELS,
  Amsterdam: AMSTERDAM,
  Hamburg: HAMBURG,
  Dusseldorf: DUSSELDORF,
};

// Город по умолчанию из ТЗ (PROJECT.md, раздел 3.1).
export const DEFAULT_CITY_NAME = 'Paris';

function offerLocation(latitude: number, longitude: number): Location {
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
  // ---------- Paris (город по умолчанию) ----------
  {
    id: 'p1',
    title: 'Bright loft near Montmartre',
    type: 'apartment',
    price: 150,
    previewImage: '/img/offers/6.jpg',
    city: PARIS,
    location: offerLocation(48.8842, 2.3396),
    isFavorite: false,
    isPremium: true,
    rating: 4.9,
    description:
      'A light-filled loft two streets from Montmartre, with a rooftop view over the zinc rooftops of Paris.\n\nThe bakery downstairs opens at six, and the smell of croissants does the rest.',
    bedrooms: 2,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Coffee machine', 'Washing machine'],
    host: {
      name: 'Camille',
      avatarUrl: '/img/avatars/user-2.svg',
      isPro: true,
    },
    images: [
      '/img/offers/6.jpg',
      '/img/offers/8.jpg',
      '/img/offers/10.jpg',
      '/img/offers/12.jpg',
      '/img/offers/14.jpg',
    ],
    maxAdults: 3,
  },
  {
    id: 'p2',
    title: 'Cozy room by the Seine',
    type: 'room',
    price: 70,
    previewImage: '/img/offers/7.jpg',
    city: PARIS,
    location: offerLocation(48.8566, 2.3522),
    isFavorite: false,
    isPremium: false,
    rating: 3.5,
    description:
      'A small but impeccable room in an old building on the Left Bank, five minutes from the river.\n\nBooks, a kettle and a window onto a courtyard that stays quiet even in August.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Towels'],
    host: {
      name: 'Lucas',
      avatarUrl: '/img/avatars/user-4.svg',
      isPro: false,
    },
    images: ['/img/offers/7.jpg', '/img/offers/9.jpg', '/img/offers/11.jpg'],
    maxAdults: 1,
  },
  {
    id: 'p3',
    title: 'House with a garden in the Latin Quarter',
    type: 'house',
    price: 210,
    previewImage: '/img/offers/13.jpg',
    city: PARIS,
    location: offerLocation(48.8469, 2.3446),
    isFavorite: false,
    isPremium: false,
    rating: 4.2,
    description:
      'A rare thing in Paris: a whole house with a small garden behind a green door in the Latin Quarter.\n\nFour floors, a spiral staircase and a kitchen that has fed writers for a century.',
    bedrooms: 4,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Dishwasher', 'Fridge', 'Baby seat'],
    host: {
      name: 'Margaux',
      avatarUrl: '/img/avatars/user-5.svg',
      isPro: false,
    },
    images: [
      '/img/offers/13.jpg',
      '/img/offers/15.jpg',
      '/img/offers/16.jpg',
      '/img/offers/17.jpg',
    ],
    maxAdults: 6,
  },
  {
    id: 'p4',
    title: 'Hotel suite with the Eiffel Tower view',
    type: 'hotel',
    price: 320,
    previewImage: '/img/offers/8.jpg',
    city: PARIS,
    location: offerLocation(48.8577, 2.295),
    isFavorite: false,
    isPremium: true,
    rating: 4.7,
    description:
      'A corner suite on the seventh floor: the Tower stands in the window as if painted there, and sparkles on the hour.\n\nConcierge, breakfast on the terrace, and the kind of silence money usually cannot buy near Champ de Mars.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Cable TV', 'Washing machine', 'Fridge'],
    host: {
      name: 'Hotel Rivoli',
      avatarUrl: '/img/avatars/user-7.svg',
      isPro: true,
    },
    images: [
      '/img/offers/8.jpg',
      '/img/offers/10.jpg',
      '/img/offers/12.jpg',
      '/img/offers/14.jpg',
      '/img/offers/16.jpg',
      '/img/offers/18.jpg',
    ],
    maxAdults: 2,
  },

  // ---------- Cologne ----------
  {
    id: 'c1',
    title: 'Rhine view apartment',
    type: 'apartment',
    price: 130,
    previewImage: '/img/offers/9.jpg',
    city: COLOGNE,
    location: offerLocation(50.9381, 6.9603),
    isFavorite: false,
    isPremium: true,
    rating: 4.4,
    description:
      'A modern apartment on the right bank of the Rhine, with the cathedral filling the window.\n\nThe tram at the door crosses the river in three minutes; beer gardens are closer still.',
    bedrooms: 2,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Dishwasher', 'Cable TV'],
    host: {
      name: 'Annika',
      avatarUrl: '/img/avatars/user-6.svg',
      isPro: false,
    },
    images: ['/img/offers/9.jpg', '/img/offers/11.jpg', '/img/offers/13.jpg'],
    maxAdults: 4,
  },
  {
    id: 'c2',
    title: 'Quiet room near the Cathedral',
    type: 'room',
    price: 65,
    previewImage: '/img/offers/10.jpg',
    city: COLOGNE,
    location: offerLocation(50.9413, 6.9583),
    isFavorite: false,
    isPremium: false,
    rating: 3.8,
    description:
      'A plain, clean room in an old townhouse: the cathedral bells are loud, but double glazing keeps them polite.\n\nBakeries, the station and the museum mile are all a short walk away.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Towels'],
    host: {
      name: 'Jonas',
      avatarUrl: '/img/avatars/user-8.svg',
      isPro: false,
    },
    images: ['/img/offers/10.jpg', '/img/offers/12.jpg'],
    maxAdults: 2,
  },
  {
    id: 'c3',
    title: 'Studio in the Belgian quarter',
    type: 'apartment',
    price: 88,
    previewImage: '/img/offers/13.jpg',
    city: COLOGNE,
    location: offerLocation(50.9351, 6.9432),
    isFavorite: false,
    isPremium: false,
    rating: 4.1,
    description:
      'A bright studio in the Belgian quarter: cafes on the doorstep and the cathedral a ten-minute walk.\n\nBikes live in the hallway, and the tram two streets away covers the rest of the city.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Washing machine'],
    host: {
      name: 'Miriam',
      avatarUrl: '/img/avatars/user-2.svg',
      isPro: false,
    },
    images: ['/img/offers/13.jpg', '/img/offers/5.jpg'],
    maxAdults: 2,
  },
  {
    id: 'c4',
    title: 'Hotel room by the Opera',
    type: 'hotel',
    price: 210,
    previewImage: '/img/offers/6.jpg',
    city: COLOGNE,
    location: offerLocation(50.9335, 6.9578),
    isFavorite: false,
    isPremium: true,
    rating: 4.6,
    description:
      'A corner hotel room off the Opernplatz: blackout curtains, a deep tub and breakfast until eleven.\n\nThe opera house shares the square, and the Rhine promenade is one block down.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Cable TV', 'Towels', 'Coffee machine'],
    host: {
      name: 'Koln Hotel Group',
      avatarUrl: '/img/avatars/user-7.svg',
      isPro: true,
    },
    images: ['/img/offers/6.jpg', '/img/offers/9.jpg', '/img/offers/13.jpg'],
    maxAdults: 2,
  },

  // ---------- Brussels ----------
  {
    id: 'b1',
    title: 'Grand Place apartment',
    type: 'apartment',
    price: 140,
    previewImage: '/img/offers/11.jpg',
    city: BRUSSELS,
    location: offerLocation(50.8467, 4.3525),
    isFavorite: false,
    isPremium: true,
    rating: 4.6,
    description:
      'An apartment above the gabled roofs a street away from Grand Place: step out and you are in the postcard.\n\nWaffles, chocolate and two hundred beers are within a five-minute radius.',
    bedrooms: 2,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Coffee machine', 'Fridge'],
    host: {
      name: 'Elise',
      avatarUrl: '/img/avatars/user-9.svg',
      isPro: true,
    },
    images: ['/img/offers/11.jpg', '/img/offers/14.jpg', '/img/offers/17.jpg'],
    maxAdults: 3,
  },
  {
    id: 'b2',
    title: 'Loft near Atomium',
    type: 'apartment',
    price: 175,
    previewImage: '/img/offers/12.jpg',
    city: BRUSSELS,
    location: offerLocation(50.8949, 4.3417),
    isFavorite: false,
    isPremium: false,
    rating: 4.1,
    description:
      'A brick loft in a former print shop near the Atomium park, with skylights and a mezzanine bed.\n\nThe metro is four stops from the centre; the park around is where the city goes to breathe.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Washing machine', 'Dishwasher'],
    host: {
      name: 'Ruben',
      avatarUrl: '/img/avatars/user-10.svg',
      isPro: false,
    },
    images: ['/img/offers/12.jpg', '/img/offers/15.jpg', '/img/offers/18.jpg'],
    maxAdults: 2,
  },
  {
    id: 'b3',
    title: 'Budget room in Ixelles',
    type: 'room',
    price: 55,
    previewImage: '/img/offers/14.jpg',
    city: BRUSSELS,
    location: offerLocation(50.8265, 4.3719),
    isFavorite: false,
    isPremium: false,
    rating: 3.2,
    description:
      'A student-grade room in Ixelles: modest, honest and unbeatable for the price.\n\nThe ponds, the flea market and the best fries in Brussels are around the corner.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating'],
    host: {
      name: 'Nora',
      avatarUrl: '/img/avatars/user-1.svg',
      isPro: false,
    },
    images: ['/img/offers/14.jpg', '/img/offers/16.jpg'],
    maxAdults: 1,
  },
  {
    id: 'b4',
    title: 'Art nouveau house in Ixelles',
    type: 'house',
    price: 195,
    previewImage: '/img/offers/9.jpg',
    city: BRUSSELS,
    location: offerLocation(50.8335, 4.3622),
    isFavorite: false,
    isPremium: true,
    rating: 4.4,
    description:
      'A restored art nouveau house with stained glass in the stairwell and a small garden behind the kitchen.\n\nThe Ixelles ponds and the weekend flea market are both a five-minute walk.',
    bedrooms: 3,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Washing machine', 'Fridge', 'Cable TV'],
    host: {
      name: 'Colette',
      avatarUrl: '/img/avatars/user-4.svg',
      isPro: false,
    },
    images: ['/img/offers/9.jpg', '/img/offers/12.jpg', '/img/offers/16.jpg'],
    maxAdults: 6,
  },

  // ---------- Amsterdam (моки КТ1, ID 1-4, без изменений) ----------
  {
    id: '1',
    title: 'Beautiful & luxurious apartment at great location',
    type: 'apartment',
    price: 120,
    previewImage: '/img/offers/1.jpg',
    city: AMSTERDAM,
    location: offerLocation(52.3909553943508, 4.85309666406198),
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
    location: offerLocation(52.367633, 4.904139),
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
    location: offerLocation(52.371933, 4.884893),
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
    location: offerLocation(52.380212, 4.875381),
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

  // ---------- Hamburg ----------
  {
    id: 'h1',
    title: 'Harbor view apartment',
    type: 'apartment',
    price: 160,
    previewImage: '/img/offers/15.jpg',
    city: HAMBURG,
    location: offerLocation(53.5413, 9.9841),
    isFavorite: false,
    isPremium: true,
    rating: 4.5,
    description:
      'An apartment in a red-brick warehouse with a balcony over the harbor: cranes, ferries and the Elbphilharmonie in one sweep.\n\nIn the morning the fish market is a ten-minute stroll along the water.',
    bedrooms: 2,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Dishwasher', 'Washing machine'],
    host: {
      name: 'Klaus',
      avatarUrl: '/img/avatars/user-3.svg',
      isPro: false,
    },
    images: ['/img/offers/15.jpg', '/img/offers/17.jpg', '/img/offers/18.jpg'],
    maxAdults: 4,
  },
  {
    id: 'h2',
    title: 'Alster lake house',
    type: 'house',
    price: 240,
    previewImage: '/img/offers/16.jpg',
    city: HAMBURG,
    location: offerLocation(53.5646, 10.0134),
    isFavorite: false,
    isPremium: false,
    rating: 4.8,
    description:
      'A white house with its own dock on the Outer Alster: sailboats pass the window all day long.\n\nCoffee on the terrace in the morning, and the city centre is one ferry stop away.',
    bedrooms: 3,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Fridge', 'Baby seat', 'Cable TV'],
    host: {
      name: 'Heike',
      avatarUrl: '/img/avatars/user-5.svg',
      isPro: true,
    },
    images: ['/img/offers/16.jpg', '/img/offers/10.jpg', '/img/offers/14.jpg'],
    maxAdults: 5,
  },
  {
    id: 'h3',
    title: 'St Pauli walk-up flat',
    type: 'apartment',
    price: 105,
    previewImage: '/img/offers/3.jpg',
    city: HAMBURG,
    location: offerLocation(53.5511, 9.9631),
    isFavorite: false,
    isPremium: false,
    rating: 3.6,
    description:
      'A fourth-floor walk-up in St Pauli: harbor fog in the mornings, the fish market on Sundays and the Reeperbahn two streets over.\n\nThe U-Bahn at the corner reaches the centre in eight minutes.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Kitchen'],
    host: {
      name: 'Timm',
      avatarUrl: '/img/avatars/user-8.svg',
      isPro: false,
    },
    images: ['/img/offers/3.jpg', '/img/offers/11.jpg'],
    maxAdults: 3,
  },
  {
    id: 'h4',
    title: 'Elbe penthouse with a terrace',
    type: 'apartment',
    price: 330,
    previewImage: '/img/offers/7.jpg',
    city: HAMBURG,
    location: offerLocation(53.5313, 9.9761),
    isFavorite: false,
    isPremium: true,
    rating: 4.9,
    description:
      'A penthouse above the Elbe with a terrace wide enough for a long table: container ships slide by all evening.\n\nThe landlord leaves two bikes in the cellar for the dike route.',
    bedrooms: 3,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Dishwasher', 'Fridge', 'Baby seat'],
    host: {
      name: 'Greta',
      avatarUrl: '/img/avatars/user-1.svg',
      isPro: true,
    },
    images: ['/img/offers/7.jpg', '/img/offers/15.jpg', '/img/offers/18.jpg'],
    maxAdults: 5,
  },

  // ---------- Dusseldorf ----------
  {
    id: 'd1',
    title: 'Modern flat near Konigsallee',
    type: 'apartment',
    price: 190,
    previewImage: '/img/offers/17.jpg',
    city: DUSSELDORF,
    location: offerLocation(51.2245, 6.7763),
    isFavorite: false,
    isPremium: true,
    rating: 4.3,
    description:
      'A sleek flat in a new building a block from the Konigsallee: floor-to-ceiling windows, oak floors, everything at walking distance.\n\nThe old town with its brewery alleys is across the canal.',
    bedrooms: 2,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Coffee machine', 'Dishwasher', 'Fridge'],
    host: {
      name: 'Stefan',
      avatarUrl: '/img/avatars/user-6.svg',
      isPro: false,
    },
    images: ['/img/offers/17.jpg', '/img/offers/8.jpg', '/img/offers/11.jpg'],
    maxAdults: 3,
  },
  {
    id: 'd2',
    title: 'Riverside hotel room',
    type: 'hotel',
    price: 110,
    previewImage: '/img/offers/18.jpg',
    city: DUSSELDORF,
    location: offerLocation(51.2217, 6.7716),
    isFavorite: false,
    isPremium: false,
    rating: 3.9,
    description:
      'A hotel room facing the Rhine promenade: river traffic instead of television, and the sunset is included.\n\nBreakfast is served with a view of the towers on the far bank.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Cable TV', 'Towels'],
    host: {
      name: 'Rheinblick Hotel',
      avatarUrl: '/img/avatars/user-9.svg',
      isPro: true,
    },
    images: ['/img/offers/18.jpg', '/img/offers/12.jpg'],
    maxAdults: 2,
  },
  {
    id: 'd3',
    title: 'Attic studio in Bilk',
    type: 'apartment',
    price: 95,
    previewImage: '/img/offers/4.jpg',
    city: DUSSELDORF,
    location: offerLocation(51.2117, 6.7819),
    isFavorite: false,
    isPremium: false,
    rating: 4.0,
    description:
      'An attic studio under the roofs of Bilk, with skylights and a hammock between the beams.\n\nThe university quarter around it keeps the coffee cheap and the streets awake.',
    bedrooms: 1,
    goods: ['Wifi', 'Heating', 'Kitchen'],
    host: {
      name: 'Lena',
      avatarUrl: '/img/avatars/user-10.svg',
      isPro: false,
    },
    images: ['/img/offers/4.jpg', '/img/offers/6.jpg', '/img/offers/13.jpg'],
    maxAdults: 2,
  },
  {
    id: 'd4',
    title: 'Loft above the brewery alley',
    type: 'apartment',
    price: 145,
    previewImage: '/img/offers/2.jpg',
    city: DUSSELDORF,
    location: offerLocation(51.2269, 6.7741),
    isFavorite: false,
    isPremium: false,
    rating: 4.2,
    description:
      'A loft over the old town brewery alleys: the smell of malt on Fridays and the Rhine at the end of the street.\n\nNoise-locked windows keep the party outside where it belongs.',
    bedrooms: 2,
    goods: ['Wifi', 'Heating', 'Kitchen', 'Dishwasher', 'Towels'],
    host: {
      name: 'Bastian',
      avatarUrl: '/img/avatars/user-3.svg',
      isPro: false,
    },
    images: ['/img/offers/2.jpg', '/img/offers/10.jpg', '/img/offers/14.jpg'],
    maxAdults: 4,
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

// «Предложения неподалёку»: соседи - предложения того же города, кроме
// текущего, в порядке выборки. Настоящий /nearby - этап 7.
export function getNearbyOffers(currentOfferId: string, count = 3): OfferPreview[] {
  const current = MOCK_OFFERS.find((item) => item.id === currentOfferId);

  return MOCK_OFFERS
    .filter((item) => item.id !== currentOfferId && item.city.name === current?.city.name)
    .slice(0, count)
    .map(toPreview);
}

// Избранное: пока без сервера - это предложения моков с isFavorite.
export function getFavoriteOffers(): OfferPreview[] {
  return MOCK_OFFERS
    .filter((item) => item.isFavorite)
    .map(toPreview);
}
