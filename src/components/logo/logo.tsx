import Link from 'next/link';

// Логотип из вёрстки: ссылка на главную, в шапке и в подвале.
export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="Шесть городов - на главную">
      <img className="logo__mark" src="/img/logo.svg" width="32" height="32" alt="" />
      <span className="logo__text">six<span>cities</span></span>
    </Link>
  );
}
