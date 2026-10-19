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

export async function bankRoute(request, env, url) {
  const email = (request.headers.get("Cf-Access-Authenticated-User-Email") || env.EB_DEV_EMAIL || "").trim().toLowerCase();
  if (!email) return json({ ok: false, fout: "Niet ingelogd" }, 401);
  const pad = url.pathname.replace(/^\/api\/bank/, "") || "/";

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
