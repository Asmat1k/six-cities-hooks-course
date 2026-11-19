import {useState} from 'react';
import {RouterProvider, createMemoryRouter} from 'react-router';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {MainPage} from './main-page';
import type {City, OfferPreview} from '@/entities/offer';
import {SEARCH_DEBOUNCE_MS} from '@/shared/config/variant';

// Тесты главной (этапы 4-6): поиск с дебаунсом 500 мс и историей
// (replace для q, push для сортировки), обе гонки H4 (Back во время
// ожидания; сортировка до истечения таймера - и новый sort, и новый q),
// Enter и очистка, поиск вместе со сменой города и сортировкой.
// Тестовый роутер - memory: имитация Back/Forward через navigate(delta).

const PARIS: City = {
  name: 'Paris',
  location: {latitude: 48.85661, longitude: 2.35222, zoom: 10},
};

const AMSTERDAM: City = {
  name: 'Amsterdam',
  location: {latitude: 52.38333, longitude: 4.9, zoom: 10},
};

const CITY_NAMES = ['Paris', 'Cologne', 'Brussels', 'Amsterdam', 'Hamburg', 'Dusseldorf'];

function makeOffer(id: string, title: string, cityName: string, price: number, rating: number): OfferPreview {
  return {
    id,
    title,
    type: 'apartment',
    price,
    previewImage: `/img/offers/${id}.jpg`,
    city: cityName === 'Paris' ? PARIS : AMSTERDAM,
    location: {latitude: 48.85, longitude: 2.35, zoom: 12},
    isFavorite: false,
    isPremium: false,
    rating,
  };
}

const OFFERS: OfferPreview[] = [
  makeOffer('p1', 'Bright loft near Montmartre', 'Paris', 150, 4.9),
  makeOffer('p2', 'Cozy loft by the Seine', 'Paris', 70, 3.5),
  makeOffer('p3', 'House in the Latin Quarter', 'Paris', 210, 4.2),
  makeOffer('a1', 'Canal apartment in Amsterdam', 'Amsterdam', 120, 4.8),
];

const CITY_BY_NAME: Record<string, City> = {Paris: PARIS, Amsterdam: AMSTERDAM};

// Стенд повторяет контракт MainRoute: город кликается - отображаемый
// город меняется (в реальном приложении - через Redux и startTransition).
function MainHarness() {
  const [displayedCity, setDisplayedCity] = useState<City>(PARIS);

  return (
    <MainPage
      cityNames={CITY_NAMES}
      selectedCityName={displayedCity.name}
      displayedCity={displayedCity}
      offers={OFFERS}
      onCityChange={(cityName) => {
        setDisplayedCity(CITY_BY_NAME[cityName] ?? PARIS);
      }}
    />
  );
}

type TestRouter = ReturnType<typeof createMemoryRouter>;

// initialIndex нужен явно: memory-роутер по умолчанию стартует с ПОСЛЕДНЕЙ
// записи initialEntries.
function renderMain(initialEntries: string[], initialIndex = 0): {router: TestRouter} {
  const router = createMemoryRouter([{path: '/', element: <MainHarness />}], {
    initialEntries,
    initialIndex,
  });

  render(<RouterProvider router={router} />);

  return {router};
}

function getSearchInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Search by title');
}

function typeSearch(text: string) {
  fireEvent.change(getSearchInput(), {target: {value: text}});
}

function applyPendingSearch() {
  act(() => {
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  });
}

function expectCardTitles(titles: string[]) {
  const cards = document.querySelectorAll('.places-grid .place-card__title');

  expect(Array.from(cards).map((card) => card.textContent)).toEqual(titles);
}

function selectSort(label: string) {
  fireEvent.click(screen.getByRole('button', {name: /Sort by/}));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(label));
}

// Memory-роутер не стреляет popstate - браузер в реальности стреляет его сам
// на каждую кнопку «назад/вперёд»; в тесте имитируем браузер. navigate
// асинхронный: ждём его внутри act, чтобы роутер и React успели закрыть
// переход до проверок.
async function goBack(router: TestRouter) {
  await act(async () => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    await router.navigate(-1);
  });
}

async function goForward(router: TestRouter) {
  await act(async () => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    await router.navigate(1);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('MainPage: state in the url', () => {
  it('restores sort and search from a direct url', () => {
    const {router} = renderMain(['/?sort=price-asc&q=loft']);

    expect(router.state.location.search).toBe('?sort=price-asc&q=loft');
    expect(screen.getByText('Price: low to high', {selector: '#sort-current'})).toBeInTheDocument();
    expect(getSearchInput().value).toBe('loft');
    // Отфильтровано по «loft» и отсортировано по цене по возрастанию.
    expectCardTitles(['Cozy loft by the Seine', 'Bright loft near Montmartre']);
  });

  it('falls back to Popular for an invalid sort and does not rewrite the url', () => {
    const {router} = renderMain(['/?sort=abc']);

    expect(screen.getByText('Popular', {selector: '#sort-current'})).toBeInTheDocument();
    expect(router.state.location.search).toBe('?sort=abc');
  });

  it('applies search only after the debounce, not on every letter', () => {
    const {router} = renderMain(['/']);

    fireEvent.change(getSearchInput(), {target: {value: 'l'}});
    fireEvent.change(getSearchInput(), {target: {value: 'lo'}});
    fireEvent.change(getSearchInput(), {target: {value: 'lof'}});
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });

    expect(router.state.location.search).toBe('');
    expectCardTitles([
      'Bright loft near Montmartre',
      'Cozy loft by the Seine',
      'House in the Latin Quarter',
    ]);

    applyPendingSearch();

    expect(router.state.location.search).toBe('?q=lof');
    expectCardTitles(['Bright loft near Montmartre', 'Cozy loft by the Seine']);
  });

  it('applies the search immediately on Enter', () => {
    const {router} = renderMain(['/']);

    typeSearch('house');
    fireEvent.keyDown(getSearchInput(), {key: 'Enter'});

    expect(router.state.location.search).toBe('?q=house');

    // Отложенного вызова после Enter не остаётся.
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    });
    expect(router.state.location.search).toBe('?q=house');
  });

  it('cancels the pending search and removes q on Clear', () => {
    const {router} = renderMain(['/']);

    typeSearch('house');
    applyPendingSearch();
    expect(router.state.location.search).toBe('?q=house');

    fireEvent.click(screen.getByRole('button', {name: 'Clear search'}));

    expect(router.state.location.search).toBe('');
    expect(getSearchInput().value).toBe('');

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    });
    expect(router.state.location.search).toBe('');
  });
});

describe('MainPage: history behaviour', () => {
  it('writes q with replace: typing adds no history entry', async () => {
    const {router} = renderMain(['/?before=1', '/'], 1);

    typeSearch('house');
    applyPendingSearch();
    expect(router.state.location.search).toBe('?q=house');

    // Back возвращает соседнюю запись ДО ввода: между ней и применённым
    // поиском нет промежуточных записей с каждой буквой - q писал replace.
    await goBack(router);

    expect(router.state.location.search).toBe('?before=1');
    expect(getSearchInput().value).toBe('');
  });

  it('writes sort with push: Back returns the state before sorting', async () => {
    const {router} = renderMain(['/']);

    selectSort('Price: low to high');
    expect(router.state.location.search).toBe('?sort=price-asc');

    await goBack(router);

    expect(router.state.location.search).toBe('');
    expect(screen.getByText('Popular', {selector: '#sort-current'})).toBeInTheDocument();
    expectCardTitles([
      'Bright loft near Montmartre',
      'Cozy loft by the Seine',
      'House in the Latin Quarter',
    ]);
  });
});

describe('MainPage: H4 races', () => {
  it('Back during the pending search cancels it: the url, field and list stay untouched', async () => {
    const {router} = renderMain(['/?q=loft', '/'], 1);

    expect(getSearchInput().value).toBe('');
    expectCardTitles([
      'Bright loft near Montmartre',
      'Cozy loft by the Seine',
      'House in the Latin Quarter',
    ]);

    typeSearch('new');
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 100);
    });

    // «Назад» до истечения таймера: popstate отменяет отложенный поиск
    // синхронно, до того как роутер обработал переход.
    await goBack(router);

    // Поле восстановлено из URL целевой записи, список - по её q.
    expect(router.state.location.search).toBe('?q=loft');
    expect(getSearchInput().value).toBe('loft');
    expectCardTitles(['Bright loft near Montmartre', 'Cozy loft by the Seine']);

    // Таймер отменён: даже после истечения 500 мс ничего не дописалось.
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    });

    expect(router.state.location.search).toBe('?q=loft');
    expect(getSearchInput().value).toBe('loft');
    expectCardTitles(['Bright loft near Montmartre', 'Cozy loft by the Seine']);
  });

  it('Forward during a pending search does not rewrite the target entry', async () => {
    const {router} = renderMain(['/', '/?q=loft'], 0);

    expect(router.state.location.search).toBe('');

    typeSearch('new');
    act(() => {
      vi.advanceTimersByTime(100);
    });

    await goForward(router);

    // Целевая запись - /?q=loft: поле восстановлено из неё, таймер снят.
    expect(getSearchInput().value).toBe('loft');

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    });

    expect(router.state.location.search).toBe('?q=loft');
    expect(getSearchInput().value).toBe('loft');
  });

  it('a sort push during the pending search keeps both: the flush writes into the fresh entry', async () => {
    const {router} = renderMain(['/?utm=promo']);

    typeSearch('loft');
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Сортировка до таймера: push создаёт запись с sort.
    selectSort('Price: low to high');
    expect(router.state.location.search).toBe('?utm=promo&sort=price-asc');

    // Дождались таймера: q дописан в актуальную запись - со свежим
    // сеттером, а не со снимком параметров на момент ввода. Посторонний
    // параметр уцелел.
    applyPendingSearch();

    expect(router.state.location.search).toBe('?utm=promo&sort=price-asc&q=loft');
    expect(screen.getByText('Price: low to high', {selector: '#sort-current'})).toBeInTheDocument();
    expectCardTitles(['Cozy loft by the Seine', 'Bright loft near Montmartre']);

    // «Назад» возвращает запись ДО сортировки: сортировка сброшена,
    // поле восстановлено из URL (q там не было).
    await goBack(router);

    expect(router.state.location.search).toBe('?utm=promo');
    expect(getSearchInput().value).toBe('');
    expectCardTitles([
      'Bright loft near Montmartre',
      'Cozy loft by the Seine',
      'House in the Latin Quarter',
    ]);
  });
});

describe('MainPage: search with city and sort together', () => {
  it('filters the newly selected city by the same query', () => {
    renderMain(['/?q=loft']);

    expectCardTitles(['Bright loft near Montmartre', 'Cozy loft by the Seine']);

    fireEvent.click(screen.getByRole('button', {name: 'Amsterdam'}));

    expect(screen.getByRole('heading', {name: '0 places to stay in Amsterdam'})).toBeInTheDocument();
    expectCardTitles([]);

    // URL не трогался сменой города: q остался.
    fireEvent.click(screen.getByRole('button', {name: 'Paris'}));
    expectCardTitles(['Bright loft near Montmartre', 'Cozy loft by the Seine']);
  });

  it('combines city filter, search and sort in the visible list', () => {
    renderMain(['/?q=loft&sort=price-desc']);

    expectCardTitles(['Bright loft near Montmartre', 'Cozy loft by the Seine']);
    expect(screen.getByRole('heading', {name: '2 places to stay in Paris'})).toBeInTheDocument();
  });
});

describe('MainPage: active card', () => {
  it('marks the hovered card as active and clears it on leave', () => {
    renderMain(['/']);

    const cards = screen.getAllByRole('article');

    fireEvent.mouseEnter(cards[0]);
    expect(cards[0].className).toContain('place-card--active');

    fireEvent.mouseLeave(cards[0]);
    expect(cards[0].className).not.toContain('place-card--active');
  });

  it('marks the focused card as active (keyboard, not just hover)', () => {
    renderMain(['/']);

    const cards = screen.getAllByRole('article');

    fireEvent.focus(within(cards[0]).getByRole('link'));
    expect(cards[0].className).toContain('place-card--active');

    fireEvent.blur(within(cards[0]).getByRole('link'));
    expect(cards[0].className).not.toContain('place-card--active');
  });
});
