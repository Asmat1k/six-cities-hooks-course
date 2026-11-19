import {Logo} from '@/components/logo/logo';

// Подвал из вёрстки: логотип и подпись, на всех страницах.
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <Logo />
        <p>Учебный проект</p>
      </div>
    </footer>
  );
}
