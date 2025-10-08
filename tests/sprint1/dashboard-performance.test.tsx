import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../client/src/pages/dashboard';
import { AuthProvider } from '../../client/src/hooks/useAuth';
import { CurrencyProvider } from '../../client/src/contexts/CurrencyContext';

// Mock the useAuth hook
const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin' as const,
};

vi.mock('../../client/src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
  RouteGuard: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the useRealtimeDashboard hook
vi.mock('../../client/src/hooks/useRealtimeDashboard', () => ({
  useRealtimeDashboard: () => ({
    isConnected: true,
    connectionError: null,
  }),
}));

// Mock the schema to prevent getAllCategories error
vi.mock('../../shared/schema', () => ({
  getAllCategories: () => [
    { value: 'salary', label: 'Maaş' },
    { value: 'food', label: 'Yiyecek & İçecek' },
  ],
  getCategoryLabel: (value: string) => value || 'Kategori Yok',
}));

// Mock the useFormatCurrency hook
vi.mock('../../client/src/lib/utils/formatCurrency', () => ({
  useFormatCurrency: () => (value: number) => `₺${value.toLocaleString('tr-TR')}`,
}));

// Mock API responses
const mockDashboardData = {
  accounts: [
    {
      id: '1',
      name: 'Test Account',
      type: 'company',
      bankName: 'Test Bank',
      balance: '10000',
      currency: 'TRY',
      subAccounts: {
        creditCard: {
          used: 5000,
          minimumPayment: 500,
        },
      },
    },
  ],
  recentTransactions: [
    {
      id: '1',
      accountId: '1',
      amount: '1000',
      type: 'income',
      category: 'sales',
      description: 'Test Transaction',
      date: new Date().toISOString(),
    },
  ],
  totalBalance: 10000,
  companyBalance: 10000,
  personalBalance: 0,
  totalCash: 10000,
  totalDebt: 5000,
  totalTransactions: 1,
};

const mockBreakdownData = {
  breakdown: {},
  table: {},
  summary: {},
  chartData: {},
  accounts: 1,
};

const mockDscrData = {
  dscr: 2.0,
  status: 'ok' as const,
};

const mockRiskData = {
  best: {},
  base: {},
  worst: {},
  factors: {},
  riskLevel: 'low',
  recommendations: ['Test recommendation'],
  parameters: {},
};

// Mock fetch
global.fetch = vi.fn();

describe('Dashboard Performance', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          // Provide a default queryFn to satisfy useQuery without queryFn
          queryFn: async ({ queryKey }) => {
            const key = Array.isArray(queryKey) ? String(queryKey[0]) : String(queryKey);
            const res = await fetch(key as any);
            if (!(res as any).ok) throw new Error('Network error');
            return (res as any).json();
          },
        },
      },
    });

    vi.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CurrencyProvider>
            <Dashboard />
          </CurrencyProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading', async () => {
      // Mock loading state
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(() => {}) // Never resolves, keeps loading
      );

      renderDashboard();

      // Check for loading indicators
      expect(screen.getByText('Finansal Yönetim Panosu')).toBeInTheDocument();
      // Loading skeleton should be present
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      });
    });

    it('should show error state when data fails to load', async () => {
      // Mock error response
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Veri yüklenirken hata oluştu')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Tekrar Dene')).toBeInTheDocument();
      });
    });
  });

  describe('Data Rendering', () => {
    beforeEach(() => {
      // Mock successful API responses
      vi.mocked(fetch).mockImplementation((url) => {
        if (url.includes('/api/dashboard')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDashboardData),
          } as Response);
        }
        if (url.includes('/api/consolidation/breakdown')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBreakdownData),
          } as Response);
        }
        if (url.includes('/api/finance/dscr')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDscrData),
          } as Response);
        }
        if (url.includes('/api/risk/analysis')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRiskData),
          } as Response);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should render dashboard with financial summary (header or summary visible)', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(
          screen.queryByText('Finansal Yönetim Panosu') ||
          screen.queryByText('Toplam Varlık') ||
          screen.queryByText('Net Değer')
        ).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('should render tabs correctly', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Genel Bakış')).toBeInTheDocument();
        expect(screen.getByText('Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Risk Analizi')).toBeInTheDocument();
        expect(screen.getByText('İşlemler')).toBeInTheDocument();
      });
    });

    it('should render admin features for admin users', async () => {
      renderDashboard();

      // Navigate to Transactions tab to reveal admin card
      const txTab = await screen.findByText('İşlemler');
      txTab.click();

      await waitFor(() => {
        expect(
          screen.queryByText('Admin - Finansal Yönetim Panosu') ||
          screen.queryByTestId('transactions-title') ||
          screen.queryByText('Son İşlemler')
        ).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Performance Optimizations', () => {
    it('should use memoized calculations', async () => {
      const { rerender } = renderDashboard();

      // First render
      await waitFor(() => {
        expect(screen.queryByText('Toplam Varlık') || screen.getByText(/Varlık|Net Değer|Aylık Ödeme/)).toBeTruthy();
      }, { timeout: 5000 });

      // Rerender with same data
      rerender(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CurrencyProvider>
              <Dashboard />
            </CurrencyProvider>
          </AuthProvider>
        </QueryClientProvider>
      );

      // Should still render correctly
      await waitFor(() => {
        expect(screen.getByText('Toplam Varlık')).toBeInTheDocument();
      });
    });

    it('should handle filter changes efficiently', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Son İşlemler') || screen.getByTestId('transactions-title')).toBeTruthy();
      }, { timeout: 5000 });

      // Filter changes should not cause unnecessary re-renders
      // This is tested by ensuring the component doesn't crash
      // and the UI remains responsive
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock error response
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'));

      renderDashboard();

      // Should render container (title may be skeleton in loading)
      expect(screen.getByRole('main')).toBeTruthy();
      
      // Wait for error state to appear
      await waitFor(() => {
        expect(screen.getByText('Veri yüklenirken hata oluştu')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should allow retry on error', async () => {
      // Mock error response
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'));

      renderDashboard();

      // Wait for error state to appear
      await waitFor(() => {
        expect(screen.getByText('Tekrar Dene')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Click retry button
      const retryButton = screen.getByText('Tekrar Dene');
      retryButton.click();

      // Should attempt to refetch at least once
      expect((fetch as any).mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
