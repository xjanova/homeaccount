// sw.js — offline-first service worker for บัญชีนวล
// Freshness strategy (works even behind Cloudflare's 4h Browser-Cache-TTL):
//  - sw.js itself is served no-store (CF BYPASS) → browsers always pick up new SW versions.
//  - On install we fetch the shell with {cache:'reload'} → bypasses the HTTP cache and forces
//    Cloudflare to revalidate, so a new SW version always caches FRESH code.
//  - fetch() = stale-while-revalidate, and the background revalidation uses {cache:'no-cache'}
//    so each asset self-heals to the latest on the next visit. SW-controlled pages read from
//    Cache Storage (not the browser HTTP cache), so stale CF browser-TTL never reaches the app.
//  - /api is never cached (live sync data).
const VERSION = 'mn-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/main.js', './assets/js/state.js', './assets/js/db.js', './assets/js/api.js',
  './assets/js/sync.js', './assets/js/selectors.js', './assets/js/charts.js', './assets/js/ui.js',
  './assets/js/format.js', './assets/js/icons.js', './assets/js/data.js',
  './assets/js/views/dashboard.js', './assets/js/views/transactions.js', './assets/js/views/calendar.js',
  './assets/js/views/budgets.js', './assets/js/views/categories.js', './assets/js/views/accounts.js',
  './assets/js/views/reports.js', './assets/js/views/settings.js', './assets/js/views/pricing.js',
  './assets/js/views/billing.js', './assets/js/views/team.js', './assets/js/views/landing.js',
  './assets/js/views/login.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // fetch fresh (bypass HTTP cache → force CF revalidate), tolerate individual failures
    await Promise.all(SHELL.map(async url => {
      try { const res = await fetch(new Request(url, { cache: 'reload' })); if(res && res.ok) await c.put(url, res.clone()); } catch(_){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;                 // mutations pass through
  if(url.pathname.includes('/api/')) return;             // never cache live sync data
  const sameOrigin = url.origin === location.origin;
  const isFont = url.host.includes('fonts.g');
  if(!sameOrigin && !isFont) return;

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(e.request);
    // background revalidate, bypassing the browser HTTP cache so CF can't serve stale
    const network = fetch(new Request(e.request, sameOrigin ? { cache: 'no-cache' } : {}))
      .then(res => { if(res && res.status === 200) cache.put(e.request, res.clone()); return res; })
      .catch(() => cached || cache.match('./index.html'));
    return cached || network;                            // stale-while-revalidate
  })());
});
