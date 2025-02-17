import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Send, LineChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div
      className={cn(
        'flex h-[calc(100vh-4rem)] flex-col fixed left-0 top-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-72'
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-2 h-8 w-8 rounded-full border bg-background"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
      <div className="flex-1 py-2 overflow-auto">
        <div className="px-2">
          <nav className="space-y-1">
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
                        'h-5 w-5',
                        !isCollapsed && 'mr-3',
                        pathname === link.href
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-primary'
                      )}
                    />
                    {!isCollapsed && (
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
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="text-xs text-muted-foreground">{link.description}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
