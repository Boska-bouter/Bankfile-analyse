// nieuw-V4R6 — eigen inlog, als vervanging van Cloudflare Access (geen code per e-mail, geen kosten per gebruiker).
//
// Aan met de variabele INLOG_MODUS = "eigen". Zonder die variabele (of "access") werkt alles zoals voorheen: de Worker
// vertrouwt dan op Cloudflare Access en de header Cf-Access-Authenticated-User-Email.
//
// Drie manieren om in te loggen:
// 1. Inloglink per e-mail (eenmalig te gebruiken, 15 minuten geldig). De link opent een bevestigpagina met een knop,
//    zodat virusscanners die links in e-mails vooraf openen de link niet "opgebruiken".
// 2. Passkey (Face ID, Touch ID, pincode van het apparaat; WebAuthn). Na de eerste inlog via de link kan de gebruiker
//    een passkey aanmaken; daarna is geen e-mail meer nodig.
// 3. (nieuw-V5R8) E-mailadres en wachtwoord. Het wachtwoord stel je zelf in na de eerste inlog; vergeten gaat via de
//    inloglink. Opgeslagen als PBKDF2-SHA256-hash met eigen zout, nooit leesbaar.
// Na inloggen krijgt de browser een sessiecookie (HttpOnly, 30 dagen, verlengt zich bij gebruik). In D1 staat alleen
// een hash van de sessiesleutel en van de inloglink, nooit de sleutel zelf.
//
// Tabellen (maakt de Worker zelf aan): sessies, inloglinks, passkeys, uitdagingen, wachtwoorden, inlogpogingen.

import { WELKOM_ACHTERGROND } from "./achtergrond.js";
import { welkomInhoud, welkomKop, welkomNieuw, alleGratis, WELKOM_STIJL } from "./welkom.js";
import { GEBRUIK, PLANNEN, PLAN_UITLEG, prijzen, prijsTekst } from "./rechten.js";

const COOKIE = "bo_sessie";
const SESSIE_DAGEN = 30;
const LINK_MINUTEN = 15;
const MAX_LINKS_PER_UUR = 5;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sessies (hash TEXT PRIMARY KEY, email TEXT NOT NULL, aangemaakt TEXT NOT NULL, verloopt INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS inloglinks (hash TEXT PRIMARY KEY, email TEXT NOT NULL, aangemaakt INTEGER NOT NULL, verloopt INTEGER NOT NULL, gebruikt INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS passkeys (id TEXT PRIMARY KEY, email TEXT NOT NULL, sleutel TEXT NOT NULL, alg INTEGER NOT NULL, teller INTEGER NOT NULL DEFAULT 0, naam TEXT, aangemaakt TEXT NOT NULL, laatst TEXT)`,
  `CREATE TABLE IF NOT EXISTS uitdagingen (id TEXT PRIMARY KEY, uitdaging TEXT NOT NULL, email TEXT, verloopt INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS wachtwoorden (email TEXT PRIMARY KEY, hash TEXT NOT NULL, zout TEXT NOT NULL, iteraties INTEGER NOT NULL, gewijzigd TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS inlogpogingen (email TEXT NOT NULL, tijd INTEGER NOT NULL)`,
];
const MIN_WACHTWOORD = 10;
const MAX_POGINGEN = 10; // mislukte wachtwoordpogingen per adres per kwartier
const PBKDF2_ITERATIES = 100000; // het maximum dat Cloudflare Workers toestaat

export const eigenInlog = (env) => String(env.INLOG_MODUS || "").trim().toLowerCase() === "eigen";

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const nu = () => Math.floor(Date.now() / 1000);

// ---- hulpjes: base64url, hash, willekeur ----
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const vanB64u = (s) => {
  const b = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "===".slice((b.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const willekeurig = (n = 32) => b64u(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async (data) => new Uint8Array(await crypto.subtle.digest("SHA-256", typeof data === "string" ? new TextEncoder().encode(data) : data));
const hashHex = async (s) => [...(await sha256(s))].map((b) => b.toString(16).padStart(2, "0")).join("");
const gelijk = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

async function wachtwoordHash(wachtwoord, zout, iteraties) {
  const sleutel = await crypto.subtle.importKey("raw", new TextEncoder().encode(wachtwoord), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: vanB64u(zout), iterations: iteraties }, sleutel, 256));
}

let tabellenKlaar = false;
async function zorgVoorTabellen(db) {
  if (tabellenKlaar) return;
  for (const s of SCHEMA) await db.prepare(s).run();
  tabellenKlaar = true;
}

function leesCookie(request, naam) {
  const c = (request.headers.get("Cookie") || "").split(/;\s*/).find((x) => x.startsWith(`${naam}=`));
  return c ? decodeURIComponent(c.slice(naam.length + 1)) : "";
}
const sessieCookie = (token, maxAge) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// ---- wie is ingelogd? ----
export async function wieIsIngelogd(request, env) {
  if (!eigenInlog(env)) return (request.headers.get("Cf-Access-Authenticated-User-Email") || "").trim().toLowerCase() || null;
  const token = leesCookie(request, COOKIE);
  if (!token || !env.DB) return null;
  try {
    await zorgVoorTabellen(env.DB);
    const hash = await hashHex(token);
    const r = await env.DB.prepare("SELECT email, verloopt FROM sessies WHERE hash = ?").bind(hash).first();
    if (!r || r.verloopt < nu()) return null;
    // Verlengen als de helft van de looptijd voorbij is (de cookie zelf verlengt de app niet; 30 dagen na laatste verlenging).
    if (r.verloopt - nu() < (SESSIE_DAGEN * 86400) / 2) {
      await env.DB.prepare("UPDATE sessies SET verloopt = ? WHERE hash = ?").bind(nu() + SESSIE_DAGEN * 86400, hash).run();
    }
    return r.email;
  } catch (e) {
    console.error("inloggen: sessie lezen mislukt", e?.message);
    return null;
  }
}

async function maakSessie(env, email) {
  const token = willekeurig(32);
  await env.DB.prepare("INSERT INTO sessies (hash, email, aangemaakt, verloopt) VALUES (?, ?, ?, ?)")
    .bind(await hashHex(token), email, new Date().toISOString(), nu() + SESSIE_DAGEN * 86400).run();
  // Opruimen: verlopen sessies, links en uitdagingen.
  await env.DB.prepare("DELETE FROM sessies WHERE verloopt < ?").bind(nu()).run();
  await env.DB.prepare("DELETE FROM inloglinks WHERE verloopt < ?").bind(nu() - 86400).run();
  await env.DB.prepare("DELETE FROM uitdagingen WHERE verloopt < ?").bind(nu()).run();
  return token;
}

// ---- WebAuthn: kleine CBOR-lezer (genoeg voor attestationObject en COSE-sleutels) ----
function cbor(bytes) {
  let i = 0;
  const lees = () => {
    const b = bytes[i++], mt = b >> 5, ai = b & 31;
    let n = ai;
    if (ai === 24) n = bytes[i++];
    else if (ai === 25) { n = (bytes[i] << 8) | bytes[i + 1]; i += 2; }
    else if (ai === 26) { n = ((bytes[i] << 24) >>> 0) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3]; i += 4; }
    else if (ai > 26) throw new Error("CBOR: niet ondersteund");
    if (mt === 0) return n;
    if (mt === 1) return -1 - n;
    if (mt === 2) { const v = bytes.slice(i, i + n); i += n; return v; }
    if (mt === 3) { const v = new TextDecoder().decode(bytes.slice(i, i + n)); i += n; return v; }
    if (mt === 4) { const a = []; for (let k = 0; k < n; k++) a.push(lees()); return a; }
    if (mt === 5) { const m = new Map(); for (let k = 0; k < n; k++) { const key = lees(); m.set(key, lees()); } return m; }
    if (mt === 7) return n === 20 ? false : n === 21 ? true : null;
    throw new Error("CBOR: onbekend type");
  };
  const waarde = lees();
  return { waarde, lengte: i };
}

function leesAuthData(ad) {
  const rpIdHash = ad.slice(0, 32), flags = ad[32];
  const teller = ((ad[33] << 24) >>> 0) + (ad[34] << 16) + (ad[35] << 8) + ad[36];
  const uit = { rpIdHash, flags, teller, aanwezig: !!(flags & 1), geverifieerd: !!(flags & 4) };
  if (flags & 64) {
    const lenId = (ad[53] << 8) | ad[54];
    uit.credId = ad.slice(55, 55 + lenId);
    uit.cose = cbor(ad.slice(55 + lenId)).waarde;
  }
  return uit;
}

function coseNaarJwk(cose) {
  const kty = cose.get(1), alg = cose.get(3);
  if (kty === 2 && alg === -7) return { alg, jwk: { kty: "EC", crv: "P-256", x: b64u(cose.get(-2)), y: b64u(cose.get(-3)), ext: true } };
  if (kty === 3 && alg === -257) return { alg, jwk: { kty: "RSA", n: b64u(cose.get(-1)), e: b64u(cose.get(-2)), ext: true } };
  throw new Error("Dit type passkey wordt niet ondersteund");
}

// ECDSA-handtekening van WebAuthn is DER; WebCrypto wil r||s (2×32 bytes).
function derNaarRaw(der) {
  let i = 2;
  const deel = () => { i++; const len = der[i++]; let v = der.slice(i, i + len); i += len; while (v.length > 32 && v[0] === 0) v = v.slice(1); const u = new Uint8Array(32); u.set(v, 32 - v.length); return u; };
  const r = deel(), s = deel();
  const uit = new Uint8Array(64); uit.set(r); uit.set(s, 32); return uit;
}

async function controleerHandtekening(alg, jwk, data, sig) {
  if (alg === -7) {
    const k = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, k, derNaarRaw(sig), data);
  }
  const k = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", k, sig, data);
}

async function nieuweUitdaging(env, email = null) {
  const id = willekeurig(16), uitdaging = willekeurig(32);
  await env.DB.prepare("INSERT INTO uitdagingen (id, uitdaging, email, verloopt) VALUES (?, ?, ?, ?)").bind(id, uitdaging, email, nu() + 300).run();
  return { id, uitdaging };
}
async function pakUitdaging(env, id) {
  const r = await env.DB.prepare("SELECT * FROM uitdagingen WHERE id = ?").bind(String(id || "")).first();
  if (r) await env.DB.prepare("DELETE FROM uitdagingen WHERE id = ?").bind(r.id).run();
  return r && r.verloopt >= nu() ? r : null;
}

function controleerClientData(clientDataJSON, type, uitdaging, origin) {
  const cd = JSON.parse(new TextDecoder().decode(clientDataJSON));
  if (cd.type !== type) throw new Error("Verkeerd type");
  if (cd.challenge !== uitdaging) throw new Error("Uitdaging klopt niet");
  if (cd.origin !== origin) throw new Error("Verkeerde herkomst");
}

// ---- e-mail met inloglink ----
// nieuw-V4R7 — de send_email-binding van Cloudflare Email Routing mailt alleen naar geverifieerde adressen. Voor
// inloglinks naar willekeurige gebruikers kan daarom Resend (resend.com) worden gebruikt: Secret RESEND_API_KEY en een
// afzender op een bij Resend geverifieerd domein (INLOG_FROM). Zonder die Secret gaat het via de binding EMAIL.
export async function verstuur(env, bericht) {
  if (env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: bericht.from, to: [bericht.to], subject: bericht.subject, text: bericht.text, html: bericht.html }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 150)}`);
    return;
  }
  if (!env.EMAIL) throw new Error("Binding EMAIL ontbreekt");
  await env.EMAIL.send(bericht);
}

// nieuw-V5R2 — aanhef en handtekening voor alle mails aan gebruikers. Handtekening aanpasbaar met de variabele
// MAIL_HANDTEKENING (regels gescheiden door "\n"), anders de standaardtekst hieronder.
const STANDAARD_HANDTEKENING = "Met vriendelijke groet,\nPaul Gerits\nEigenaar en ontwikkelaar van Bankoverzicht";
export function opmaakMail(env, { naam = "", zonderNaam = "Hallo,", regels = [], lijst = [], naLijst = [], knop = null, voetnoot = "" }) {
  const aanhef = naam ? `Beste ${naam},` : zonderNaam;
  const handtekening = String(env.MAIL_HANDTEKENING || STANDAARD_HANDTEKENING).replace(/\\n/g, "\n").split("\n");
  const text = [aanhef, ...regels, ...(lijst.length ? [lijst.map(([k, v]) => `- ${k}: ${v}`).join("\n")] : []), ...naLijst, ...(knop ? [knop.link] : []), ...(voetnoot ? [voetnoot] : []), handtekening.join("\n")].join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5"><p>${esc(aanhef)}</p>${regels.map((r) => `<p>${esc(r)}</p>`).join("")}
${lijst.length ? `<ul style="padding-left:20px">${lijst.map(([k, v]) => `<li style="margin-bottom:6px"><b>${esc(k)}</b>: ${esc(v)}</li>`).join("")}</ul>` : ""}${naLijst.map((r) => `<p>${esc(r)}</p>`).join("")}
${knop ? `<p><a href="${esc(knop.link)}" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(knop.tekst)}</a></p>` : ""}
${voetnoot ? `<p style="color:#555;font-size:13px">${esc(voetnoot)}</p>` : ""}<p>${handtekening.map(esc).join("<br>")}</p></div>`;
  return { text, html };
}

// Nieuw is wie nog niet in de rechtentabel staat, geen passkey heeft en niet op BEHEERDERS/AccessAll staat.
// (Hier zelf opgezocht in plaats van via rechten.js, dat dit bestand al importeert.)
async function isNieuw(env, email) {
  const opLijst = (l) => String(l || "").split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
    .some((x) => x === email || (x.startsWith("*@") && email.endsWith(x.slice(1))));
  if (opLijst(env.BEHEERDERS) || opLijst(env.AccessAll)) return false;
  try {
    if (await env.DB.prepare("SELECT 1 FROM passkeys WHERE email = ? LIMIT 1").bind(email).first()) return false;
    if (await env.DB.prepare("SELECT 1 FROM rechten WHERE email = ? LIMIT 1").bind(email).first()) return false;
  } catch { /* tabel bestaat nog niet: dan is iedereen nieuw */ }
  return true;
}

// nieuw-V5R2 — een passkey maak je pas aan als je toegang hebt (na goedkeuring). Dynamische import: rechten.js
// importeert dit bestand al.
// nieuw-V5R4 — passkey nog niet aangeboden? Dan gaat de eerste keer openen van de app (na goedkeuring) eerst langs de
// passkeypagina. Eén keer per apparaat (cookie), en alleen zolang er geen passkey is.
export async function passkeyAanbieden(request, env, email) {
  if (!eigenInlog(env) || !email || request.method !== "GET") return false;
  if (!(request.headers.get("Accept") || "").includes("text/html")) return false;
  if (/(?:^|;\s*)bo_pk=1/.test(request.headers.get("Cookie") || "")) return false;
  try {
    if (await env.DB.prepare("SELECT 1 FROM passkeys WHERE email = ? LIMIT 1").bind(email).first()) return false;
    return !(await env.DB.prepare("SELECT 1 FROM wachtwoorden WHERE email = ? LIMIT 1").bind(email).first());
  }
  catch { return false; }
}
export const PASSKEY_GEVRAAGD = `bo_pk=1; Path=/; Max-Age=${365 * 86400}; HttpOnly; Secure; SameSite=Lax`;

// nieuw-V5R7 — inloglink voor in de goedkeuringsmail: langer geldig dan een gewone link (de mail wordt niet altijd meteen
// gelezen), maar ook maar één keer te gebruiken. Geeft null bij Access-inlog (daar bestaan geen inloglinks).
export const GOEDKEUR_LINK_UREN = 72;
export async function maakInloglink(env, email, origin, minuten = GOEDKEUR_LINK_UREN * 60) {
  if (!eigenInlog(env) || !env.DB) return null;
  await zorgVoorTabellen(env.DB);
  const token = willekeurig(32);
  await env.DB.prepare("INSERT INTO inloglinks (hash, email, aangemaakt, verloopt) VALUES (?, ?, ?, ?)").bind(await hashHex(token), email, nu(), nu() + minuten * 60).run();
  return `${origin}/inloggen/link?t=${token}`;
}

async function magPasskey(env, email) {
  const { rechtenVan } = await import("./rechten.js");
  return !!(await rechtenVan(email, env)).toegang;
}

async function stuurLink(env, email, link) {
  const from = env.INLOG_FROM || env.FEEDBACK_FROM;
  const nieuw = await isNieuw(env, email);
  const { text, html } = opmaakMail(env, nieuw ? {
    zonderNaam: "Beste aanvrager,",
    regels: [
      "Bedankt voor je interesse in Bankoverzicht, de app die je bankafschriften omzet in overzichten van je inkomsten en uitgaven.",
      "Dit is je eerste inloglink. Na het inloggen kies je of je de app zakelijk (eenmanszaak, zzp of BV) of privé (alleen je eigen huishouden) gebruikt, kies je een versie en dien je je aanvraag in:",
    ],
    lijst: [
      ["Eenvoudig", "in vier stappen je bankbestanden indelen en een eerste overzicht krijgen: zakelijk een indicatie van je btw en inkomstenbelasting, privé je inkomsten en uitgaven per maand."],
      ["Uitgebreid", "alle tabbladen, controles en berekeningen: zakelijk de aangifteberekening, privé je budget, vaste lasten en een indicatie van je inkomstenbelasting."],
      ["Uitgebreid met bankkoppeling", "alles van Uitgebreid, en je transacties rechtstreeks bij je bank ophalen in plaats van bestanden te downloaden. De bankkoppeling is nog in ontwikkeling en komt beschikbaar zodra er genoeg gebruikers zijn."],
    ],
    naLijst: ["Ik beoordeel je aanvraag zo snel mogelijk. Je krijgt daarover een e-mail."],
    knop: { link, tekst: "Inloggen en aanvraag doen" },
    voetnoot: `De link is ${LINK_MINUTEN} minuten geldig en werkt één keer. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.`,
  } : {
    regels: ["Klik op de knop om in te loggen bij Bankoverzicht."],
    knop: { link, tekst: "Inloggen" },
    voetnoot: `De link is ${LINK_MINUTEN} minuten geldig en werkt één keer. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.`,
  });
  await verstuur(env, { to: email, from, subject: nieuw ? "Je eerste inloglink voor Bankoverzicht" : "Inloggen bij Bankoverzicht", text, html });
}

// ---- pagina's ----
const STIJL = `:root{--bg:#f6f8f7;--fg:#0f172a;--muted:#475569;--card:#fff;--line:#d8e2de;--accent:#0f766e;--err:#b42318;--ok:#065f46;--okbg:#ecfdf5}
@media (prefers-color-scheme:dark){:root{--bg:#0f1715;--fg:#e4ece9;--muted:#9aaba5;--card:#16211e;--line:#2a3833;--accent:#2fb3a6;--err:#f97066;--ok:#a7f3d0;--okbg:#0b2b22}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif}
main{max-width:460px;margin:0 auto;padding:40px 16px;display:flex;flex-direction:column;gap:16px}
h1{margin:0;font-size:1.4rem}.sub{margin:0;color:var(--muted)}
.kaart{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px}
input{font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}
button,.knop{font:inherit;font-weight:600;background:var(--accent);color:#fff;border:0;border-radius:8px;padding:11px 16px;cursor:pointer;text-align:center;text-decoration:none}
button.tweede,.knop.tweede{background:transparent;color:var(--accent);border:1px solid var(--accent)}
button[disabled]{opacity:.6}#status{margin:0;min-height:1.3em;color:var(--muted)}#status.err{color:var(--err)}#status.ok{color:var(--ok)}
.of{text-align:center;color:var(--muted);font-size:13px}`;

const HULP_JS = `const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
const vanB64u=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(s+"===".slice((s.length+3)%4)),c=>c.charCodeAt(0))};
const st=document.getElementById("status");const meld=(t,k)=>{st.className=k||"";st.textContent=t};
const post=async(p,b)=>{const r=await fetch(p,{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify(b||{})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.fout||("Fout "+r.status));return d};
const kanPasskey=!!(window.PublicKeyCredential&&navigator.credentials);`;

const pagina = (titel, inhoud, script = "", extraHeaders = {}, achter = "") =>
  new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titel)} · Bankoverzicht</title><style>${STIJL}</style></head><body><main>${inhoud}</main>${achter}
${script ? `<script>${HULP_JS}\n${script}</script>` : ""}</body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...extraHeaders } });

// beide-V4R0 — de inlogpagina is ook de welkomstpagina (zie welkom.js): breed uitleg links en inloggen rechts, smal inloggen bovenaan.
const SOORT_UITLEG = {
  prive: { voor: "Voor je eigen huishouden, eventueel met je partner.", kan: ["Budget per maand en categorie", "Vaste lasten en sparen", "Indicatie inkomstenbelasting (Uitgebreid ook eigen woning en box 3)"] },
  zakelijk: { voor: "Voor zzp, eenmanszaak of BV.", kan: ["Omzet, kosten en winst", "Indicatie btw per kwartaal", "Indicatie inkomstenbelasting en Zvw (Uitgebreid ook de aangifteberekening, activa, leningen en lease)"] },
};
function welkomSoorten(env) {
  const pr = prijzen(env);
  return ["prive", "zakelijk"].map((s) => ({
    soort: s, naam: GEBRUIK[s], ...SOORT_UITLEG[s],
    plannen: Object.keys(PLANNEN).map((k) => ({ sleutel: k, naam: PLANNEN[k], uitleg: PLAN_UITLEG[s][k], prijs: prijsTekst(pr[s][k]), gratis: !Number(pr[s][k]) })),
  }));
}

function inlogPagina(env) {
  const soorten = welkomSoorten(env);
  return pagina("Inloggen", `<style>${WELKOM_STIJL}</style>
<div class="welkom-grid">
${welkomKop(soorten)}
<aside class="inlogkolom">
<div class="kaart inlogkaart">
  <h2>Log hier in als je al een account hebt</h2>
  <form id="f" style="display:flex;flex-direction:column;gap:10px">
    <input type="email" name="email" required autocomplete="username webauthn" placeholder="naam@voorbeeld.nl" aria-label="E-mailadres">
    <input type="password" name="wachtwoord" autocomplete="current-password" placeholder="Wachtwoord" aria-label="Wachtwoord">
    <button type="submit">Inloggen</button>
    <button type="button" id="link" class="linkknop">Wachtwoord vergeten of nog geen wachtwoord? Stuur inloglink</button>
  </form>
  <div class="scheiding" id="ofpk"></div>
  <button id="pk" type="button" class="linkknop">Inloggen met passkey (Face ID of pincode)</button>
  <p id="status" role="status"></p>
</div>
<div class="kaart inlogkaart">
  <h2>Start hier je aanvraag voor toegang tot Bankoverzicht</h2>
  <form id="a" style="display:flex;flex-direction:column;gap:10px">
    <input type="email" name="email" required autocomplete="email" placeholder="naam@voorbeeld.nl" aria-label="E-mailadres voor je aanvraag">
    <button type="submit" class="tweede">Stuur inloglink</button>
  </form>
  <p id="status2" role="status"></p>
  ${welkomNieuw(alleGratis(soorten))}
</div>
</aside>
<div class="uitlegkolom">${welkomInhoud({ soorten })}</div>
</div>`, `
const pk=document.getElementById("pk");if(!kanPasskey){pk.style.display="none";document.getElementById("ofpk").style.display="none"}
pk.addEventListener("click",async()=>{pk.disabled=true;meld("Bezig…");try{
 const o=await post("/api/inloggen/passkey/opties");
 const c=await navigator.credentials.get({publicKey:{challenge:vanB64u(o.uitdaging),rpId:o.rpId,userVerification:"preferred",timeout:60000}});
 await post("/api/inloggen/passkey/login",{uitdagingId:o.id,id:c.id,clientDataJSON:b64u(c.response.clientDataJSON),authenticatorData:b64u(c.response.authenticatorData),signature:b64u(c.response.signature)});
 location.href="/";
}catch(e){meld(e.name==="NotAllowedError"?"Geannuleerd of geen passkey gevonden. Gebruik anders je wachtwoord of de inloglink.":"Inloggen lukte niet: "+e.message,"err")}finally{pk.disabled=false}});
const f=document.getElementById("f"),lk=document.getElementById("link");
f.addEventListener("submit",async e=>{e.preventDefault();const k=f.querySelector("button[type=submit]");
 if(!f.wachtwoord.value){meld("Vul je wachtwoord in, of kies Stuur inloglink.","err");f.wachtwoord.focus();return}
 k.disabled=true;meld("Bezig…");
 try{await post("/api/inloggen/wachtwoord",{email:f.email.value,wachtwoord:f.wachtwoord.value});location.href="/"}
 catch(x){meld(x.message,"err")}finally{k.disabled=false}});
// Aanvraagvak: zelfde inloglink, eigen e-mailveld en eigen melding.
const fa=document.getElementById("a"),st2=document.getElementById("status2");
fa.addEventListener("submit",async e=>{e.preventDefault();const k=fa.querySelector("button");k.disabled=true;st2.className="";st2.textContent="Bezig…";
 try{await post("/api/inloggen/link",{email:fa.email.value});st2.className="ok";st2.textContent="Er staat binnen een minuut een inloglink in je mailbox. Kijk ook in je spam. Je kunt dit venster nu sluiten: de link in de mail opent de app."}
 catch(x){st2.className="err";st2.textContent=x.message}finally{k.disabled=false}});
lk.addEventListener("click",async()=>{if(!f.email.reportValidity())return;lk.disabled=true;meld("Bezig…");
 try{await post("/api/inloggen/link",{email:f.email.value});meld("Als dit adres bekend is of nieuw is, staat er binnen een minuut een inloglink in je mailbox. Kijk ook in je spam. Je kunt dit venster nu sluiten: de link in de mail opent de app.","ok")}
 catch(x){meld(x.message,"err")}finally{lk.disabled=false}});`, {}, WELKOM_ACHTERGROND);
}

// nieuw-V5R3 — de bevestigpagina zegt voor wie en waarvoor de link is: nieuwe aanvrager, lopende aanvraag of gewoon inloggen.
// De link wordt hier alleen opgezocht, niet gebruikt; dat gebeurt pas bij de klik (mailscanners openen links ook).
async function bevestigPagina(env, token, huidig = null) {
  const t = String(token || "").slice(0, 100);
  let soort = "gewoon";
  let email = "";
  try {
    const r = t ? await env.DB.prepare("SELECT email, verloopt, gebruikt FROM inloglinks WHERE hash = ?").bind(await hashHex(t)).first() : null;
    if (!r || r.gebruikt || r.verloopt < nu()) soort = "verlopen";
    else {
      email = r.email;
      if (await isNieuw(env, email)) soort = "nieuw";
      else if (!(await magPasskey(env, email))) soort = "wacht";
    }
  } catch { /* dan de gewone tekst */ }
  const tekst = {
    nieuw: ["Welkom bij Bankoverzicht", `Je hebt een eerste inloglink aangevraagd voor <b>${esc(email)}</b>. Na het inloggen kies je welke versie je wilt gebruiken (Eenvoudig, Uitgebreid of Uitgebreid met bankkoppeling) en vertel je kort waarom je toegang vraagt. Daarna beoordeel ik je aanvraag en krijg je een e-mail.`, "Inloggen en aanvraag doen", "/"],
    wacht: ["Je aanvraag is in behandeling", `Je logt in als <b>${esc(email)}</b>. Je aanvraag voor Bankoverzicht is nog niet beoordeeld. Na het inloggen zie je de stand van zaken en kun je eventueel een andere versie kiezen.`, "Inloggen", "/"],
    gewoon: ["Inloggen bij Bankoverzicht", `${email ? `Je logt in als <b>${esc(email)}</b>. ` : ""}Klik op de knop om in te loggen op dit apparaat.`, "Inloggen", "/inloggen/passkey"],
    verlopen: ["Link verlopen", "Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe link aan.", "", ""],
  }[soort];
  // nieuw-V5R6 — al ingelogd met een ander adres? Dat zeggen, anders lijkt de link naar het verkeerde account te gaan.
  const ander = huidig && huidig !== email
    ? `<p class="sub" style="margin:0">Op dit apparaat ben je nu ingelogd als <b>${esc(huidig)}</b>.${tekst[2] ? ` Met de knop log je uit en log je in als <b>${esc(email)}</b>.` : ""}</p>` : "";
  const knop = tekst[2] ? `<button id="ok" type="button">${tekst[2]}</button>`
    : huidig ? `<a class="knop" href="/">Verder als ${esc(huidig)}</a><a class="knop tweede" href="/uitloggen">Uitloggen</a>`
    : `<a class="knop" href="/inloggen">Nieuwe link aanvragen</a>`;
  return pagina("Inloggen", `
<h1>${tekst[0]}</h1>
<div class="kaart"><p class="sub" style="margin:0">${tekst[1]}</p>${ander}
${knop}<p id="status" role="status"></p></div>`, tekst[2] ? `
const t=${JSON.stringify(t)};const k=document.getElementById("ok");
k.addEventListener("click",async()=>{k.disabled=true;meld("Bezig…");try{await post("/api/inloggen/link/bevestig",{t});location.href=${JSON.stringify(tekst[3])}}
catch(e){meld(e.message,"err");setTimeout(()=>location.reload(),2000)}finally{k.disabled=false}});` : "");
}

// nieuw-V5R8 — "Inloggen instellen": wachtwoord instellen of wijzigen, en een passkey aanmaken.
function passkeyPagina(email, aantal, heeftWachtwoord) {
  const klaar = aantal || heeftWachtwoord;
  return pagina("Inloggen instellen", `
<h1>Inloggen instellen</h1>
<p class="sub">Je bent ingelogd als <b>${esc(email)}</b>. Kies hoe je voortaan inlogt. Je kunt ook allebei instellen.</p>
<div class="kaart">
  <b>Wachtwoord</b>
  <p class="sub" style="margin:0">${heeftWachtwoord ? "Je hebt een wachtwoord. Hier kun je het wijzigen." : `Log in met je e-mailadres en een wachtwoord van minimaal ${MIN_WACHTWOORD} tekens.`}</p>
  <form id="ww" style="display:flex;flex-direction:column;gap:10px">
    <input type="email" name="email" value="${esc(email)}" autocomplete="username" readonly hidden>
    <input type="password" name="nieuw" required minlength="${MIN_WACHTWOORD}" autocomplete="new-password" placeholder="Nieuw wachtwoord" aria-label="Nieuw wachtwoord">
    <input type="password" name="herhaal" required minlength="${MIN_WACHTWOORD}" autocomplete="new-password" placeholder="Herhaal wachtwoord" aria-label="Herhaal wachtwoord">
    <button type="submit">${heeftWachtwoord ? "Wachtwoord wijzigen" : "Wachtwoord instellen"}</button>
  </form>
</div>
<div class="kaart" id="pkkaart">
  <b>Passkey</b>
  <p class="sub" style="margin:0">${aantal ? `Je hebt ${aantal} passkey${aantal === 1 ? "" : "s"}. ` : ""}Met een passkey log je in met Face ID, Touch ID of de pincode van dit apparaat, zonder wachtwoord of e-mail.</p>
  <button id="maak" type="button" class="tweede">Passkey aanmaken op dit apparaat</button>
</div>
<p id="status" role="status"></p>
<div class="kaart" id="beginscherm" hidden>
  <b>Tip: zet Bankoverzicht op je beginscherm</b>
  <p class="sub" style="margin:0">Dan open je de app met één tik, schermvullend en zonder adresbalk.</p>
  <p class="sub" style="margin:0"><b>iPad of iPhone (Safari):</b> tik op het deelicoon (vierkantje met pijl omhoog) en kies <b>Zet op beginscherm</b>. Log daarna één keer in via het nieuwe icoon; dat gaat het snelst met je passkey. Een dossier dat je in Safari hebt, laad je daar via <b>Dossier laden</b>.</p>
  <p class="sub" style="margin:0"><b>Android (Chrome):</b> menu ⋮ en dan <b>Toevoegen aan startscherm</b>. <b>Computer (Chrome of Edge):</b> het installeer-icoon rechts in de adresbalk.</p>
</div>
<a class="knop tweede" id="naarapp" href="/">${klaar ? "Naar de app" : "Later, naar de app"}</a>`, `
// beide-V2R1 — na het instellen de tip om de app op het beginscherm te zetten (niet als hij daar al vandaan komt).
const losseApp=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const klaarMet=t=>{meld(t,"ok");if(losseApp){setTimeout(()=>location.href="/",1500);return}
 document.getElementById("beginscherm").hidden=false;const a=document.getElementById("naarapp");a.textContent="Naar de app";a.className="knop";a.scrollIntoView({behavior:"smooth",block:"end"})};

const k=document.getElementById("maak");if(!kanPasskey){document.getElementById("pkkaart").style.display="none"}
const w=document.getElementById("ww");w.addEventListener("submit",async e=>{e.preventDefault();
 if(w.nieuw.value!==w.herhaal.value){meld("De twee wachtwoorden zijn niet gelijk.","err");return}
 const b=w.querySelector("button");b.disabled=true;meld("Bezig…");
 try{await post("/api/inloggen/wachtwoord/instellen",{wachtwoord:w.nieuw.value});w.reset();klaarMet("Wachtwoord opgeslagen. Voortaan log je in met je e-mailadres en dit wachtwoord.")}
 catch(x){meld(x.message,"err")}finally{b.disabled=false}});
k.addEventListener("click",async()=>{k.disabled=true;meld("Bezig…");try{
 const o=await post("/api/inloggen/passkey/opties-registratie");
 const c=await navigator.credentials.create({publicKey:{challenge:vanB64u(o.uitdaging),rp:o.rp,user:{id:vanB64u(o.gebruiker.id),name:o.gebruiker.naam,displayName:o.gebruiker.naam},
  pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{residentKey:"required",userVerification:"preferred"},
  excludeCredentials:(o.bestaand||[]).map(id=>({type:"public-key",id:vanB64u(id)})),attestation:"none",timeout:60000}});
 await post("/api/inloggen/passkey/registreer",{uitdagingId:o.id,id:c.id,clientDataJSON:b64u(c.response.clientDataJSON),attestationObject:b64u(c.response.attestationObject)});
 klaarMet("Passkey aangemaakt. Voortaan log je in met Face ID, Touch ID of de pincode van dit apparaat.");
}catch(e){meld(e.name==="NotAllowedError"?"Geannuleerd.":e.name==="InvalidStateError"?"Op dit apparaat staat al een passkey voor jou.":"Aanmaken lukte niet: "+e.message,"err")}finally{k.disabled=false}});`, { "Set-Cookie": PASSKEY_GEVRAAGD });
}

// Paden die zonder inlog bereikbaar moeten zijn.
export const isOpenPad = (p) => p === "/inloggen" || p.startsWith("/inloggen/") || p.startsWith("/api/inloggen/") || p === "/uitloggen";

// ---- routes ----
export async function inlogRoute(request, env, url, email) {
  const p = url.pathname;
  if (p === "/uitloggen") {
    if (!eigenInlog(env)) return Response.redirect(`${url.origin}/cdn-cgi/access/logout`, 302);
    const token = leesCookie(request, COOKIE);
    if (token && env.DB) { try { await env.DB.prepare("DELETE FROM sessies WHERE hash = ?").bind(await hashHex(token)).run(); } catch { /* niets */ } }
    return new Response(null, { status: 302, headers: { Location: "/inloggen", "Set-Cookie": sessieCookie("", 0), "cache-control": "no-store" } });
  }
  if (!eigenInlog(env)) return json({ ok: false, fout: "Eigen inlog staat uit (INLOG_MODUS)" }, 404);
  if (!env.DB) return json({ ok: false, fout: "Database niet gekoppeld (binding DB)" }, 503);
  await zorgVoorTabellen(env.DB);

  if (request.method === "GET") {
    if (p === "/inloggen") return email ? Response.redirect(`${url.origin}/`, 302) : inlogPagina(env);
    if (p === "/inloggen/link") return bevestigPagina(env, url.searchParams.get("t"), email);
    if (p === "/inloggen/passkey") {
      if (!email) return Response.redirect(`${url.origin}/inloggen`, 302);
      if (!(await magPasskey(env, email))) return Response.redirect(`${url.origin}/`, 302);
      const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM passkeys WHERE email = ?").bind(email).first();
      const w = await env.DB.prepare("SELECT 1 FROM wachtwoorden WHERE email = ?").bind(email).first();
      return passkeyPagina(email, Number(r?.n || 0), !!w);
    }
    return json({ ok: false, fout: "Onbekende route" }, 404);
  }
  if (request.method !== "POST") return json({ ok: false, fout: "Alleen GET of POST" }, 405);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ ok: false, fout: "Verkeerde herkomst" }, 403);
  let body = {};
  try { body = await request.json(); } catch { /* leeg */ }
  const rpId = url.hostname;

  try {
    if (p === "/api/inloggen/link") {
      const doel = String(body?.email || "").trim().toLowerCase();
      if (!EMAIL_RE.test(doel) || doel.length > 200) return json({ ok: false, fout: "Vul een geldig e-mailadres in." }, 400);
      const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM inloglinks WHERE email = ? AND aangemaakt > ?").bind(doel, nu() - 3600).first();
      if (Number(r?.n || 0) >= MAX_LINKS_PER_UUR) return json({ ok: false, fout: "Te veel inloglinks aangevraagd. Probeer het over een uur opnieuw." }, 429);
      const token = willekeurig(32);
      await env.DB.prepare("INSERT INTO inloglinks (hash, email, aangemaakt, verloopt) VALUES (?, ?, ?, ?)").bind(await hashHex(token), doel, nu(), nu() + LINK_MINUTEN * 60).run();
      try { await stuurLink(env, doel, `${url.origin}/inloggen/link?t=${token}`); }
      catch (e) { return json({ ok: false, fout: `De e-mail kon niet worden verstuurd (${String(e?.message || e).slice(0, 200)}).` }, 502); }
      return json({ ok: true });
    }
    if (p === "/api/inloggen/link/bevestig") {
      const hash = await hashHex(String(body?.t || ""));
      const r = await env.DB.prepare("SELECT * FROM inloglinks WHERE hash = ?").bind(hash).first();
      if (!r || r.gebruikt || r.verloopt < nu()) return json({ ok: false, fout: "Deze inloglink is verlopen of al gebruikt." }, 400);
      await env.DB.prepare("UPDATE inloglinks SET gebruikt = 1 WHERE hash = ?").bind(hash).run();
      const sessie = await maakSessie(env, r.email);
      return json({ ok: true }, 200, { "Set-Cookie": sessieCookie(sessie, SESSIE_DAGEN * 86400) });
    }
    if (p === "/api/inloggen/wachtwoord") {
      const doel = String(body?.email || "").trim().toLowerCase();
      const ww = String(body?.wachtwoord || "");
      if (!EMAIL_RE.test(doel) || !ww || ww.length > 200) return json({ ok: false, fout: "Vul je e-mailadres en wachtwoord in." }, 400);
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM inlogpogingen WHERE email = ? AND tijd > ?").bind(doel, nu() - 900).first();
      if (Number(n?.n || 0) >= MAX_POGINGEN) return json({ ok: false, fout: "Te veel mislukte pogingen. Probeer het over een kwartier opnieuw, of gebruik de inloglink." }, 429);
      const r = await env.DB.prepare("SELECT hash, zout, iteraties FROM wachtwoorden WHERE email = ?").bind(doel).first();
      // Ook zonder wachtwoord even rekenen, zodat de responstijd niet verraadt of een adres een wachtwoord heeft.
      const h = await wachtwoordHash(ww, r?.zout || "AAAAAAAAAAAAAAAAAAAAAA", r?.iteraties || PBKDF2_ITERATIES);
      if (!r || !gelijk(h, vanB64u(r.hash))) {
        await env.DB.prepare("INSERT INTO inlogpogingen (email, tijd) VALUES (?, ?)").bind(doel, nu()).run();
        await env.DB.prepare("DELETE FROM inlogpogingen WHERE tijd < ?").bind(nu() - 86400).run();
        return json({ ok: false, fout: "E-mailadres of wachtwoord klopt niet. Nog geen wachtwoord of vergeten? Gebruik dan de inloglink." }, 400);
      }
      await env.DB.prepare("DELETE FROM inlogpogingen WHERE email = ?").bind(doel).run();
      const sessie = await maakSessie(env, doel);
      return json({ ok: true }, 200, { "Set-Cookie": sessieCookie(sessie, SESSIE_DAGEN * 86400) });
    }
    if (p === "/api/inloggen/passkey/opties") {
      const u = await nieuweUitdaging(env);
      return json({ ok: true, id: u.id, uitdaging: u.uitdaging, rpId });
    }
    if (p === "/api/inloggen/passkey/login") {
      const u = await pakUitdaging(env, body?.uitdagingId);
      if (!u) return json({ ok: false, fout: "Verlopen, probeer opnieuw" }, 400);
      const pk = await env.DB.prepare("SELECT * FROM passkeys WHERE id = ?").bind(String(body?.id || "")).first();
      if (!pk) return json({ ok: false, fout: "Deze passkey is niet bekend. Log in met een inloglink en maak een nieuwe aan." }, 400);
      const clientData = vanB64u(body.clientDataJSON), authData = vanB64u(body.authenticatorData), sig = vanB64u(body.signature);
      controleerClientData(clientData, "webauthn.get", u.uitdaging, url.origin);
      const ad = leesAuthData(authData);
      if (!gelijk(ad.rpIdHash, await sha256(rpId)) || !ad.aanwezig) throw new Error("Passkey hoort niet bij deze site");
      const data = new Uint8Array(authData.length + 32); data.set(authData); data.set(await sha256(clientData), authData.length);
      if (!(await controleerHandtekening(pk.alg, JSON.parse(pk.sleutel), data, sig))) throw new Error("Handtekening klopt niet");
      if (ad.teller && pk.teller && ad.teller <= pk.teller) throw new Error("Passkey-teller klopt niet (mogelijk gekopieerd)");
      await env.DB.prepare("UPDATE passkeys SET teller = ?, laatst = ? WHERE id = ?").bind(ad.teller, new Date().toISOString(), pk.id).run();
      const sessie = await maakSessie(env, pk.email);
      return json({ ok: true }, 200, { "Set-Cookie": sessieCookie(sessie, SESSIE_DAGEN * 86400) });
    }
    // Vanaf hier alleen voor wie is ingelogd.
    if (!email) return json({ ok: false, fout: "Niet ingelogd" }, 401);
    if ((p.startsWith("/api/inloggen/passkey/") || p === "/api/inloggen/wachtwoord/instellen") && !(await magPasskey(env, email)))
      return json({ ok: false, fout: "Je kunt een wachtwoord of passkey instellen zodra je aanmelding is goedgekeurd." }, 403);
    if (p === "/api/inloggen/wachtwoord/instellen") {
      const ww = String(body?.wachtwoord || "");
      if (ww.length < MIN_WACHTWOORD) return json({ ok: false, fout: `Kies een wachtwoord van minimaal ${MIN_WACHTWOORD} tekens.` }, 400);
      if (ww.length > 200) return json({ ok: false, fout: "Dat wachtwoord is te lang." }, 400);
      if (ww.trim().toLowerCase() === email) return json({ ok: false, fout: "Gebruik niet je e-mailadres als wachtwoord." }, 400);
      const zout = willekeurig(16);
      const h = await wachtwoordHash(ww, zout, PBKDF2_ITERATIES);
      await env.DB.prepare(`INSERT INTO wachtwoorden (email, hash, zout, iteraties, gewijzigd) VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(email) DO UPDATE SET hash = ?2, zout = ?3, iteraties = ?4, gewijzigd = ?5`).bind(email, b64u(h), zout, PBKDF2_ITERATIES, new Date().toISOString()).run();
      return json({ ok: true });
    }
    if (p === "/api/inloggen/passkey/opties-registratie") {
      const u = await nieuweUitdaging(env, email);
      const { results } = await env.DB.prepare("SELECT id FROM passkeys WHERE email = ?").bind(email).all();
      return json({ ok: true, id: u.id, uitdaging: u.uitdaging, rp: { id: rpId, name: "Bankoverzicht" },
        gebruiker: { id: b64u((await sha256(`bankoverzicht:${email}`)).slice(0, 16)), naam: email }, bestaand: (results || []).map((r) => r.id) });
    }
    if (p === "/api/inloggen/passkey/registreer") {
      const u = await pakUitdaging(env, body?.uitdagingId);
      if (!u || u.email !== email) return json({ ok: false, fout: "Verlopen, probeer opnieuw" }, 400);
      controleerClientData(vanB64u(body.clientDataJSON), "webauthn.create", u.uitdaging, url.origin);
      const att = cbor(vanB64u(body.attestationObject)).waarde;
      const ad = leesAuthData(att.get("authData"));
      if (!gelijk(ad.rpIdHash, await sha256(rpId)) || !ad.aanwezig || !ad.credId) throw new Error("Passkey hoort niet bij deze site");
      const { alg, jwk } = coseNaarJwk(ad.cose);
      const id = b64u(ad.credId);
      await env.DB.prepare("INSERT OR REPLACE INTO passkeys (id, email, sleutel, alg, teller, naam, aangemaakt) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(id, email, JSON.stringify(jwk), alg, ad.teller, String(request.headers.get("User-Agent") || "").slice(0, 120), new Date().toISOString()).run();
      return json({ ok: true });
    }
    return json({ ok: false, fout: "Onbekende route" }, 404);
  } catch (e) {
    return json({ ok: false, fout: String(e?.message || e).slice(0, 200) }, 400);
  }
}
