'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function ChatFab() {
  return (
    <Link
      href="/connect"
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-transform hover:scale-105 hover:bg-orange-600 md:right-6 md:bottom-6"
    >
      <Sparkles className="h-4 w-4" />
      Chat
    </Link>
  );
}
