// nieuw-V3R8 — rechtstreekse bankkoppeling via Enable Banking (PSD2-rekeninginformatie, alleen lezen).
// De Worker is een dunne doorgeefroute: hij ondertekent de verzoeken met de geheime sleutel van de app en geeft de
// antwoorden door aan de browser. Er wordt niets opgeslagen. De sessie-id en de rekening-id's van Enable Banking
// (waarmee je bij de gegevens kunt) gaan nooit leesbaar naar de browser: ze zitten versleuteld in een "koppeltoken",
// gebonden aan het e-mailadres waarmee iemand via Cloudflare Access is ingelogd.
//
// Secrets (Workers & Pages → <worker> → Settings → Variables and Secrets, of `npx wrangler secret put <naam>`):
//   EB_APP_ID         Application ID uit het Enable Banking Control Panel
//   EB_PRIVATE_KEY    inhoud van het .pem-bestand dat bij het registreren van de app is gedownload
//   EB_TOKEN_GEHEIM   willekeurige tekst van minstens 32 tekens (versleutelt de koppeltokens)
// Optioneel (alleen lokaal testen met `wrangler dev`, zonder Access): variabele EB_DEV_EMAIL.

import { pontoRoute } from "./ponto.js";

const EB_API = "https://api.enablebanking.com";
const MAX_PAGINAS = 40; // Free-plan: max. 50 subrequests per verzoek
const MAX_GELDIG_SEC = 180 * 24 * 3600;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const vanB64url = (s) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

// ---- JWT (RS256) voor Enable Banking ----

// PKCS#1 ("BEGIN RSA PRIVATE KEY") omzetten naar PKCS#8, want WebCrypto leest alleen PKCS#8.
function derLengte(n) {
  if (n < 0x80) return [n];
  const b = [];
  while (n > 0) { b.unshift(n & 0xff); n >>= 8; }
  return [0x80 | b.length, ...b];
}
function pkcs1NaarPkcs8(pkcs1) {
  const algId = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = [0x04, ...derLengte(pkcs1.length), ...pkcs1];
  const inhoud = [0x02, 0x01, 0x00, ...algId, ...octet];
  return new Uint8Array([0x30, ...derLengte(inhoud.length), ...inhoud]);
}
function pemNaarDer(pem) {
  const tekst = String(pem || "").replace(/\\n/g, "\n");
  const pkcs1 = /BEGIN RSA PRIVATE KEY/.test(tekst);
  const b64 = tekst.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return pkcs1 ? pkcs1NaarPkcs8(der) : der;
}

let sleutelCache = null; // per isolate: { pem, key }
let jwtCache = null; // { appId, exp, token }
async function maakJwt(env) {
  const nu = Math.floor(Date.now() / 1000);
  if (jwtCache && jwtCache.appId === env.EB_APP_ID && jwtCache.exp - 300 > nu) return jwtCache.token;
  if (!sleutelCache || sleutelCache.pem !== env.EB_PRIVATE_KEY) {
    const key = await crypto.subtle.importKey("pkcs8", pemNaarDer(env.EB_PRIVATE_KEY), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    sleutelCache = { pem: env.EB_PRIVATE_KEY, key };
  }
  const exp = nu + 3600;
  const kop = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "RS256", kid: env.EB_APP_ID })));
  const body = b64url(enc.encode(JSON.stringify({ iss: "enablebanking.com", aud: "api.enablebanking.com", iat: nu, exp })));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", sleutelCache.key, enc.encode(`${kop}.${body}`));
  const token = `${kop}.${body}.${b64url(sig)}`;
  jwtCache = { appId: env.EB_APP_ID, exp, token };
  return token;
}

async function eb(env, pad, { method = "GET", body } = {}) {
  const r = await fetch(`${EB_API}${pad}`, {
    method,
    headers: { authorization: `Bearer ${await maakJwt(env)}`, "content-type": "application/json", accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const tekst = await r.text();
  let data = null;
  try { data = tekst ? JSON.parse(tekst) : null; } catch { data = { message: tekst.slice(0, 300) }; }
  if (!r.ok) {
    const fout = Object.assign(new Error(data?.message || data?.detail || `Enable Banking gaf status ${r.status}`), { status: r.status, eb: data });
    throw fout;
  }
  return data;
}

// ---- Koppeltoken: AES-GCM, sleutel afgeleid van EB_TOKEN_GEHEIM, e-mailadres als "additional data" ----

let tokenSleutel = null; // { geheim, key }
async function tokenKey(env) {
  if (tokenSleutel?.geheim === env.EB_TOKEN_GEHEIM) return tokenSleutel.key;
  const ruw = await crypto.subtle.digest("SHA-256", enc.encode(`bankoverzicht-koppeltoken|${env.EB_TOKEN_GEHEIM}`));
  const key = await crypto.subtle.importKey("raw", ruw, "AES-GCM", false, ["encrypt", "decrypt"]);
  tokenSleutel = { geheim: env.EB_TOKEN_GEHEIM, key };
  return key;
}
async function versleutel(env, email, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(email) }, await tokenKey(env), enc.encode(JSON.stringify(obj)));
  return `${b64url(iv)}.${b64url(ct)}`;
}
async function ontsleutel(env, email, token) {
  try {
    const [iv, ct] = String(token || "").split(".");
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: vanB64url(iv), additionalData: enc.encode(email) }, await tokenKey(env), vanB64url(ct));
    return JSON.parse(dec.decode(pt));
  } catch {
    return null;
  }
}

// ---- Routes ----

const isDatum = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

async function leesBody(request) {
  try { return await request.json(); } catch { return {}; }
}

// beide-V3R4 — afronden van de koppeling op de server. Op een iPad/iPhone met de app als icoon op het beginscherm opent
// de bank (of Ponto) in Safari, en daar komt ook de terugkeer (/bank/terug) binnen: zonder het open dossier, zonder de
// gegevens uit het koppelvenster en vaak zonder inlog. Daarom bewaart /start de "state" met het e-mailadres in D1
// (30 minuten), wisselt de Worker bij /bank/terug zelf de code in, en zet het resultaat (het versleutelde koppeltoken en
// de rekeningen, 2 uur) klaar voor dat e-mailadres. De app haalt het op met /api/bank/wachtend zodra hij weer in beeld is.
// beide-V3R6 — ophalen wist het resultaat niet meer: op iPad kan een ander venster (het browservenster van Ponto) het
// eerder ophalen dan de app zelf. De app slaat dubbele koppelingen over (zelfde id). Het resultaat verdwijnt bij het
// eerste gebruik van de koppeling (/transacties of /verwijder; Ponto vervangt de sleutel dan) of na 2 uur.
const BANK_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS bank_start (state TEXT PRIMARY KEY, email TEXT NOT NULL, bank TEXT, psu TEXT, pkce TEXT, verloopt INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS bank_wachtend (id TEXT PRIMARY KEY, email TEXT NOT NULL, data TEXT NOT NULL, verloopt INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS bank_log (tijd INTEGER NOT NULL, email TEXT, tekst TEXT NOT NULL)",
];
// beide-V3R7 — verloop van een koppeling (zonder sleutels of codes), zodat het koppelvenster kan laten zien waar het
// stopt. Wordt na een dag weggegooid.
async function bankLog(env, email, tekst, request) {
  try {
    await zorgVoorBankTabellen(env.DB);
    const ua = String(request?.headers.get("user-agent") || "");
    // Op iPad/iPhone mist "Safari/" in de user-agent van een app op het beginscherm; Safari en het Ponto-venster hebben het wel.
    const waar = !request ? "" : /Mobile\//.test(ua) && !/Safari\//.test(ua) ? " (app op beginscherm)" : " (browser)";
    await env.DB.prepare("INSERT INTO bank_log (tijd, email, tekst) VALUES (?, ?, ?)").bind(Date.now(), email || null, `${tekst}${waar}`.slice(0, 300)).run();
    await env.DB.prepare("DELETE FROM bank_log WHERE tijd < ?").bind(Date.now() - 24 * 3600 * 1000).run();
  } catch { /* log is niet belangrijk */ }
}
const START_MS = 30 * 60 * 1000;
const WACHT_MS = 2 * 3600 * 1000;
const bankTabellenKlaar = new WeakSet();
async function zorgVoorBankTabellen(db) {
  if (bankTabellenKlaar.has(db)) return;
  for (const s of BANK_SCHEMA) await db.prepare(s).run();
  bankTabellenKlaar.add(db);
}

const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function terugPagina(gelukt, tekst) {
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bankkoppeling</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;background:#f8fafc;color:#0f172a}main{max-width:32rem;margin:12vh auto;padding:28px 24px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:1.3rem;margin:0 0 12px;color:${gelukt ? "#0f766e" : "#b91c1c"}}p{line-height:1.5;color:#334155}a{display:inline-block;margin-top:12px;color:#0f766e}</style></head><body><main>
<h1>${gelukt ? "Koppeling gelukt" : "Koppeling niet gelukt"}</h1><p>${escHtml(tekst)}</p>
<p>Ga terug naar de app Bankoverzicht (bijvoorbeeld via het icoon op je beginscherm). ${gelukt ? "De rekeningen verschijnen daar vanzelf in het venster van de bankkoppeling (open het zo nodig opnieuw)." : "Begin daar zo nodig opnieuw met koppelen."} Dit venster mag je sluiten.</p>
<a href="/">Of open de app in deze browser</a></main></body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}

// Terugkeer van de bank (/bank/terug?code=…&state=…), vóór de inlogcontrole. Geeft null als de state hier niet bekend
// is (geen D1, verlopen of van vóór beide-V3R4): dan rondt de app de koppeling zelf af zoals voorheen.
export async function bankTerugRoute(request, env, url) {
  const state = String(url.searchParams.get("state") || "").slice(0, 100);
  if (!env.DB || !state) return null;
  await zorgVoorBankTabellen(env.DB);
  const nu = Date.now();
  await env.DB.prepare("DELETE FROM bank_start WHERE verloopt < ?").bind(nu).run();
  // beide-V3R6 — op iPad komt dezelfde terugkeer soms twee keer binnen (eerst in het browservenster van Ponto, daarna in
  // de app). De eerste rondt af; de state blijft gemarkeerd ("klaar:") zodat de tweede gewoon naar de app gaat.
  const start = await env.DB.prepare("UPDATE bank_start SET psu = 'klaar:' || psu WHERE state = ? AND psu NOT LIKE 'klaar:%' RETURNING email, bank, psu, pkce").bind(state).first();
  const ingelogd = String(request.headers.get("Cf-Access-Authenticated-User-Email") || "").trim().toLowerCase();
  const wie = (email) => (!ingelogd ? "niet ingelogd" : ingelogd === email ? "ingelogd" : "ander adres ingelogd");
  if (!start) {
    const al = await env.DB.prepare("SELECT email FROM bank_start WHERE state = ?").bind(state).first();
    if (!al) return null;
    await bankLog(env, al.email, `Terugkeer nogmaals ontvangen, ${wie(al.email)}`, request);
    if (ingelogd && ingelogd === al.email) return new Response(null, { status: 302, headers: { Location: "/bank/terug?klaar=1", "cache-control": "no-store" } });
    return terugPagina(true, "De koppeling is al afgerond.");
  }
  start.psu = String(start.psu || "").replace(/^klaar:/, "");
  await bankLog(env, start.email, `Terugkeer van ${start.bank || "de bank"} ontvangen, ${wie(start.email)}`, request);
  const weigering = url.searchParams.get("error_description") || url.searchParams.get("error");
  let d;
  if (weigering) d = { ok: false, fout: `De bank gaf geen toestemming: ${String(weigering).slice(0, 200)}` };
  else {
    const req = new Request(`${url.origin}/api/bank/sessie`, {
      method: "POST",
      headers: { "content-type": "application/json", "Cf-Access-Authenticated-User-Email": start.email },
      body: JSON.stringify({ code: url.searchParams.get("code") || "", bank: start.bank || "", ...(start.pkce ? { pkce: start.pkce } : {}) }),
    });
    d = await (await bankRoute(req, env, new URL(req.url))).json().catch(() => ({ ok: false, fout: "Onverwacht antwoord" }));
  }
  const item = d.ok
    ? { id: crypto.randomUUID(), state, bank: d.bank || start.bank || "", psu: start.psu || "personal", token: d.token, rekeningen: d.rekeningen || [], geldigTot: d.geldigTot || null, gekoppeldOp: new Date().toISOString(), opgehaald: {} }
    : { state, fout: [d.fout, d.detail].filter(Boolean).join(" — ") || "Koppeling mislukt" };
  await bankLog(env, start.email, d.ok ? `Koppeling gemaakt (${(d.rekeningen || []).length} rekening(en))` : `Koppeling mislukt: ${item.fout}`);
  await env.DB.prepare("DELETE FROM bank_wachtend WHERE verloopt < ?").bind(nu).run();
  await env.DB.prepare("INSERT INTO bank_wachtend (id, email, data, verloopt) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), start.email, JSON.stringify(item), nu + WACHT_MS).run();
  // Zelfde browser en ingelogd als dezelfde gebruiker: meteen terug naar de app, die het resultaat ophaalt.
  if (ingelogd && ingelogd === start.email) return new Response(null, { status: 302, headers: { Location: "/bank/terug?klaar=1", "cache-control": "no-store" } });
  const n = item.rekeningen?.length || 0;
  return terugPagina(d.ok, d.ok ? `${item.bank} is gekoppeld (${n} rekening${n === 1 ? "" : "en"}).` : item.fout);
}

export async function bankRoute(request, env, url) {
  const email = (request.headers.get("Cf-Access-Authenticated-User-Email") || env.EB_DEV_EMAIL || "").trim().toLowerCase();
  if (!email) return json({ ok: false, fout: "Niet ingelogd" }, 401);
  const pad = url.pathname.replace(/^\/api\/bank/, "") || "/";

  // beide-V3R4 — koppelingen die de Worker na terugkeer van de bank heeft afgerond (zie bankTerugRoute) ophalen; ze
  // worden daarbij van de server verwijderd.
  if (pad === "/wachtend" && request.method === "GET") {
    if (!env.DB) return json({ ok: true, koppelingen: [], fouten: [] });
    await zorgVoorBankTabellen(env.DB);
    await env.DB.prepare("DELETE FROM bank_wachtend WHERE verloopt < ?").bind(Date.now()).run();
    const { results } = await env.DB.prepare("SELECT id, data FROM bank_wachtend WHERE email = ?").bind(email).all();
    // Alleen koppelingen die in deze app zijn gestart (de app stuurt zijn eigen states mee), zodat een ander venster
    // of een later geopend dossier niet per ongeluk een koppeling van iemand anders' sessie overneemt.
    const states = new Set(String(url.searchParams.get("states") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10));
    const items = (results || []).map((r) => { try { return { ...JSON.parse(r.data), wachtId: r.id }; } catch { return null; } })
      .filter((x) => x && states.has(x.state));
    // Een foutmelding hoeft maar één keer getoond te worden.
    for (const x of items.filter((i) => i.fout)) await env.DB.prepare("DELETE FROM bank_wachtend WHERE id = ?").bind(x.wachtId).run();
    const vanAnder = (results || []).length - items.length;
    if (items.length || url.searchParams.get("melden") === "1") {
      await bankLog(env, email, `App vroeg om de koppeling: ${items.length} gevonden${vanAnder ? `, ${vanAnder} van een ander venster/apparaat` : ""}${states.size ? "" : ", deze app heeft geen koppeling gestart"}`, request);
    }
    const { results: log } = await env.DB.prepare("SELECT tijd, tekst FROM bank_log WHERE email = ? AND tijd > ? ORDER BY tijd DESC LIMIT 12").bind(email, Date.now() - 2 * 3600 * 1000).all();
    return json({ ok: true, koppelingen: items.filter((x) => !x.fout).map(({ wachtId, state: _s, ...k }) => k), fouten: items.filter((x) => x.fout).map((x) => x.fout), log: (log || []).reverse() });
  }
  // beide-V3R6 — eerste gebruik van een klaargezette koppeling: het klaargezette exemplaar weghalen.
  if ((pad === "/transacties" || pad === "/verwijder") && request.method === "POST" && env.DB) {
    try {
      const t = String((await request.clone().json().catch(() => ({}))).token || "");
      if (t.length > 20) {
        await zorgVoorBankTabellen(env.DB);
        await env.DB.prepare("DELETE FROM bank_wachtend WHERE email = ? AND instr(data, ?) > 0").bind(email, t).run();
      }
    } catch { /* niet erg: vervalt na 2 uur */ }
  }

  const startBody = pad === "/start" && request.method === "POST" ? request.clone().json().catch(() => ({})) : null;
  const antwoord = await bankRouteAanbieder(request, env, url, email, pad);
  // beide-V3R4 — bij /start de state bewaren, zodat de Worker de terugkeer zelf kan afronden.
  if (startBody && antwoord.ok && env.DB) {
    try {
      const s = await antwoord.clone().json();
      const b = (await startBody) || {};
      if (s?.ok && s.state) {
        await zorgVoorBankTabellen(env.DB);
        await env.DB.prepare("DELETE FROM bank_start WHERE verloopt < ?").bind(Date.now()).run();
        await bankLog(env, email, `Koppelen gestart (${b.bank || "bank"})`, request);
        await env.DB.prepare("INSERT OR REPLACE INTO bank_start (state, email, bank, psu, pkce, verloopt) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(String(s.state).slice(0, 100), email, String(b.bank || "").slice(0, 120), b.psu === "business" ? "business" : "personal", s.pkce || null, Date.now() + START_MS).run();
      }
    } catch { /* dan rondt de app de koppeling zelf af zoals voorheen */ }
  }
  return antwoord;
}

async function bankRouteAanbieder(request, env, url, email, pad) {

  // nieuw-V5R1 — Ponto als aanbieder (BANK_AANBIEDER = "ponto"). Nieuwe koppelingen gaan dan via Ponto; bestaande
  // koppelingen blijven werken via de aanbieder waarmee ze zijn gemaakt (te zien aan het koppeltoken).
  const standaardPonto = String(env.BANK_AANBIEDER || "").trim().toLowerCase() === "ponto";
  const viaPonto = await (async () => {
    if ((pad === "/transacties" || pad === "/verwijder") && String(env.EB_TOKEN_GEHEIM || "").trim()) {
      const b = await request.clone().json().catch(() => ({}));
      const t = await ontsleutel(env, email, b.token);
      if (t) return !!t.p; // een geldig token bepaalt de aanbieder; een ongeldig token weigert de standaardaanbieder
    }
    if (pad === "/sessie" && (await request.clone().json().catch(() => ({}))).pkce) return true;
    return standaardPonto;
  })();
  if (viaPonto) {
    try {
      return await pontoRoute(request, env, url, pad, email, { json, leesBody, versleutel, ontsleutel, isDatum });
    } catch (e) {
      const detail = [e.status, e.message].filter(Boolean).join(" — ").slice(0, 400);
      return json({ ok: false, fout: e.status === 429 ? "Ponto vraagt even te wachten (te veel verzoeken)" : "Bankkoppeling via Ponto mislukt", detail }, e.status === 429 ? 429 : 502);
    }
  }

  const ontbreekt = ["EB_APP_ID", "EB_PRIVATE_KEY", "EB_TOKEN_GEHEIM"].filter((k) => !String(env[k] || "").trim());
  if (ontbreekt.length) return json({ ok: false, fout: "Bankkoppeling is nog niet ingesteld", detail: `Ontbrekende secrets: ${ontbreekt.join(", ")}` }, 503);

  try {
    // Lijst van banken in Nederland (privé of zakelijk).
    if (pad === "/banken" && request.method === "GET") {
      const psu = url.searchParams.get("psu") === "business" ? "business" : "personal";
      const data = await eb(env, `/aspsps?country=NL&psu_type=${psu}&service=AIS`);
      const banken = (data?.aspsps || []).map((a) => ({
        naam: a.name, land: a.country, logo: a.logo || null, beta: !!a.beta,
        maxGeldigSec: a.maximum_consent_validity || null,
        psuTypes: a.psu_types || [],
      }));
      return json({ ok: true, aanbieder: "enablebanking", banken });
    }

    // Start de toestemming: geeft de URL terug waar de gebruiker bij de eigen bank inlogt.
    if (pad === "/start" && request.method === "POST") {
      const b = await leesBody(request);
      const bank = String(b.bank || "").slice(0, 120);
      if (!bank) return json({ ok: false, fout: "Geen bank gekozen" }, 400);
      const psu = b.psu === "business" ? "business" : "personal";
      const maxSec = Math.min(MAX_GELDIG_SEC, Number(b.maxGeldigSec) > 0 ? Number(b.maxGeldigSec) : MAX_GELDIG_SEC);
      const state = String(b.state || "").slice(0, 100) || crypto.randomUUID();
      const data = await eb(env, "/auth", {
        method: "POST",
        body: {
          access: { valid_until: new Date(Date.now() + (maxSec - 60) * 1000).toISOString() },
          aspsp: { name: bank, country: "NL" },
          state,
          redirect_url: `${url.origin}/bank/terug`,
          psu_type: psu,
          language: "nl",
        },
      });
      return json({ ok: true, url: data.url, state });
    }

    // Terug van de bank: de eenmalige code inwisselen voor een sessie. Antwoord: koppeltoken + rekeningen (zonder id's).
    if (pad === "/sessie" && request.method === "POST") {
      const b = await leesBody(request);
      const code = String(b.code || "").slice(0, 500);
      if (!code) return json({ ok: false, fout: "Geen code van de bank ontvangen" }, 400);
      const s = await eb(env, "/sessions", { method: "POST", body: { code } });
      const rekeningen = (s.accounts || []).map((a) => ({
        iban: a.account_id?.iban || a.account_id?.other?.identification || "",
        naam: a.name || a.product || "",
        valuta: a.currency || "EUR",
        soort: a.cash_account_type || "",
      }));
      const uids = (s.accounts || []).map((a) => a.uid);
      const geldigTot = s.access?.valid_until || null;
      const token = await versleutel(env, email, { s: s.session_id, u: uids, t: geldigTot });
      return json({ ok: true, token, bank: s.aspsp?.name || b.bank || "", rekeningen, geldigTot });
    }

    // Transacties (en eindsaldo) van één rekening ophalen. "rekening" is het volgnummer uit de lijst hierboven.
    if (pad === "/transacties" && request.method === "POST") {
      const b = await leesBody(request);
      const t = await ontsleutel(env, email, b.token);
      if (!t) return json({ ok: false, fout: "Koppeling ongeldig of van een andere gebruiker" }, 403);
      const uid = t.u?.[Number(b.rekening)];
      if (!uid) return json({ ok: false, fout: "Onbekende rekening" }, 400);
      const q = new URLSearchParams();
      if (isDatum(b.van)) q.set("date_from", b.van);
      if (isDatum(b.tot)) q.set("date_to", b.tot);
      const transacties = [];
      let sleutel = null;
      let paginas = 0;
      do {
        const qq = new URLSearchParams(q);
        if (sleutel) qq.set("continuation_key", sleutel);
        const data = await eb(env, `/accounts/${encodeURIComponent(uid)}/transactions?${qq}`);
        transacties.push(...(data?.transactions || []));
        sleutel = data?.continuation_key || null;
        paginas += 1;
      } while (sleutel && paginas < MAX_PAGINAS);
      let saldi = [];
      try { saldi = (await eb(env, `/accounts/${encodeURIComponent(uid)}/balances`))?.balances || []; } catch { /* niet elke bank geeft saldi */ }
      return json({ ok: true, transacties, saldi, onvolledig: !!sleutel });
    }

    // Koppeling intrekken bij Enable Banking (de bank stopt dan met gegevens geven).
    if (pad === "/verwijder" && request.method === "POST") {
      const b = await leesBody(request);
      const t = await ontsleutel(env, email, b.token);
      if (!t) return json({ ok: false, fout: "Koppeling ongeldig of van een andere gebruiker" }, 403);
      try { await eb(env, `/sessions/${encodeURIComponent(t.s)}`, { method: "DELETE" }); } catch (e) { if (e.status !== 404) throw e; }
      return json({ ok: true });
    }

    return json({ ok: false, fout: "Onbekende route" }, 404);
  } catch (e) {
    const status = e.status === 401 || e.status === 403 ? 502 : e.status === 429 ? 429 : 502;
    const detail = [e.status, e.message, e.eb?.code, e.eb?.error].filter(Boolean).join(" — ").slice(0, 400);
    return json({ ok: false, fout: e.status === 429 ? "De bank of Enable Banking vraagt even te wachten (te veel verzoeken)" : "Bankkoppeling mislukt", detail }, status);
  }
}
