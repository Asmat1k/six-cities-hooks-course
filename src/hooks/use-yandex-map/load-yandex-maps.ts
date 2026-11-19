import type {YMap, YMapDefaultFeaturesLayer, YMapDefaultSchemeLayer, YMapMarker} from '@yandex/ymaps3-types';

// Загрузчик JS API Яндекс Карт 3.0 (H5). Скрипт добавляется в документ
// один раз на всё приложение: промис кэшируется на уровне модуля, поэтому
// при двух одновременно монтирующихся картах (или повторном открытии
// страницы без перезагрузки) второй запрос не уходит. При ошибке загрузки
// кэш сбрасывается - повторная попытка снова добавит скрипт.
//
// Ключ передаётся в URL скрипта; в репозиторий он не попадает - берётся из
// VITE_YANDEX_MAPS_KEY (см. .env.example и SETUP.md).

// Структурный тип глобального объекта API: официальный пакет
// @yandex/ymaps3-types объявляет глобальную константу ymaps3, а скрипт API
// кладёт её на window - здесь описано то подмножество, которым пользуется
// хук useYandexMap.
export interface YandexMapsApi {
  ready: Promise<void>;
  YMap: typeof YMap;
  YMapDefaultSchemeLayer: typeof YMapDefaultSchemeLayer;
  YMapDefaultFeaturesLayer: typeof YMapDefaultFeaturesLayer;
  YMapMarker: typeof YMapMarker;
}

declare global {
  interface Window {
    ymaps3?: YandexMapsApi;
  }
}

const API_SCRIPT_URL = 'https://api-maps.yandex.ru/v3/';

let apiPromise: Promise<YandexMapsApi> | null = null;

function resetLoaderCache() {
  apiPromise = null;
}

export function loadYandexMapsApi(apiKey: string): Promise<YandexMapsApi> {
  if (apiPromise !== null) {
    return apiPromise;
  }

  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${API_SCRIPT_URL}?apikey=${encodeURIComponent(apiKey)}&lang=en_US`;
    script.async = true;

    script.onload = () => {
      const api = window.ymaps3;

      if (api === undefined) {
        resetLoaderCache();
        reject(new Error('The Yandex Maps script did not define the ymaps3 global.'));
        return;
      }

      api.ready.then(
        () => {
          resolve(api);
        },
        () => {
          resetLoaderCache();
          reject(new Error('The Yandex Maps API failed to initialize.'));
        },
      );
    };

    script.onerror = () => {
      resetLoaderCache();
      reject(new Error('Failed to load the Yandex Maps script.'));
    };

    document.head.append(script);
  });

  return apiPromise;
}
