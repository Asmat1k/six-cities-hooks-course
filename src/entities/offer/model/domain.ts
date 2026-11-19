// Типы сущности «предложение» по описанию сервера - PROJECT.md, раздел 9.2.
// Host принадлежит сущности user и приходит сюда через её cross-import API
// `@x` - так связь сущностей остаётся явной и точечной.

import type {Host} from '@/entities/user/@x/offer';

export interface Location {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface City {
  name: string;
  location: Location;
}

export type OfferType = 'apartment' | 'room' | 'house' | 'hotel';

// Краткое предложение - в списках (главная, избранное, «неподалёку»).
export interface OfferPreview {
  id: string;
  title: string;
  type: OfferType;
  price: number;
  previewImage: string;
  city: City;
  location: Location;
  isFavorite: boolean;
  isPremium: boolean;
  rating: number;
}

// Полное предложение - страница /offer/:id.
export type Offer = Omit<OfferPreview, 'previewImage'> & {
  description: string;
  bedrooms: number;
  goods: string[];
  host: Host;
  images: string[];
  maxAdults: number;
};

export interface Review {
  id: string;
  date: string;
  user: Host;
  comment: string;
  rating: number;
}
