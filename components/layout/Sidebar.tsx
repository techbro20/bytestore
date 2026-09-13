'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Box,
  ChevronDown,
  DollarSign,
  Home,
  MessageCircle,
  Wrench,
} from 'lucide-react';
import { sidebarNav } from '@/lib/nav';
import { ByteStoreLogo } from '@/components/brand/ByteStoreLogo';
import type { CatalogCategory } from '@/lib/catalog-store';

function linkActive(pathname: string, search: string, href: string) {
  const [path, query = ''] = href.split('?');
  if (path === '/') return pathname === '/';

  const pathMatch = pathname === path || pathname.startsWith(`${path}/`);
  if (!pathMatch) return false;

  const current = new URLSearchParams(search);

  if (!query) {
    if (path === '/shop') {
      return !current.has('filter') && !current.has('category');
    }
    return true;
  }

  const params = new URLSearchParams(query);
  for (const [key, value] of params.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

const iconMap = {
  home: Home,
  shop: Box,
  orders: DollarSign,
  tools: Wrench,
  connect: MessageCircle,
} as const;

type NavTreeProps = {
  onNavigate?: () => void;
};

export function NavTree({ onNavigate }: NavTreeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const shopOpenDefault = pathname.startsWith('/shop');
  const [shopOpen, setShopOpen] = useState(shopOpenDefault);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);

  useEffect(() => {
    if (shopOpenDefault) setShopOpen(true);
  }, [shopOpenDefault]);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((data: { categories?: CatalogCategory[] }) => {
        setCategories(data.categories || []);
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Sidebar">
      {sidebarNav.map((item) => {
        if (item.type === 'link') {
          const active = linkActive(pathname, search, item.href);
          const Icon =
            item.icon && item.icon in iconMap
              ? iconMap[item.icon as keyof typeof iconMap]
              : Home;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                active
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-neutral-700 hover:bg-white/50 dark:text-neutral-200 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        }

        const GroupIcon =
          item.icon && item.icon in iconMap
            ? iconMap[item.icon as keyof typeof iconMap]
            : Box;

        const children =
          item.label === 'Shop'
            ? [
                { href: '/shop', label: 'All Products' },
                ...categories.map((c) => ({
                  href: `/shop?category=${c.slug}`,
                  label: c.title,
                })),
              ]
            : item.children;

        return (
          <div key={item.label} className="mt-1">
            <button
              type="button"
              onClick={() => setShopOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-white/50 dark:text-neutral-200 dark:hover:bg-white/5"
              aria-expanded={shopOpen}
            >
              <span className="flex items-center gap-2.5">
                <GroupIcon className="h-4 w-4" />
                {item.label}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  shopOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-200 ${
                shopOpen
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <ul className="ml-3 space-y-0.5 border-l border-neutral-300/70 py-1 pl-2 dark:border-neutral-600">
                  {children.map((child) => {
                    const active = linkActive(pathname, search, child.href);
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={onNavigate}
                          className={`block rounded-md px-3 py-2 text-sm transition-colors duration-200 ${
                            active
                              ? 'font-medium text-orange-600 dark:text-orange-400'
                              : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                          }`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        );
      })}

      <div className="mt-auto space-y-1 border-t border-neutral-300/70 pt-3 dark:border-neutral-700">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="block rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-white/50 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          Guest profile
        </Link>
      </div>
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-64 flex-col border-r border-neutral-300/55 bg-white/45 backdrop-blur-xl md:flex dark:border-neutral-700/50 dark:bg-neutral-950/40">
      <div className="flex h-14 items-center gap-2.5 border-b border-neutral-300/55 px-4 dark:border-neutral-700/50">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-950 p-1.5">
            <ByteStoreLogo variant="mark" priority className="h-7 w-7" />
          </span>
          <ByteStoreLogo variant="wordmark" />
        </Link>
      </div>
      <NavTree />
      <div className="border-t border-neutral-300/55 p-4 text-[11px] text-neutral-500 dark:border-neutral-700/50">
        Guest checkout · secure delivery
      </div>
    </aside>
  );
}
