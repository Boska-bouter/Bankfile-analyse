// beide-V7R9 — noodmodus (wens Boska 27-10): de app blijft te openen als Cloudflare (de server) niet bereikbaar is.
// Dit is de service worker. Vite (vite.config.js) schrijft hem bij het bouwen naar dist/sw.js en vult daarbij
// BUILD_ID en de lijst met app-bestanden in; dit bestand zelf wordt nergens geïmporteerd.
//
// Werking:
// - Installeren: alle app-bestanden (assets) en de startpagina komen in de cache van het apparaat.
// - Starten van de app ("/"): eerst de server. Antwoordt die niet (geen verbinding, na 10 seconden nog niets, of een
//   foutpagina 5xx van Cloudflare), dan de bewaarde app — maar alleen als iemand de afgelopen NOOD_DAGEN dagen nog
//   gewoon via de server is binnengekomen. Wie is uitgelogd of wiens sessie is verlopen, krijgt de bewaarde app niet.
// - Andere pagina's van de server (aanmelden, inloggen, beheer) zonder server: een korte uitleg met een knop terug.
// - /api/… gaat altijd rechtstreeks naar de server; de app vangt zelf op dat die niet antwoordt (dossier/useNoodmodus.js).
const BUILD_ID = "__BUILD_ID__";
const BESTANDEN = __BESTANDEN__;
const CACHE = `bankoverzicht-app-${BUILD_ID}`;
const META = "bankoverzicht-noodmodus";
const NOOD_DAGEN = 7;
const WACHT_MS = 10_000;

const isApp = (html) => typeof html === "string" && html.includes('id="root"');

async function zetLaatsteBezoek(t) {
  const c = await caches.open(META);
  await c.put("/__laatste-bezoek", new Response(String(t)));
}
async function laatsteBezoek() {
  const r = await (await caches.open(META)).match("/__laatste-bezoek");
  return r ? Number(await r.text()) || 0 : 0;
}
async function vergeet() {
  await caches.delete(META);
  for (const k of await caches.keys()) if (k.startsWith("bankoverzicht-app-")) await caches.delete(k);
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(BESTANDEN.map((b) => `/${b}`)).catch(() => { /* een ontbrekend bestand: dan later bij gebruik */ });
    try {
      const r = await fetch("/", { credentials: "same-origin", cache: "no-store" });
      const html = r.ok && !r.redirected ? await r.clone().text() : null;
      if (isApp(html)) { await c.put("/", r); await zetLaatsteBezoek(Date.now()); }
    } catch { /* geen verbinding: bij het volgende bezoek */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("bankoverzicht-app-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => {
  if (e.data === "vergeet") e.waitUntil(vergeet()); // bij uitloggen (dossier/useRol.js)
});

function metTijdslimiet(p) {
  return Promise.race([p, new Promise((_, nee) => setTimeout(() => nee(new Error("te traag")), WACHT_MS))]);
}

const pagina = (titel, tekst, knop) => new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${titel}</title>
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f5f5f4;color:#1e293b;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
main{max-width:460px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px}h1{font-size:20px;margin:0 0 8px}p{line-height:1.5;color:#475569}
a{display:inline-block;margin-top:8px;background:#0f766e;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600}</style></head>
<body><main><h1>${titel}</h1><p>${tekst}</p>${knop ? `<a href="/">${knop}</a>` : ""}</main></body></html>`,
{ status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

async function startpagina(request) {
  try {
    const r = await metTijdslimiet(fetch(request));
    if (r.status < 500) {
      // Gewoon binnengekomen? Dan de startpagina bewaren. Doorgestuurd naar inloggen of aanmelden = niet (meer)
      // ingelogd of geen toegang: dan ook de bewaarde app vergeten.
      const html = r.ok && !r.redirected ? await r.clone().text().catch(() => null) : null;
      if (isApp(html)) {
        const c = await caches.open(CACHE);
        await c.put("/", r.clone());
        await zetLaatsteBezoek(Date.now());
      } else if (r.redirected || r.type === "opaqueredirect" || r.ok) {
        await vergeet();
      }
      return r;
    }
  } catch { /* geen verbinding of te traag */ }
  const bewaard = await caches.match("/", { cacheName: CACHE }) || await caches.match("/");
  const recent = Date.now() - (await laatsteBezoek()) < NOOD_DAGEN * 86_400_000;
  if (bewaard && recent) return bewaard;
  return pagina("Bankoverzicht is even niet bereikbaar",
    "De server is op dit moment niet bereikbaar. Probeer het over een paar minuten opnieuw. Dossiers staan als bestand op dit apparaat en gaan niet verloren.",
    "Opnieuw proberen");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    if (url.pathname === "/" || url.pathname === "/index.html") { e.respondWith(startpagina(req)); return; }
    // Andere pagina's van de server (aanmelden, inloggen, bank): gewoon ophalen, zonder server een uitleg.
    e.respondWith(fetch(req).then((r) => (r.status >= 500 ? pagina("Even niet beschikbaar",
      "Deze pagina komt van de server, en die is op dit moment niet bereikbaar. In de app zelf kan gewoon verder worden gewerkt met dossiers op dit apparaat.",
      "Terug naar de app") : r)).catch(() => pagina("Even niet beschikbaar",
      "Deze pagina komt van de server, en die is op dit moment niet bereikbaar. In de app zelf kan gewoon verder worden gewerkt met dossiers op dit apparaat.",
      "Terug naar de app")));
    return;
  }
  // App-bestanden: eerst de cache (de namen bevatten een hash, ze veranderen nooit), anders ophalen en bewaren.
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(caches.match(req).then((bewaard) => bewaard || fetch(req).then(async (r) => {
      if (r.ok) (await caches.open(CACHE)).put(req, r.clone());
      return r;
    })));
  }
});
