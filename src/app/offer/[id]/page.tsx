import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {OfferDetails} from '@/components/offer-details/offer-details';
import {getAuthInfo} from '@/mocks/auth';
import {getNearbyOffers, getOfferById, getOfferIds} from '@/mocks/offers';
import {getReviewsByOfferId} from '@/mocks/reviews';
import '@/styles/pages/offer.css';

// Страница предложения `/offer/:id`: id приходит асинхронными `params`
// (App Router). Четыре известных ID пререндериваются сборкой, любые другие
// не попадают в маршрут вовсе (dynamicParams = false) -> 404.

export const dynamicParams = false;

export function generateStaticParams() {
  return getOfferIds().map((id) => ({id}));
}

interface OfferPageProps {
  params: Promise<{id: string}>;
}

export async function generateMetadata({params}: OfferPageProps): Promise<Metadata> {
  const {id} = await params;
  const offer = getOfferById(id);

  return {
    title: offer?.title ?? '404',
  };
}

export default async function OfferPage({params}: OfferPageProps) {
  const {id} = await params;
  const offer = getOfferById(id);

  if (!offer) {
    notFound();
  }

  const reviews = getReviewsByOfferId(offer.id);
  const nearbyOffers = getNearbyOffers(offer.id);
  const isAuthorized = getAuthInfo() !== null;

  return (
    <OfferDetails
      offer={offer}
      reviews={reviews}
      nearbyOffers={nearbyOffers}
      isAuthorized={isAuthorized}
    />
  );
}
