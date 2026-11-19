import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterEach} from 'vitest';

// jsdom не реализует прокрутку окна, а ScrollRestoration роутера вызывает
// window.scrollTo на каждом переходе: замещаем no-op, чтобы не сыпались
// предупреждения «Not implemented».
if (typeof window.scrollTo === 'function') {
  window.scrollTo = () => undefined;
}

// Очистка DOM между тестами: каждый тест рисует компоненты в чистый документ.
afterEach(() => {
  cleanup();
});
