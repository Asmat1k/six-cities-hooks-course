// Cross-import API FSD (`@x`, feature-sliced.design/docs/reference/public-api):
// узкий публичный API сущности user только для сущности offer. Offer и Review
// содержат хозяина предложения, и эта связь должна быть видимой - сюда
// экспортируется ровно один тип Host, всё остальное offer не получает.
export type {Host} from '../model/user';
