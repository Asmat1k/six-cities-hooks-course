import {useEffect, useRef, useState, type RefObject} from 'react';
import type {YMap, YMapMarker} from '@yandex/ymaps3-types';
import {loadYandexMapsApi, type YandexMapsApi} from './load-yandex-maps';

// H5. `useYandexMap(containerRef, city, offers, activeOfferId)` - карта на
// Яндекс Картах (JS API 3.0). Карта создаётся один раз на монтирование
// контейнера; смена города двигает только центр, смена списка предложений
// пересобирает только маркеры, смена активного предложения перекрашивает
// маркер через класс элемента. При размонтировании карта уничтожается
// (destroy) - это же спасает от двойного монтирования в StrictMode.
//
// Без ключа (VITE_YANDEX_MAPS_KEY пуст) скрипт не грузится вовсе, статус
// 'no-key'; при ошибке загрузки скрипта - 'error'. Компонент показывает
// сообщение вместо карты, приложение продолжает работать.

export type YandexMapStatus = 'no-key' | 'loading' | 'ready' | 'error';

// Минимальные структурные типы: срез карты не зависит от сущностей FSD и
// годится любым данным с координатами (OfferPreview подходит структурно).
// Яндекс Карты ждут [долгота, широта] - долгота первой (PROJECT.md, 9.2).
export interface YandexMapLocation {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface YandexMapCity {
  location: YandexMapLocation;
}

export interface YandexMapPoint {
  id: string;
  location: YandexMapLocation;
}

export type LngLat = [number, number];

interface MapLocationRequest {
  center: LngLat;
  zoom: number;
}

// Значение переменной окружения читается в одном месте: пустое значение или
// отсутствие переменной означают режим «без ключа».
function readYandexMapsApiKeyValue(): string {
  return import.meta.env.VITE_YANDEX_MAPS_KEY ?? '';
}

function toLngLat(location: YandexMapLocation): LngLat {
  return [location.longitude, location.latitude];
}

export function useYandexMap(
  containerRef: RefObject<HTMLElement | null>,
  city: YandexMapCity,
  offers: readonly YandexMapPoint[],
  activeOfferId: string | null,
): YandexMapStatus {
  const [status, setStatus] = useState<YandexMapStatus>(() =>
    readYandexMapsApiKeyValue() === '' ? 'no-key' : 'loading',
  );

  // Актуальные пропсы для эффектов, создающих карту: город читается через
  // ref, чтобы карта не пересоздавалась при его смене - центр и маркеры
  // обновляются отдельными эффектами.
  const cityRef = useRef(city);

  useEffect(() => {
    cityRef.current = city;
  });

  // Экземпляр карты (маркеры вешаются на саму карту - addChild/removeChild у
  // YMap публичные); реестр DOM-элементов маркеров нужен, чтобы перекрашивать
  // активный маркер без пересоздания остальных.
  const mapRef = useRef<YMap | null>(null);
  const markersRef = useRef<YMapMarker[]>([]);
  const markerElementsRef = useRef(new Map<string, HTMLElement>());
  const apiRef = useRef<YandexMapsApi | null>(null);

  // Последний применённый центр: чтобы синхронизация «на готовность» не
  // дёргала карту лишним update, а эффект менял центр только при смене.
  const appliedLocationRef = useRef<MapLocationRequest | null>(null);

  // Эффект 1: загрузка скрипта и создание карты - один раз на монтирование.
  useEffect(() => {
    const apiEnvironment = readYandexMapsApiKeyValue();

    if (apiEnvironment === '') {
      return undefined;
    }

    let cancelled = false;

    loadYandexMapsApi(apiEnvironment).then(
      (api) => {
        if (cancelled) {
          return;
        }

        const container = containerRef.current;

        if (container === null) {
          setStatus('error');
          return;
        }

        const initialLocation = cityRef.current.location;
        const initialRequest: MapLocationRequest = {
          center: toLngLat(initialLocation),
          zoom: initialLocation.zoom,
        };
        const map = new api.YMap(container, {location: initialRequest});

        map.addChild(new api.YMapDefaultSchemeLayer({}));
        map.addChild(new api.YMapDefaultFeaturesLayer({}));

        apiRef.current = api;
        mapRef.current = map;
        markerElementsRef.current = new Map();
        markersRef.current = [];
        appliedLocationRef.current = initialRequest;
        setStatus('ready');
      },
      () => {
        if (!cancelled) {
          setStatus('error');
        }
      },
    );

    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      markersRef.current = [];
      markerElementsRef.current = new Map();
      apiRef.current = null;
      appliedLocationRef.current = null;
    };
  }, [containerRef]);

  // Эффект 2: смена города двигает центр готовой карты, не пересоздавая её.
  useEffect(() => {
    const map = mapRef.current;

    if (map === null || status !== 'ready') {
      return;
    }

    const applied = appliedLocationRef.current;
    const nextRequest: MapLocationRequest = {
      center: toLngLat(city.location),
      zoom: city.location.zoom,
    };

    const isSameLocation =
      applied !== null &&
      applied.zoom === nextRequest.zoom &&
      applied.center[0] === nextRequest.center[0] &&
      applied.center[1] === nextRequest.center[1];

    if (isSameLocation) {
      return;
    }

    appliedLocationRef.current = nextRequest;
    map.update({location: nextRequest});
  }, [city, status]);

  // Эффект 3: список маркеров пересобирается при смене предложений,
  // но не карты. Цвет активного маркера трогает эффект 4.
  useEffect(() => {
    const api = apiRef.current;
    const map = mapRef.current;

    if (api === null || map === null || status !== 'ready') {
      return;
    }

    for (const marker of markersRef.current) {
      map.removeChild(marker);
    }

    markersRef.current = [];
    markerElementsRef.current = new Map();

    for (const offer of offers) {
      const markerElement = document.createElement('span');

      markerElement.className = 'marker';
      markerElement.dataset.offerId = offer.id;
      markerElement.innerHTML = '<svg aria-hidden="true"><use href="#icon-pin"></use></svg>';
      markerElement.setAttribute('aria-label', `Offer pin ${offer.id}`);

      const marker = new api.YMapMarker(
        {coordinates: toLngLat(offer.location)},
        markerElement,
      );

      map.addChild(marker);
      markersRef.current.push(marker);
      markerElementsRef.current.set(offer.id, markerElement);
    }
  }, [offers, status]);

  // Эффект 4: активное предложение перекрашивает только свой маркер.
  // `offers` в зависимостях: эффект 3 при смене предложений пересобирает
  // маркеры с чистыми элементами, и подсветку нужно применить заново,
  // даже если активный id не менялся. При смене только activeOfferId
  // маркеры не пересоздаются - их трогает лишь этот эффект.
  useEffect(() => {
    for (const [offerId, markerElement] of markerElementsRef.current) {
      markerElement.classList.toggle('marker--active', offerId === activeOfferId);
    }
  }, [activeOfferId, offers, status]);

  return status;
}
