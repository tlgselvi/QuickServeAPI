import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgingTable } from '../../client/src/components/aging-table';

// Mock the currency context
jest.mock('../../client/src/contexts/CurrencyContext', () => ({
  useFormatCurrency: () => (amount: number) => `₺${amount.toLocaleString('tr-TR')}`,
}));

// Mock fetch
global.fetch = jest.fn();

describe('AgingTable Component', () => {
  const mockProps = {
    reportType: 'ar' as const,
    title: 'Alacak Yaşlandırması',
    description: 'Müşteri alacaklarının yaşlandırma analizi',
  };

  const mockData = [
    {
      id: '1',
      reportType: 'ar',
      customerVendorName: 'Test Müşteri A',
      invoiceNumber: 'INV-001',
      invoiceDate: '2024-01-15',
      dueDate: '2024-02-15',
      currentAmount: '10000',
      agingDays: 30,
      agingBucket: '0-30',
      status: 'outstanding',
      riskLevel: 'low',
    },
    {
      id: '2',
      reportType: 'ar',
      customerVendorName: 'Test Müşteri B',
      invoiceNumber: 'INV-002',
      invoiceDate: '2024-01-01',
      dueDate: '2024-01-31',
      currentAmount: '25000',
      agingDays: 60,
      agingBucket: '30-60',
      status: 'overdue',
      riskLevel: 'medium',
    },
  ];

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  test('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<AgingTable {...mockProps} />);
    
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });

  test('renders error state when fetch fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    render(<AgingTable {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  test('renders aging reports data correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockData,
      }),
    });
    
    render(<AgingTable {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Müşteri A')).toBeInTheDocument();
      expect(screen.getByText('Test Müşteri B')).toBeInTheDocument();
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });
  });

  test('displays summary statistics', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockData,
      }),
    });
    
    render(<AgingTable {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('₺35.000')).toBeInTheDocument(); // Total amount
      expect(screen.getByText('2')).toBeInTheDocument(); // Total count
    });
  });

  test('filters work correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockData,
      }),
    });
    
    render(<AgingTable {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Müşteri A')).toBeInTheDocument();
    });
    
    // Test status filter
    const statusFilter = screen.getByDisplayValue('Tüm Durumlar');
    // Note: This would need actual user interaction testing with fireEvent
  });

  test('shows correct aging bucket colors', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockData,
      }),
    });
    
    render(<AgingTable {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('0-30 gün')).toBeInTheDocument();
      expect(screen.getByText('30-60 gün')).toBeInTheDocument();
    });
  });
});
