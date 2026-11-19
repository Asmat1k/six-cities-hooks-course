import type {OfferPreview} from '@/entities/offer';

// Модель сортировки главной (этап 6). Значения живут в адресе страницы
// (H4): `/?sort=price-asc&q=house`. Допустимых значений четыре; всё
// остальное (`?sort=abc`, отсутствие параметра) - Popular, без ошибки и
// без перезаписи адреса. Функция сортировки не мутирует вход: список
// копируется, Popular сохраняет порядок «как пришло».

export const SORT_VALUES = ['popular', 'price-asc', 'price-desc', 'top-rated'] as const;
export type SortValue = (typeof SORT_VALUES)[number];

export const DEFAULT_SORT_VALUE: SortValue = 'popular';

export const SORT_LABELS: Record<SortValue, string> = {
  'popular': 'Popular',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'top-rated': 'Top rated first',
};

export function parseSortValue(raw: string | null): SortValue {
  if (raw === null) {
    return DEFAULT_SORT_VALUE;
  }

  for (const sortValue of SORT_VALUES) {
    if (sortValue === raw) {
      return sortValue;
    }
  }

  // Некорректное значение - сортировка по умолчанию, без ошибки.
  return DEFAULT_SORT_VALUE;
}

function compareByPriceAscending(left: OfferPreview, right: OfferPreview): number {
  return left.price - right.price;
}

function compareByPriceDescending(left: OfferPreview, right: OfferPreview): number {
  return right.price - left.price;
}

function compareByRatingDescending(left: OfferPreview, right: OfferPreview): number {
  return right.rating - left.rating;
}

export function sortOffers(offers: readonly OfferPreview[], sortValue: SortValue): OfferPreview[] {
  const sortedOffers = [...offers];

  switch (sortValue) {
    case 'price-asc': {
      sortedOffers.sort(compareByPriceAscending);
      break;
    }
    case 'price-desc': {
      sortedOffers.sort(compareByPriceDescending);
      break;
    }
    case 'top-rated': {
      sortedOffers.sort(compareByRatingDescending);
      break;
    }
    case 'popular': {
      // Порядок «как пришло»: мок-выборка уже отсортирована популярностью,
      // сервер на этапе 7 отдаёт свой порядок - его и сохраняем.
      break;
    }
  }

  return sortedOffers;
}
