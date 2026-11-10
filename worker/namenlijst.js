// nieuw-V2R1 — gedeelde namenlijst (fase 1 van "bedrijfsnamen opzoeken bij het laden", besluit Boska 10-11).
// - GET  /api/namen/lijst        : de lijst voor de app (startvulling + keuzes van gebruikers met toestemming). Iedereen die is ingelogd.
// - POST /api/namen/stem         : eigen keuzes op bedrijfsnamen, alleen met toestemming. { stemmen: [{ k, c }] }, k = "sleutel|teken|soort|branche".
// - POST /api/namen/zoek          : nieuw-V2R2, onbekende namen opzoeken met AI (zie namenAi.js).
// - GET/POST /api/namen/toestemming : toestemming lezen of aan/uit zetten ({ aan: true|false }). Standaard uit.
// Er komt nooit een e-mailadres bij de keuzes: elk account telt onder een anonieme code (hash), één stem per naam per account.
// D1-tabellen "namen_stem" en "namen_toestemming"; de Worker maakt ze zelf aan.
import START from "./namenlijst-start.js";
import { zoekRoute } from "./namenAi.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS namen_stem (sleutel TEXT NOT NULL, teken TEXT NOT NULL, soort TEXT NOT NULL, branche TEXT NOT NULL,
    account TEXT NOT NULL, categorie TEXT NOT NULL, tijd TEXT NOT NULL, PRIMARY KEY (sleutel, teken, soort, branche, account))`,
  "CREATE TABLE IF NOT EXISTS namen_toestemming (email TEXT PRIMARY KEY, aan INTEGER NOT NULL DEFAULT 0, tijd TEXT NOT NULL)",
];
const klaar = new WeakSet();
async function zorg(db) {
  if (klaar.has(db)) return;
  for (const s of SCHEMA) await db.prepare(s).run();
  klaar.add(db);
}

const SOORTEN = new Set(["zakelijk", "prive", "prive-dossier"]);
const MAX_STEMMEN = 200;
const MIN_ACCOUNTS = 2; // een naam staat pas in de lijst als minstens zoveel accounts (of testdossiers) hem hebben ingedeeld
const CACHE_MS = 10 * 60 * 1000;

// Controleert één sleutel "sleutel|teken|soort|branche". Sleutel = verkorte bedrijfsnaam (kleine letters, geen cijfers).
export function geldigeSleutel(k) {
  const d = String(k || "").split("|");
  if (d.length !== 4) return null;
  const [s, t, o, b] = d;
  if (!/^[a-z][a-z ]{1,59}$/.test(s) || !/^(neg|pos)$/.test(t) || !SOORTEN.has(o) || !/^[a-z-]{0,30}$/.test(b)) return null;
  return { sleutel: s, teken: t, soort: o, branche: b };
}
export function geldigeCategorie(c) {
  const t = String(c || "").trim();
  return t.length >= 2 && t.length <= 80 && !/[<>\u0000-\u001F]/.test(t) ? t : null;
}

async function accountCode(email) {
  const data = new TextEncoder().encode(`bankafschriftentool-namenlijst|${String(email).trim().toLowerCase()}`);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...h.slice(0, 16)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function namenToestemmingVan(email, env) {
  if (!email || !env?.DB) return false;
  try {
    await zorg(env.DB);
    const r = await env.DB.prepare("SELECT aan FROM namen_toestemming WHERE email = ?").bind(String(email).toLowerCase()).first();
    return r?.aan === 1;
  } catch { return false; }
}
export async function zetNamenToestemming(env, email, aan) {
  await zorg(env.DB);
  await env.DB.prepare(`INSERT INTO namen_toestemming (email, aan, tijd) VALUES (?1, ?2, ?3)
    ON CONFLICT(email) DO UPDATE SET aan = ?2, tijd = ?3`).bind(String(email).toLowerCase(), aan ? 1 : 0, new Date().toISOString()).run();
}
// Bij verwijderen van een gebruiker: toestemming en alle keuzes weg.
export async function wisNamen(db, email) {
  try {
    await zorg(db);
    await db.prepare("DELETE FROM namen_toestemming WHERE email = ?").bind(String(email).toLowerCase()).run();
    await db.prepare("DELETE FROM namen_stem WHERE account = ?").bind(await accountCode(email)).run();
    await db.prepare("DELETE FROM namen_ai_teller WHERE account = ?").bind(await accountCode(email)).run().catch(() => {});
  } catch { /* tabel bestaat (nog) niet */ }
}

// Startvulling + keuzes uit D1 samen; alleen namen met minstens MIN_ACCOUNTS accounts (per naam, teken en soort).
export function voegSamen(start, rijen) {
  const namen = {};
  for (const [k, cats] of Object.entries(start || {})) namen[k] = { ...cats };
  for (const r of rijen || []) {
    const k = `${r.sleutel}|${r.teken}|${r.soort}|${r.branche}`;
    const cats = (namen[k] ||= {});
    cats[r.categorie] = (cats[r.categorie] || 0) + Number(r.n || 0);
  }
  const groep = {};
  for (const [k, cats] of Object.entries(namen)) {
    const g = k.split("|").slice(0, 3).join("|");
    groep[g] = (groep[g] || 0) + Object.values(cats).reduce((a, b) => a + b, 0);
  }
  for (const k of Object.keys(namen)) if (groep[k.split("|").slice(0, 3).join("|")] < MIN_ACCOUNTS) delete namen[k];
  return namen;
}

let cache = null, cacheTijd = 0;
export async function namenRoute(request, env, url, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return json({ ok: false, fout: "Niet ingelogd" }, 401);
  if (url.pathname === "/api/namen/lijst") {
    if (request.method !== "GET") return json({ ok: false, fout: "Alleen GET" }, 405);
    if (!cache || Date.now() - cacheTijd > CACHE_MS) {
      let rijen = [];
      if (env.DB) {
        try {
          await zorg(env.DB);
          rijen = (await env.DB.prepare("SELECT sleutel, teken, soort, branche, categorie, COUNT(*) AS n FROM namen_stem GROUP BY sleutel, teken, soort, branche, categorie").all())?.results || [];
        } catch (err) { console.error("namenlijst", err?.message); }
      }
      cache = voegSamen(START, rijen);
      cacheTijd = Date.now();
    }
    return json({ ok: true, namen: cache });
  }
  const herkomst = request.headers.get("Origin");
  if (request.method === "POST") {
    if (herkomst && herkomst !== url.origin) return json({ ok: false, fout: "Verkeerde herkomst" }, 403);
    if (!String(request.headers.get("content-type") || "").includes("application/json")) return json({ ok: false, fout: "Alleen JSON" }, 415);
  }
  if (!env.DB) return json({ ok: false, fout: "Database niet gekoppeld" }, 503);
  if (url.pathname === "/api/namen/toestemming") {
    if (request.method === "GET") return json({ ok: true, aan: await namenToestemmingVan(e, env) });
    if (request.method !== "POST") return json({ ok: false, fout: "Alleen GET of POST" }, 405);
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
    await zetNamenToestemming(env, e, body?.aan === true);
    // Toestemming ingetrokken: de eerder gestuurde keuzes gaan ook weg.
    if (body?.aan !== true) await env.DB.prepare("DELETE FROM namen_stem WHERE account = ?").bind(await accountCode(e)).run().catch(() => {});
    return json({ ok: true, aan: body?.aan === true });
  }
  if (url.pathname === "/api/namen/zoek") {
    if (request.method !== "POST") return json({ ok: false, fout: "Alleen POST" }, 405);
    return zoekRoute(request, env, await accountCode(e));
  }
  if (url.pathname === "/api/namen/stem") {
    if (request.method !== "POST") return json({ ok: false, fout: "Alleen POST" }, 405);
    if (!(await namenToestemmingVan(e, env))) return json({ ok: false, fout: "Geen toestemming voor de gedeelde namenlijst" }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
    const lijst = Array.isArray(body?.stemmen) ? body.stemmen.slice(0, MAX_STEMMEN) : [];
    const account = await accountCode(e);
    const tijd = new Date().toISOString();
    const stmts = [];
    for (const s of lijst) {
      const k = geldigeSleutel(s?.k), c = geldigeCategorie(s?.c);
      if (!k || !c) continue;
      stmts.push(env.DB.prepare(`INSERT INTO namen_stem (sleutel, teken, soort, branche, account, categorie, tijd) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(sleutel, teken, soort, branche, account) DO UPDATE SET categorie = ?6, tijd = ?7`).bind(k.sleutel, k.teken, k.soort, k.branche, account, c, tijd));
    }
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true, opgeslagen: stmts.length });
  }
  return json({ ok: false, fout: "Onbekende route" }, 404);
}
