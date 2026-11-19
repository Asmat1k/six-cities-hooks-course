// Типы для CSS-переменных в инлайн-стилях.
//
// React.CSSProperties намеренно закрыт для произвольных свойств (см. примечание
// в @types/react: «use type assertion or module augmentation»). Рейтинг звёзд
// из вёрстки задаёт ширину заливки кастом-свойством `--rating`, поэтому
// добавляем индекс-сигнатуру для `--*-переменных` через module augmentation -
// это типобезопасный способ вместо `as`.

import 'react';

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
