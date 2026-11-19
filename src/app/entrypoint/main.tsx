import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@/app/styles/main.css';
import {App} from '@/app/ui/app';

// Точка входа SPA: монтирует приложение в `#root` из index.html.
// Общие стили подключаются раньше CSS страниц, которые тянут за собой
// импорты маршрутов, - так порядок стилей в бандле совпадает с вёрсткой.

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
