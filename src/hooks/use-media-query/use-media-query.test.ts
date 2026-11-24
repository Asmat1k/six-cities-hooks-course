import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useMediaQuery} from './use-media-query';

// Тесты H12: в jsdom нет window.matchMedia - мокаем его сами. Проверяем
// начальное значение, обновление по событию change, отписку при
// размонтировании и смену query.

interface FakeMediaController {
  matches: boolean;
  listeners: Set<EventListener>;
}

const controllers = new Map<string, FakeMediaController>();

function createController(media: string, matches: boolean): FakeMediaController {
  const controller: FakeMediaController = {matches, listeners: new Set()};
  controllers.set(media, controller);
  return controller;
}

// Каждому вызову matchMedia - один и тот же «живой» объект: matches
// читается из контроллера в момент обращения, как в настоящем API.
function makeMediaQueryList(media: string, defaultMatches: boolean) {
  return (query: string): MediaQueryList => {
    const controller = controllers.get(query) ?? createController(query, defaultMatches);

    return {
      get matches() {
        return controller.matches;
      },
      media: query,
      onchange: null,
      // Устаревшие члены нужны только чтобы объект удовлетворял интерфейсу
      // MediaQueryList: хук их не вызывает, он работает через addEventListener.
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      addListener: (listener: EventListener) => {
        controller.listeners.add(listener);
      },
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      removeListener: (listener: EventListener) => {
        controller.listeners.delete(listener);
      },
      addEventListener: (type: string, listener: EventListener) => {
        if (type === 'change') {
          controller.listeners.add(listener);
        }
      },
      removeEventListener: (type: string, listener: EventListener) => {
        if (type === 'change') {
          controller.listeners.delete(listener);
        }
      },
      dispatchEvent: () => false,
    };
  };
}

function notifyChange(query: string) {
  const controller = controllers.get(query);

  if (controller === undefined) {
    throw new Error(`matchMedia was not called with ${query}`);
  }

  controller.matches = !controller.matches;

  const changeEvent = new Event('change');
  for (const listener of controller.listeners) {
    listener(changeEvent);
  }
}

const matchMediaMock = vi.fn(makeMediaQueryList('', false));

beforeEach(() => {
  controllers.clear();
  matchMediaMock.mockImplementation(makeMediaQueryList('', false));
  vi.stubGlobal('matchMedia', matchMediaMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  controllers.clear();
});

describe('useMediaQuery', () => {
  it('returns the current matches value on first render', () => {
    matchMediaMock.mockImplementation(makeMediaQueryList('', true));

    const {result} = renderHook(() => useMediaQuery('(max-width: 767px)'));

    expect(result.current).toBe(true);
  });

  it('returns false when the media query does not match', () => {
    const {result} = renderHook(() => useMediaQuery('(max-width: 767px)'));

    expect(result.current).toBe(false);
  });

  it('updates when the media query change event fires', () => {
    const {result} = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);

    act(() => {
      notifyChange('(max-width: 767px)');
    });

    expect(result.current).toBe(true);
  });

  it('subscribes only while mounted and unsubscribes on unmount', () => {
    const {unmount} = renderHook(() => useMediaQuery('(max-width: 767px)'));
    const controller = controllers.get('(max-width: 767px)');

    expect(controller?.listeners.size).toBe(1);

    unmount();
    expect(controller?.listeners.size).toBe(0);
  });

  it('does not react to changes of another media query', () => {
    const {result} = renderHook(() => useMediaQuery('(max-width: 767px)'));
    createController('(min-width: 768px)', true);

    act(() => {
      notifyChange('(min-width: 768px)');
    });

    expect(result.current).toBe(false);
  });

  it('switches to the new query and drops the old subscription', () => {
    const {result, rerender} = renderHook(({query}) => useMediaQuery(query), {
      initialProps: {query: '(max-width: 767px)'},
    });

    expect(result.current).toBe(false);
    const oldController = controllers.get('(max-width: 767px)');

    matchMediaMock.mockImplementation(makeMediaQueryList('', true));
    rerender({query: '(min-width: 768px)'});

    expect(result.current).toBe(true);
    expect(oldController?.listeners.size).toBe(0);
    expect(controllers.get('(min-width: 768px)')?.listeners.size).toBe(1);
  });
});
