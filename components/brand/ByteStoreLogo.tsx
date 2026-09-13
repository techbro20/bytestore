import Image from 'next/image';

type ByteStoreLogoProps = {
  variant?: 'full' | 'mark' | 'wordmark' | 'svg';
  className?: string;
  priority?: boolean;
};

export function ByteStoreLogo({
  variant = 'full',
  className = '',
  priority = false,
}: ByteStoreLogoProps) {
  if (variant === 'wordmark') {
    return (
      <span
        className={`inline-flex items-baseline text-sm font-black tracking-[0.08em] uppercase ${className}`}
      >
        <span className="text-[#FF6600]">BYTE</span>
        <span className="text-neutral-900 dark:text-white">STORE</span>
      </span>
    );
  }

  if (variant === 'svg') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/bytestore-logo.svg"
        alt="ByteStore"
        className={`h-auto w-full object-contain ${className}`}
      />
    );
  }

  if (variant === 'mark') {
    return (
      <Image
        src="/brand/bytestore-mark.png"
        alt="ByteStore"
        width={64}
        height={64}
        priority={priority}
        className={`h-9 w-9 object-contain ${className}`}
      />
    );
  }

  return (
    <Image
      src="/brand/bytestore-logo.png"
      alt="ByteStore"
      width={240}
      height={210}
      priority={priority}
      className={`h-auto w-full object-contain ${className}`}
    />
  );
}
