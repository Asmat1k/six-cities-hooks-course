import {createElement} from 'react';
import {fireEvent, render, renderHook, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useRef} from 'react';
import {useOutsideClick} from './use-outside-click';

// Тесты H3 (useOutsideClick): клик внутри - не закрывает, снаружи -
// закрывает; подписка на document есть только при isActive; новый handler
// на каждом рендере не пересоздаёт подписку; после закрытия и размонтирования
// обработчики сняты.

// Проба без JSX: файл .ts, поэтому разметка собрана через createElement.
function renderHookWithRef(handler: () => void, isActive: boolean) {
  function Probe() {
    const ref = useRef<HTMLDivElement>(null);

    useOutsideClick(ref, handler, isActive);

    return createElement(
      'div',
      null,
      createElement('div', {'data-testid': 'outside'}),
      createElement('div', {'data-testid': 'inside', ref}),
    );
  }

  return render(createElement(Probe));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOutsideClick', () => {
  it('calls the handler for a mousedown outside the element', () => {
    const handler = vi.fn();
    renderHookWithRef(handler, true);

    fireEvent.mouseDown(document.body);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call the handler for a mousedown inside the element', () => {
    const handler = vi.fn();
    renderHookWithRef(handler, true);

    fireEvent.mouseDown(document.body);
    fireEvent.mouseDown(screen.getByTestId('inside'));

    // Один раз - только по первому «снаружи».
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores outside clicks while inactive', () => {
    const handler = vi.fn();
    renderHookWithRef(handler, false);

    fireEvent.mouseDown(document.body);

    expect(handler).not.toHaveBeenCalled();
  });

  it('subscribes on document only while active', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const {unmount} = renderHookWithRef(vi.fn(), false);
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('mousedown', expect.any(Function));

    const active = renderHookWithRef(vi.fn(), true);
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    active.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    unmount();
  });

  it('does not resubscribe when the handler changes each render', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    const {rerender} = renderHook(
      ({handler}) => {
        useOutsideClick(useRef<HTMLDivElement>(null), handler, true);
      },
      {initialProps: {handler: vi.fn()}},
    );

    const subscriptionCount = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'mousedown',
    ).length;

    rerender({handler: vi.fn()});
    rerender({handler: vi.fn()});

    const callsAfterRerenders = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'mousedown',
    ).length;

    expect(callsAfterRerenders).toBe(subscriptionCount);
  });

  it('invokes the latest handler version, not the one from mount time', () => {
    function Probe({handler}: {handler: () => void}) {
      const ref = useRef<HTMLDivElement>(null);

      useOutsideClick(ref, handler, true);

      return createElement('div', null, createElement('div', {'data-testid': 'inside', ref}));
    }

    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    const view = render(createElement(Probe, {handler: firstHandler}));
    view.rerender(createElement(Probe, {handler: secondHandler}));

    fireEvent.mouseDown(document.body);

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('calls nothing after unmount', () => {
    const handler = vi.fn();
    const {unmount} = renderHookWithRef(handler, true);

    unmount();
    fireEvent.mouseDown(document.body);

    expect(handler).not.toHaveBeenCalled();
  });
});
