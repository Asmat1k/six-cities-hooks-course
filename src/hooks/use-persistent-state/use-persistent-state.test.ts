import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {usePersistentState} from './use-persistent-state';

// Тесты H6: восстановление из localStorage, запись, битый JSON, данные не
// той формы (validate), ошибка setItem, синхронизация через событие storage
// и смена ключа без «утаскивания» чужого черновика.

interface Draft {
  rating: number;
  text: string;
}

const EMPTY_DRAFT: Draft = {rating: 0, text: ''};

function isDraft(value: unknown): value is Draft {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('rating' in value) || !('text' in value)) {
    return false;
  }

  return typeof value.rating === 'number' && typeof value.text === 'string';
}

const KEY_A = 'sc-test-draft-a';
const KEY_B = 'sc-test-draft-b';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('usePersistentState', () => {
  it('returns initialValue when storage is empty', () => {
    const {result} = renderHook(() => usePersistentState<Draft>(KEY_A, EMPTY_DRAFT, isDraft));

    expect(result.current[0]).toEqual(EMPTY_DRAFT);
  });

  it('restores a valid stored value on first render', () => {
    window.localStorage.setItem(KEY_A, JSON.stringify({rating: 4, text: 'Nice place'}));

    const {result} = renderHook(() => usePersistentState<Draft>(KEY_A, EMPTY_DRAFT, isDraft));

    expect(result.current[0]).toEqual({rating: 4, text: 'Nice place'});
  });

  it('falls back to initialValue on broken JSON', () => {
    window.localStorage.setItem(KEY_A, '{oops');

    const {result} = renderHook(() => usePersistentState<Draft>(KEY_A, EMPTY_DRAFT, isDraft));

    expect(result.current[0]).toEqual(EMPTY_DRAFT);
  });

  it('falls back to initialValue when data has the wrong shape', () => {
    window.localStorage.setItem(KEY_A, JSON.stringify({rating: 'four', text: 42}));
    window.localStorage.setItem(KEY_B, JSON.stringify({rating: 999, text: 'stray draft'}));

    const {result} = renderHook(() => usePersistentState<Draft>(KEY_A, EMPTY_DRAFT, isDraft));

    expect(result.current[0]).toEqual(EMPTY_DRAFT);
  });

  it('writes the value to storage on setValue', () => {
    const {result} = renderHook(() => usePersistentState<Draft>(KEY_A, EMPTY_DRAFT, isDraft));

    act(() => {
      result.current[1]({rating: 5, text: 'Perfect stay'});
    });

    expect(result.current[0]).toEqual({rating: 5, text: 'Perfect stay'});
    expect(window.localStorage.getItem(KEY_A)).toBe(JSON.stringify({rating: 5, text: 'Perfect stay'}));
  });

  it('survives a setItem failure (quota or private mode)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const {result} = renderHook(() => usePersistentState<Draft>(KEY_A, EMPTY_DRAFT, isDraft));

    let thrownError: unknown;
    act(() => {
      try {
        result.current[1]({rating: 3, text: 'still typing'});
      } catch (error) {
        thrownError = error;
      }
    });

    expect(thrownError).toBeUndefined();
    expect(result.current[0]).toEqual({rating: 3, text: 'still typing'});
    expect(setItemSpy).toHaveBeenCalled();
  });

  it('picks up changes from another tab via the storage event', () => {
    const {result} = renderHook(() => usePersistentState<Draft>(KEY_A, EMPTY_DRAFT, isDraft));

    // В реальном браузере вторая вкладка сначала записывает значение, и
    // только потом событие доезжает до первой.
    act(() => {
      window.localStorage.setItem(KEY_A, JSON.stringify({rating: 2, text: 'from the other tab'}));
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: KEY_A,
          newValue: JSON.stringify({rating: 2, text: 'from the other tab'}),
        }),
      );
    });

    expect(result.current[0]).toEqual({rating: 2, text: 'from the other tab'});
  });

  it('ignores storage events for other keys', () => {
    window.localStorage.setItem(KEY_B, JSON.stringify({rating: 1, text: 'other key'}));
    const {result} = renderHook(() => usePersistentState<Draft>(KEY_A, EMPTY_DRAFT, isDraft));

    act(() => {
      window.localStorage.setItem(KEY_B, JSON.stringify({rating: 1, text: 'changed'}));
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: KEY_B,
          newValue: JSON.stringify({rating: 1, text: 'changed'}),
        }),
      );
    });

    expect(result.current[0]).toEqual(EMPTY_DRAFT);
  });

  it('removes the key and resets to initialValue on remove', () => {
    window.localStorage.setItem(KEY_A, JSON.stringify({rating: 4, text: 'draft'}));
    const {result} = renderHook(() => usePersistentState<Draft>(KEY_A, EMPTY_DRAFT, isDraft));

    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toEqual(EMPTY_DRAFT);
    expect(window.localStorage.getItem(KEY_A)).toBeNull();
  });

  it('re-reads the new key on key change without leaking the old draft', () => {
    window.localStorage.setItem(KEY_A, JSON.stringify({rating: 4, text: 'draft of offer A'}));
    window.localStorage.setItem(KEY_B, JSON.stringify({rating: 2, text: 'draft of offer B'}));

    const {result, rerender} = renderHook(
      ({key}) => usePersistentState<Draft>(key, EMPTY_DRAFT, isDraft),
      {initialProps: {key: KEY_A}},
    );
    expect(result.current[0]).toEqual({rating: 4, text: 'draft of offer A'});

    rerender({key: KEY_B});
    expect(result.current[0]).toEqual({rating: 2, text: 'draft of offer B'});

    // Чужой черновик не переехал на новый ключ и не затёр свой.
    expect(window.localStorage.getItem(KEY_A)).toBe(
      JSON.stringify({rating: 4, text: 'draft of offer A'}),
    );
    expect(window.localStorage.getItem(KEY_B)).toBe(
      JSON.stringify({rating: 2, text: 'draft of offer B'}),
    );
  });

  it('writes the value under the current key after a key change', () => {
    const {result, rerender} = renderHook(
      ({key}) => usePersistentState<Draft>(key, EMPTY_DRAFT, isDraft),
      {initialProps: {key: KEY_A}},
    );

    rerender({key: KEY_B});

    act(() => {
      result.current[1]({rating: 5, text: 'written for B'});
    });

    expect(window.localStorage.getItem(KEY_B)).toBe(
      JSON.stringify({rating: 5, text: 'written for B'}),
    );
    expect(window.localStorage.getItem(KEY_A)).toBeNull();
  });
});
