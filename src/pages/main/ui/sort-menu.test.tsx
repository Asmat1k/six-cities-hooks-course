import {fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {SortMenu} from './sort-menu';
import type {SortValue} from '../model/sort-offers';

// Тесты меню сортировки (H3): открытие/закрытие, клик снаружи, Escape,
// стрелки и Enter, отписка после закрытия и размонтирования, а также то,
// что новый handler на каждом рендере не пересоздаёт подписки document.

function renderSortMenu(value: SortValue = 'popular', onChange = vi.fn()) {
  return render(<SortMenu value={value} onChange={onChange} />);
}

function getOptionElements() {
  return within(screen.getByRole('listbox')).getAllByRole('option');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SortMenu', () => {
  it('shows the current value and opens the list on click', () => {
    renderSortMenu('popular');

    expect(screen.getByText('Popular', {selector: '#sort-current'})).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));
    expect(screen.getByRole('listbox')).toBeVisible();
    expect(screen.getByRole('button', {name: /Sort by/})).toHaveAttribute('aria-expanded', 'true');
  });

  it('selects an option by click and closes the menu', () => {
    const onChange = vi.fn();
    renderSortMenu('popular', onChange);

    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));
    fireEvent.click(screen.getByText('Price: low to high'));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('price-asc');
    expect(screen.getByRole('button', {name: /Sort by/})).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks the active option', () => {
    const {container} = renderSortMenu('top-rated');
    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));

    const activeOption = container.querySelector('.sort__option--active');

    expect(activeOption?.textContent).toBe('Top rated first');
    expect(activeOption).toHaveAttribute('aria-selected', 'true');
  });

  it('closes on a click outside', () => {
    renderSortMenu();

    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));
    expect(screen.getByRole('button', {name: /Sort by/})).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseDown(document.body);

    expect(screen.getByRole('button', {name: /Sort by/})).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape', () => {
    renderSortMenu();

    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));
    fireEvent.keyDown(document, {key: 'Escape'});

    expect(screen.getByRole('button', {name: /Sort by/})).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves the focused option with arrow keys and selects it with Enter', () => {
    const onChange = vi.fn();
    renderSortMenu('popular', onChange);
    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));

    const options = getOptionElements();
    expect(options[0].className).toContain('sort__option--focused');

    fireEvent.keyDown(document, {key: 'ArrowDown'});
    fireEvent.keyDown(document, {key: 'ArrowDown'});
    expect(options[2].className).toContain('sort__option--focused');

    fireEvent.keyDown(document, {key: 'ArrowUp'});
    expect(options[1].className).toContain('sort__option--focused');

    fireEvent.keyDown(document, {key: 'Enter'});
    expect(onChange).toHaveBeenCalledExactlyOnceWith('price-asc');
    expect(screen.getByRole('button', {name: /Sort by/})).toHaveAttribute('aria-expanded', 'false');
  });

  it('stops at the edges with arrow keys', () => {
    renderSortMenu('popular');
    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));

    const options = getOptionElements();

    fireEvent.keyDown(document, {key: 'ArrowUp'});
    expect(options[0].className).toContain('sort__option--focused');

    for (let index = 0; index < 10; index += 1) {
      fireEvent.keyDown(document, {key: 'ArrowDown'});
    }

    expect(options[3].className).toContain('sort__option--focused');
  });

  it('ignores keys while closed', () => {
    const onChange = vi.fn();
    renderSortMenu('popular', onChange);

    fireEvent.keyDown(document, {key: 'ArrowDown'});
    fireEvent.keyDown(document, {key: 'Enter'});
    fireEvent.mouseDown(document.body);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: /Sort by/})).toHaveAttribute('aria-expanded', 'false');
  });

  it('subscribes on document only while the menu is open', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const keydownCount = () =>
      addEventListenerSpy.mock.calls.filter(([event]) => event === 'keydown').length;
    const keydownRemoved = () =>
      removeEventListenerSpy.mock.calls.filter(([event]) => event === 'keydown').length;

    renderSortMenu();
    expect(keydownCount()).toBe(0);

    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));
    // Стрелки, Enter, Escape - по одной подписке на клавишу.
    expect(keydownCount()).toBe(4);

    fireEvent.keyDown(document, {key: 'Escape'});
    expect(keydownRemoved()).toBe(4);
  });

  it('removes all document listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const {unmount} = renderSortMenu();
    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));

    const subscribed = addEventListenerSpy.mock.calls.filter(([event]) =>
      event === 'keydown' || event === 'mousedown',
    ).length;

    unmount();

    const removed = removeEventListenerSpy.mock.calls.filter(([event]) =>
      event === 'keydown' || event === 'mousedown',
    ).length;

    expect(removed).toBe(subscribed);
  });

  it('does not resubscribe when onChange changes each render', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const {rerender} = renderSortMenu('popular', vi.fn());
    fireEvent.click(screen.getByRole('button', {name: /Sort by/}));

    const mousedownCount = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'mousedown',
    ).length;

    rerender(<SortMenu value="popular" onChange={vi.fn()} />);
    rerender(<SortMenu value="popular" onChange={vi.fn()} />);

    const callsAfterRerenders = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'mousedown',
    ).length;

    expect(callsAfterRerenders).toBe(mousedownCount);
  });
});
