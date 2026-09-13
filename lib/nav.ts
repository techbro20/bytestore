export type BottomNavItem = {
  href: string;
  label: string;
  key: 'home' | 'shop' | 'orders' | 'cart' | 'profile';
};

export type SidebarChild = {
  href: string;
  label: string;
};

export type SidebarItem =
  | { type: 'link'; href: string; label: string; icon?: string }
  | { type: 'group'; label: string; icon?: string; children: SidebarChild[] };

export const bottomNavItems: BottomNavItem[] = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/shop', label: 'Shop', key: 'shop' },
  { href: '/orders', label: 'Orders', key: 'orders' },
  { href: '/cart', label: 'Cart', key: 'cart' },
  { href: '/profile', label: 'Profile', key: 'profile' },
];

export const sidebarNav: SidebarItem[] = [
  { type: 'link', href: '/', label: 'Home', icon: 'home' },
  {
    type: 'group',
    label: 'Shop',
    icon: 'shop',
    children: [
      { href: '/shop', label: 'All Products' },
    ],
  },
  { type: 'link', href: '/orders', label: 'Orders', icon: 'orders' },
  { type: 'link', href: '/tools', label: 'Tools', icon: 'tools' },
  { type: 'link', href: '/connect', label: 'Connect', icon: 'connect' },
];

export function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/shop')) return 'Shop';
  if (pathname.startsWith('/cart')) return 'Cart';
  if (pathname.startsWith('/checkout')) return 'Checkout';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/orders')) return 'Orders';
  if (pathname.startsWith('/tools')) return 'Tools';
  if (pathname.startsWith('/connect')) return 'Connect';
  if (pathname.startsWith('/admin')) return 'Admin';
  return 'ByteStore';
}
