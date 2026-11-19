import {useEffect, useEffectEvent} from 'react';

// H3, часть 2. `useKeydown(key, handler, isActive)` зовёт `handler` по
// нажатию конкретной клавиши `key`. Подписка на document существует ТОЛЬКО
// пока `isActive` (меню открыто); смена `handler` на каждом рендере не
// пересоздаёт подписку - свежая версия вызывается в момент события.

export type KeydownHandler = (event: KeyboardEvent) => void;

export function useKeydown(key: string, handler: KeydownHandler, isActive: boolean): void {
  // M1: прежний способ держать актуальный обработчик (useRef + запись после
  // каждого рендера) заменён на встроенный useEffectEvent - он делает то же
  // самое сам. Тесты H3 не менялись и остались зелёными.
  const onKeyDown = useEffectEvent(handler);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === key) {
        onKeyDown(event);
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
    // onKeyDown не входит в зависимости по документации useEffectEvent:
    // обёртка читает актуальный обработчик в момент вызова, а её собственная
    // идентичность меняется на каждом рендере (useEffectEvent возвращает новую
    // функцию), и в зависимостях она пересоздавала бы подписку.
  }, [key, isActive]);
}
