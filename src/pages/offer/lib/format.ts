// Форматирование данных для страницы предложения.

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Склонения по правилам PROJECT.md, раздел 4.1:
// `1 Bedroom` / `3 Bedrooms`, `Max 1 adult` / `Max 4 adults`.
export function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

// Дата отзыва в формате «Месяц Год» (`April 2019`).
// Дата приходит ISO-строкой, поэтому форматирование детерминировано в UTC:
// время сервера и пояса не сдвигают месяц.
const reviewDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatReviewDate(isoDate: string): string {
  return reviewDateFormatter.format(new Date(isoDate));
}
