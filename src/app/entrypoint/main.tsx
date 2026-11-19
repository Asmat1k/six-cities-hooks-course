import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@/app/styles/main.css';
import {App} from '@/app/ui/app';
import {installViewTransitionStallGuard} from './view-transition-stall-guard';

// Точка входа SPA: монтирует приложение в `#root` из index.html.
// Общие стили подключаются раньше CSS страниц, которые тянут за собой
// импорты маршрутов, - так порядок стилей в бандле совпадает с вёрсткой.

// Браузерные ViewTransition (M3) держат коммит Reactа до первого кадра
// страницы; под нагрузкой кадр может опаздывать на секунды, и экран
// отставал бы от адреса. Ставим защиту до первого перехода.
installViewTransitionStallGuard();

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
