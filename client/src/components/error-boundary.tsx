import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor (props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError (error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch (error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Log error to external service in production
    this.logErrorToService(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: Send to error reporting service
        // errorReportingService.captureException(error, {
        //   extra: errorInfo,
        //   tags: {
        //     component: 'ErrorBoundary',
        //     errorId: this.state.errorId
        //   }
        // });

        // For now, just log to console with structured data
        logger.error('Production Error:', {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorId: this.state.errorId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        });
      } catch (loggingError) {
        logger.error('Failed to log error:', loggingError);
      }
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        // Show success message
        alert('Hata detayları panoya kopyalandı');
      })
      .catch(() => {
        // Fallback: show error details in alert
        alert(JSON.stringify(errorDetails, null, 2));
      });
  };

  render () {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Bir Hata Oluştu</CardTitle>
              <CardDescription>
                Uygulamada beklenmeyen bir hata meydana geldi. Lütfen sayfayı yenileyin veya ana sayfaya dönün.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Geliştirici Bilgileri:</p>
                      <p className="text-sm font-mono bg-muted p-2 rounded">
                        {this.state.error.message}
                      </p>
                      {this.state.error.stack && (
                        <details className="text-xs">
                          <summary className="cursor-pointer font-medium">Stack Trace</summary>
                          <pre className="mt-2 bg-muted p-2 rounded overflow-auto max-h-32">
                            {this.state.error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error ID for support */}
              <div className="text-center text-sm text-muted-foreground">
                <p>Hata ID: <code className="bg-muted px-1 rounded">{this.state.errorId}</code></p>
                <p>Bu hatayı destek ekibine bildirirken bu ID'yi kullanın.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} variant="default" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Tekrar Dene
                </Button>

                <Button onClick={this.handleReload} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Sayfayı Yenile
                </Button>

                <Button onClick={this.handleGoHome} variant="outline" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Ana Sayfa
                </Button>

                <Button onClick={this.copyErrorDetails} variant="ghost" size="sm" className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Hata Detaylarını Kopyala
                </Button>
              </div>

              {/* Support Information */}
              <div className="text-center text-sm text-muted-foreground border-t pt-4">
                <p>Problem devam ederse, lütfen destek ekibi ile iletişime geçin.</p>
                <p>Hata ID'sini paylaşarak daha hızlı yardım alabilirsiniz.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object> (
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for programmatic error handling
export function useErrorHandler () {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    logger.error('Manual error report:', error, errorInfo);

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // errorReportingService.captureException(error, { extra: errorInfo });
    }
  };
}

export default ErrorBoundary;
