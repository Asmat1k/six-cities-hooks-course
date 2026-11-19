import {configureAppStore} from './store';
import {fillOffers} from './app-slice';
import {getOffers} from '@/mocks/offers';

// Единственный экземпляр хранилища на приложение. Моки КТ2 подключает
// только слой app (FSD): список предложений заполняется здесь один раз при
// старте. На этапе 7 то же действие начнут вызывать thunk-и с сервера,
// а моки отсюда уйдут.
export const appStore = configureAppStore();
appStore.dispatch(fillOffers(getOffers()));
