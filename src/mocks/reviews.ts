// Моки отзывов для страницы предложения (КТ1, этапы 1-3).
// Настоящий GET /comments/{offerId} появится на этапе 7. Тип Review -
// через публичный API сущности offer (FSD).

import type {Review} from '@/entities/offer';

const REVIEWS_BY_OFFER_ID: Record<string, Review[]> = {
  '1': [
    {
      id: 'r1',
      date: '2019-04-24',
      user: {
        name: 'Max',
        avatarUrl: '/img/avatars/user-1.svg',
        isPro: false,
      },
      comment:
        'A quiet cozy and picturesque that hides behind a river by the unique lightness of Amsterdam. The building is green and from 18th century.',
      rating: 4,
    },
    {
      id: 'r2',
      date: '2019-04-12',
      user: {
        name: 'Sophie',
        avatarUrl: '/img/avatars/user-2.svg',
        isPro: false,
      },
      comment:
        'Great location, five minutes to the canals. The bed is huge and the kitchen has everything you need for a lazy breakfast.',
      rating: 5,
    },
    {
      id: 'r3',
      date: '2019-04-03',
      user: {
        name: 'Christopher',
        avatarUrl: '/img/avatars/user-4.svg',
        isPro: false,
      },
      comment:
        'Nice and clean, but the street gets noisy on Friday nights. Angelina answered every question within minutes.',
      rating: 3,
    },
    {
      id: 'r4',
      date: '2018-08-14',
      user: {
        name: 'Oliver',
        avatarUrl: '/img/avatars/user-5.svg',
        isPro: false,
      },
      comment:
        'We stayed here two years in a row and both times it felt like coming home. Would book again without hesitation.',
      rating: 5,
    },
  ],
  '2': [
    {
      id: 'r5',
      date: '2019-06-02',
      user: {
        name: 'Amelia',
        avatarUrl: '/img/avatars/user-6.svg',
        isPro: false,
      },
      comment:
        'The wooden beams give the room a warm hostel feel, but everything is spotless and the bed is comfortable.',
      rating: 5,
    },
    {
      id: 'r6',
      date: '2019-05-20',
      user: {
        name: 'Jack',
        avatarUrl: '/img/avatars/user-7.svg',
        isPro: false,
      },
      comment:
        'Good value for the price. The stairs to the room are steep, so keep that in mind with a big suitcase.',
      rating: 4,
    },
  ],
  '3': [
    {
      id: 'r7',
      date: '2020-01-15',
      user: {
        name: 'Isabella',
        avatarUrl: '/img/avatars/user-8.svg',
        isPro: false,
      },
      comment:
        'The balcony is the real deal - we drank coffee every morning watching the boats. The apartment itself is a bit worn.',
      rating: 3,
    },
  ],
  '4': [
    {
      id: 'r8',
      date: '2019-03-08',
      user: {
        name: 'Noah',
        avatarUrl: '/img/avatars/user-9.svg',
        isPro: false,
      },
      comment:
        'Perfect for our family of five. The big bed is as huge as promised, and the kids loved the rooftop view.',
      rating: 5,
    },
    {
      id: 'r9',
      date: '2019-07-30',
      user: {
        name: 'Sophie',
        avatarUrl: '/img/avatars/user-2.svg',
        isPro: false,
      },
      comment:
        'Spacious and bright. The dishwasher and the washing machine saved us a lot of time with two small children.',
      rating: 4,
    },
    {
      id: 'r10',
      date: '2019-12-01',
      user: {
        name: 'Emma',
        avatarUrl: '/img/avatars/user-10.svg',
        isPro: false,
      },
      comment:
        'We spent New Year here. Warm, cozy and quiet despite the holiday crowds outside on the canals.',
      rating: 5,
    },
  ],
};

// Отзывы предложения, новые сверху. В КТ1 показываем все (лимит 10 - этап 5).
export function getReviewsByOfferId(offerId: string): Review[] {
  const reviews = REVIEWS_BY_OFFER_ID[offerId] ?? [];

  return [...reviews].sort((first, second) => second.date.localeCompare(first.date));
}
