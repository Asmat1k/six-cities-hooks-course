import {RouterProvider, createBrowserRouter} from 'react-router';
import {getAppRoutes} from '../routes/routes';

// Корневой компонент приложения. Роутер - единственный на всё приложение и
// создаётся один раз, вне рендера (React Router 8, Data Mode): пере-создание
// на каждый рендер потеряло бы состояние навигации.
const router = createBrowserRouter(getAppRoutes());

export function App() {
  return <RouterProvider router={router} />;
}
