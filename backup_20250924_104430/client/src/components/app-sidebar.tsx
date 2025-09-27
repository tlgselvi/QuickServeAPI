import { Link, useLocation } from "wouter";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRoleType } from "@shared/schema";

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
} from "@/components/ui/sidebar";

const menuGroups: MenuGroup[] = [
  {
    title: "Genel",
    items: [
      {
        title: "Genel Özet",
        path: "/",
        icon: Home,
      },
      {
        title: "Analiz",
        path: "/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Hesap Yönetimi",
    items: [
      {
        title: "Şirket",
        path: "/company",
        icon: Building2,
      },
      {
        title: "Şahsi",
        path: "/personal",
        icon: User,
      },
      {
        title: "Virman",
        path: "/transfers",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    title: "Finansal İşlemler",
    items: [
      {
        title: "Sabit Giderler",
        path: "/fixed-expenses",
        icon: Calendar,
      },
      {
        title: "Kredi & Kartlar",
        path: "/credit-cards",
        icon: CreditCard,
      },
      {
        title: "Portföy Yönetimi",
        path: "/portfolio",
        icon: PieChart,
      },
      {
        title: "Simülasyon",
        path: "/simulation",
        icon: PlayCircle,
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        title: "Raporlar",
        path: "/reports",
        icon: FileText,
      },
      {
        title: "Uyarılar",
        path: "/alerts",
        icon: Bell,
      },
      {
        title: "Ayarlar",
        path: "/settings",
        icon: Settings,
      },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold" data-testid="sidebar-title">FinBot</span>
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
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.path} data-testid={`sidebar-${item.path.replace("/", "") || "home"}`}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
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