export type CryptoAsset = 'USDC' | 'ETH' | 'SOL' | 'LTC';

export type PaymentMethod =
  | 'paystack_card'
  | 'paystack_mobile_money'
  | 'crypto';

export const CRYPTO_ASSETS: {
  id: CryptoAsset;
  label: string;
  network: string;
}[] = [
  { id: 'USDC', label: 'USDC', network: 'Ethereum / Solana (set in env)' },
  { id: 'ETH', label: 'Ethereum', network: 'Ethereum' },
  { id: 'SOL', label: 'Solana', network: 'Solana' },
  { id: 'LTC', label: 'Litecoin', network: 'Litecoin' },
];

export function getPaystackPublicKey() {
  return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';
}

export function getPaystackCurrency() {
  return process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY ?? 'NGN';
}

/** Paystack expects the smallest currency unit (e.g. kobo for NGN, cents for USD). */
export function toPaystackAmount(usdTotal: number) {
  const currency = getPaystackCurrency().toUpperCase();
  const rate = Number(process.env.NEXT_PUBLIC_USD_TO_PAYSTACK_RATE ?? '1600');
  if (currency === 'USD' || currency === 'GHS' || currency === 'ZAR') {
    return Math.round(usdTotal * 100);
  }
  // Default: treat product prices as USD and convert to NGN kobo
  return Math.round(usdTotal * rate * 100);
}

export function getCryptoAddress(asset: CryptoAsset): string {
  const map: Record<CryptoAsset, string | undefined> = {
    USDC: process.env.NEXT_PUBLIC_CRYPTO_USDC_ADDRESS,
    ETH: process.env.NEXT_PUBLIC_CRYPTO_ETH_ADDRESS,
    SOL: process.env.NEXT_PUBLIC_CRYPTO_SOL_ADDRESS,
    LTC: process.env.NEXT_PUBLIC_CRYPTO_LTC_ADDRESS,
  };
  return map[asset]?.trim() || '';
}
