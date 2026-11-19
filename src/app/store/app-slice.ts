import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {OfferPreview} from '@/entities/offer';

// Глобальное состояние приложения (этап 6): выбранный город и список
// предложений. Источник правды для города и данных - Redux; сортировка и
// поиск живут в адресе строки (H4) и сюда не дублируются.
//
// Действия по ТЗ два: смена города и заполнение списка. Заполнение сейчас
// вызывается один раз при старте приложения моками (слой app/store);
// на этапе 7 список начнут наполнять thunk-и с сервера.

interface AppState {
  cityName: string;
  offers: OfferPreview[];
}

// Город по умолчанию из ТЗ (PROJECT.md, раздел 3.1): Paris.
export const DEFAULT_CITY_NAME = 'Paris';

const initialState: AppState = {
  cityName: DEFAULT_CITY_NAME,
  offers: [],
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    changeCity(state, action: PayloadAction<string>) {
      state.cityName = action.payload;
    },
    fillOffers(state, action: PayloadAction<OfferPreview[]>) {
      state.offers = action.payload;
    },
  },
});

export const {changeCity, fillOffers} = appSlice.actions;
export const appReducer = appSlice.reducer;

// Типы корневого состояния и селекторы: слой app передаёт страницым данные
// через props (FSD), поэтому селекторов два - город и весь список.
export interface AppStoreState {
  app: AppState;
}

export const selectCityName = (state: AppStoreState): string => state.app.cityName;
export const selectOffers = (state: AppStoreState): OfferPreview[] => state.app.offers;
