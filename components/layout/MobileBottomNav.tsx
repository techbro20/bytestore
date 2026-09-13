'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  Settings,
  ShoppingCart,
  Store,
  User,
} from 'lucide-react';
import { bottomNavItems } from '@/lib/nav';
import { useCart } from '@/lib/cart';
import { useAdminSession } from '@/lib/admin-session';

const icons = {
  home: Home,
  shop: Store,
  orders: Package,
  cart: ShoppingCart,
  profile: User,
  admin: Settings,
} as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { isAdmin } = useAdminSession();

  const items = isAdmin
    ? bottomNavItems.map((item) =>
        item.key === 'cart'
          ? { href: '/admin', label: 'Admin', key: 'admin' as const }
          : item,
      )
    : bottomNavItems;

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-neutral-100/95 backdrop-blur-md md:hidden dark:border-neutral-700 dark:bg-neutral-900/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid h-16 grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = icons[item.key as keyof typeof icons] ?? Home;

          return (
            <li key={item.key} className="relative">
              <Link
                href={item.href}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-all duration-200 ${
                  active
                    ? 'scale-105 text-orange-500'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon
                    className="h-5 w-5 transition-transform duration-200"
                    strokeWidth={active ? 2.5 : 2}
                    fill={active ? 'currentColor' : 'none'}
                    fillOpacity={active ? 0.2 : 0}
                  />
                  {item.key === 'cart' && itemCount > 0 ? (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  ) : null}
                </span>
                <span>{item.label}</span>
                <span
                  className={`absolute top-0 h-0.5 w-6 rounded-full bg-orange-500 transition-opacity duration-200 ${
                    active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
