import type { Metadata } from 'next';
import { Mail, MessageSquare, Send } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Connect',
};

export default function ConnectPage() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'info@dvtechnologies.xyz';
  const telegramUrl =
    process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/dvtechnologies';
  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, '') || '';
  const botUrl = botUsername ? `https://t.me/${botUsername}` : '';

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h2 className="text-2xl font-medium text-neutral-900 dark:text-white">
          Connect
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Support, live chat, shop bot, and community channel.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/45 dark:bg-neutral-900/40">
          <Mail className="h-6 w-6 text-orange-500" />
          <h3 className="mt-3 font-medium text-neutral-900 dark:text-white">
            Email support
          </h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            <a
              href={`mailto:${supportEmail}`}
              className="text-orange-600 hover:underline dark:text-orange-400"
            >
              {supportEmail}
            </a>{' '}
            — include your order ID and checkout email for delivery help.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/45 dark:bg-neutral-900/40">
          <MessageSquare className="h-6 w-6 text-orange-500" />
          <h3 className="mt-3 font-medium text-neutral-900 dark:text-white">
            Live chat
          </h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Use the Chat button for quick help with products, payments, and
            delivery. Support is available for guest buyers — no account needed.
          </p>
        </div>

        {botUrl ? (
          <div className="rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/45 dark:bg-neutral-900/40">
            <Send className="h-6 w-6 text-orange-500" />
            <h3 className="mt-3 font-medium text-neutral-900 dark:text-white">
              Shop on Telegram
            </h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Browse the catalog and pay with Paystack or crypto inside the bot.
            </p>
            <a
              href={botUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Open shop bot
            </a>
          </div>
        ) : null}

        <div className="rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/45 dark:bg-neutral-900/40">
          <Send className="h-6 w-6 text-orange-500" />
          <h3 className="mt-3 font-medium text-neutral-900 dark:text-white">
            Telegram community
          </h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Join our channel for updates, tips, and community support.
          </p>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Join Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
