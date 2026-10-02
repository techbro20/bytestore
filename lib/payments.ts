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

export function isCryptoAsset(value: string): value is CryptoAsset {
  return CRYPTO_ASSETS.some((a) => a.id === value);
}

export function normalizeTxHash(value: string) {
  return value.trim().replace(/\s+/g, '');
}

/** EVM (0x + 64 hex), Litecoin (64 hex) or Solana (base58 signature). */
export function isPlausibleTxHash(value: string) {
  const hash = normalizeTxHash(value);
  return (
    /^0x[0-9a-fA-F]{64}$/.test(hash) ||
    /^[0-9a-fA-F]{64}$/.test(hash) ||
    /^[1-9A-HJ-NP-Za-km-z]{43,90}$/.test(hash)
  );
}

export function getExplorerTxUrl(
  asset: string | null | undefined,
  txHash: string | null | undefined,
): string | null {
  if (!txHash) return null;
  const hash = encodeURIComponent(normalizeTxHash(txHash));
  const isEvm = /^0x/i.test(txHash);
  switch (asset) {
    case 'ETH':
      return `https://etherscan.io/tx/${hash}`;
    case 'USDC':
      return isEvm
        ? `https://etherscan.io/tx/${hash}`
        : `https://solscan.io/tx/${hash}`;
    case 'SOL':
      return `https://solscan.io/tx/${hash}`;
    case 'LTC':
      return `https://blockchair.com/litecoin/transaction/${hash}`;
    default:
      return isEvm ? `https://etherscan.io/tx/${hash}` : null;
  }
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
