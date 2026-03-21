// ── Revenda Pro — Service Worker ──────────────────────────────
var CACHE_NAME = 'revenda-pro-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── INSTALL — cacheia os arquivos essenciais ──────────────────
self.addEventListener('install', function(e) {
  console.log('[SW] Instalando...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Cache aberto');
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE — limpa caches antigos ──────────────────────────
self.addEventListener('activate', function(e) {
  console.log('[SW] Ativando...');
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH — cache first, network fallback ────────────────────
self.addEventListener('fetch', function(e) {
  // Ignora requisições não GET
  if (e.request.method !== 'GET') return;

  // Ignora requisições externas (APIs, CDNs)
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      // Busca na rede em paralelo para atualizar o cache
      var networkFetch = fetch(e.request).then(function(response) {
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Sem rede e sem cache — retorna index.html offline
        return caches.match('./index.html');
      });

      // Retorna cache imediatamente se disponível, senão aguarda rede
      return cached || networkFetch;
    })
  );
});

// ── PUSH NOTIFICATIONS (futuro) ──────────────────────────────
self.addEventListener('push', function(e) {
  if (!e.data) return;
  var data = e.data.json();
  self.registration.showNotification(data.title || 'Revenda Pro', {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    vibrate: [200, 100, 200]
  });
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.openWindow('./')
  );
});
