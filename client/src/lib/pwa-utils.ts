// PWA Install Prompt Utility
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PWAInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;

  constructor () {
    this.init();
  }

  private init () {
    // Install prompt event listener
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
    });

    // App installed event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      this.isInstalled = true;
      this.deferredPrompt = null;
    });

    // Check if already installed
    this.checkIfInstalled();
  }

  private checkIfInstalled () {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isWebApp = (window.navigator as any).standalone === true;

    this.isInstalled = isStandalone || isWebApp;
  }

  async showInstallPrompt (): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;

      console.log('[PWA] User choice:', choiceResult.outcome);

      if (choiceResult.outcome === 'accepted') {
        this.deferredPrompt = null;
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return false;
    }
  }

  canInstall (): boolean {
    return !!this.deferredPrompt && !this.isInstalled;
  }

  getIsInstalled (): boolean {
    return this.isInstalled;
  }
}

export const pwaInstallManager = new PWAInstallManager();

// Service Worker Registration
export async function registerServiceWorker (): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] SW registered successfully:', registration);

      // Update service worker when available
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New SW available, reload to update');
              // Show update notification to user
              if (confirm('Yeni güncelleme mevcut. Uygulamayı yenileyelim mi?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('[PWA] SW registration failed:', error);
      return null;
    }
  }

  console.log('[PWA] Service Worker not supported');
  return null;
}

// Push Notification Utilities
export async function requestNotificationPermission (): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Request permission
  const permission = await Notification.requestPermission();
  console.log('[PWA] Notification permission:', permission);

  return permission;
}

export async function subscribeToPush (registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // VAPID public key - replace with your own
        'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9HLg2cHSLztjyzwVjfLV5xCzU-UUyy5LZbDXP_Vx5v6MG5rBu5',
      ),
    });

    console.log('[PWA] Push subscription successful:', subscription);
    return subscription;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
}

// Helper function for VAPID key conversion
function urlBase64ToUint8Array (base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Offline Storage for Transactions
export class OfflineStorage {
  private readonly OFFLINE_KEY = 'finbot-offline-transactions';

  async saveOfflineTransaction (transaction: any): Promise<void> {
    try {
      const existing = await this.getOfflineTransactions();
      existing.push({
        ...transaction,
        id: Date.now().toString(),
        offline: true,
        timestamp: new Date().toISOString(),
      });

      localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(existing));
      console.log('[PWA] Transaction saved offline');

      // Register for background sync if available
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('background-sync-transactions');
      }
    } catch (error) {
      console.error('[PWA] Failed to save offline transaction:', error);
    }
  }

  getOfflineTransactions (): any[] {
    try {
      const stored = localStorage.getItem(this.OFFLINE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[PWA] Failed to get offline transactions:', error);
      return [];
    }
  }

  clearOfflineTransactions (): void {
    localStorage.removeItem(this.OFFLINE_KEY);
  }

  getOfflineCount (): number {
    const transactions = this.getOfflineTransactions();
    return transactions.length;
  }
}

export const offlineStorage = new OfflineStorage();
