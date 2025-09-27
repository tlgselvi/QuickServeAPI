import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, AuthGuard, RouteGuard, useAuth } from "@/hooks/useAuth";
import { JWTAuthProvider, useJWTAuth } from "@/hooks/useJWTAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import Company from "@/pages/company";
import Personal from "@/pages/personal";
import Transfers from "@/pages/transfers";
import FixedExpenses from "@/pages/fixed-expenses";
import CreditCards from "@/pages/credit-cards";
import Portfolio from "@/pages/portfolio";
import Simulation from "@/pages/simulation";
import Reports from "@/pages/reports";
import Alerts from "@/pages/alerts";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Register from "@/pages/register";
import JWTLogin from "@/pages/jwt-login";
import NotFound from "@/pages/not-found";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4" />
        <span className="font-medium">{user?.username}</span>
        <span className="text-muted-foreground">({user?.role})</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={logout}
        className="h-8 w-8 p-0"
        data-testid="button-logout"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="ml-auto flex items-center gap-4">
              <UserMenu />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 space-y-4 p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth routes - no sidebar */}
      <Route path="/login">
        <AuthLayout>
          <Login />
        </AuthLayout>
      </Route>
      <Route path="/register">
        <AuthLayout>
          <Register />
        </AuthLayout>
      </Route>
      <Route path="/jwt-login">
        <AuthLayout>
          <JWTLogin />
        </AuthLayout>
      </Route>
      
      {/* App routes - with sidebar and role-based protection */}
      <Route path="/" nest>
        <AppLayout>
          <Switch>
            <Route path="/">
              <RouteGuard route="/">
                <Dashboard />
              </RouteGuard>
            </Route>
            <Route path="/analytics">
              <RouteGuard route="/analytics">
                <Analytics />
              </RouteGuard>
            </Route>
            <Route path="/company">
              <RouteGuard route="/company">
                <Company />
              </RouteGuard>
            </Route>
            <Route path="/personal">
              <RouteGuard route="/personal">
                <Personal />
              </RouteGuard>
            </Route>
            <Route path="/transfers">
              <RouteGuard route="/transfers">
                <Transfers />
              </RouteGuard>
            </Route>
            <Route path="/fixed-expenses">
              <RouteGuard route="/fixed-expenses">
                <FixedExpenses />
              </RouteGuard>
            </Route>
            <Route path="/credit-cards">
              <RouteGuard route="/credit-cards">
                <CreditCards />
              </RouteGuard>
            </Route>
            <Route path="/portfolio">
              <RouteGuard route="/portfolio">
                <Portfolio />
              </RouteGuard>
            </Route>
            <Route path="/simulation">
              <RouteGuard route="/simulation">
                <Simulation />
              </RouteGuard>
            </Route>
            <Route path="/reports">
              <RouteGuard route="/reports">
                <Reports />
              </RouteGuard>
            </Route>
            <Route path="/alerts">
              <RouteGuard route="/alerts">
                <Alerts />
              </RouteGuard>
            </Route>
            <Route path="/settings">
              <RouteGuard route="/settings">
                <Settings />
              </RouteGuard>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="finbot-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <JWTAuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </JWTAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
