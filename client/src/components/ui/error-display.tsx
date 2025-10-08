import { AlertCircle, RefreshCw, Home, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ErrorDisplayProps {
  error: Error | string;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  className?: string;
  variant?: 'card' | 'alert' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

export function ErrorDisplay({
  error,
  title = 'Bir Hata Oluştu',
  description,
  onRetry,
  onGoHome,
  showDetails = false,
  className,
  variant = 'card',
  size = 'md'
}: ErrorDisplayProps) {
  const [showFullDetails, setShowFullDetails] = useState(showDetails);
  
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? null : error.stack;

  const sizeClasses = {
    sm: {
      icon: 'h-4 w-4',
      text: 'text-sm',
      button: 'h-8 text-xs'
    },
    md: {
      icon: 'h-5 w-5',
      text: 'text-base',
      button: 'h-9 text-sm'
    },
    lg: {
      icon: 'h-6 w-6',
      text: 'text-lg',
      button: 'h-10 text-base'
    }
  };

  const copyErrorDetails = async () => {
    const errorDetails = {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      // Toast could be added here
    } catch {
      // Fallback
      console.error('Error details:', errorDetails);
    }
  };

  if (variant === 'alert') {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className={sizeClasses[size].icon} />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">{title}</p>
            <p className={sizeClasses[size].text}>{description || errorMessage}</p>
            {(onRetry || onGoHome) && (
              <div className="flex gap-2 pt-2">
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className={sizeClasses[size].button}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Tekrar Dene
                  </Button>
                )}
                {onGoHome && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onGoHome}
                    className={sizeClasses[size].button}
                  >
                    <Home className="h-3 w-3 mr-1" />
                    Ana Sayfa
                  </Button>
                )}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2 text-destructive', className)}>
        <AlertCircle className={sizeClasses[size].icon} />
        <span className={sizeClasses[size].text}>
          {description || errorMessage}
        </span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('border-destructive', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className={sizeClasses[size].icon} />
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={cn('text-muted-foreground', sizeClasses[size].text)}>
          {errorMessage}
        </p>

        {showFullDetails && errorStack && (
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Teknik Detaylar
            </summary>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
              {errorStack}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className={sizeClasses[size].button}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tekrar Dene
            </Button>
          )}
          
          {onGoHome && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGoHome}
              className={sizeClasses[size].button}
            >
              <Home className="h-3 w-3 mr-1" />
              Ana Sayfa
            </Button>
          )}

          {errorStack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullDetails(!showFullDetails)}
              className={sizeClasses[size].button}
            >
              {showFullDetails ? 'Detayları Gizle' : 'Detayları Göster'}
            </Button>
          )}

          {errorStack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyErrorDetails}
              className={sizeClasses[size].button}
            >
              <Copy className="h-3 w-3 mr-1" />
              Kopyala
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Connection status component
interface ConnectionStatusProps {
  isConnected: boolean;
  error?: string | null;
  onReconnect?: () => void;
  className?: string;
}

export function ConnectionStatus({ 
  isConnected, 
  error, 
  onReconnect,
  className 
}: ConnectionStatusProps) {
  if (isConnected && !error) {
    return (
      <div className={cn('flex items-center gap-2 text-green-600', className)}>
        <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse"></div>
        <span className="text-xs">Bağlı</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 w-2 rounded-full bg-red-600"></div>
      <span className="text-xs text-red-600">
        {error || 'Bağlantı yok'}
      </span>
      {onReconnect && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className="h-5 w-5 p-0"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
