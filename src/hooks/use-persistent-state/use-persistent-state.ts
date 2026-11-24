import {useCallback, useEffect, useRef, useState} from 'react';

// H6. `usePersistentState<T>(key, initialValue, validate)` - «useState,
// переживающий перезагрузку»: значение лежит в localStorage под ключом
// `key`, а чтение проходит проверку `validate` - функцию-предикату
// `(value: unknown) => value is T`.
//
// Граничные случаи:
//   - битый JSON или данные не той формы -> initialValue, без падения;
//   - ошибка записи (переполненное хранилище, приватный режим) не роняет
//     приложение - состояние в памяти всё равно меняется;
//   - смена `key` (другой offerId) не утаскивает чужой черновик: значение
//     вычисляется по актуальному ключу, и старое значение не записывается
//     под новым ключом;
//   - событие `storage` подхватывает изменения из другой вкладки; вкладка,
//     которая сама записала значение, это событие не получает (так устроен
//     браузер) - ей и не нужно, её состояние уже актуально.
//
// Возвращает тройку [value, setValue, remove]: setValue кладёт новое
// значение и в память, и в localStorage, remove стирает ключ и возвращает
// initialValue - это нужно форме отзыва (H8), где после успешной отправки
// черновик должен исчезнуть.

interface StoredValue<T> {
  key: string;
  value: T;
}

function readStoredValue<T>(
  key: string,
  initialValue: T,
  validate: (value: unknown) => value is T,
): T {
  try {
    const raw = window.localStorage.getItem(key);

    if (raw === null) {
      return initialValue;
    }

    const parsed: unknown = JSON.parse(raw);

    return validate(parsed) ? parsed : initialValue;
  } catch {
    // Битый JSON или недоступное хранилище - незаметно начинаем с initialValue.
    return initialValue;
  }
}

function writeStoredValue(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Переполнено хранилище или приватный режим: в памяти значение новое,
    // приложение не падает - просто не переживёт перезагрузку.
  }
}

function removeStoredValue(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Недоступное хранилище: состояние в памяти сбрасывается всё равно.
  }
}

export type SetPersistentValue<T> = (value: T) => void;
export type RemovePersistentValue = () => void;

export function usePersistentState<T>(
  key: string,
  initialValue: T,
  validate: (value: unknown) => value is T,
): [T, SetPersistentValue<T>, RemovePersistentValue] {
  // Ленивая инициализация: чтение localStorage происходит один раз при
  // первом рендере, а не на каждом.
  const [stored, setStored] = useState<StoredValue<T>>(() => ({
    key,
    value: readStoredValue(key, initialValue, validate),
  }));

  // Значение выведено из состояния и актуального ключа. Если ключ сменился
  // (другой offerId), значение перечитывается по новому ключу - черновик
  // чужого предложения ни на экран, ни в хранилище под новым ключом не
  // попадает. Чтение дешёвое и одинаковое на каждом таком рендере.
  const value: T = stored.key === key ? stored.value : readStoredValue(key, initialValue, validate);

  // Актуальное значение для функциональных апдейтов: ref обновляется в
  // эффекте (не в рендере), а setValue стабилен между сменами значения.
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  });

  const setPersistedValue = useCallback<SetPersistentValue<T>>(
    (nextValue) => {
      valueRef.current = nextValue;
      writeStoredValue(key, nextValue);
      setStored({key, value: nextValue});
    },
    [key],
  );

  const removeValue = useCallback<RemovePersistentValue>(() => {
    removeStoredValue(key);
    valueRef.current = initialValue;
    setStored({key, value: initialValue});
  }, [key, initialValue]);

  useEffect(() => {
    // Синхронизация между вкладками. Во вкладку, которая сама записала
    // значение, это событие не приходит - и не должно.
    function handleStorage(event: StorageEvent) {
      if (event.key !== key) {
        return;
      }

      setStored({key, value: readStoredValue(key, initialValue, validate)});
    }

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [key, initialValue, validate]);

  return [value, setPersistedValue, removeValue];
}
