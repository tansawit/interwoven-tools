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
    id: 'registry',
    title: 'Asset Registry',
    description: 'Add new assets to rollup assetlist.json files',
    path: '/registry/assets',
  },
  // Add more tools here in the future
];

export default function Home() {
  return (
    <div className="container mx-auto py-12 sm:py-20 px-4 max-w-5xl">
      <div className="space-y-12 sm:space-y-16">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 sm:mb-6">
            Interwoven Tools
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto px-4">
            A collection of useful tools for the Interwoven ecosystem
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link href={tool.path} key={tool.id}>
              <Card className="h-full cursor-pointer border border-border hover:bg-foreground hover:text-background transition-colors duration-300">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl mb-2">{tool.title}</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm sm:text-base">
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
