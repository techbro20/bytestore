import type { Metadata } from 'next';
import Link from 'next/link';
import { Headphones } from 'lucide-react';
import { getTools } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Tools',
};

export const dynamic = 'force-dynamic';

export default async function ToolsPage() {
  const tools = await getTools();

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h2 className="text-2xl font-medium text-neutral-900 dark:text-white">
          Tools
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Tools and related products from the catalog.
        </p>
      </header>

      {tools.length === 0 ? null : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool.id}>
              <Link
                href={tool.href}
                className="flex h-full flex-col gap-3 rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl transition-colors hover:border-orange-300 dark:border-neutral-600/45 dark:bg-neutral-900/40 dark:hover:border-orange-700"
              >
                {tool.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tool.image}
                    alt=""
                    className="h-28 w-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                    <Headphones className="h-5 w-5" />
                  </span>
                )}
                <span>
                  <span className="block text-lg font-medium text-neutral-900 dark:text-white">
                    {tool.title}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">
                    {tool.body}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
