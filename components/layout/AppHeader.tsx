'use client';

import Link from 'next/link';
import { Menu, Moon, ShoppingCart, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPageTitle } from '@/lib/nav';
import { useCart } from '@/lib/cart';
import { useAdminSession } from '@/lib/admin-session';

type AppHeaderProps = {
  onMenuOpen: () => void;
};

export function AppHeader({ onMenuOpen }: AppHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { itemCount } = useCart();
  const { isAdmin } = useAdminSession();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('hs_theme', next ? 'dark' : 'light');
    setDark(next);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-300/50 bg-white/45 px-4 backdrop-blur-xl sm:px-6 md:px-8 dark:border-neutral-700/50 dark:bg-neutral-950/35">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-white/50 md:hidden dark:text-neutral-300 dark:hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-lg font-medium tracking-tight text-neutral-800 md:text-xl dark:text-neutral-100">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg border border-neutral-300/60 bg-white/50 p-2 text-neutral-600 transition-colors hover:border-orange-300 dark:border-neutral-600/60 dark:bg-white/5 dark:text-neutral-300"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        {isAdmin ? (
          <Link
            href="/admin"
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Admin
          </Link>
        ) : (
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300/60 bg-white/50 px-3 py-2 text-sm font-normal text-neutral-700 transition-colors hover:border-orange-300 dark:border-neutral-600/60 dark:bg-white/5 dark:text-neutral-200"
          >
            <ShoppingCart className="h-4 w-4 text-orange-500" />
            <span className="hidden sm:inline">Cart</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-semibold text-white">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
