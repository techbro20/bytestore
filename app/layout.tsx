import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import { NextSSRPlugin } from '@uploadthing/react/next-ssr-plugin';
import { extractRouterConfig } from 'uploadthing/server';
import { AppShell } from '@/components/layout/AppShell';
import { HideNextDevTools } from '@/components/dev/HideNextDevTools';
import { ToastProvider } from '@/components/ui/Toast';
import { CartProvider } from '@/lib/cart';
import { AdminSessionProvider } from '@/lib/admin-session';
import { AdminShopGuard } from '@/components/layout/AdminShopGuard';
import { ourFileRouter } from '@/app/api/uploadthing/core';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ByteStore',
    template: '%s · ByteStore',
  },
  description:
    'ByteStore — digital products shop. Proxies, phone numbers, SIP, API keys, SMTP, and call center systems with secure checkout and email delivery.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={bricolage.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('hs_theme')==='dark'||(!('hs_theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${bricolage.className} font-normal text-neutral-800 antialiased dark:text-neutral-200`}
      >
        <HideNextDevTools />
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <CartProvider>
          <AdminSessionProvider>
            <ToastProvider>
              <Suspense fallback={null}>
                <AdminShopGuard>
                  <AppShell>{children}</AppShell>
                </AdminShopGuard>
              </Suspense>
            </ToastProvider>
          </AdminSessionProvider>
        </CartProvider>
      </body>
    </html>
  );
}
