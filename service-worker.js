/**
 * Service Worker for Bluebook PWA
 * Pure Cache API - no Workbox dependency
 */

const CACHE_NAME = 'bluebook-v10';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './bluebook-16x16.1121fe81.png',
  './bluebook-32x32.cb8ed68a.png',
  './bluebook-192x192.5d752eee.png',
  './bluebook-512x512.0148e2a2.png',
  './cd173ebc1e719033.svg',
  './f83137da2104c653.svg',
  './1e8ffee1ac6ff755.svg',
  './3ebda4955e48bdfa.svg',
  './45f9e80d892a8583.svg',
  './7616ebc5551f295d.svg',
  './7c5454f13e7d157c.svg',
  './802e74d124150325.svg',
  './89da239509290a5b.svg',
  './a059f9a86ee9f66a.svg',
  './c3ee5d4d5a1f2c34.svg',
  './cba6998ee1bf9b2a.svg',
  './d65cbe15e1e0a517.svg',
  './f8e6109dd28f690d.svg',
  // Newly fetched assets (2026-10-21)
  './004b4ded0631369d.svg',
  './7f78bf74a8d25e47.jpg',
  './d4c93f0b28f86eb0.svg',
  './c1411e5c1d7fe13b.svg',
  './7bd760a299d920bf.svg',
  './0f2e210813afd2c7.svg',
  './735f43f66779a35f.svg',
  './cd9bdefcb0254309.svg',
  './5f09b2f31c83ace5.svg',
  './6974139c0f180a95.svg',
  './7270cbfed3ff9d91.svg',
  './1063fd5a65908453.svg',
  './e89c482bb3c378ae.woff2',
  // Additional fonts from vendor-public.js
  './11e05b7d957a8fa8.woff2',
  './1fef99d151543045.woff2',
  './2a63183e6dff7d00.woff2',
  './3443d6ceebc5f7ae.woff',
  './35bf7b51c120b339.ttf',
  './390061c79a976b33.woff2',
  './45af087b9f656297.woff',
  './4e7449338f3a9fee.woff2',
  './78caebf195bb74dd.woff2',
  './86fc2559ff73eac5.woff2',
  './97b722c1a6a9477b.ttf',
  './a8535ca1f2f140ec.woff',
  './b4556791e2a9e005.woff2',
  './b905938f03330d83.woff2',
  './e6298ae4e67c21f0.woff2',
  './f8693cca22ae31bc.woff2',
  './f8d92427fd4ddeb5.ttf',
  './mspaint-clone.js',
  // Newly fetched SVG assets (2026-10-21 continued)
  './715fcd2e39ff411d.svg',
  './11055a0648d683a6.svg',
  './a792eab23094eeec.svg',
  './7cfa9270fd0b7684.svg',
  './bc17356e5dc6d30c.svg',
  // Font file
  './fonts/NotoSerif-Regular.woff2',
  // Response/telemetry workers
  './responses-worker.4f27696af686b45e.js',
  './telemetry-worker.4f27696af686b45e.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Cache-first strategy for static assets
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first for HTML and API requests
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// Background sync for exam data
self.addEventListener('sync', (event) => {
  if (event.tag === 'exam-sync') {
    event.waitUntil(syncExamData());
  }
});

async function syncExamData() {
  // Placeholder for exam data synchronization
  console.log('[SW] Background sync triggered');
}

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});