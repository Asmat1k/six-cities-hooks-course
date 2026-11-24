import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {YandexMapsApi} from './load-yandex-maps';

// Тесты загрузчика JS API (H5): скрипт добавляется в документ один раз при
// двух одновременных вызовах; промис кэшируется до выгрузки страницы;
// при ошибке кэш сбрасывается и следующая попытка снова добавляет скрипт.
// jsdom не исполняет скрипты по src - события load/error стреляем сами.
// Подстановка window.ymaps3 - через vi.stubGlobal: глобал объявлен
// структурным типом YandexMapsApi, а фейку достаточно быть распознаваемой
// по ссылке (загрузчик возвращает её как есть).

interface LoaderModule {
  loadYandexMapsApi(apiKeyValue: string): Promise<YandexMapsApi>;
}

const FAKE_API = {
  ready: Promise.resolve(),
  YMap: vi.fn(),
  YMapDefaultSchemeLayer: vi.fn(),
  YMapDefaultFeaturesLayer: vi.fn(),
  YMapMarker: vi.fn(),
};

describe('loadYandexMapsApi', () => {
  let loader: LoaderModule;

  beforeEach(async () => {
    // Свежий модуль на каждый тест: кэш промиса живёт на уровне модуля.
    vi.resetModules();
    vi.unstubAllGlobals();
    loader = await import('./load-yandex-maps');
    document.head.querySelectorAll('script').forEach((script) => {
      script.remove();
    });
  });

  it('creates a single script for two simultaneous calls', async () => {
    vi.stubGlobal('ymaps3', FAKE_API);

    const first = loader.loadYandexMapsApi('test-key');
    const second = loader.loadYandexMapsApi('test-key');

    const scripts = document.head.querySelectorAll('script[src*="api-maps.yandex.ru"]');
    expect(scripts).toHaveLength(1);

    const script = scripts[0];
    script.dispatchEvent(new Event('load'));

    expect(await first).toBe(FAKE_API);
    expect(await second).toBe(FAKE_API);
  });

  it('embeds the key and the v3 version into the script url', () => {
    // Событие load не стреляем: проверяем только URL добавленного скрипта.
    void loader.loadYandexMapsApi('my test key');

    const script = document.head.querySelector('script[src*="api-maps.yandex.ru"]');

    expect(script?.getAttribute('src')).toBe(
      'https://api-maps.yandex.ru/v3/?apikey=my%20test%20key&lang=en_US',
    );
  });

  it('reuses the cached promise for later calls', async () => {
    vi.stubGlobal('ymaps3', FAKE_API);

    const first = loader.loadYandexMapsApi('test-key');

    const script = document.head.querySelector('script[src*="api-maps.yandex.ru"]');
    script?.dispatchEvent(new Event('load'));

    expect(await first).toBe(FAKE_API);

    // Повторный вызов после загрузки: скрипт больше не добавляется.
    await expect(loader.loadYandexMapsApi('test-key')).resolves.toBe(FAKE_API);
    expect(document.head.querySelectorAll('script[src*="api-maps.yandex.ru"]')).toHaveLength(1);
  });

  it('rejects when the script fails to load and allows a retry', async () => {
    const first = loader.loadYandexMapsApi('test-key');

    const script = document.head.querySelector('script[src*="api-maps.yandex.ru"]');
    script?.dispatchEvent(new Event('error'));

    await expect(first).rejects.toThrow('Failed to load the Yandex Maps script.');

    // Кэш сброшен: новая попытка добавляет новый скрипт.
    vi.stubGlobal('ymaps3', FAKE_API);
    const retry = loader.loadYandexMapsApi('test-key');
    const scripts = document.head.querySelectorAll('script[src*="api-maps.yandex.ru"]');
    expect(scripts).toHaveLength(2);

    const retryScript = scripts[1];
    retryScript.dispatchEvent(new Event('load'));
    await expect(retry).resolves.toBe(FAKE_API);
  });

  it('rejects when the script did not define the ymaps3 global', async () => {
    // Глобал не подставлен: как будто скрипт загрузился, но API не объявил.
    const promise = loader.loadYandexMapsApi('test-key');

    const script = document.head.querySelector('script[src*="api-maps.yandex.ru"]');
    script?.dispatchEvent(new Event('load'));

    await expect(promise).rejects.toThrow('did not define the ymaps3 global.');
  });
});
