import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ReviewForm} from './review-form';
import {SUBMIT_STUB_DELAY_MS} from '@/hooks/use-review-form/use-review-form';
import {STORAGE_PREFIX} from '@/shared/config/variant';

// Тесты формы отзыва на настоящем хуке и настоящей заглушке отправки:
// звёзды оценки, валидация кнопки, черновик в localStorage, блокировка
// во время отправки, успех с очисткой и удалением черновика, а также
// синхронизация полей с черновиком из другой вкладки (H6, событие
// storage). Отрисовку ошибки проверяет отдельно review-form-error.test.tsx.

const OFFER_ID = '7';
const DRAFT_KEY = `${STORAGE_PREFIX}-draft-${OFFER_ID}`;
const VALID_TEXT = 'A quiet cozy place with everything we needed for the weekend.';

function typeValidText() {
  fireEvent.change(screen.getByLabelText('Review text'), {target: {value: VALID_TEXT}});
}

function fillValidForm() {
  fireEvent.click(screen.getByRole('radio', {name: 'good'}));
  typeValidText();
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('ReviewForm', () => {
  it('renders the rating options and the disabled submit button', () => {
    render(<ReviewForm offerId={OFFER_ID} />);

    for (const label of ['terribly', 'badly', 'not bad', 'good', 'perfect']) {
      expect(screen.getByRole('radio', {name: label})).toBeInTheDocument();
    }

    expect(screen.getByRole('button', {name: 'Submit'})).toBeDisabled();
  });

  it('enables Submit only with a rating and enough text', () => {
    render(<ReviewForm offerId={OFFER_ID} />);

    typeValidText();
    expect(screen.getByRole('button', {name: 'Submit'})).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', {name: 'perfect'}));
    expect(screen.getByRole('button', {name: 'Submit'})).toBeEnabled();
  });

  it('restores the draft from localStorage', () => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({rating: 4, text: 'Saved while typing earlier.'}),
    );

    render(<ReviewForm offerId={OFFER_ID} />);

    expect(screen.getByRole('radio', {name: 'good'})).toBeChecked();
    expect(screen.getByLabelText('Review text')).toHaveValue('Saved while typing earlier.');
  });

  it('blocks the whole form while the stub submit is in flight', async () => {
    render(<ReviewForm offerId={OFFER_ID} />);

    fillValidForm();
    fireEvent.click(screen.getByRole('button', {name: 'Submit'}));

    expect(screen.getByRole('button', {name: 'Submitting…'})).toBeDisabled();
    expect(screen.getByLabelText('Review text')).toBeDisabled();
    expect(screen.getByRole('radio', {name: 'perfect'})).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SUBMIT_STUB_DELAY_MS);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Your review has been posted.');
    expect(screen.getByLabelText('Review text')).toHaveValue('');
    expect(screen.getByRole('radio', {name: 'good'})).not.toBeChecked();
  });

  it('removes the draft key after a successful submit', async () => {
    render(<ReviewForm offerId={OFFER_ID} />);

    fillValidForm();
    expect(window.localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', {name: 'Submit'}));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SUBMIT_STUB_DELAY_MS);
    });

    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('picks up a draft written from another tab without writing back', () => {
    render(<ReviewForm offerId={OFFER_ID} />);

    const externalDraft = JSON.stringify({rating: 5, text: 'Typed in another tab.'});

    // «Вторая вкладка» записала черновик: событие storage доезжает до этой.
    window.localStorage.setItem(DRAFT_KEY, externalDraft);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {key: DRAFT_KEY}));
    });

    expect(screen.getByRole('radio', {name: 'perfect'})).toBeChecked();
    expect(screen.getByLabelText('Review text')).toHaveValue('Typed in another tab.');

    // Обратной записи нет: в хранилище ровно то, что положила «вторая вкладка».
    expect(window.localStorage.getItem(DRAFT_KEY)).toBe(externalDraft);
  });

  it('clears the fields when another tab removes the draft key', () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({rating: 4, text: 'Restored draft.'}));

    render(<ReviewForm offerId={OFFER_ID} />);
    expect(screen.getByRole('radio', {name: 'good'})).toBeChecked();
    expect(screen.getByLabelText('Review text')).toHaveValue('Restored draft.');

    // «Вторая вкладка» отправила отзыв и удалила черновик.
    window.localStorage.removeItem(DRAFT_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {key: DRAFT_KEY}));
    });

    expect(screen.getByRole('radio', {name: 'good'})).not.toBeChecked();
    expect(screen.getByLabelText('Review text')).toHaveValue('');

    // Ключ не ожил обратно: синхронизация только читает черновик.
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
