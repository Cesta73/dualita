// Service worker di Dualità: rende l'app installabile e veloce da riaprire.
// - Pagine: prima la rete (così si ha sempre l'ultima versione), se manca la rete la copia salvata.
// - File dell'app (JS, CSS, icone): prima la copia salvata, poi la rete; i nomi dei file cambiano a ogni versione.
// - Supabase (dati e tiri): mai salvati qui, servono sempre in tempo reale.
const CACHE = 'dualita-v1';
const BASE = new URL('./', self.location).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([BASE, `${BASE}manifest.webmanifest`, `${BASE}favicon.svg`, `${BASE}icona-192.png`])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(BASE, copia)); return res; })
        .catch(() => caches.match(BASE)),
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((hit) => hit ?? fetch(req).then((res) => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
      return res;
    })),
  );
});
