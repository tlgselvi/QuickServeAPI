import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Home, BarChart3, TrendingUp } from 'lucide-react';

export default function Navigation () {
  const [location] = useLocation();

  const navItems = [
    { path: '/', label: 'Ana Sayfa', icon: Home },
    { path: '/analytics', label: 'Analiz', icon: BarChart3 },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold" data-testid="app-title">FinBot</h1>
          </div>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;

              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                    data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
