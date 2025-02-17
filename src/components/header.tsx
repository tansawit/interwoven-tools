'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Send, LineChart } from 'lucide-react';
import { WalletButton } from '@/components/wallet-button';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';

export const Header = memo(() => {
  const pathname = usePathname();

  const links = [
    {
      href: '/multisend',
      label: 'MULTISEND',
      icon: Send,
      description: 'Send tokens to multiple addresses',
    },
    {
      href: '/oracle',
      label: 'ORACLE',
      icon: LineChart,
      description: 'View real-time price data',
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <nav className="h-16 flex items-center">
        <div className="container mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Logo />
            <div className="flex items-center gap-4">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-accent',
                      pathname === link.href ? 'bg-accent/50' : 'transparent'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        pathname === link.href
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-primary'
                      )}
                    />
                    <span
                      className={cn(
                        'font-medium',
                        pathname === link.href
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-primary'
                      )}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          <WalletButton />
        </div>
      </nav>
    </header>
  );
});

Header.displayName = 'Header';
