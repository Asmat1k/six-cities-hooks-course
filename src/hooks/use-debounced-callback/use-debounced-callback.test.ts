import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useDebouncedCallback} from './use-debounced-callback';

// Тесты H1 (useDebouncedCallback) на фейковых таймерах: отложенный вызов,
// перезапуск таймера при частых вызовах, flush/cancel, смена fn во время
// ожидания, отсутствие вызовов после размонтирования.

const DELAY = 500;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedCallback', () => {
  it('calls fn with the last arguments after the delay', () => {
    const fn = vi.fn();
    const {result} = renderHook(() => useDebouncedCallback(fn, DELAY));

    act(() => {
      result.current('house');
    });
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DELAY);
    });
    expect(fn).toHaveBeenCalledExactlyOnceWith('house');
  });

  it('restarts the timer on rapid calls: only the last arguments are used', () => {
    const fn = vi.fn();
    const {result} = renderHook(() => useDebouncedCallback(fn, DELAY));

    act(() => {
      result.current('h');
      vi.advanceTimersByTime(300);
      result.current('ho');
      vi.advanceTimersByTime(300);
      result.current('house');
      vi.advanceTimersByTime(300);
    });
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(fn).toHaveBeenCalledExactlyOnceWith('house');
  });

  it('flush calls fn immediately with the last arguments', () => {
    const fn = vi.fn();
    const {result} = renderHook(() => useDebouncedCallback(fn, DELAY));

    act(() => {
      result.current('house');
    });

    act(() => {
      result.current.flush();
    });
    expect(fn).toHaveBeenCalledExactlyOnceWith('house');

    // После flush отложенного вызова не остаётся.
    act(() => {
      vi.advanceTimersByTime(DELAY * 2);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('flush without a pending call does nothing', () => {
    const fn = vi.fn();
    const {result} = renderHook(() => useDebouncedCallback(fn, DELAY));

    act(() => {
      result.current.flush();
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel drops the pending call', () => {
    const fn = vi.fn();
    const {result} = renderHook(() => useDebouncedCallback(fn, DELAY));

    act(() => {
      result.current('house');
      result.current.cancel();
    });

    act(() => {
      vi.advanceTimersByTime(DELAY * 2);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel after a completed call keeps the result', () => {
    const fn = vi.fn();
    const {result} = renderHook(() => useDebouncedCallback(fn, DELAY));

    act(() => {
      result.current('house');
      vi.advanceTimersByTime(DELAY);
      result.current.cancel();
      vi.advanceTimersByTime(DELAY);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls the latest fn when it changes during the wait', () => {
    const firstFn = vi.fn();
    const secondFn = vi.fn();
    const {result, rerender} = renderHook(({fn}) => useDebouncedCallback(fn, DELAY), {
      initialProps: {fn: firstFn},
    });

    act(() => {
      result.current('house');
    });

    // fn поменялся во время ожидания: сработать должна новая версия.
    rerender({fn: secondFn});
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });

    expect(firstFn).not.toHaveBeenCalled();
    expect(secondFn).toHaveBeenCalledExactlyOnceWith('house');
  });

  it('does not call fn after unmount', () => {
    const fn = vi.fn();
    const {result, unmount} = renderHook(() => useDebouncedCallback(fn, DELAY));

    act(() => {
      result.current('house');
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(DELAY * 2);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('returns a stable function across renders', () => {
    const {result, rerender} = renderHook(() => useDebouncedCallback(vi.fn(), DELAY));
    const first = result.current;

    rerender();
    expect(result.current).toBe(first);
  });
});
