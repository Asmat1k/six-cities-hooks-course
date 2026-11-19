// Типы хранилища в одном месте (без исполнения): hooks.ts и внешние слои
// импортируют отсюда, не затягивая сам стор с моками.

export type {AppDispatch, AppStore} from './store';
export type {AppStoreState} from './app-slice';
