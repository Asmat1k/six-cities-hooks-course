import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SUBMIT_STUB_DELAY_MS, useReviewForm, type SubmitReview} from './use-review-form';
import {STORAGE_PREFIX} from '@/shared/config/variant';

// Тесты хука H8: отправка через заглушку с задержкой, ошибка с сохранением
// данных, повторная отправка, черновик в localStorage под ключом
// `<prefix>-draft-<offerId>` (вариант 3: префикс sc-charlie).

const VALID_TEXT = 'A quiet cozy place with everything we needed for the weekend.';
const OFFER_ID = '1';
const DRAFT_KEY = `${STORAGE_PREFIX}-draft-${OFFER_ID}`;

// Фабрики отправки для тестов: с задержкой, мгновенная, падающая и
// «вечная» - вынесены на уровень модуля, чтобы не растить вложенность.
function delayedSubmit(delay: number): SubmitReview {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, delay);
    });
}

const instantSubmit: SubmitReview = () => Promise.resolve();
const failingSubmit: SubmitReview = () => Promise.reject(new Error('offline'));
const neverResolvingSubmit: SubmitReview = () =>
  new Promise(() => {
    // Преднамеренно незавершённый промис: отправка не заканчивается.
  });

// Отправка + промывка микрозадач: catch-обработчик ошибки успевает
// отработать до проверок.
function submitAndFlush(result: {current: ReturnType<typeof useReviewForm>}): Promise<void> {
  return act(() => {
    result.current.submit();
    return Promise.resolve();
  });
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

describe('useReviewForm', () => {
  it('starts invalid with empty data', () => {
    const {result} = renderHook(() => useReviewForm(OFFER_ID));

    expect(result.current.status).toBe('editing');
    expect(result.current.rating).toBe(0);
    expect(result.current.text).toBe('');
    expect(result.current.isValid).toBe(false);
  });

  it('becomes valid with a rating and text of at least 50 characters', () => {
    const {result} = renderHook(() => useReviewForm(OFFER_ID));

    act(() => {
      result.current.setRating(4);
      result.current.setText(VALID_TEXT);
    });

    expect(result.current.isValid).toBe(true);
  });

  it('keeps the draft in localStorage under the variant-prefixed key', () => {
    const {result} = renderHook(() => useReviewForm(OFFER_ID));

    act(() => {
      result.current.setRating(3);
      result.current.setText(VALID_TEXT);
    });

    expect(window.localStorage.getItem(DRAFT_KEY)).toBe(
      JSON.stringify({rating: 3, text: VALID_TEXT}),
    );
  });

  it('restores the draft saved before the reload', () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({rating: 2, text: 'Saved earlier.'}));

    const {result} = renderHook(() => useReviewForm(OFFER_ID));

    expect(result.current.rating).toBe(2);
    expect(result.current.text).toBe('Saved earlier.');
  });

  it('submits through the stub after the delay and clears the draft', async () => {
    const {result} = renderHook(() => useReviewForm(OFFER_ID));

    act(() => {
      result.current.setRating(5);
      result.current.setText(VALID_TEXT);
    });

    act(() => {
      result.current.submit();
    });
    expect(result.current.status).toBe('submitting');
    expect(result.current.isValid).toBe(true);

    // Черновик ещё на месте: отправка не завершилась.
    expect(window.localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SUBMIT_STUB_DELAY_MS);
    });

    expect(result.current.status).toBe('success');
    expect(result.current.rating).toBe(0);
    expect(result.current.text).toBe('');
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('ignores a repeated submit while the first one is in flight', async () => {
    const submitReview = vi.fn(delayedSubmit(SUBMIT_STUB_DELAY_MS));
    const {result} = renderHook(() => useReviewForm(OFFER_ID, submitReview));

    act(() => {
      result.current.setRating(5);
      result.current.setText(VALID_TEXT);
    });

    // Оба вызова - в одном тике, до следующего рендера: замыкание ещё видит
    // editing, поэтому от двойной отправки защищает только синхронная метка.
    act(() => {
      result.current.submit();
      result.current.submit();
    });

    expect(submitReview).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SUBMIT_STUB_DELAY_MS);
    });
    expect(result.current.status).toBe('success');
  });

  it('does nothing on submit with invalid data', () => {
    const submitReview = vi.fn(instantSubmit);
    const {result} = renderHook(() => useReviewForm(OFFER_ID, submitReview));

    act(() => {
      result.current.setText(VALID_TEXT);
    });

    act(() => {
      result.current.submit();
    });

    // Оценка не выбрана - кнопка неактивна, отправки нет.
    expect(result.current.status).toBe('editing');
    expect(submitReview).not.toHaveBeenCalled();
  });

  it('shows an error on submit failure and keeps the data', async () => {
    const {result} = renderHook(() => useReviewForm(OFFER_ID, failingSubmit));

    act(() => {
      result.current.setRating(4);
      result.current.setText(VALID_TEXT);
    });

    await submitAndFlush(result);

    expect(result.current.status).toBe('error');
    expect(result.current.error).not.toBeNull();
    expect(result.current.rating).toBe(4);
    expect(result.current.text).toBe(VALID_TEXT);
    // Черновик при ошибке не пропал.
    expect(window.localStorage.getItem(DRAFT_KEY)).not.toBeNull();
  });

  it('allows a retry after an error and succeeds', async () => {
    let attempts = 0;
    const submitReview: SubmitReview = () => {
      attempts += 1;

      if (attempts === 1) {
        return Promise.reject(new Error('first attempt fails'));
      }

      return Promise.resolve();
    };
    const {result} = renderHook(() => useReviewForm(OFFER_ID, submitReview));

    act(() => {
      result.current.setRating(5);
      result.current.setText(VALID_TEXT);
    });

    await submitAndFlush(result);
    expect(result.current.status).toBe('error');

    await submitAndFlush(result);

    expect(result.current.status).toBe('success');
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('edits again after success: the machine returns to editing', async () => {
    const {result} = renderHook(() => useReviewForm(OFFER_ID, instantSubmit));

    act(() => {
      result.current.setRating(5);
      result.current.setText(VALID_TEXT);
    });

    await submitAndFlush(result);
    expect(result.current.status).toBe('success');

    act(() => {
      result.current.setRating(2);
    });

    expect(result.current.status).toBe('editing');
    expect(result.current.rating).toBe(2);
  });

  it('blocks edits while submitting', () => {
    const {result} = renderHook(() => useReviewForm(OFFER_ID, neverResolvingSubmit));

    act(() => {
      result.current.setRating(5);
      result.current.setText(VALID_TEXT);
    });

    act(() => {
      result.current.submit();
    });

    act(() => {
      result.current.setRating(1);
      result.current.setText('Try to change while blocked.');
    });

    expect(result.current.status).toBe('submitting');
    expect(result.current.rating).toBe(5);
    expect(result.current.text).toBe(VALID_TEXT);
  });
});
