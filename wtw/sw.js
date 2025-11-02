const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `wtw-static-${CACHE_VERSION}`;
const TMDB_IMAGE_CACHE = `wtw-tmdb-images-${CACHE_VERSION}`;
const HOT_JSON_CACHE = `wtw-hot-json-${CACHE_VERSION}`;
const CACHE_TIMESTAMP_HEADER = 'x-sw-cache-timestamp';
const IMAGE_CACHE_LIMIT = 80;
const IMAGE_CACHE_TTL = 48 * 60 * 60 * 1000; // 48 horas

const STATIC_ASSET_PATHS = [
  'css/style.css',
  'css/search-results.css',
  'css/providers.css',
  'css/movie.css',
  'css/profile.css',
  'js/script.js',
  'js/search-results.js',
  'js/providers.js',
  'js/filme.js',
  'js/person.js',
  'js/profile.js',
  'js/surpreenda.js',
  'js/utils.js',
  'imagens/icon-cast.png',
  'imagens/favicon-wtw.png',
  'imagens/Where-toWatch.png',
];

const STATIC_ASSET_URLS = new Set(
  STATIC_ASSET_PATHS.map((path) => new URL(path, self.registration.scope).href)
);

const KNOWN_CACHES = new Set([STATIC_CACHE, TMDB_IMAGE_CACHE, HOT_JSON_CACHE]);

async function precacheStaticAssets() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(
    Array.from(STATIC_ASSET_URLS).map(async (assetUrl) => {
      try {
        const request = new Request(assetUrl, { cache: 'no-cache' });
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
        }
      } catch (error) {
        console.warn('[ServiceWorker] Falha ao pré-carregar ativo estático:', assetUrl, error);
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheStaticAssets());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (!KNOWN_CACHES.has(cacheName)) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        }),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(request) {
  try {
    const url = new URL(request.url);
    return STATIC_ASSET_URLS.has(url.href);
  } catch (error) {
    return false;
  }
}

function isTmdbImageRequest(request) {
  try {
    const url = new URL(request.url);
    return request.destination === 'image' && /\.tmdb\.org$/i.test(url.hostname);
  } catch (error) {
    return false;
  }
}

function isHotJsonRequest(request) {
  try {
    const url = new URL(request.url);
    if (url.hostname !== 'api.themoviedb.org') {
      return false;
    }
    if (!/\/trending\//.test(url.pathname)) {
      return false;
    }
    const acceptHeader = request.headers.get('accept') || '';
    return acceptHeader.includes('application/json');
  } catch (error) {
    return false;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheResponseWithTimestamp(cache, request, response) {
  const headers = new Headers(response.headers);
  headers.set(CACHE_TIMESTAMP_HEADER, Date.now().toString());
  const body = await response.blob();
  const timestampedResponse = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(request, timestampedResponse);
}

async function trimCache(cache, maxItems) {
  const keys = await cache.keys();
  if (keys.length <= maxItems) {
    return;
  }
  const excess = keys.length - maxItems;
  const removals = keys.slice(0, excess);
  await Promise.all(removals.map((request) => cache.delete(request)));
}

async function handleTmdbImage(request) {
  const cache = await caches.open(TMDB_IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    const timestamp = Number(cached.headers.get(CACHE_TIMESTAMP_HEADER) || '0');
    if (!timestamp || Date.now() - timestamp > IMAGE_CACHE_TTL) {
      // Revalidar conteúdo expirado abaixo.
    } else {
      return cached;
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await cacheResponseWithTimestamp(cache, request, networkResponse.clone());
      await trimCache(cache, IMAGE_CACHE_LIMIT);
      return networkResponse;
    }
    if (cached) {
      return cached;
    }
    return networkResponse;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function handleHotJson(event, request) {
  const cache = await caches.open(HOT_JSON_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.warn('[ServiceWorker] Falha ao buscar JSON quente:', error);
      return null;
    });

  if (cached) {
    event.waitUntil(networkPromise);
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response(JSON.stringify({ error: 'offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isTmdbImageRequest(request)) {
    event.respondWith(handleTmdbImage(request));
    return;
  }

  if (isHotJsonRequest(request)) {
    event.respondWith(handleHotJson(event, request));
  }
});
