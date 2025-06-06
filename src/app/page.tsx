import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Tool {
  id: string;
  title: string;
  description: string;
  path: string;
}

const tools: Tool[] = [
  {
    id: 'address-converter',
    title: 'Address Converter',
    description: 'Convert between 0x addresses and bech32 init-prefixed addresses',
    path: '/address-converter',
  },
  {
    id: 'minitswap',
    title: 'Minitswap',
    description: 'Monitoring of Minitswap pools, balances, and swap prices',
    path: '/minitswap',
  },
  {
    id: 'staking',
    title: 'Staking',
    description: 'Monitoring of INIT and EL pools',
    path: '/staking',
  },
  {
    id: 'vip-scores',
    title: 'VIP Scores',
    description: 'Track and monitor VIP scores across the Interwoven ecosystem',
    path: '/vip-scores',
  },
  {
    id: 'block-time',
    title: 'Block Time Calculator',
    description: 'Calculate block times, estimate future blocks, and analyze blockchain timing',
    path: '/block-time',
  },
  // Add more tools here in the future
];

export default function Home() {
  return (
    <div className="container mx-auto py-8 sm:py-12 lg:py-20 px-4 max-w-5xl">
      <div className="space-y-8 sm:space-y-12 lg:space-y-16">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight mb-3 sm:mb-4 lg:mb-6">
            Interwoven Tools
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg lg:text-xl max-w-2xl mx-auto px-2 sm:px-4">
            A collection of useful tools for the Interwoven ecosystem
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:gap-8 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link href={tool.path} key={tool.id}>
              <Card className="h-full cursor-pointer border border-border hover:bg-foreground hover:text-background transition-colors duration-300">
                <CardHeader className="p-3 sm:p-4 lg:p-6">
                  <CardTitle className="text-base sm:text-lg lg:text-xl mb-2">
                    {tool.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-xs sm:text-sm lg:text-base">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
