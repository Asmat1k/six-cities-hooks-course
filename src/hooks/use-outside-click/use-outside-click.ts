import {useEffect, useEffectEvent, type RefObject} from 'react';

// H3, часть 1. `useOutsideClick(ref, handler, isActive)` зовёт `handler`,
// когда указатель нажимает вне элемента из `ref`. Подписка на document
// существует ТОЛЬКО пока `isActive` (меню открыто); актуальный `handler`
// вызывает useEffectEvent, поэтому новый обработчик на каждом рендере не
// пересоздаёт подписку, но срабатывает всегда последняя версия.
//
// Слушается mousedown, а не click: меню закрывается в самом начале жеста,
// до выделения текста и до «отпускания» вне; нажатие, НАЧАВШЕЕСЯ вне
// элемента, считается внешним, даже если указатель отпустили внутри.

export type OutsideClickHandler = (event: MouseEvent) => void;

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  handler: OutsideClickHandler,
  isActive: boolean,
): void {
  // M1: прежний способ держать актуальный обработчик (useRef + запись после
  // каждого рендера) заменён на встроенный useEffectEvent - он делает то же
  // самое сам. Тесты H3 не менялись и остались зелёными.
  const onOutsideClick = useEffectEvent(handler);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      const element = ref.current;

      if (element === null) {
        return;
      }

      if (event.target instanceof Node && !element.contains(event.target)) {
        onOutsideClick(event);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
    // onOutsideClick не входит в зависимости по документации useEffectEvent:
    // обёртка читает актуальный обработчик в момент вызова, а её собственная
    // идентичность меняется на каждом рендере (useEffectEvent возвращает новую
    // функцию), и в зависимостях она пересоздавала бы подписку.
  }, [isActive, ref]);
}
