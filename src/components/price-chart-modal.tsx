'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { getHighlighter, type Highlighter } from 'shiki';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getTokenIcon } from '@/lib/token-utils';
import Image from 'next/image';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface PriceChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseSymbol: string;
  quoteSymbol: string;
  currentPrice: number;
}

const generateMockData = () => {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    return {
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: Math.random() * 0.4 + 0.8,
    };
  });
};

const codeExamples = {
  curl: `curl -X GET "https://api.example.com/v1/prices/{BASE}/{QUOTE}" \\
     -H "Accept: application/json" \\
     -H "Authorization: Bearer YOUR_API_KEY"`,
  cli: `initia-cli query oracle price {BASE}/{QUOTE}`,
  js: `import { OracleClient } from '@initia/oracle-client'

const client = new OracleClient({
  endpoint: 'https://api.example.com',
  apiKey: 'YOUR_API_KEY'
})

const price = await client.getPrice({
  base: '{BASE}',
  quote: '{QUOTE}'
})`,
  evm: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOracle {
    function getPrice(string calldata base, string calldata quote) 
        external view returns (uint256);
}

contract PriceConsumer {
    IOracle public oracle;
    
    constructor(address _oracle) {
        oracle = IOracle(_oracle);
    }
    
    function getPrice(string memory base, string memory quote) 
        public view returns (uint256) {
        return oracle.getPrice(base, quote);
    }
}`,
  move: `module oracle::price_consumer {
    use std::string::String;
    
    struct Price has key {
        value: u64
    }
    
    public fun get_price(
        base: String,
        quote: String
    ): u64 acquires Price {
        oracle::get_price(base, quote)
    }
}`,
  wasm: `import { getPrice } from "@initia/oracle-interface"

export function get_price(base: string, quote: string): u64 {
    return getPrice(base, quote)
}`,
};

export function PriceChartModal({
  isOpen,
  onClose,
  baseSymbol,
  quoteSymbol,
  currentPrice,
}: PriceChartModalProps) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const data = useMemo(() => generateMockData(), []);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  React.useEffect(() => {
    getHighlighter({
      themes: ['nord'],
      langs: ['shellscript', 'typescript', 'javascript', 'rust'],
    })
      .then(setHighlighter)
      .catch(console.error);
  }, []);

  const getLanguageForTab = (key: string) => {
    switch (key) {
      case 'curl':
      case 'cli':
        return 'shellscript';
      case 'js':
      case 'wasm':
        return 'typescript';
      case 'evm':
        return 'javascript'; // Using JavaScript for Solidity since it's closest
      case 'move':
        return 'rust'; // Using Rust for Move since it's closest
      default:
        return 'shellscript';
    }
  };

  const handleCopy = async (code: string, tab: string) => {
    await navigator.clipboard.writeText(
      code.replace(/\{BASE\}/g, baseSymbol).replace(/\{QUOTE\}/g, quoteSymbol)
    );
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-background/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <div className="fixed inset-x-0 bottom-0 z-20">
            <DialogContent
              className={cn(
                'p-0 gap-0 bg-background mx-auto border border-border/30 shadow-lg',
                isDesktop
                  ? 'max-w-3xl w-[95vw] sm:w-[90vw] md:w-[85vw] max-h-[50vh] rounded-lg'
                  : 'w-full h-[65vh] rounded-t-xl rounded-b-none'
              )}
            >
              {!isDesktop && (
                <div className="w-12 h-1 bg-border/30 rounded-full absolute -top-2 left-1/2 transform -translate-x-1/2" />
              )}
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="px-3 py-2 border-b border-border/10 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-border/20">
                      <Image
                        src={getTokenIcon(baseSymbol)}
                        alt={baseSymbol}
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-muted-foreground leading-none">
                        {baseSymbol}/{quoteSymbol}
                      </div>
                      <div className="text-lg font-mono font-medium leading-none mt-0.5">
                        {currentPrice === undefined ? (
                          <span className="text-muted-foreground/50">Loading...</span>
                        ) : (
                          <>
                            $
                            {currentPrice.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0">
                  <Tabs defaultValue="price" className="h-full flex flex-col">
                    <div className="px-3 bg-background">
                      <div className="border-b border-border/10" />
                      <TabsList className="w-fit bg-transparent border-0 p-0 h-8 mt-2">
                        <TabsTrigger
                          value="price"
                          className="px-2 py-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-muted-foreground data-[state=active]:text-foreground transition-colors text-xs"
                        >
                          Price History
                        </TabsTrigger>
                        <TabsTrigger
                          value="code"
                          className="px-2 py-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-muted-foreground data-[state=active]:text-foreground transition-colors text-xs"
                        >
                          Code Examples
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="price" className="flex-1 p-2 pt-4 m-0 overflow-hidden">
                      <div className="h-full">
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={data}
                              margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                            >
                              <XAxis
                                dataKey="time"
                                stroke="currentColor"
                                fontSize={10}
                                tickLine={false}
                                axisLine={true}
                                dy={8}
                                tick={{ fontSize: '9px', fontFamily: 'monospace' }}
                              />
                              <YAxis
                                stroke="currentColor"
                                fontSize={10}
                                tickLine={false}
                                axisLine={true}
                                tickFormatter={(value) => `$${value.toFixed(2)}`}
                                dx={-8}
                                tick={{ fontSize: '9px', fontFamily: 'monospace' }}
                              />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const value = payload[0].value;
                                    if (typeof value === 'number') {
                                      return (
                                        <div className="bg-popover/80 backdrop-blur-sm border px-1.5 py-1 shadow-lg rounded-md">
                                          <p className="text-xs font-mono font-medium">
                                            ${value.toFixed(2)}
                                          </p>
                                          <p className="text-[9px] text-muted-foreground">
                                            {payload[0].payload.time}
                                          </p>
                                        </div>
                                      );
                                    }
                                  }
                                  return null;
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="price"
                                stroke="currentColor"
                                strokeWidth={1}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="code"
                      className="flex-1 p-4 pt-6 sm:p-6 m-0 overflow-hidden"
                    >
                      {highlighter && (
                        <Tabs defaultValue="curl" className="h-full flex flex-col">
                          <div className="border bg-muted/5 p-1">
                            <TabsList className="w-full bg-transparent border-0 p-0.5 gap-1 overflow-x-auto flex-nowrap">
                              {Object.keys(codeExamples).map((key) => (
                                <TabsTrigger
                                  key={key}
                                  value={key}
                                  className="flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground text-xs sm:text-sm py-1.5 px-2 sm:px-3 whitespace-nowrap"
                                >
                                  {key.toUpperCase()}
                                </TabsTrigger>
                              ))}
                            </TabsList>
                          </div>
                          {Object.entries(codeExamples).map(([key, code]) => (
                            <TabsContent
                              key={key}
                              value={key}
                              className="relative mt-0 flex-1 min-h-0"
                            >
                              <div className="absolute right-3 top-3 z-10">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopy(code, key)}
                                  className="h-7 w-7 hover:bg-muted"
                                >
                                  {copiedTab === key ? (
                                    <span className="text-xs text-muted-foreground">Copied!</span>
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                  <span className="sr-only">
                                    {copiedTab === key ? 'Copied' : 'Copy code'}
                                  </span>
                                </Button>
                              </div>
                              <div
                                className="h-full overflow-auto bg-muted/5 border border-t-0 shadow-sm"
                                dangerouslySetInnerHTML={{
                                  __html: highlighter.codeToHtml(
                                    code
                                      .replace(/\{BASE\}/g, baseSymbol)
                                      .replace(/\{QUOTE\}/g, quoteSymbol),
                                    {
                                      lang: getLanguageForTab(key),
                                      theme: 'nord',
                                    }
                                  ),
                                }}
                              />
                            </TabsContent>
                          ))}
                        </Tabs>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <style jsx global>{`
                .shiki {
                  background: transparent !important;
                  padding: 1.5rem;
                  font-size: 0.875rem;
                  height: 100%;
                }
                .shiki code {
                  display: block;
                  overflow-x: auto;
                }
                .shiki code .line {
                  white-space: pre-wrap;
                  word-break: break-all;
                  padding: 0.125rem 0;
                }
              `}</style>
            </DialogContent>
          </div>
        </>
      )}
    </Dialog>
  );
}
