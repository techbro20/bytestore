'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { ByteStoreLogo } from '@/components/brand/ByteStoreLogo';
import { NavTree } from './Sidebar';

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? '' : 'invisible'}`}
      aria-hidden={!open}
      inert={!open ? true : undefined}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        className={`absolute inset-0 bg-neutral-950/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        className={`absolute inset-y-0 left-0 flex h-dvh w-[min(20rem,88vw)] flex-col border-r border-neutral-300/55 bg-white/90 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out dark:border-neutral-700/50 dark:bg-neutral-950/90 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex h-14 items-center justify-between border-b border-neutral-300 px-4 dark:border-neutral-700">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-950 p-1.5">
              <ByteStoreLogo variant="mark" className="h-7 w-7" />
            </span>
            <ByteStoreLogo variant="wordmark" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavTree onNavigate={onClose} />
      </aside>
    </div>
  );
}
