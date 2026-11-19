import {appStore as createdAppStore} from './singleton';

// Публичный API хранилища (FSD, слой app): синглтон для приложения и
// тестов, а также типы и фабрика для переиспользования.

export const appStore = createdAppStore;
export {configureAppStore} from './store';
export type {AppStore, AppDispatch} from './store';
export {
  appReducer,
  changeCity,
  fillOffers,
  selectCityName,
  selectOffers,
  DEFAULT_CITY_NAME,
} from './app-slice';
export type {AppStoreState} from './app-slice';
