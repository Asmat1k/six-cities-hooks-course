import {useCallback, useSyncExternalStore} from 'react';

// H12. `useMediaQuery(query)` отвечает, подходит ли экран под медиазапрос,
// и обновляется при изменении размера окна и повороте экрана. Реализация -
// useSyncExternalStore поверх window.matchMedia: без события resize и без
// связки useEffect + useState, поэтому нет ни «мигания» на первом рендере,
// ни рассинхронизации с медиа-состоянием браузера.
//
// Первый рендер читает актуальное состояние (getSnapshot), так что значения
// «по умолчанию» не бывает: хук сразу говорит правду. На сервере (если
// рендер когда-нибудь станет изоморфным) возвращает false.

const SERVER_SNAPSHOT = false;

export function useMediaQuery(query: string): boolean {
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  const subscribe = useCallback(
    (handleChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', handleChange);
      return () => {
        mediaQueryList.removeEventListener('change', handleChange);
      };
    },
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
