import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary, withErrorBoundary, useErrorHandler } from './error-boundary';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws an error in useEffect
const ThrowErrorInEffect = () => {
  React.useEffect(() => {
    throw new Error('Effect error');
  }, []);
  return <div>Effect component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
    expect(screen.getByText(/Uygulamada beklenmeyen bir hata meydana geldi/)).toBeInTheDocument();
  });

  it('should show error ID', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Hata ID:/)).toBeInTheDocument();
  });

  it('should show retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Tekrar Dene')).toBeInTheDocument();
  });

  it('should show reload button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Sayfayı Yenile')).toBeInTheDocument();
  });

  it('should show home button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Ana Sayfa')).toBeInTheDocument();
  });

  it('should show copy error details button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Hata Detaylarını Kopyala')).toBeInTheDocument();
  });

  it('should retry when retry button is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    const retryButton = screen.getByText('Tekrar Dene');
    fireEvent.click(retryButton);

    // After retry, the error should be cleared and children should render
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should reload page when reload button is clicked', () => {
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    const reloadButton = screen.getByText('Sayfayı Yenile');
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('should navigate to home when home button is clicked', () => {
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    const homeButton = screen.getByText('Ana Sayfa');
    fireEvent.click(homeButton);

    expect(mockLocation.href).toBe('/');
  });

  it('should copy error details when copy button is clicked', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    const copyButton = screen.getByText('Hata Detaylarını Kopyala');
    fireEvent.click(copyButton);

    expect(mockWriteText).toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith('Hata detayları panoya kopyalandı');
  });

  it('should show fallback UI when provided', () => {
    const fallback = <div>Custom fallback UI</div>;

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Geliştirici Bilgileri:')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.queryByText('Geliştirici Bilgileri:')).not.toBeInTheDocument();
    expect(screen.queryByText('Test error')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with ErrorBoundary', () => {
    const TestComponent = () => <div>Test Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('should handle errors in wrapped component', () => {
    const TestComponent = () => {
      throw new Error('Wrapped component error');
    };
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
  });

  it('should set display name correctly', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});

describe('useErrorHandler hook', () => {
  it('should return error handler function', () => {
    const TestComponent = () => {
      const handleError = useErrorHandler();
      return (
        <button onClick={() => handleError(new Error('Test error'))}>
          Trigger Error
        </button>
      );
    };

    render(<TestComponent />);

    const button = screen.getByText('Trigger Error');
    expect(button).toBeInTheDocument();

    // Clicking the button should not throw an error
    expect(() => fireEvent.click(button)).not.toThrow();
  });
});

// Test for error boundary with different error types
describe('ErrorBoundary with different error types', () => {
  it('should handle TypeError', () => {
    const ThrowTypeError = () => {
      throw new TypeError('Type error');
    };

    render(
      <ErrorBoundary>
        <ThrowTypeError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
  });

  it('should handle ReferenceError', () => {
    const ThrowReferenceError = () => {
      throw new ReferenceError('Reference error');
    };

    render(
      <ErrorBoundary>
        <ThrowReferenceError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
  });

  it('should handle custom error with stack trace', () => {
    const ThrowCustomError = () => {
      const error = new Error('Custom error');
      error.stack = 'Custom stack trace';
      throw error;
    };

    render(
      <ErrorBoundary>
        <ThrowCustomError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
  });
});
