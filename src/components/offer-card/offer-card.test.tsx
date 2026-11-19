import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {OfferCard} from './offer-card';
import {getOffers} from '@/mocks/offers';

// Тесты карточки предложения (этап 2): название, цена, тип, метка Premium,
// кнопка «Избранное» и ширина звёзд рейтинга при разных значениях.
// Данные берём из моков - тест подтверждает и сами моки, и округление:
// в выборке есть рейтинги 4.8 -> 5 -> 100%, 4.3 -> 4 -> 80%,
// 3.1 -> 3 -> 60% и 4.5 -> 5 -> 100%.

function getRatingPercent(container: HTMLElement): string {
  const fill = container.querySelector<HTMLElement>('.rating__fill');
  const style = fill?.getAttribute('style') ?? '';
  return /--rating:\s*([^;]+)/.exec(style)?.[1] ?? '';
}

describe('OfferCard', () => {
  const offers = getOffers();
  const [premiumApartment, favoriteRoom, canalView, cozyApartment] = offers;

  it('renders data from mocks: title, price per night, type', () => {
    render(<OfferCard offer={premiumApartment} />);

    expect(screen.getByRole('heading', {name: premiumApartment.title})).toBeInTheDocument();
    expect(screen.getByText('€120')).toBeInTheDocument();
    expect(screen.getByText('/ night')).toBeInTheDocument();
    expect(screen.getByText('apartment')).toBeInTheDocument();
  });

  it('links the card title to its offer page', () => {
    render(<OfferCard offer={premiumApartment} />);

    expect(screen.getByRole('link', {name: premiumApartment.title})).toHaveAttribute(
      'href',
      '/offer/1',
    );
  });

  it('shows the Premium badge only for premium offers', () => {
    const {rerender} = render(<OfferCard offer={premiumApartment} />);
    expect(screen.getByText('Premium')).toBeInTheDocument();

    rerender(<OfferCard offer={favoriteRoom} />);
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });

  it('renders the bookmark disabled, pressed only for favorite offers', () => {
    const {rerender, container} = render(<OfferCard offer={premiumApartment} />);
    const addBookmark = screen.getByRole('button', {name: 'Add to favorites'});
    expect(addBookmark).toHaveAttribute('aria-pressed', 'false');
    // Переключение избранного - вне КТ1: кнопка недоступна для действия.
    expect(addBookmark).toBeDisabled();
    expect(container.querySelector('.bookmark--active')).not.toBeInTheDocument();

    rerender(<OfferCard offer={favoriteRoom} />);
    const removeBookmark = screen.getByRole('button', {name: 'Remove from favorites'});
    expect(removeBookmark).toHaveAttribute('aria-pressed', 'true');
    expect(removeBookmark).toBeDisabled();
    expect(container.querySelector('.bookmark--active')).toBeInTheDocument();
  });

  it('fills 100% of stars for rating 4.8 (rounds to 5)', () => {
    const {container} = render(<OfferCard offer={premiumApartment} />);

    expect(getRatingPercent(container)).toBe('100%');
    expect(screen.getByLabelText('Rating 5 of 5')).toBeInTheDocument();
  });

  it('fills 80% of stars for rating 4.3 (rounds to 4)', () => {
    const {container} = render(<OfferCard offer={favoriteRoom} />);

    expect(getRatingPercent(container)).toBe('80%');
    expect(screen.getByLabelText('Rating 4 of 5')).toBeInTheDocument();
  });

  it('fills 60% of stars for rating 3.1 (rounds to 3)', () => {
    const {container} = render(<OfferCard offer={canalView} />);

    expect(getRatingPercent(container)).toBe('60%');
    expect(screen.getByLabelText('Rating 3 of 5')).toBeInTheDocument();
  });

  it('fills 100% of stars for rating 4.5 (rounds to 5)', () => {
    const {container} = render(<OfferCard offer={cozyApartment} />);

    expect(getRatingPercent(container)).toBe('100%');
    expect(screen.getByLabelText('Rating 5 of 5')).toBeInTheDocument();
  });
});
