'use client';

import Link from 'next/link';
import { Send, LineChart } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-12">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Interwoven Tools
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-[42rem]">
            A suite of tools for the Interwoven ecosystem
          </p>
        </div>
        <div className="grid gap-3 sm:gap-4 mt-6 sm:mt-8">
          <Link href="/multisend" className="group">
            <div className="p-4 sm:p-6 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Multisend</h2>
                  <p className="text-sm text-muted-foreground">
                    Send tokens to multiple addresses in a single transaction
                  </p>
                </div>
                <Send className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
          <Link href="/oracle" className="group">
            <div className="p-4 sm:p-6 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Oracle</h2>
                  <p className="text-sm text-muted-foreground">
                    See Initia oracle price data in real-time
                  </p>
                </div>
                <LineChart className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
          {/* Add more tools here */}
        </div>
      </div>
    </div>
  );
}
