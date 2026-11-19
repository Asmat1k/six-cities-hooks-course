import {useDispatch, useSelector, useStore} from 'react-redux';
import type {AppDispatch, AppStore, AppStoreState} from './app-slice-types';

// Пре-типизированные хуки Redux Toolkit: единое место, где хранятся типы
// store/dispatch/state (рекомендованный паттерн react-redux 9).

export const useAppStore = useStore.withTypes<AppStore>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<AppStoreState>();
