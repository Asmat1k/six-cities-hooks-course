import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {Footer} from '@/components/footer/footer';
import {Header} from '@/components/header/header';
import {Icons} from '@/components/icons/icons';
import {getAuthInfo} from '@/mocks/auth';
import {getFavoriteOffers} from '@/mocks/offers';
import '@/styles/main.css';

// Заголовок вкладки: каждая страница задаёт свою часть через Metadata API
// (адаптация M4 под Next.js), шаблон собирает полный текст:
// `Six Cities - <часть страницы>`.
export const metadata: Metadata = {
  title: {
    default: 'Six Cities',
    template: 'Six Cities - %s',
  },
  icons: {
    icon: '/img/logo.svg',
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({children}: RootLayoutProps) {
  // Заглушка статуса из КТ1: гость по умолчанию, demo-пользователь - только
  // при сборке/запуске с SIX_CITIES_MOCK_AUTH=1. Статического сервера нет,
  // поэтому шапка получает данные здесь, на сервере.
  const auth = getAuthInfo();
  const favoritesCount = getFavoriteOffers().length;

  return (
    <html lang="en">
      <body>
        <Icons />
        <div className="page">
          <Header auth={auth} favoritesCount={favoritesCount} />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
