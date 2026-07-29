const CACHE = "dnd-companion-v3";
const SHELL = ["./", "./index.html", "./app.js", "./data.js", "./styles.css", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Strategia network-first: prova sempre a scaricare la versione fresca da internet,
// e usa la cache solo come riserva se il dispositivo è offline.
// Così quando aggiorni i file su GitHub, l'app si aggiorna da sola al prossimo caricamento.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin.includes("anthropic.com") || url.origin.includes("openai.com") || url.origin.includes("googleapis.com") || url.origin.includes("puter.com")) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
