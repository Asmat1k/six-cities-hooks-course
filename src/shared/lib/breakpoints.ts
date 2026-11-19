// Единые брейкпоинты приложения (PROJECT.md, раздел 10): телефон до 767px,
// планшет 768-1143px, десктоп от 1144px. Это единственное место, где границы
// телефона и планшета заданы числами: код строит запрос useMediaQuery из
// PHONE_ONLY_QUERY, а media-запросы CSS получают те же значения подстановкой
// токенов {{PHONE_MAX_WIDTH}} / {{TABLET_MIN_WIDTH}} при сборке (см.
// cssBreakpointTokens в vite.config.ts). В CSS-файлах граница H12 числами
// не дублируется (TASKS.md, H12).

export const PHONE_MAX_WIDTH = 767;
export const TABLET_MIN_WIDTH = 768;

// «Только телефон»: истинно на ширине 320-767px. Отрицание запроса -
// планшет и десктоп (768px+), где список и карта видны одновременно.
export const PHONE_ONLY_QUERY = `(max-width: ${String(PHONE_MAX_WIDTH)}px)`;
