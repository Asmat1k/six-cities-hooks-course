import {fireEvent, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useKeydown} from './use-keydown';

// Тесты H3 (useKeydown): событие нужной клавиши доезжает до обработчика,
// соседние клавиши - нет; подписка на document есть только при isActive;
// новый handler на каждом рендере не пересоздаёт подписку; смена key
// переслушивает новую клавишу; после размонтирования обработчики сняты.

function pressKey(key: string) {
  fireEvent.keyDown(document, {key});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useKeydown', () => {
  it('calls the handler for the matching key only', () => {
    const handler = vi.fn();
    renderHook(() => {
      useKeydown('Escape', handler, true);
    });

    pressKey('Enter');
    expect(handler).not.toHaveBeenCalled();

    pressKey('Escape');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(KeyboardEvent);
  });

  it('ignores keys while inactive', () => {
    const handler = vi.fn();
    renderHook(() => {
      useKeydown('Escape', handler, false);
    });

    pressKey('Escape');

    expect(handler).not.toHaveBeenCalled();
  });

  it('subscribes on document only while active', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const {rerender, unmount} = renderHook(
      ({isActive}) => {
        useKeydown('Escape', vi.fn(), isActive);
      },
      {initialProps: {isActive: false}},
    );

    expect(addEventListenerSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));

    rerender({isActive: true});
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('relistens when the key changes', () => {
    const escapeHandler = vi.fn();
    const enterHandler = vi.fn();

    const {rerender} = renderHook(
      ({key, handler}) => {
        useKeydown(key, handler, true);
      },
      {initialProps: {key: 'Escape', handler: escapeHandler}},
    );

    rerender({key: 'Enter', handler: enterHandler});

    pressKey('Escape');
    pressKey('Enter');

    expect(escapeHandler).not.toHaveBeenCalled();
    expect(enterHandler).toHaveBeenCalledTimes(1);
  });

  it('does not resubscribe when the handler changes each render', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    const {rerender} = renderHook(
      ({handler}) => {
        useKeydown('Escape', handler, true);
      },
      {initialProps: {handler: vi.fn()}},
    );

    const subscriptionCount = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'keydown',
    ).length;

    rerender({handler: vi.fn()});
    rerender({handler: vi.fn()});

    const callsAfterRerenders = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'keydown',
    ).length;

    expect(callsAfterRerenders).toBe(subscriptionCount);
  });

  it('invokes the latest handler version, not the one from mount time', () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    const {rerender} = renderHook(
      ({handler}) => {
        useKeydown('Escape', handler, true);
      },
      {initialProps: {handler: firstHandler}},
    );

    rerender({handler: secondHandler});
    pressKey('Escape');

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('calls nothing after unmount', () => {
    const handler = vi.fn();
    const {unmount} = renderHook(() => {
      useKeydown('Escape', handler, true);
    });

    unmount();
    pressKey('Escape');

    expect(handler).not.toHaveBeenCalled();
  });
});
