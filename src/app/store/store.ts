import {configureStore} from '@reduxjs/toolkit';
import {appReducer} from './app-slice';

// Конфигурация хранилища Redux Toolkit (этап 6). Создаётся один раз на всё
// приложение: фабрика нужна тестам и будущему preloadedState.

export function configureAppStore() {
  return configureStore({
    reducer: {
      app: appReducer,
    },
  });
}

export type AppStore = ReturnType<typeof configureAppStore>;
export type AppDispatch = AppStore['dispatch'];
