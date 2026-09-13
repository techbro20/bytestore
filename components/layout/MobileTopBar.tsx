'use client';

import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getPageTitle } from '@/lib/nav';

type MobileTopBarProps = {
  onMenuOpen: () => void;
};

export function MobileTopBar({ onMenuOpen }: MobileTopBarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-neutral-300 bg-neutral-100/95 px-4 backdrop-blur-md md:hidden dark:border-neutral-700 dark:bg-neutral-900/95">
      <button
        type="button"
        onClick={onMenuOpen}
        className="rounded-lg p-2 text-neutral-700 transition-colors hover:bg-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-800"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-base font-semibold text-neutral-900 dark:text-white">
        {title}
      </h1>
    </header>
  );
}
