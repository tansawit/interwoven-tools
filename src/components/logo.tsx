import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <Link href="/" className={cn('flex items-center gap-2 min-w-0', className)}>
      <div className="flex-shrink-0">
        <Image
          src="/logo.svg"
          alt="Interwoven Logo"
          width={32}
          height={32}
          priority
          className="dark:invert"
        />
      </div>
      {showText && <span className="font-medium whitespace-nowrap">Interwoven Tools</span>}
    </Link>
  );
}
