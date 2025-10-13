/* =================================================================
   TheNarrative - Enhanced Service Worker
   Version 2.0 - Advanced PWA Features
   ================================================================= */

const CACHE_NAME = 'thenarrative-v2.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;
const IMAGE_CACHE = `${CACHE_NAME}-images`;

// Enhanced cache configuration
const CACHE_CONFIG = {
  static: {
    name: STATIC_CACHE,
    maxEntries: 100,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  dynamic: {
    name: DYNAMIC_CACHE,
    maxEntries: 50,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  api: {
    name: API_CACHE,
    maxEntries: 100,
    maxAge: 5 * 60 * 1000 // 5 minutes
  },
  images: {
    name: IMAGE_CACHE,
    maxEntries: 100,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
};

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/static/media/logo.svg',
  '/manifest.json',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/news',
  '/api/news/stats',
  '/api/news/stories',
  '/api/weather',
  '/api/markets',
  '/api/sports'
];

// Enhanced installation with comprehensive caching
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Initialize other caches
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE),
      caches.open(IMAGE_CACHE)
    ]).then(() => {
      console.log('[SW] Installation complete');
      // Force activation of new service worker
      return self.skipWaiting();
    }).catch(error => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// Enhanced activation with cleanup
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete');
      
      // Notify clients about the new service worker
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: '2.0.0'
          });
        });
      });
    }).catch(error => {
      console.error('[SW] Activation failed:', error);
    })
  );
});

// Enhanced fetch handling with intelligent caching strategies
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Route different types of requests to appropriate handlers
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigation(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Enhanced message handling for client communication
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: '2.0.0' });
      break;
      
    case 'CLEAR_CACHE':
      handleClearCache(payload?.cacheType)
        .then(result => event.ports[0].postMessage(result))
        .catch(error => event.ports[0].postMessage({ error: error.message }));
      break;
      
    case 'PREFETCH_ARTICLES':
      handlePrefetchArticles(payload?.filters)
        .then(result => event.ports[0].postMessage(result))
        .catch(error => event.ports[0].postMessage({ error: error.message }));
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  switch (event.tag) {
    case 'background-sync-articles':
      event.waitUntil(syncArticles());
      break;
      
    case 'background-sync-analytics':
      event.waitUntil(syncAnalytics());
      break;
      
    default:
      console.log('[SW] Unknown sync tag:', event.tag);
  }
});

// Push notifications handling
self.addEventListener('push', event => {
  console.log('[SW] Push message received:', event);
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New content available',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: data.tag || 'general',
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/action-open.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/action-dismiss.png'
        }
      ],
      requireInteraction: true,
      silent: false
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'TheNarrative',
        options
      )
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click:', event);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

/* =================================================================
   HELPER FUNCTIONS
   ================================================================= */

// Request type detection
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/static/') || 
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname === '/manifest.json' ||
         url.pathname === '/favicon.ico';
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('thenarrative-backend.onrender.com') ||
         url.hostname.includes('thenarrative-python.onrender.com');
}

function isImageRequest(request) {
  return request.destination === 'image' ||
         request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Enhanced caching strategies
async function handleStaticAsset(request) {
  try {
    // Cache first strategy for static assets
    const cachedResponse = await caches.match(request, { cacheName: STATIC_CACHE });
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch and cache
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Static asset error:', error);
    
    // Return offline fallback if available
    if (request.destination === 'document') {
      const fallback = await caches.match('/offline.html');
      return fallback || new Response('Offline', { status: 503 });
    }
    
    return new Response('Asset not available offline', { status: 503 });
  }
}

async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Network first strategy with short timeout for API requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Cache successful API responses
      const cache = await caches.open(API_CACHE);
      
      // Only cache GET requests
      if (request.method === 'GET') {
        cache.put(request, response.clone());
      }
      
      // Clean up old entries
      await cleanupCache(API_CACHE, CACHE_CONFIG.api.maxEntries);
    }
    
    return response;
  } catch (error) {
    console.log('[SW] API network failed, trying cache:', url.pathname);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request, { cacheName: API_CACHE });
    
    if (cachedResponse) {
      // Add header to indicate cached response
      const modifiedResponse = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...cachedResponse.headers,
          'X-Served-By': 'ServiceWorker',
          'X-Cache-Status': 'HIT'
        }
      });
      
      return modifiedResponse;
    }
    
    // Return meaningful error for offline API requests
    return new Response(JSON.stringify({
      error: 'API not available offline',
      message: 'This content requires an internet connection',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleImageRequest(request) {
  try {
    // Cache first for images with network fallback
    const cachedResponse = await caches.match(request, { cacheName: IMAGE_CACHE });
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, response.clone());
      
      // Clean up old entries
      await cleanupCache(IMAGE_CACHE, CACHE_CONFIG.images.maxEntries);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Image request failed:', error);
    
    // Return placeholder image or cached version
    const placeholder = await caches.match('/placeholder-image.png');
    return placeholder || new Response('Image not available offline', { status: 503 });
  }
}

async function handleNavigation(request) {
  try {
    // Network first for navigation
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, serving from cache');
    
    // Try to serve cached version
    const cachedResponse = await caches.match(request, { cacheName: DYNAMIC_CACHE });
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Serve the main app shell for SPA routing
    const appShell = await caches.match('/', { cacheName: STATIC_CACHE });
    return appShell || new Response('App not available offline', { status: 503 });
  }
}

async function handleDynamicRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      
      // Clean up old entries
      await cleanupCache(DYNAMIC_CACHE, CACHE_CONFIG.dynamic.maxEntries);
    }
    
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request, { cacheName: DYNAMIC_CACHE });
    return cachedResponse || new Response('Content not available offline', { status: 503 });
  }
}

// Cache cleanup utilities
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  
  return Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName !== STATIC_CACHE && 
          cacheName !== DYNAMIC_CACHE && 
          cacheName !== API_CACHE && 
          cacheName !== IMAGE_CACHE) {
        console.log('[SW] Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

async function cleanupCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  
  if (requests.length > maxEntries) {
    const requestsToDelete = requests.slice(0, requests.length - maxEntries);
    
    await Promise.all(
      requestsToDelete.map(request => cache.delete(request))
    );
    
    console.log(`[SW] Cleaned up ${requestsToDelete.length} entries from ${cacheName}`);
  }
}

async function handleClearCache(cacheType) {
  try {
    if (cacheType) {
      const cacheName = CACHE_CONFIG[cacheType]?.name;
      if (cacheName) {
        await caches.delete(cacheName);
        return { success: true, message: `Cleared ${cacheType} cache` };
      }
    } else {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      return { success: true, message: 'Cleared all caches' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Background sync utilities
async function syncArticles() {
  try {
    console.log('[SW] Syncing articles in background...');
    
    // Fetch latest articles
    const response = await fetch('/api/news?limit=10&enhanced=true');
    
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put('/api/news', response.clone());
      console.log('[SW] Articles synced successfully');
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error; // This will retry the sync later
  }
}

async function syncAnalytics() {
  try {
    console.log('[SW] Syncing analytics in background...');
    
    // Get stored analytics data
    const analyticsData = await getStoredAnalytics();
    
    if (analyticsData.length > 0) {
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: analyticsData })
      });
      
      if (response.ok) {
        await clearStoredAnalytics();
        console.log('[SW] Analytics synced successfully');
      }
    }
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
    throw error;
  }
}

async function handlePrefetchArticles(filters) {
  try {
    const url = new URL('/api/news', self.location.origin);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          url.searchParams.append(key, value);
        }
      });
    }
    
    const response = await fetch(url);
    
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(url.toString(), response.clone());
      
      return { success: true, message: 'Articles prefetched successfully' };
    }
    
    throw new Error(`Prefetch failed: ${response.status}`);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// IndexedDB utilities for offline analytics
async function getStoredAnalytics() {
  // Implement IndexedDB operations for offline analytics
  return [];
}

async function clearStoredAnalytics() {
  // Implement clearing of stored analytics
}

/* =================================================================
   SERVICE WORKER UTILITIES
   ================================================================= */

// Performance monitoring
function measurePerformance(name, fn) {
  return async (...args) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      console.log(`[SW] ${name} took ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[SW] ${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
}

// Wrap key functions with performance monitoring
const enhancedHandlers = {
  handleStaticAsset: measurePerformance('handleStaticAsset', handleStaticAsset),
  handleAPIRequest: measurePerformance('handleAPIRequest', handleAPIRequest),
  handleImageRequest: measurePerformance('handleImageRequest', handleImageRequest),
  handleNavigation: measurePerformance('handleNavigation', handleNavigation)
};

console.log('[SW] Service Worker v2.0.0 loaded successfully');
