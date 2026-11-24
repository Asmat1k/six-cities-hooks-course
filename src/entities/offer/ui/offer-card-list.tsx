import type {OfferPreview} from '../model/domain';
import {OfferCard} from './offer-card';

// Общий список предложений (этап 5): перебор с ключами и той же карточкой
// переиспользуется на главной, на странице предложения (соседние) и в
// избранном, а не копируется. Контейнер остаётся за вызовом - у главной
// сетка, у соседей и избранного свои классы. onActiveChange передаёт только
// главная: подсветка маркера по наведению, по ТЗ, работает лишь там.

interface OfferCardListProps {
  offers: readonly OfferPreview[];
  variant?: 'grid' | 'row';
  activeOfferId?: string | null;
  onActiveChange?: (offerId: string | null) => void;
}

export function OfferCardList({offers, variant, activeOfferId, onActiveChange}: OfferCardListProps) {
  return (
    <>
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          variant={variant}
          isActive={offer.id === activeOfferId}
          onActiveChange={onActiveChange}
        />
      ))}
    </>
  );
}
