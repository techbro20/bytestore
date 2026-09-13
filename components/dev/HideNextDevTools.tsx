'use client';

import { useEffect } from 'react';

/** Removes the floating Next.js Dev Tools portal from the document in development. */
export function HideNextDevTools() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    const remove = () => {
      document.querySelectorAll('nextjs-portal').forEach((el) => el.remove());
      document
        .querySelectorAll(
          '[data-next-badge-root], [data-nextjs-toast], [data-nextjs-dev-overlay-root]',
        )
        .forEach((el) => el.remove());
    };

    remove();
    const observer = new MutationObserver(remove);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
