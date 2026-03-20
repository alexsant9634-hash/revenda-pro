/* ============================================================
   Revenda Pro — Service Worker
   Versão: 1.0
   Estratégia: Cache First para assets, Network First para HTML
   ============================================================ */

var CACHE_NAME = 'revenda-pro-v1';

/* Arquivos que serão cacheados na instalação */
var ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap'
];

/* ── INSTALL ── Faz cache dos assets essenciais */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* ── ACTIVATE ── Remove caches antigos */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ── FETCH ── Estratégia: Cache First com fallback para rede */
self.addEventListener('fetch', function(e) {
  /* Ignora requisições não-GET */
  if (e.request.method !== 'GET') return;

  /* Ignora URLs de extensões do Chrome */
  if (e.request.url.startsWith('chrome-extension://')) return;

  e.respondWith(
    caches.match(e.request).then(function(cachedResponse) {
      /* Encontrou no cache — retorna imediatamente */
      if (cachedResponse) {
        /* Em background, tenta atualizar o cache */
        fetch(e.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, networkResponse);
            });
          }
        }).catch(function() {});
        return cachedResponse;
      }

      /* Não está no cache — busca na rede */
      return fetch(e.request).then(function(networkResponse) {
        /* Só cacheia respostas válidas */
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        /* Salva no cache para próxima vez */
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch(function() {
        /* Sem rede e sem cache — retorna o index.html como fallback */
        return caches.match('./index.html');
      });
    })
  );
});
