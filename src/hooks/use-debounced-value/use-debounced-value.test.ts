import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useDebouncedValue} from './use-debounced-value';

// Тесты H1 (useDebouncedValue) на фейковых таймерах: значение не меняется
// раньше delay; частый ввод перезапускает таймер; после размонтирования
// ничего не срабатывает.

const DELAY = 500;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const {result} = renderHook(() => useDebouncedValue('first', DELAY));

    expect(result.current).toBe('first');
  });

  it('does not change the value before the delay', () => {
    const {result, rerender} = renderHook(({value}) => useDebouncedValue(value, DELAY), {
      initialProps: {value: 'first'},
    });

    rerender({value: 'second'});
    act(() => {
      vi.advanceTimersByTime(DELAY - 1);
    });

    expect(result.current).toBe('first');
  });

  it('changes the value after the delay', () => {
    const {result, rerender} = renderHook(({value}) => useDebouncedValue(value, DELAY), {
      initialProps: {value: 'first'},
    });

    rerender({value: 'second'});
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });

    expect(result.current).toBe('second');
  });

  it('restarts the timer on rapid input: only the last value lands', () => {
    const {result, rerender} = renderHook(({value}) => useDebouncedValue(value, DELAY), {
      initialProps: {value: 'first'},
    });

    rerender({value: 'second'});
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({value: 'third'});
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // 300 + 300 < 500 от последнего ввода: второе значение не успело примениться.
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('third');
  });

  it('does nothing after unmount', () => {
    const {result, rerender, unmount} = renderHook(({value}) => useDebouncedValue(value, DELAY), {
      initialProps: {value: 'first'},
    });

    rerender({value: 'second'});
    unmount();
    act(() => {
      vi.advanceTimersByTime(DELAY * 2);
    });

    // Отложенное значение так и не применилось: cleanup снял таймер до
    // размонтирования, состояние хука осталось на «first».
    expect(result.current).toBe('first');
  });
});
