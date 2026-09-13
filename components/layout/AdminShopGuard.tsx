'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminSession } from '@/lib/admin-session';

const BLOCKED = ['/cart', '/checkout'];

export function AdminShopGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdminSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isAdmin) return;
    if (BLOCKED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      router.replace('/admin');
    }
  }, [isAdmin, loading, pathname, router]);

  return <>{children}</>;
}
