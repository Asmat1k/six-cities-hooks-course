import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ReviewForm} from './review-form';
import type {UseReviewFormResult} from '@/hooks/use-review-form/use-review-form';

// Презентационный тест ошибки формы отзыва. Хук подменён целиком: через UI
// падающую отправку не подсунуть (это делает хук-тест use-review-form),
// здесь проверяется только ветка отрисовки status === 'error'.

const failedState: UseReviewFormResult = {
  rating: 4,
  text: 'A quiet cozy place with everything we needed for the weekend.',
  status: 'error',
  error: 'Something went wrong while sending your review. Please try again.',
  isValid: true,
  setRating: () => undefined,
  setText: () => undefined,
  submit: () => undefined,
};

vi.mock('@/hooks/use-review-form/use-review-form', () => ({
  useReviewForm: () => failedState,
}));

describe('ReviewForm error state', () => {
  it('shows the alert and keeps the form editable with data in place', () => {
    render(<ReviewForm offerId="7" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByLabelText('Review text')).toHaveValue(failedState.text);
    expect(screen.getByRole('radio', {name: 'good'})).toBeChecked();
    expect(screen.getByRole('button', {name: 'Submit'})).toBeEnabled();
  });
});
