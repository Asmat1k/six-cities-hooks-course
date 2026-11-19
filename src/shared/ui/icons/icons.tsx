// Спрайт SVG-символов из вёрстки (docs/markup). Рендерится один раз в layout
// приложения; компоненты ссылаются на символы через <use href="#icon-...">.
// Перенесены только используемые на страницах КТ1 иконки.

export function Icons() {
  return (
    <svg width="0" height="0" className="visually-hidden" aria-hidden="true">
      <symbol id="icon-bookmark" viewBox="0 0 20 20">
        <path
          d="M5 2.5h10a1 1 0 0 1 1 1V18l-6-3.8L4 18V3.5a1 1 0 0 1 1-1z"
          strokeLinejoin="round"
        />
      </symbol>
      <symbol id="icon-pin" viewBox="0 0 28 38">
        <path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 38 14 38s14-14 14-24.3C28 6.1 21.7 0 14 0zm0 19a5.2 5.2 0 1 1 0-10.4A5.2 5.2 0 0 1 14 19z" />
      </symbol>
      <symbol id="icon-star" viewBox="0 0 24 24">
        <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
      </symbol>
    </svg>
  );
}
