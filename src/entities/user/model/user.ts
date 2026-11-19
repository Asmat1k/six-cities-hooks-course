// Сущность «пользователь»: типы по описанию сервера - PROJECT.md, раздел 9.2.
// Хозяин предложения (Host) - тоже «пользователь» сервера, поэтому оба типа
// живут в этой сущности; сущности offer тип Host доступен через узкий
// cross-import API `@x/offer.ts`.

export interface Host {
  name: string;
  avatarUrl: string;
  isPro: boolean;
}

export type AuthInfo = Host & {
  email: string;
  token: string;
};
