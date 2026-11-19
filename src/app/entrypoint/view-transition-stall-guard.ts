// Связка React ViewTransition (M3) с браузерным document.startViewTransition
// приостанавливает коммит Reactа внутри update-колбэка перехода: DOM нового
// экрана появляется не в задаче клика, а на ближайшей «rendering opportunity»
// браузера. Обычно это один кадр, но под большой нагрузкой (много параллельных
// вкладок/процессов, экономный headless в e2e-прогоне) кадр странице может
// не доставляться секундами. Chromium не вызывает update и не помечает
// переход skipped, а React 19.3 ждёт бесконечно: адрес уже новый, экран -
// старый (зависание /favorites -> /offer/2 из ревью: заголовок «Favorites
// (2)» держался 5-7 с, update выполнялся только со следующим кадром).
//
// Обходной путь - обёртка над document.startViewTransition: если браузер не
// начал update за STALLED_AFTER_MS, переход помечается skipped. React
// реагирует на reject(ready) гарантированным повторным коммитом (react-dom
// 19.3: обработчик rejection вызывает flushMutationEffects и соседние фазы),
// содержимое появляется сразу; теряется только анимация зависшего перехода.

const STALLED_AFTER_MS = 500;

// Формы аргумента document.startViewTransition (css-view-transitions):
// колбэк или объект опций. В dom-либе этой версии TypeScript аргумент
// типизирован неточно, поэтому сигнатуры описаны здесь.
type UpdateCallback = () => void | Promise<void>;
interface CallbackOptions {
  update?: UpdateCallback;
  types?: string[] | null;
}
type StartViewTransitionArgument = UpdateCallback | CallbackOptions;

// Устанавливается один раз в точке входа, до первого перехода Reactа.
export function installViewTransitionStallGuard(): void {
  if (typeof document.startViewTransition !== 'function') {
    // jsdom и старые браузеры: без API нет ни анимации, ни зависания -
    // React коммитит в обход этого пути.
    return;
  }

  const nativeStartViewTransition = document.startViewTransition.bind(document);

  document.startViewTransition = (rawArgument) => {
    const argument = rawArgument as StartViewTransitionArgument | undefined;

    if (argument === undefined) {
      // Вызов без аргумента guards не касается - нативный API сам решает,
      // что с ним делать.
      return nativeStartViewTransition();
    }

    let updateStarted = false;
    const originalUpdate = typeof argument === 'function' ? argument : argument.update;
    const wrappedUpdate = (): void | Promise<void> => {
      updateStarted = true;

      return originalUpdate?.();
    };
    const patchedArgument: StartViewTransitionArgument =
      typeof argument === 'function' ? wrappedUpdate : {...argument, update: wrappedUpdate};

    const transition = nativeStartViewTransition(patchedArgument);

    // Кадр под update так и не пришёл: единственный способ расшевелить
    // браузерный переход - skip. Спека гарантирует вызов update при
    // skip из pending-фазы, React вдобавок дублирует коммит в своём
    // обработчике rejection; двойного применения не будет - фазы
    // коммита защищены статусами.
    const stalledCheck = window.setTimeout(() => {
      if (!updateStarted) {
        transition.skipTransition();
      }
    }, STALLED_AFTER_MS);

    const stopStalledCheck = () => {
      window.clearTimeout(stalledCheck);
    };

    transition.finished.then(stopStalledCheck, stopStalledCheck);

    return transition;
  };
}
