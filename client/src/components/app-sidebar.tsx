import { Link, useLocation } from 'wouter';
import {
  Building2,
  User,
  ArrowLeftRight,
  Calendar,
  CreditCard,
  FileText,
  Bell,
  Settings,
  Home,
  BarChart3,
  TrendingUp,
  PieChart,
  PlayCircle,
  LayoutGrid,
  Clock,
  Target,
  Wallet,
  Building,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRoleType } from '@shared/client-schema';

interface MenuItem {
  title: string;
  path: string;
  icon: any;
  requiredRole?: UserRoleType;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
  requiredRole?: UserRoleType;
}

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';

const menuGroups: MenuGroup[] = [
  {
    title: 'Genel',
    items: [
      {
        title: 'Genel Özet',
        path: '/',
        icon: Home,
      },
      {
        title: 'Dashboard Extended',
        path: '/dashboard-extended',
        icon: LayoutGrid,
      },
      {
        title: 'Analiz',
        path: '/analytics',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Hesap Yönetimi',
    items: [
      {
        title: 'Şirket',
        path: '/company',
        icon: Building2,
      },
      {
        title: 'Şahsi',
        path: '/personal',
        icon: User,
      },
      {
        title: 'Virman',
        path: '/transfers',
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    title: 'Finansal İşlemler',
    items: [
      {
        title: 'Sabit Giderler',
        path: '/fixed-expenses',
        icon: Calendar,
      },
      {
        title: 'Kredi & Kartlar',
        path: '/credit-cards',
        icon: CreditCard,
      },
      {
        title: 'Portföy Yönetimi',
        path: '/portfolio',
        icon: PieChart,
      },
      {
        title: 'Simülasyon',
        path: '/simulation',
        icon: PlayCircle,
      },
    ],
  },
  {
    title: 'Finansal Yönetim',
    items: [
      {
        title: 'Bütçe Yönetimi',
        path: '/budget-management',
        icon: Target,
      },
      {
        title: 'Kasa Yönetimi',
        path: '/cashbox-management',
        icon: Wallet,
      },
      {
        title: 'Banka Entegrasyonu',
        path: '/bank-integration',
        icon: Building,
      },
      {
        title: 'Yaşlandırma Analizi',
        path: '/aging-analysis',
        icon: Clock,
      },
    ],
  },
  {
    title: 'Sistem',
    items: [
      {
        title: 'Raporlar',
        path: '/reports',
        icon: FileText,
      },
      {
        title: 'Uyarılar',
        path: '/alerts',
        icon: Bell,
      },
      {
        title: 'Ayarlar',
        path: '/settings',
        icon: Settings,
      },
    ],
  },
];

export function AppSidebar () {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
        <div className="flex items-center gap-2 px-3 py-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" data-testid="sidebar-title">
              FinBot
            </span>
            <div className="text-xs text-muted-foreground">v3.0.0</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  // Hide admin items for non-admin users
                  if (item.requiredRole && user?.role !== item.requiredRole) {
                    return null;
                  }

                  const Icon = item.icon;
                  const isActive = location === item.path;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        className="group relative overflow-hidden transition-all duration-200 hover:bg-accent/50 hover:shadow-sm"
                      >
                        <Link 
                          href={item.path} 
                          data-testid={`sidebar-${item.path.replace('/', '') || 'home'}`}
                          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                        >
                          <Icon className={`h-4 w-4 transition-colors ${
                            isActive 
                              ? 'text-primary' 
                              : 'text-muted-foreground group-hover:text-foreground'
                          }`} />
                          <span className={`font-medium transition-colors ${
                            isActive 
                              ? 'text-primary' 
                              : 'text-muted-foreground group-hover:text-foreground'
                          }`}>
                            {item.title}
                          </span>
                          {isActive && (
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-l-full" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
