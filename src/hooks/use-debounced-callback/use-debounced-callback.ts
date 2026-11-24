import {useEffect, useState} from 'react';

// H1, часть 2. `useDebouncedCallback(fn, delay)` возвращает функцию, которая
// откладывает вызов `fn` на `delay` мс после последнего вызова, с методами:
//   - `cancel()` - снять отложенный вызов;
//   - `flush()` - вызвать немедленно с аргументами последнего вызова.
// Вызов всегда идёт к последней версии `fn`: функция создаётся один раз, а
// актуальные `fn` и `delay` она получает через updateCallback после каждого
// рендера, поэтому смена `fn` не пересоздаёт таймер, но таймер, доживший до
// срабатывания, вызывает уже новую функцию. Возвращаемая ссылка стабильна -
// её можно держать в зависимостях эффектов.

export interface DebouncedCallback<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
  flush: () => void;
}

// Внутренний слот «последний обработчик»: наружу не отдаётся.
interface ManagedDebouncedCallback<A extends unknown[]> extends DebouncedCallback<A> {
  updateCallback: (callback: (...args: A) => void, delay: number) => void;
}

function createDebouncedCallback<A extends unknown[]>(): ManagedDebouncedCallback<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: A | null = null;
  let latestCallback: ((...args: A) => void) | null = null;
  let latestDelay = 0;

  const debounced: ManagedDebouncedCallback<A> = (...args: A) => {
    pendingArgs = args;

    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      const latestArgs = pendingArgs;
      const callback = latestCallback;

      if (latestArgs === null || callback === null) {
        return;
      }

      pendingArgs = null;
      callback(...latestArgs);
    }, latestDelay);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    pendingArgs = null;
  };

  debounced.flush = () => {
    const latestArgs = pendingArgs;
    const callback = latestCallback;

    if (timer === null || latestArgs === null || callback === null) {
      return;
    }

    debounced.cancel();
    callback(...latestArgs);
  };

  debounced.updateCallback = (callback: (...args: A) => void, delay: number) => {
    latestCallback = callback;
    latestDelay = delay;
  };

  return debounced;
}

export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
): DebouncedCallback<A> {
  // Функция с методами cancel/flush создаётся один раз: ссылка на неё
  // стабильна, и мутация объекта не происходит в рендере.
  const [debounced] = useState(() => createDebouncedCallback<A>());

  // Последняя версия обработчика доезжает до таймера через эффект: смена
  // `fn` не пересоздаёт ни функцию, ни таймер.
  useEffect(() => {
    debounced.updateCallback(callback, delay);
  });

  // Размонтирование компонента отменяет отложенный вызов: после ухода со
  // страницы ничего не срабатывает.
  useEffect(() => {
    const cancelPending = debounced.cancel;
    return () => {
      cancelPending();
    };
  }, [debounced]);

  return debounced;
}
