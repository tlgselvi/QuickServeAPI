import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CurrencySwitcher, { CurrencySwitcherCompact } from '../../client/src/components/CurrencySwitcher';
import { CurrencyProvider } from '../../client/src/contexts/CurrencyContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        {children}
      </CurrencyProvider>
    </QueryClientProvider>
  );
};

describe('CurrencySwitcher', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  test('renders currency switcher with default TRY', () => {
    render(
      <TestWrapper>
        <CurrencySwitcher />
      </TestWrapper>
    );

    expect(screen.getByText('TRY')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('shows currency options when clicked', async () => {
    render(
      <TestWrapper>
        <CurrencySwitcher />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Türk Lirası')).toBeInTheDocument();
      expect(screen.getByText('US Dollar')).toBeInTheDocument();
      expect(screen.getByText('Euro')).toBeInTheDocument();
    });
  });

  test('displays currency flags and symbols', async () => {
    render(
      <TestWrapper>
        <CurrencySwitcher />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('🇹🇷')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('🇪🇺')).toBeInTheDocument();
    });
  });

  test('shows example format', async () => {
    render(
      <TestWrapper>
        <CurrencySwitcher />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Örnek format:')).toBeInTheDocument();
      expect(screen.getByText(/₺1\.234,56/)).toBeInTheDocument();
    });
  });

  test('changes currency when option is selected', async () => {
    render(
      <TestWrapper>
        <CurrencySwitcher />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      const usdOption = screen.getByText('US Dollar');
      fireEvent.click(usdOption);
    });

    await waitFor(() => {
      expect(screen.getByText('USD')).toBeInTheDocument();
    });
  });

  test('saves currency to localStorage', async () => {
    render(
      <TestWrapper>
        <CurrencySwitcher />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      const eurOption = screen.getByText('Euro');
      fireEvent.click(eurOption);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('selectedCurrency', 'EUR');
  });

  test('loads currency from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('USD');
    
    render(
      <TestWrapper>
        <CurrencySwitcher />
      </TestWrapper>
    );

    expect(localStorageMock.getItem).toHaveBeenCalledWith('selectedCurrency');
  });

  test('shows active badge for selected currency', async () => {
    render(
      <TestWrapper>
        <CurrencySwitcher />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Aktif')).toBeInTheDocument();
    });
  });
});

describe('CurrencySwitcherCompact', () => {
  test('renders compact version', () => {
    render(
      <TestWrapper>
        <CurrencySwitcherCompact />
      </TestWrapper>
    );

    expect(screen.getByText('TRY')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('cycles through currencies on click', async () => {
    render(
      <TestWrapper>
        <CurrencySwitcherCompact />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    
    // Click to change to USD
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('USD')).toBeInTheDocument();
    });

    // Click to change to EUR
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('EUR')).toBeInTheDocument();
    });

    // Click to change back to TRY
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('TRY')).toBeInTheDocument();
    });
  });

  test('displays currency icons', () => {
    render(
      <TestWrapper>
        <CurrencySwitcherCompact />
      </TestWrapper>
    );

    // Should have currency icon (Lira icon for TRY)
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });
});

describe('Currency Context Integration', () => {
  test('formatCurrency function works correctly', async () => {
    const TestComponent = () => {
      const { formatCurrency } = require('../../client/src/contexts/CurrencyContext');
      const { useCurrency } = formatCurrency;
      
      const format = useCurrency();
      
      return (
        <div>
          <span data-testid="formatted-amount">{format(1234.56)}</span>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Should format according to current currency
    expect(screen.getByTestId('formatted-amount')).toHaveTextContent(/₺1\.234,56/);
  });
});
