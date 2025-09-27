import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import type { UserRoleType, PermissionType } from '@shared/schema';
import { hasPermission } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  username: string;
  role: UserRoleType;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: PermissionType) => boolean;
  hasRole: (role: UserRoleType) => boolean;
  canAccessRoute: (route: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider ({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  // Query current user
  const { data: userResponse, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false, // Don't retry on 401
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const user = (userResponse as any)?.user || null;
  const isAuthenticated = !!user && !error;

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/auth/logout'),
    onSuccess: () => {
      // Redirect to login after logout
      setLocation('/login');
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  // Permission check helper
  const checkPermission = (permission: PermissionType): boolean => {
    if (!user) {
      return false;
    }
    return hasPermission(user.role, permission);
  };

  // Role check helper
  const checkRole = (role: UserRoleType): boolean => {
    if (!user) {
      return false;
    }
    return user.role === role;
  };

  // Route access control based on user role
  const canAccessRoute = (route: string): boolean => {
    if (!user) {
      return false;
    }

    // Route-role mapping
    const routePermissions: Record<string, UserRoleType[]> = {
      '/': ['admin', 'company_user', 'personal_user'],
      '/analytics': ['admin', 'company_user', 'personal_user'],
      '/company': ['admin', 'company_user'], // Personal users can't access company routes
      '/personal': ['admin', 'company_user', 'personal_user'],
      '/transfers': ['admin', 'company_user', 'personal_user'],
      '/fixed-expenses': ['admin', 'company_user', 'personal_user'],
      '/credit-cards': ['admin', 'company_user', 'personal_user'],
      '/reports': ['admin', 'company_user', 'personal_user'],
      '/settings': ['admin', 'company_user', 'personal_user'],
      '/admin': ['admin'], // Admin-only route
    };

    const allowedRoles = routePermissions[route];
    if (!allowedRoles) {
      return true;
    } // Default allow if route not specified

    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        hasPermission: checkPermission,
        hasRole: checkRole,
        canAccessRoute,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth () {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth guard component for protecting routes
export function AuthGuard ({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}

// Role guard component for role-based access
export function RoleGuard ({
  allowedRoles,
  children,
  fallback,
}: {
  allowedRoles: UserRoleType[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Erişim Engellendi
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Bu sayfayı görüntülemek için gerekli yetkiniz bulunmuyor.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Route guard component
export function RouteGuard ({
  route,
  children,
}: {
  route: string;
  children: React.ReactNode;
}) {
  const { canAccessRoute } = useAuth();

  if (!canAccessRoute(route)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Erişim Engellendi
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Bu sayfayı görüntülemek için gerekli yetkiniz bulunmuyor.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
