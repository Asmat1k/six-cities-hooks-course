import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterEach} from 'vitest';

// Очистка DOM между тестами: каждый тест рисует компоненты в чистый документ.
afterEach(() => {
  cleanup();
});
