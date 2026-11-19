'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {AuthInfo} from '@/types/domain';
import {Logo} from '@/components/logo/logo';

const SIGN_IN_PATH = '/login';
const FAVORITES_PATH = '/favorites';

interface HeaderProps {
  auth: AuthInfo | null;
  favoritesCount: number;
}

// Шапка из вёрстки: логотип и блок пользователя. Данные приходит из layout
// (сервер), поэтому здесь только отображение; текущий путь нужен лишь для
// aria-current на странице входа, как в вёрстке.
export function Header({auth, favoritesCount}: HeaderProps) {
  const pathname = usePathname();

  if (!auth) {
    return (
      <header className="header">
        <div className="container header__inner">
          <Logo />
          <nav className="user-nav" aria-label="Пользователь">
            <Link
              className="user-nav__link"
              href={SIGN_IN_PATH}
              aria-current={pathname === SIGN_IN_PATH ? 'page' : undefined}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M12 4h4v12h-4M8 6l-4 4 4 4M4 10h8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign in
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="container header__inner">
        <Logo />
        <nav className="user-nav" aria-label="Пользователь">
          <Link className="user-nav__link" href={FAVORITES_PATH}>
            <img
              className="user-nav__avatar"
              src={auth.avatarUrl}
              width="32"
              height="32"
              alt=""
            />
            <span className="user-nav__email">{auth.email}</span>
            <span className="user-nav__count" aria-label={`В избранном: ${String(favoritesCount)}`}>
              {favoritesCount}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
