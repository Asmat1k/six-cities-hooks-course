// Единая заглушка статуса авторизации для КТ1 (этапы 1-3).
//
// Настоящего входа нет (сервер и авторизация - этап 7), поэтому статус
// определяется переменной окружения, а не запросом к API:
//   - по умолчанию все страницы видит гость;
//   - SIX_CITIES_MOCK_AUTH=1 при сборке (и при `next start`) включает
//     демонстрационного пользователя без настоящих учётных данных.
// Токен пустой: он понадобится только на этапе 7, сейчас API нет.
// Это НЕ механизм безопасности: флаг лишь переключает мок-состояние.

import type {AuthInfo} from '@/types/domain';

const DEMO_AUTH_INFO: AuthInfo = {
  name: 'Oliver Conner',
  avatarUrl: '/img/avatars/user-3.svg',
  isPro: false,
  email: 'oliver.conner@gmail.com',
  token: '',
};

export function getAuthInfo(): AuthInfo | null {
  return process.env.SIX_CITIES_MOCK_AUTH === '1' ? DEMO_AUTH_INFO : null;
}
