/// <reference types="vite/client" />

// Типы переменных окружения Vite для КТ1.
// VITE_SIX_CITIES_MOCK_AUTH='1' включает демопользователя (заглушку статуса
// авторизации). Значение встраивается при сборке и НЕ является механизмом
// безопасности - это просто переключатель мок-состояния.
interface ImportMetaEnv {
  readonly VITE_SIX_CITIES_MOCK_AUTH?: string;
}
