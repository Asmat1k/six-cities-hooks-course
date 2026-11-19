import type {Offer, OfferPreview, Review} from '@/entities/offer';
import {OfferDetails} from './offer-details';
import './offer.css';

// Страница предложения `/offer/:id`: полный экран OfferDetails с заголовком
// вкладки по названию предложения. ID и данные подбирает адаптер в слое app,
// поэтому здесь - только отображение полученных props.

interface OfferPageProps {
  offer: Offer;
  reviews: Review[];
  nearbyOffers: OfferPreview[];
  isAuthorized: boolean;
}

export function OfferPage({offer, reviews, nearbyOffers, isAuthorized}: OfferPageProps) {
  return (
    <>
      <title>{`Six Cities - ${offer.title}`}</title>

      <OfferDetails
        offer={offer}
        reviews={reviews}
        nearbyOffers={nearbyOffers}
        isAuthorized={isAuthorized}
      />
    </>
  );
}
