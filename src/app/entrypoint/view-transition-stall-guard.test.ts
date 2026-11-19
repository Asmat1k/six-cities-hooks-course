import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {installViewTransitionStallGuard} from './view-transition-stall-guard';

// Тесты защиты от зависших браузерных ViewTransition: в jsdom нет
// document.startViewTransition, поэтому «нативный» API ставим моком и
// проверяем обёртку - пропускает ли она update/types в браузер, снимает ли
// зависший переход по таймауту и убирает ли проверку после finished.

interface StubTransition {
  skipped: number;
  finish(): void;
}

// Тип аргумента нативного вызова выводим из сигнатуры API в dom-либе,
// не называя его: имя типа опций меняется между версиями TypeScript.
type NativeArgument = NonNullable<Parameters<Document['startViewTransition']>[0]>;

function installNativeStub(invokeUpdate: boolean) {
  const transitionRecord: StubTransition = {
    skipped: 0,
    finish: () => undefined,
  };

  let resolveFinished: () => void;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });
  transitionRecord.finish = () => {
    resolveFinished();
  };

  const native = vi.fn((argument: NativeArgument) => {
    if (invokeUpdate) {
      const update = typeof argument === 'function' ? argument : argument.update;

      void update?.();
    }

    return {
      skipTransition: () => {
        transitionRecord.skipped += 1;
      },
      finished,
    } as ViewTransition;
  });

  document.startViewTransition = native;

  return {native, transitionRecord};
}

describe('installViewTransitionStallGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.startViewTransition = undefined as unknown as Document['startViewTransition'];
  });

  it('without the browser API the guard is a no-op', () => {
    expect(typeof document.startViewTransition).toBe('undefined');

    expect(() => {
      installViewTransitionStallGuard();
    }).not.toThrow();
    expect(typeof document.startViewTransition).toBe('undefined');
  });

  it('a started update keeps the transition alive: no skip after the deadline', async () => {
    const {transitionRecord} = installNativeStub(true);
    installViewTransitionStallGuard();

    const update = vi.fn(() => undefined);
    document.startViewTransition(update);

    expect(update).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(600);

    expect(transitionRecord.skipped).toBe(0);
  });

  it('a stalled update is skipped after the deadline, types pass through', async () => {
    const {native, transitionRecord} = installNativeStub(false);
    installViewTransitionStallGuard();

    const update = vi.fn(() => undefined);
    document.startViewTransition({types: ['offer-forward'], update});

    expect(native).toHaveBeenCalledWith(
      expect.objectContaining({types: ['offer-forward']}),
    );
    expect(update).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(499);
    expect(transitionRecord.skipped, 'before the deadline the transition is intact').toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(transitionRecord.skipped).toBe(1);
    expect(update, 'the browser still has not run the update').not.toHaveBeenCalled();
  });

  it('a settled transition stops the stalled check', async () => {
    const {transitionRecord} = installNativeStub(false);
    installViewTransitionStallGuard();

    document.startViewTransition({update: vi.fn()});
    transitionRecord.finish();

    await vi.advanceTimersByTimeAsync(1_000);

    expect(transitionRecord.skipped).toBe(0);
  });
});
