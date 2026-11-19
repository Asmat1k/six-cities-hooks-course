// Типы данных «Шести городов» по описанию сервера - PROJECT.md, раздел 9.2.

export interface Location {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface City {
  name: string;
  location: Location;
}

export interface Host {
  name: string;
  avatarUrl: string;
  isPro: boolean;
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

export type AuthInfo = Host & {
  email: string;
  token: string;
};
