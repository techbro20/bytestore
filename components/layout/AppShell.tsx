'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { AppHeader } from './AppHeader';
import { ChatFab } from './ChatFab';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileDrawer } from './MobileDrawer';
import { Sidebar } from './Sidebar';
import { SiteFooter } from './SiteFooter';

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="page-shell flex h-dvh min-h-dvh selection:bg-yellow-400/70 selection:text-neutral-700 dark:selection:text-neutral-900">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      <Suspense fallback={null}>
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </Suspense>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:pl-64">
        <AppHeader onMenuOpen={() => setDrawerOpen(true)} />

        <SmoothScroll className="min-h-0 flex-1 overflow-y-auto pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))] md:pb-0">
          <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 md:px-8 md:pt-6">
            {children}
          </div>
          <SiteFooter />
        </SmoothScroll>

        <MobileBottomNav />
        <ChatFab />
      </div>
    </div>
  );
}
