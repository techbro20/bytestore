import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-300/55 bg-white/40 px-4 py-3 text-xs text-neutral-500 backdrop-blur-md sm:px-6 md:px-8 dark:border-neutral-700/50 dark:bg-neutral-950/30 dark:text-neutral-400">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} ByteStore · Guest checkout</p>
        <p className="flex flex-wrap gap-3">
          <Link
            href="/orders"
            className="text-orange-600 hover:underline dark:text-orange-400"
          >
            Orders
          </Link>
          <Link
            href="/connect"
            className="text-orange-600 hover:underline dark:text-orange-400"
          >
            Support
          </Link>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
        </p>
      </div>
    </footer>
  );
}
