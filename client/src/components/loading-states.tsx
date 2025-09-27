import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, RefreshCw } from 'lucide-react';

// Loading skeleton components
export const DashboardSkeleton = () => (
  <div className="space-y-8">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>

    {/* KPI Bar skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Main content skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export const TransactionListSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
    ))}
  </div>
);

export const AccountCardSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ChartSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="flex justify-center space-x-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Loading spinner components
export const LoadingSpinner = ({ size = 'default', className = '' }: {
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

export const LoadingButton = ({
  children,
  loading,
  ...props
}: {
  children: React.ReactNode;
  loading: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={`flex items-center gap-2 ${props.className || ''}`}
  >
    {loading && <LoadingSpinner size="sm" />}
    {children}
  </button>
);

// Loading overlay component
export const LoadingOverlay = ({
  isLoading,
  message = 'Yükleniyor...',
  children,
}: {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    )}
  </div>
);

// Refresh button component
export const RefreshButton = ({
  onRefresh,
  isRefreshing = false,
  className = '',
}: {
  onRefresh: () => void;
  isRefreshing?: boolean;
  className?: string;
}) => (
  <button
    onClick={onRefresh}
    disabled={isRefreshing}
    className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors disabled:opacity-50 ${className}`}
  >
    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
    {isRefreshing ? 'Yenileniyor...' : 'Yenile'}
  </button>
);

// Loading state hook
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => setIsLoading(true), []);
  const stopLoading = React.useCallback(() => setIsLoading(false), []);
  const toggleLoading = React.useCallback(() => setIsLoading(prev => !prev), []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setIsLoading,
  };
};

// Async loading wrapper
export const withLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingComponent?: React.ComponentType,
) => {
  return React.forwardRef<any, P & { isLoading?: boolean }>((props, ref) => {
    const { isLoading, ...restProps } = props;

    if (isLoading) {
      return loadingComponent ? React.createElement(loadingComponent) : <DashboardSkeleton />;
    }

    return <Component {...(restProps as P)} ref={ref} />;
  });
};

// Loading context for global loading states
interface LoadingContextType {
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  loadingStates: Record<string, boolean>;
  setLoadingState: (key: string, loading: boolean) => void;
}

const LoadingContext = React.createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalLoading, setGlobalLoading] = React.useState(false);
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});

  const setLoadingState = React.useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading,
    }));
  }, []);

  const value = React.useMemo(() => ({
    globalLoading,
    setGlobalLoading,
    loadingStates,
    setLoadingState,
  }), [globalLoading, loadingStates, setLoadingState]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoadingContext = () => {
  const context = React.useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
};

// Global loading indicator
export const GlobalLoadingIndicator = () => {
  const { globalLoading } = useLoadingContext();

  if (!globalLoading) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg">
        <LoadingSpinner size="sm" />
        <span className="text-sm">İşlem yapılıyor...</span>
      </div>
    </div>
  );
};

export default {
  DashboardSkeleton,
  TransactionListSkeleton,
  AccountCardSkeleton,
  ChartSkeleton,
  LoadingSpinner,
  LoadingButton,
  LoadingOverlay,
  RefreshButton,
  useLoadingState,
  withLoading,
  LoadingProvider,
  useLoadingContext,
  GlobalLoadingIndicator,
};
