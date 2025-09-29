const CACHE_NAME = 'finbot-v1';
const OFFLINE_URL = '/offline.html';

// Öncelikli cache edilecek dosyalar
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png'
];

// Service Worker kurulum
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching offline page');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Service Worker aktivasyonu
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - Network First stratejisi
self.addEventListener('fetch', event => {
  // POST istekleri için cache kullanma
  if (event.request.method !== 'GET') {
    return;
  }

  // API çağrıları için Network First
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Başarılı response'u cache'le
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network başarısız, cache'den dön
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Cache'de yoksa offline sayfası
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Diğer istekler için Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Başarılı response'u cache'le
            if (response.status === 200 && event.request.url.startsWith('http')) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Network başarısız, offline sayfası göster
            return caches.match(OFFLINE_URL);
          });
      })
  );
});

// Background Sync for offline transactions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync-transactions') {
    event.waitUntil(syncOfflineTransactions());
  }
});

// Push notification
self.addEventListener('push', event => {
  console.log('[SW] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Yeni bildirim',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Aç',
        icon: '/pwa-icon-192.png'
      },
      {
        action: 'close',
        title: 'Kapat'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FinBot', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click:', event);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Offline transaction sync helper
async function syncOfflineTransactions() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const offlineTransactions = await cache.match('offline-transactions');
    
    if (offlineTransactions) {
      const transactions = await offlineTransactions.json();
      
      for (const transaction of transactions) {
        try {
          await fetch('/api/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(transaction)
          });
        } catch (error) {
          console.error('[SW] Failed to sync transaction:', error);
        }
      }
      
      // Clear offline transactions after sync
      await cache.delete('offline-transactions');
      console.log('[SW] Offline transactions synced');
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}