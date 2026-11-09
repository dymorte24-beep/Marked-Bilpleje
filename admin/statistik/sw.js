// Minimal service worker, så statistik-siden kan installeres som app.
// Den gemmer bevidst intet: tallene skal altid være friske fra databasen.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
