import {StrictMode, useRef} from 'react';
import {act, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {LngLat, YandexMapCity, YandexMapPoint} from './use-yandex-map';
import {useYandexMap} from './use-yandex-map';

// Тесты хука H5 с мок-объектом JS API: карта создаётся один раз; смена
// города двигает только центр; смена activeOfferId - только маркеры, без
// map.update; при размонтировании вызывается destroy; ошибка загрузки
// отдаёт 'error'; без ключа загрузчик не вызывается вовсе.

interface FakeMapCall {
  kind: 'create';
  center: LngLat;
  zoom: number;
}

interface FakeUpdateCall {
  kind: 'update';
  center: LngLat;
  zoom: number;
}

interface FakeMarkerCall {
  kind: 'marker';
  coordinates: LngLat;
  element: HTMLElement;
}

type FakeCall = FakeMapCall | FakeUpdateCall | FakeMarkerCall | {kind: 'destroy'};

const calls: FakeCall[] = [];

class FakeLayer {
  public children: unknown[] = [];

  addChild(child: unknown): void {
    this.children.push(child);
  }

  removeChild(child: unknown): void {
    this.children = this.children.filter((item) => item !== child);
  }
}

class FakeSchemeLayer extends FakeLayer {}

class FakeFeaturesLayer extends FakeLayer {}

class FakeMap {
  public children: unknown[] = [];

  constructor(
    public container: HTMLElement,
    props: {location: {center: LngLat; zoom: number}},
  ) {
    calls.push({kind: 'create', center: props.location.center, zoom: props.location.zoom});
  }

  update(props: {location: {center: LngLat; zoom: number}}): void {
    calls.push({kind: 'update', center: props.location.center, zoom: props.location.zoom});
  }

  addChild(child: unknown): void {
    this.children.push(child);
  }

  removeChild(child: unknown): void {
    this.children = this.children.filter((item) => item !== child);
  }

  destroy(): void {
    calls.push({kind: 'destroy'});
  }
}

class FakeMarker {
  constructor(
    props: {coordinates: LngLat},
    public element: HTMLElement,
  ) {
    calls.push({kind: 'marker', coordinates: props.coordinates, element});
  }
}

vi.mock('./load-yandex-maps', () => ({
  loadYandexMapsApi: vi.fn(() =>
    Promise.resolve({
      ready: Promise.resolve(),
      YMap: FakeMap,
      YMapDefaultSchemeLayer: FakeSchemeLayer,
      YMapDefaultFeaturesLayer: FakeFeaturesLayer,
      YMapMarker: FakeMarker,
    }),
  ),
}));

const PARIS: YandexMapCity = {
  location: {latitude: 48.85661, longitude: 2.35222, zoom: 10},
};

const COLOGNE: YandexMapCity = {
  location: {latitude: 50.938361, longitude: 6.959811, zoom: 10},
};

function makePoint(id: string): YandexMapPoint {
  return {id, location: {latitude: 48.85, longitude: 2.35, zoom: 12}};
}

const PARIS_POINTS: readonly YandexMapPoint[] = [makePoint('p1'), makePoint('p2')];
const COLOGNE_POINTS: readonly YandexMapPoint[] = [makePoint('c1'), makePoint('c2'), makePoint('c3')];

interface MapProbeProps {
  city: YandexMapCity;
  offers: readonly YandexMapPoint[];
  activeOfferId: string | null;
}

function MapProbe({city, offers, activeOfferId}: MapProbeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const status = useYandexMap(containerRef, city, offers, activeOfferId);

  return (
    <div>
      <span data-testid="map-status">{status}</span>
      <div data-testid="map-container" ref={containerRef} />
    </div>
  );
}

function countCalls(kind: FakeCall['kind']): number {
  return calls.filter((call) => call.kind === kind).length;
}

beforeEach(() => {
  calls.length = 0;
  vi.stubEnv('VITE_YANDEX_MAPS_KEY', 'test-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

async function renderMap(props: Partial<MapProbeProps> = {}) {
  const utils = render(
    <MapProbe
      city={props.city ?? PARIS}
      offers={props.offers ?? PARIS_POINTS}
      activeOfferId={props.activeOfferId ?? null}
    />,
  );

  await act(async () => {
    await Promise.resolve();
  });

  return utils;
}

describe('useYandexMap', () => {
  it('creates the map once with the city center and ready status', async () => {
    await renderMap();

    expect(screen.getByTestId('map-status').textContent).toBe('ready');
    expect(countCalls('create')).toBe(1);

    const createCall = calls.find((call) => call.kind === 'create');
    expect(createCall).toMatchObject({center: [2.35222, 48.85661], zoom: 10});
  });

  it('creates markers for all offers with longitude first', async () => {
    await renderMap();

    expect(countCalls('marker')).toBe(2);
    expect(calls.find((call) => call.kind === 'marker')).toMatchObject({
      coordinates: [2.35, 48.85],
    });
  });

  it('does nothing without a key: no loader call, no map', async () => {
    vi.stubEnv('VITE_YANDEX_MAPS_KEY', '');

    await renderMap();

    expect(screen.getByTestId('map-status').textContent).toBe('no-key');
    expect(countCalls('create')).toBe(0);
    expect(countCalls('marker')).toBe(0);
  });

  it('creates two independent maps mounted simultaneously', async () => {
    render(
      <>
        <MapProbe city={PARIS} offers={PARIS_POINTS} activeOfferId={null} />
        <MapProbe city={COLOGNE} offers={COLOGNE_POINTS} activeOfferId="c1" />
      </>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Обе карты созданы, каждая со своим центром. «Скрипт один на всё
    // приложение» проверяет load-yandex-maps.test.ts на настоящем загрузчике.
    expect(countCalls('create')).toBe(2);
    expect(calls.filter((call) => call.kind === 'create').map((call) => call.center)).toEqual(
      expect.arrayContaining([
        [2.35222, 48.85661],
        [6.959811, 50.938361],
      ]),
    );
  });

  it('moves only the center on city change: no new map, no marker churn', async () => {
    const {rerender} = await renderMap();

    rerender(<MapProbe city={COLOGNE} offers={PARIS_POINTS} activeOfferId={null} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(countCalls('create')).toBe(1);
    expect(countCalls('update')).toBe(1);
    expect(calls.find((call) => call.kind === 'update')).toMatchObject({
      center: [6.959811, 50.938361],
    });
  });

  it('rebuilds markers on offers change without touching the map', async () => {
    const {rerender} = await renderMap();

    rerender(<MapProbe city={PARIS} offers={COLOGNE_POINTS} activeOfferId={null} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(countCalls('create')).toBe(1);
    expect(countCalls('update')).toBe(0);
    expect(countCalls('marker')).toBe(5);
  });

  it('repaints only the active marker on activeOfferId change', async () => {
    const {rerender} = await renderMap({activeOfferId: 'p1'});

    const activeElement = calls
      .filter((call): call is FakeMarkerCall => call.kind === 'marker')
      .find((call) => call.element.dataset.offerId === 'p1')?.element;
    const inactiveElement = calls
      .filter((call): call is FakeMarkerCall => call.kind === 'marker')
      .find((call) => call.element.dataset.offerId === 'p2')?.element;

    expect(activeElement?.classList.contains('marker--active')).toBe(true);
    expect(inactiveElement?.classList.contains('marker--active')).toBe(false);

    const markersBefore = countCalls('marker');
    const updatesBefore = countCalls('update');

    rerender(<MapProbe city={PARIS} offers={PARIS_POINTS} activeOfferId="p2" />);
    await act(async () => {
      await Promise.resolve();
    });

    // Только маркеры: ни карты, ни update, ни новых маркеров.
    expect(countCalls('marker')).toBe(markersBefore);
    expect(countCalls('update')).toBe(updatesBefore);
    expect(activeElement?.classList.contains('marker--active')).toBe(false);
    expect(inactiveElement?.classList.contains('marker--active')).toBe(true);
  });

  it('reapplies the active class after markers are rebuilt with the same active id', async () => {
    // Новый массив точек с теми же id (например, список предложений
    // пересчитался в Redux): маркеры пересобраны - подсветка обязана
    // вернуться на НОВЫЙ элемент активного маркера.
    const {rerender} = await renderMap({activeOfferId: 'p1'});

    rerender(<MapProbe city={PARIS} offers={[makePoint('p1'), makePoint('p2')]} activeOfferId="p1" />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(countCalls('marker')).toBe(4);
    expect(countCalls('create')).toBe(1);
    expect(countCalls('update')).toBe(0);

    const rebuiltMarkers = calls.filter((call): call is FakeMarkerCall => call.kind === 'marker').slice(-2);
    const rebuiltActive = rebuiltMarkers.find((call) => call.element.dataset.offerId === 'p1')?.element;
    const rebuiltInactive = rebuiltMarkers.find((call) => call.element.dataset.offerId === 'p2')?.element;

    expect(rebuiltActive?.classList.contains('marker--active')).toBe(true);
    expect(rebuiltInactive?.classList.contains('marker--active')).toBe(false);
  });

  it('destroys the map on unmount', async () => {
    const {unmount} = await renderMap();
    expect(countCalls('destroy')).toBe(0);

    unmount();

    expect(countCalls('destroy')).toBe(1);
  });

  it('reports the error status when the script fails to load', async () => {
    const {loadYandexMapsApi} = await import('./load-yandex-maps');

    vi.mocked(loadYandexMapsApi).mockRejectedValueOnce(new Error('load failed'));

    render(<MapProbe city={PARIS} offers={PARIS_POINTS} activeOfferId={null} />);

    await waitFor(() => {
      expect(screen.getByTestId('map-status').textContent).toBe('error');
    });
    expect(countCalls('create')).toBe(0);
  });

  it('survives the StrictMode double mount with a single live map', async () => {
    render(
      <StrictMode>
        <MapProbe city={PARIS} offers={PARIS_POINTS} activeOfferId={null} />
      </StrictMode>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(countCalls('create')).toBe(1);
    expect(countCalls('destroy')).toBe(0);
    expect(screen.getByTestId('map-status').textContent).toBe('ready');
  });
});
