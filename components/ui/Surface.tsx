import type { ReactNode } from 'react';

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header';
  padded?: boolean;
  dashed?: boolean;
};

export function Surface({
  children,
  className = '',
  as: Tag = 'div',
  padded = true,
  dashed = false,
}: SurfaceProps) {
  return (
    <Tag
      className={[
        'rounded-2xl border backdrop-blur-xl',
        dashed
          ? 'border-dashed border-neutral-300/70 bg-white/35 dark:border-neutral-500/40 dark:bg-neutral-900/25'
          : 'border-neutral-300/55 bg-white/50 shadow-[0_1px_0_rgba(255,255,255,0.55)_inset] dark:border-neutral-600/45 dark:bg-neutral-900/40 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
        padded ? 'p-4 sm:p-5' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  );
}
