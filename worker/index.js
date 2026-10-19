// Bankoverzicht — hulpvraag/feedback ontvangen en per e-mail doorsturen (Cloudflare Worker).
// De app (React) stuurt een POST naar /api/feedback op dezelfde hostnaam als de app. Die hostnaam staat achter
// Cloudflare Access, dus alleen ingelogde gebruikers komen hier. Access zet hun e-mailadres in de header
// "Cf-Access-Authenticated-User-Email"; dat gebruiken we als antwoordadres.
//
// Instellingen (zie wrangler.jsonc): binding EMAIL (send_email), variabelen FEEDBACK_TO en FEEDBACK_FROM.

import { bankRoute } from "./bank.js";
import { opLijst, rechtenVan, beheerRoute, aanmeldRoute, aanmeldPagina, heeftToegang, toegangVerplicht, telAanvragen } from "./rechten.js";

const MAX = { naam: 100, onderwerp: 150, bericht: 5000 };
const SOORTEN = ["Hulpvraag", "Feedback"];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const schoon = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// release32V0 — leest (zonder te valideren, alleen om te tonen) de tijden uit het Access-inlogbewijs: de header
// Cf-Access-Jwt-Assertion en, ter vergelijking, het cookie CF_Authorization. Het bewijs zelf wordt niet teruggegeven.
function leesJwt(token) {
  try {
    const deel = String(token || "").split(".")[1];
    if (!deel) return null;
    const b64 = deel.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((deel.length + 3) % 4);
    return JSON.parse(atob(b64));
  } catch { return null; }
}
const nlTijd = (sec) => (sec ? new Date(sec * 1000).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }) : "—");
const duur = (a, b) => {
  if (!a || !b) return "—";
  const min = Math.max(0, Math.round((b - a) / 60));
  return `${Math.floor(min / 60)} uur ${min % 60} min`;
};
function samenvatting(p) {
  if (!p) return null;
  const nu = Math.floor(Date.now() / 1000);
  return {
    type: p.type ?? null,
    uitgegeven: nlTijd(p.iat), verloopt: nlTijd(p.exp), geldigheid: duur(p.iat, p.exp), nogGeldig: duur(nu, p.exp),
    iat: p.iat ?? null, exp: p.exp ?? null,
  };
}
function sessieInfo(request, url) {
  const header = samenvatting(leesJwt(request.headers.get("Cf-Access-Jwt-Assertion")));
  const cookie = (request.headers.get("Cookie") || "").split(/;\s*/).find((c) => c.startsWith("CF_Authorization="));
  const uitCookie = samenvatting(leesJwt(cookie ? cookie.slice("CF_Authorization=".length) : ""));
  const data = { nu: nlTijd(Math.floor(Date.now() / 1000)), email: request.headers.get("Cf-Access-Authenticated-User-Email") || null, header, cookie: uitCookie };
  if (url.searchParams.has("json")) return json(data);
  const blok = (titel, x) => `<h3>${titel}</h3>${x ? `<table>${[["Soort", x.type], ["Uitgegeven", x.uitgegeven], ["Verloopt", x.verloopt], ["Geldigheid", x.geldigheid], ["Nog geldig", x.nogGeldig]].map(([k, v]) => `<tr><td>${k}</td><td><b>${esc(v ?? "—")}</b></td></tr>`).join("")}</table>` : "<p>Niet gevonden.</p>"}`;
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sessietest</title>
<style>body{font-family:system-ui,sans-serif;margin:20px;color:#0f172a}td{padding:4px 12px 4px 0}h3{margin:18px 0 6px}p{color:#475569}</style></head><body>
<h2>Sessietest Bankoverzicht</h2><p>Nu: <b>${esc(data.nu)}</b>${data.email ? ` · ingelogd als ${esc(data.email)}` : ""}</p>
${blok("Inlogbewijs dat de app meekrijgt (header)", header)}${blok("Inlogcookie (ter vergelijking)", uitCookie)}
<p>Open deze pagina een paar keer, verspreid over een uur. Blijft "Verloopt" gelijk en is "Geldigheid" ongeveer de sessieduur die in Cloudflare is ingesteld, dan is dit tijdstip bruikbaar voor een waarschuwing.</p>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

// nieuw-V2R0 — mag de ingelogde gebruiker de uitgebreide weergave gebruiken? Sinds nieuw-V4R3: Secret "AccessAll",
// Secret "BEHEERDERS" en de D1-tabel "rechten" (zie rechten.js). Geen recht of niet ingelogd = alleen Eenvoudig.
export const magUitgebreid = opLijst; // nieuw-V4R3 — verhuisd naar rechten.js (daar ook BEHEERDERS en de D1-tabel)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // release32V0 — test: wat zegt het Access-inlogbewijs over inlogtijd en verlooptijd? (zie sessieInfo)
    if (url.pathname === "/api/sessie") return sessieInfo(request, url);
    if (url.pathname === "/api/rol") {
      const email = request.headers.get("Cf-Access-Authenticated-User-Email");
      const r = await rechtenVan(email, env);
      const aanvragen = r.beheerder ? await telAanvragen(env) : 0;
      // lijst = is er een bron van rechten (AccessAll of de database); de inhoud wordt niet teruggegeven.
      return json({ ok: true, email: email || null, lijst: !!String(env.AccessAll || "").trim() || !!env.DB, db: !!env.DB, slot: toegangVerplicht(env), aanvragen, ...r });
    }
    // nieuw-V4R5 — aanmelden voor een abonnement (Eenvoudig, Uitgebreid, met bankkoppeling)
    if (url.pathname === "/api/aanmelden") {
      return aanmeldRoute(request, env, url, request.headers.get("Cf-Access-Authenticated-User-Email"), ctx);
    }
    // nieuw-V4R5 — toegangsslot: met TOEGANG_VERPLICHT = "ja" krijgt alleen wie toegang heeft de app; de rest de
    // aanmeldpagina. Vereist "run_worker_first": true in wrangler.jsonc, anders komen de app-bestanden niet langs hier.
    if (toegangVerplicht(env) && !url.pathname.startsWith("/api/")) {
      const email = request.headers.get("Cf-Access-Authenticated-User-Email");
      const r = await heeftToegang(email, env);
      if (!r.toegang) return aanmeldPagina(email, r);
    }
    // nieuw-V4R3 — beheerscherm "Gebruikers en rechten" (alleen Secret BEHEERDERS)
    if (url.pathname.startsWith("/api/beheer/")) {
      return beheerRoute(request, env, url, request.headers.get("Cf-Access-Authenticated-User-Email"));
    }
    // nieuw-V3R8 — rechtstreekse bankkoppeling (zie bank.js). Sinds nieuw-V4R3 alleen met het recht "koppelen".
    if (url.pathname.startsWith("/api/bank/")) {
      if (!env.EB_DEV_EMAIL && !(await rechtenVan(request.headers.get("Cf-Access-Authenticated-User-Email"), env)).koppelen) {
        return json({ ok: false, fout: "Bankkoppeling staat niet aan voor jouw account" }, 403);
      }
      return bankRoute(request, env, url);
    }
    // Alles behalve /api/feedback is de app zelf (statische bestanden): doorgeven aan de assets-binding.
    if (url.pathname !== "/api/feedback") return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
    if (request.method !== "POST") return json({ ok: false, fout: "Alleen POST" }, 405);

    const email = request.headers.get("Cf-Access-Authenticated-User-Email");
    if (!email) return json({ ok: false, fout: "Niet ingelogd" }, 401);

    let body;
    try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }

    const soort = SOORTEN.includes(body?.soort) ? body.soort : "Hulpvraag";
    const naam = schoon(body?.naam, MAX.naam);
    const onderwerp = schoon(body?.onderwerp, MAX.onderwerp);
    const bericht = schoon(body?.bericht, MAX.bericht);
    const release = schoon(body?.release, 40);
    if (!bericht) return json({ ok: false, fout: "Bericht is leeg" }, 400);

    const subject = `[Bankoverzicht] ${soort}${onderwerp ? `: ${onderwerp.replace(/[\r\n]+/g, " ")}` : ""}`;
    const regels = [`Van: ${naam || "(geen naam)"} <${email}>`, `App: ${release || "onbekend"}`];
    const text = `${bericht}\n\n—\n${regels.join("\n")}`;
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(bericht)}</div><hr><p style="font-family:Arial,sans-serif;font-size:12px;color:#555">${regels.map(esc).join("<br>")}</p>`;

    const bericht_ = { to: env.FEEDBACK_TO, from: env.FEEDBACK_FROM, subject, text, html };
    try {
      if (!env.EMAIL) throw Object.assign(new Error("Binding EMAIL ontbreekt in deze deployment"), { code: "NO_BINDING" });
      try {
        await env.EMAIL.send({ ...bericht_, replyTo: email });
      } catch {
        // Niet elke versie van de binding kent replyTo: probeer zonder (het antwoordadres staat in de tekst).
        await env.EMAIL.send(bericht_);
      }
    } catch (e) {
      // Technische melding meegeven (code + tekst van Cloudflare), zodat de oorzaak in de app zichtbaar is.
      const detail = [e?.code, e?.message].filter(Boolean).join(" — ").slice(0, 300);
      return json({ ok: false, fout: "Versturen mislukt", detail }, 502);
    }
    return json({ ok: true });
  },
};
