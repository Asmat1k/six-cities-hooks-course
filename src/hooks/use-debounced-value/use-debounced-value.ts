import {useEffect, useState} from 'react';

// H1, часть 1. `useDebouncedValue(value, delay)` возвращает отложенную копию
// `value`: она меняется не раньше, чем `delay` мс пройдёт после последнего
// изменения входа. Частые обновления перезапускают таймер, cleanup снимает
// его, поэтому после размонтирования ничего не срабатывает.

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
