'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WalletButton } from '@/components/wallet-button';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Navigation = memo(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="h-16 flex items-center">
      <div className="flex-1 flex items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center space-x-2 min-w-0">
          <div className="flex-shrink-0">
            <Image src="/logo.svg" alt="Interwoven Logo" width={32} height={32} priority />
          </div>
          <span className="font-medium whitespace-nowrap">Interwoven Tools</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/multisend"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            MULTISEND
          </Link>
          <Link
            href="/rollups"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ROLLUPS
          </Link>
          <Link
            href="/oracle"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ORACLE
          </Link>
          <WalletButton />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          'fixed inset-x-0 top-[64px] bg-background/95 backdrop-blur-sm border-b md:hidden transition-all duration-200 ease-in-out',
          isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        )}
      >
        <div className="px-4 py-4 space-y-4">
          <Link
            href="/multisend"
            className="block py-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            MULTISEND
          </Link>
          <Link
            href="/oracle"
            className="block py-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            ORACLE
          </Link>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export const Header = memo(() => (
  <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
    <Navigation />
  </header>
));

Header.displayName = 'Header';
