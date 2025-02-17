'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface TokenIconProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TokenIcon({ src, alt, size = 24, className }: TokenIconProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-background rounded-full text-xs font-medium [filter:invert(1)_hue-rotate(180deg)]',
          className
        )}
        style={{ width: size, height: size }}
      >
        {alt.charAt(0)}
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {isLoading && (
        <div className={cn('absolute inset-0 animate-pulse bg-muted rounded-full', className)} />
      )}
      <div className="bg-background rounded-full overflow-hidden [filter:invert(1)_hue-rotate(180deg)]">
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={cn(
            'rounded-full transition-opacity duration-200',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          loading="eager"
          priority={true}
          onLoad={() => setIsLoading(false)}
          onError={() => setError(true)}
        />
      </div>
    </div>
  );
}
