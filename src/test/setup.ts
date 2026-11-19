import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterEach} from 'vitest';

// jsdom не реализует прокрутку окна, а ScrollRestoration роутера вызывает
// window.scrollTo на каждом переходе: замещаем no-op, чтобы не сыпались
// предупреждения «Not implemented».
if (typeof window.scrollTo === 'function') {
  window.scrollTo = () => undefined;
}

// jsdom не реализует window.matchMedia (его мокает каждый тест H12 сам);
// для компонентов, которые просто рендерятся в юнит-тестах, даём
// «безопасный по умолчанию» список: ничего не совпадает, событий нет.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => {
    const listeners = new Set<EventListener>();

    return {
      matches: false,
      media: query,
      onchange: null,
      // Устаревшие члены нужны только чтобы заглушка удовлетворяла
      // интерфейсу MediaQueryList: тестируемый код их не вызывает.
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      addListener: (listener: EventListener) => {
        listeners.add(listener);
      },
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      removeListener: (listener: EventListener) => {
        listeners.delete(listener);
      },
      addEventListener: (type: string, listener: EventListener) => {
        if (type === 'change') {
          listeners.add(listener);
        }
      },
      removeEventListener: (type: string, listener: EventListener) => {
        if (type === 'change') {
          listeners.delete(listener);
        }
      },
      dispatchEvent: () => false,
    };
  };
}

// Очистка DOM между тестами: каждый тест рисует компоненты в чистый документ.
afterEach(() => {
  cleanup();
});
