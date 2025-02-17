import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ClientLayout } from '@/components/client-layout';
import type { Metadata } from 'next';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Interwoven Tools',
  description: 'Tools for the Interwoven ecosystem',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} font-sans antialiased min-h-screen bg-background`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
