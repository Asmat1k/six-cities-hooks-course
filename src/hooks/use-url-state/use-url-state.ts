import {useCallback} from 'react';
import {useSearchParams} from 'react-router';

// H4. `useUrlState<T>(name, defaultValue, parse)` хранит одно значение в
// query-параметре адреса (?sort=price-asc&q=house) через useSearchParams
// React Router. Источник правды - URL: состоянием можно поделиться ссылкой,
// кнопки «назад»/«вперёд» браузера его переключают, а перезагрузка страницы
// восстанавливает его же.
//
// Граничные случаи:
//   - отсутствующий параметр или некорректное значение -> defaultValue,
//     БЕЗ перезаписи адреса: чтение никогда не навигирует;
//   - запись копирует актуальные URLSearchParams и меняет только свой
//     параметр - посторонние параметры (utm и т.п.) сохраняются;
//   - `value === undefined` стирает параметр (пустой поиск - без ?q=);
//   - `options.replace: true` заменяет текущую запись истории, а не
//     добавляет новую (поиск не засоряет историю на каждую букву);
//   - `options.preventScrollReset: true` просит роутер не прыгать в начало
//     страницы - нужно поиску, который применяется во время прокрутки.

export interface SetUrlStateOptions {
  replace?: boolean;
  preventScrollReset?: boolean;
}

export type UrlStateSetter<T> = (value: T | undefined, options?: SetUrlStateOptions) => void;

export function useUrlState<T>(
  name: string,
  defaultValue: T,
  parse: (raw: string | null) => T,
): [T, UrlStateSetter<T>] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = parse(searchParams.get(name));

  const setValue = useCallback<UrlStateSetter<T>>(
    (nextValue, options) => {
      // Копия актуальных параметров: трогаем только свой, чужие не теряем.
      // Замыкание всегда свежее: колбэки, вызываемые позже (дебаунс),
      // попадают на послерендерную версию с уже применённой сортировкой.
      const nextParams = new URLSearchParams(searchParams);

      if (nextValue === undefined) {
        nextParams.delete(name);
      } else {
        nextParams.set(name, String(nextValue));
      }

      setSearchParams(nextParams, {
        replace: options?.replace ?? false,
        preventScrollReset: options?.preventScrollReset ?? false,
      });
    },
    [name, searchParams, setSearchParams],
  );

  return [value, setValue];
}
