/// <reference types="vite/client" />

// Типы переменных окружения Vite.
// VITE_SIX_CITIES_MOCK_AUTH='1' включает демопользователя (заглушку статуса
// авторизации). Значение встраивается при сборке и НЕ является механизмом
// безопасности - это просто переключатель мок-состояния.
// VITE_YANDEX_MAPS_KEY - ключ JS API Яндекс Карт (этап 5, H5): задаётся в
// .env.local, в репозиторий не попадает. Пустое значение или отсутствие
// переменной - режим «без ключа»: вместо карты сообщение.
interface ImportMetaEnv {
  readonly VITE_SIX_CITIES_MOCK_AUTH?: string;
  readonly VITE_YANDEX_MAPS_KEY?: string;
}
