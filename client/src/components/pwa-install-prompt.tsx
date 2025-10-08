import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Download, Smartphone } from 'lucide-react';
import { pwaInstallManager } from '@/lib/pwa-utils';

export function PWAInstallPrompt () {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const checkInstallability = () => {
      const canInstall = pwaInstallManager.canInstall();
      const isInstalled = pwaInstallManager.getIsInstalled();

      // Show prompt if can install and not already shown
      if (canInstall && !isInstalled && !localStorage.getItem('pwa-prompt-dismissed')) {
        setShowPrompt(true);
      }
    };

    // Check immediately
    checkInstallability();

    // Check periodically
    const interval = setInterval(checkInstallability, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      const installed = await pwaInstallManager.showInstallPrompt();
      if (installed) {
        setShowPrompt(false);
      }
    } catch (error) {
      logger.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <Alert className="mb-4 border-primary bg-primary/5" data-testid="pwa-install-prompt">
      <Smartphone className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <span className="font-medium">FinBot'u telefonuna indir!</span>
          <p className="text-sm text-muted-foreground mt-1">
            Offline erişim, push bildirimleri ve daha hızlı performans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleInstall}
            disabled={isInstalling}
            data-testid="button-pwa-install"
          >
            <Download className="h-4 w-4 mr-2" />
            {isInstalling ? 'Yükleniyor...' : 'Yükle'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            data-testid="button-pwa-dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
