import {Link} from 'react-router';
import './login.css';

// Вход по макету (markup/login.html): поля email/password и кнопка-ссылка
// с городом. Границы КТ1: реальный вход, валидация пароля и случайный город
// НЕ реализованы (это этап 7) - форма показывает разметку, отправка отключена.
// Редирект авторизованного на `/` выполняет guard в слое app, не сама страница.

export function LoginPage() {
  return (
    <>
      <title>Six Cities - Login</title>

      <main className="page__main">
        <div className="container login">
          <section className="login__panel" aria-labelledby="login-title">
            <h1 className="login__title" id="login-title">Sign in</h1>

            <form className="login__form" noValidate>
              <div className="login__group">
                <label className="login__label" htmlFor="login-email">E-mail</label>
                <input
                  className="field"
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="login__group">
                <label className="login__label" htmlFor="login-password">Password</label>
                <input
                  className="field"
                  id="login-password"
                  type="password"
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />
                <p className="login__hint" id="login-password-hint">
                  Password must contain at least one letter and one digit
                </p>
              </div>

              {/* KT1: отправка формы и настоящий вход не реализованы (этап 7),
                  поэтому кнопка не сабмитит форму - разметка просто показывается. */}
              <button className="button login__submit" type="button">Sign in</button>
            </form>

            <p className="login__hint">KT1 mock: submitting this form does not sign you in yet.</p>
          </section>

          <Link className="login__city" to="/">
            <img
              className="login__city-image"
              src="/img/offers/15.jpg"
              width="800"
              height="600"
              alt=""
            />
            <span className="login__city-text">
              <span className="login__city-caption">Explore</span>
              <span className="login__city-name">Amsterdam</span>
            </span>
          </Link>
        </div>
      </main>
    </>
  );
}
