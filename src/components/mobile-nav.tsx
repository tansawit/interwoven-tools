import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Send, LineChart, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function MobileNav() {
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
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <div className="flex-1 py-6">
          <div className="px-2">
            <nav className="space-y-2">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'group flex flex-col space-y-0.5 px-3 py-2 rounded-lg transition-colors hover:bg-accent',
                      pathname === link.href ? 'bg-accent/50' : 'transparent'
                    )}
                  >
                    <div className="flex items-center">
                      <Icon
                        className={cn(
                          'mr-3 h-5 w-5',
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
                    </div>
                    <span className="text-xs text-muted-foreground">{link.description}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
