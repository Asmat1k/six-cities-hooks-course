import type {ReactNode} from 'react';
import {MemoryRouter, useLocation, useNavigationType} from 'react-router';
import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useUrlState} from './use-url-state';
import {parseSortValue} from '@/pages/main/model/sort-offers';

// Тесты H4 на MemoryRouter: чтение из URL, запись в URL, значение по
// умолчанию для отсутствующего/некорректного параметра (без перезаписи
// адреса), replace против push (по navigationType) и сохранение
// посторонних параметров при записи.

const SORT_NAME = 'sort';
const DEFAULT_SORT = 'popular';

interface ProbeProps {
  name: string;
  defaultValue: string;
  parse: (raw: string | null) => string;
}

function UrlStateProbe({name, defaultValue, parse}: ProbeProps) {
  const [sortValue, setSortValue] = useUrlState(name, defaultValue, parse);
  const location = useLocation();
  const navigationType = useNavigationType();

  function applySort(nextValue: string, options?: {replace?: boolean}) {
    setSortValue(nextValue === '' ? undefined : nextValue, options);
  }

  return (
    <div>
      <output data-testid="value">{sortValue}</output>
      <output data-testid="search">{location.search}</output>
      <output data-testid="navigation-type">{navigationType}</output>
      <button
        type="button"
        onClick={() => {
          applySort('price-asc');
        }}
      >push-value
      </button>
      <button
        type="button"
        onClick={() => {
          applySort('price-asc', {replace: true});
        }}
      >replace-value
      </button>
      <button
        type="button"
        onClick={() => {
          applySort('');
        }}
      >remove-value
      </button>
    </div>
  );
}

function renderProbe(initialUrl: string, props?: Partial<ProbeProps>) {
  function RouterWrapper({children}: {children: ReactNode}) {
    return <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>;
  }

  return render(
    <UrlStateProbe
      name={props?.name ?? SORT_NAME}
      defaultValue={props?.defaultValue ?? DEFAULT_SORT}
      parse={props?.parse ?? parseSortValue}
    />,
    {wrapper: RouterWrapper},
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useUrlState', () => {
  it('reads the value from the initial url', () => {
    renderProbe('/?sort=price-asc');

    expect(screen.getByTestId('value').textContent).toBe('price-asc');
    expect(screen.getByTestId('search').textContent).toBe('?sort=price-asc');
  });

  it('returns the default value when the parameter is missing', () => {
    renderProbe('/');

    expect(screen.getByTestId('value').textContent).toBe('popular');
    expect(screen.getByTestId('search').textContent).toBe('');
  });

  it('returns the default value for an incorrect value and keeps the url untouched', () => {
    // ?sort=abc означает Popular - и адрес не перезаписывается.
    renderProbe('/?sort=abc');

    expect(screen.getByTestId('value').textContent).toBe('popular');
    expect(screen.getByTestId('search').textContent).toBe('?sort=abc');
    expect(screen.getByTestId('navigation-type').textContent).toBe('POP');
  });

  it('writes the value into the url and creates a history entry by default', () => {
    renderProbe('/');

    fireEvent.click(screen.getByText('push-value'));

    expect(screen.getByTestId('value').textContent).toBe('price-asc');
    expect(screen.getByTestId('search').textContent).toBe('?sort=price-asc');
    expect(screen.getByTestId('navigation-type').textContent).toBe('PUSH');
  });

  it('replaces the current entry with replace instead of pushing', () => {
    renderProbe('/?sort=price-asc');

    fireEvent.click(screen.getByText('replace-value'));

    expect(screen.getByTestId('value').textContent).toBe('price-asc');
    expect(screen.getByTestId('search').textContent).toBe('?sort=price-asc');
    expect(screen.getByTestId('navigation-type').textContent).toBe('REPLACE');
  });

  it('removes the parameter when the value is undefined', () => {
    renderProbe('/?sort=price-asc&utm=promo');

    fireEvent.click(screen.getByText('remove-value'));

    expect(screen.getByTestId('value').textContent).toBe('popular');
    expect(screen.getByTestId('search').textContent).toBe('?utm=promo');
  });

  it('keeps unrelated parameters when writing its own', () => {
    renderProbe('/?utm=promo&q=house');

    fireEvent.click(screen.getByText('push-value'));

    expect(screen.getByTestId('search').textContent).toBe('?utm=promo&q=house&sort=price-asc');
  });

  it('updates only its own parameter on repeated writes', () => {
    renderProbe('/?utm=promo&sort=price-asc');

    fireEvent.click(screen.getByText('replace-value'));

    expect(screen.getByTestId('search').textContent).toBe('?utm=promo&sort=price-asc');
  });
});

// Прямая проверка сигнатуры сеттера: undefined стирает параметр, replace
// не создаёт новую запись истории.
describe('useUrlState setter contract', () => {
  it('removes the parameter with replace semantics', () => {
    function Probe() {
      const [, setSortValue] = useUrlState(SORT_NAME, DEFAULT_SORT, parseSortValue);
      const location = useLocation();
      const navigationType = useNavigationType();

      return (
        <div>
          <output data-testid="search">{location.search}</output>
          <output data-testid="navigation-type">{navigationType}</output>
          <button
            type="button"
            onClick={() => {
              setSortValue(undefined, {replace: true});
            }}
          >
            clear
          </button>
        </div>
      );
    }

    function RouterWrapper({children}: {children: ReactNode}) {
      return <MemoryRouter initialEntries={['/?sort=price-asc']}>{children}</MemoryRouter>;
    }

    render(<Probe />, {wrapper: RouterWrapper});
    fireEvent.click(screen.getByText('clear'));

    expect(screen.getByTestId('search').textContent).toBe('');
    expect(screen.getByTestId('navigation-type').textContent).toBe('REPLACE');
  });
});
