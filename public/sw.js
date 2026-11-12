/* HemoDinks service worker (#206).
 * Caches ONLY static, content-hashed build assets (/assets/*) whose response really is a script,
 * stylesheet, image or font. Never caches API responses, HTML (index/navigations, or an SPA fallback
 * served for a missing asset), icons, tutorials, other origins, requests with a query string, non-GET
 * requests or responses marked no-store/private: no patient, session or clinic data.
 * Every other request goes to the network exactly as without a service worker.
 */
const CACHE_PREFIX = 'hemodinks-static-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const MAX_ENTRIES = 80;
const CACHEABLE_PATH = /^\/assets\/[^/]+$/;
const CACHEABLE_TYPE = /^(?:text\/css|(?:text|application)\/javascript|image\/(?!svg)[\w.+-]+|font\/[\w.+-]+)\s*(?:;|$)/i;

function isCacheableRequest(request) {
  if (request.method !== 'GET' || request.mode === 'navigate') return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin && !url.search && CACHEABLE_PATH.test(url.pathname);
}

function isCacheableResponse(response) {
  return response.ok
    && response.type === 'basic'
    && CACHEABLE_TYPE.test(response.headers.get('Content-Type') || '')
    && !/no-store|private/i.test(response.headers.get('Cache-Control') || '');
}

async function trimCache(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((key) => cache.delete(key)));
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    await cache.put(request, response.clone());
    await trimCache(cache);
  }
  return response;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (!isCacheableRequest(event.request)) return;
  event.respondWith(cacheFirst(event.request));
});
