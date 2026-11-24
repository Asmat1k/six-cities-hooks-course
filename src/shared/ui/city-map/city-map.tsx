import {useRef} from 'react';
import {
  useYandexMap,
  type YandexMapCity,
  type YandexMapPoint,
} from '@/hooks/use-yandex-map/use-yandex-map';

// Карта города (этап 5): одна и та же на главной (все предложения города,
// активная карточка подсвечивает маркер) и на странице предложения (три
// соседних и текущее). Типы пропсов - структурные, без привязки к сущностям
// FSD: OfferPreview подходит автоматически.

interface CityMapProps {
  city: YandexMapCity;
  points: readonly YandexMapPoint[];
  activePointId?: string | null;
}

const NO_KEY_MESSAGE =
  'The map is unavailable: no Yandex Maps API key. Add VITE_YANDEX_MAPS_KEY to .env.local and rebuild - the list keeps working without it.';
const LOAD_ERROR_MESSAGE =
  'The map failed to load. Check your internet connection and the API key, then reload the page.';

export function CityMap({city, points, activePointId = null}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const status = useYandexMap(containerRef, city, points, activePointId);

  if (status === 'no-key' || status === 'error') {
    return (
      <div className="map">
        <p className="map__fallback">
          {status === 'no-key' ? NO_KEY_MESSAGE : LOAD_ERROR_MESSAGE}
        </p>
      </div>
    );
  }

  return <div className="map" ref={containerRef} />;
}

export type {YandexMapCity, YandexMapPoint};
