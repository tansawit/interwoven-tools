'use client';

import { memo } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { WalletWidgetProvider } from '@initia/react-wallet-widget';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/sonner';

export const ClientLayout = memo(({ children }: { children: React.ReactNode }) => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
    <WalletWidgetProvider chainId="initiation-2">
      <div className="relative min-h-screen">
        <Header />
        <main className="pt-16 min-h-screen bg-dot-pattern overflow-x-hidden">
          <div className="relative">{children}</div>
        </main>
      </div>
      <Toaster position="bottom-center" />
    </WalletWidgetProvider>
  </ThemeProvider>
));

ClientLayout.displayName = 'ClientLayout';
