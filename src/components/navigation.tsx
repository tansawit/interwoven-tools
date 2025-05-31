'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const pathname = usePathname();

  // Only show the back button if we're not on the home page
  if (pathname === '/') {
    return null;
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4">
      <Link href="/">
        <Button
          variant="outline"
          size="sm"
          className="button button-outline transition-colors duration-300 text-foreground/80 hover:text-background text-sm"
        >
          ← Back to Tools
        </Button>
      </Link>
    </div>
  );
}
