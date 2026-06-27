// sw.js — offline-first service worker for บัญชีนวล
// Strategy: cache-first for the app shell/static; network-only (never cache) for /api.
const VERSION = 'mn-v1';
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
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;                  // mutations pass through
  if(url.pathname.includes('/api/')) return;              // never cache API (sync data)
  if(url.origin !== location.origin && !url.host.includes('fonts.g')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if(res && res.status===200 && (url.origin===location.origin || url.host.includes('fonts.g'))){
          const clone = res.clone(); caches.open(VERSION).then(c=>c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached || caches.match('./index.html'));
      return cached || net;
    })
  );
});
