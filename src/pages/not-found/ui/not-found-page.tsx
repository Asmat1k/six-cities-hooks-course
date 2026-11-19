import {Link} from 'react-router';
import './not-found.css';

// Единый экран 404 (markup/404.html) - и для неизвестных адресов, и для
// несуществующего id предложения. В SPA он рендерится без смены URL:
// адрес остаётся тем, что открыл пользователь.

export function NotFoundPage() {
  return (
    <>
      <title>Six Cities - 404</title>

      <main className="page__main">
        <section className="container not-found" aria-labelledby="not-found-title">
          <svg className="not-found__image" viewBox="0 0 240 180" aria-hidden="true">
            <ellipse className="not-found__shadow" cx="120" cy="160" rx="70" ry="10" />
            <path
              className="not-found__route"
              d="M18 150c30-6 40-40 70-44s38 24 66 18 36-40 70-46"
              fill="none"
            />
            <circle className="not-found__dot" cx="18" cy="150" r="6" />
            <path
              className="not-found__pin"
              d="M120 20c-24 0-42 18.6-42 41.6C78 92 120 136 120 136s42-44 42-74.4C162 38.6 144 20 120 20z"
            />
            <circle className="not-found__pin-hole" cx="120" cy="60" r="20" />
            <text className="not-found__mark" x="120" y="70" textAnchor="middle">?</text>
          </svg>

          <h1 className="not-found__title" id="not-found-title">
            <span className="not-found__code">404</span>
            Not Found
          </h1>
          <p className="not-found__text">
            We could not find this page. It may have been moved, or the address has a typo.
          </p>
          <p className="not-found__text">Let’s get you back to the places to stay.</p>
          <Link className="button not-found__button" to="/">Back to main page</Link>
        </section>
      </main>
    </>
  );
}
