// nieuw-V4R6 — eigen inlog, als vervanging van Cloudflare Access (geen code per e-mail, geen kosten per gebruiker).
//
// Aan met de variabele INLOG_MODUS = "eigen". Zonder die variabele (of "access") werkt alles zoals voorheen: de Worker
// vertrouwt dan op Cloudflare Access en de header Cf-Access-Authenticated-User-Email.
//
// Twee manieren om in te loggen:
// 1. Inloglink per e-mail (eenmalig te gebruiken, 15 minuten geldig). De link opent een bevestigpagina met een knop,
//    zodat virusscanners die links in e-mails vooraf openen de link niet "opgebruiken".
// 2. Passkey (Face ID, Touch ID, pincode van het apparaat; WebAuthn). Na de eerste inlog via de link kan de gebruiker
//    een passkey aanmaken; daarna is geen e-mail meer nodig.
// Na inloggen krijgt de browser een sessiecookie (HttpOnly, 30 dagen, verlengt zich bij gebruik). In D1 staat alleen
// een hash van de sessiesleutel en van de inloglink, nooit de sleutel zelf.
//
// Tabellen (maakt de Worker zelf aan): sessies, inloglinks, passkeys, uitdagingen.

const COOKIE = "bo_sessie";
const SESSIE_DAGEN = 30;
const LINK_MINUTEN = 15;
const MAX_LINKS_PER_UUR = 5;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sessies (hash TEXT PRIMARY KEY, email TEXT NOT NULL, aangemaakt TEXT NOT NULL, verloopt INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS inloglinks (hash TEXT PRIMARY KEY, email TEXT NOT NULL, aangemaakt INTEGER NOT NULL, verloopt INTEGER NOT NULL, gebruikt INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS passkeys (id TEXT PRIMARY KEY, email TEXT NOT NULL, sleutel TEXT NOT NULL, alg INTEGER NOT NULL, teller INTEGER NOT NULL DEFAULT 0, naam TEXT, aangemaakt TEXT NOT NULL, laatst TEXT)`,
  `CREATE TABLE IF NOT EXISTS uitdagingen (id TEXT PRIMARY KEY, uitdaging TEXT NOT NULL, email TEXT, verloopt INTEGER NOT NULL)`,
];

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

async function stuurLink(env, email, link) {
  const from = env.INLOG_FROM || env.FEEDBACK_FROM;
  const text = `Klik op de link om in te loggen bij Bankoverzicht:\n\n${link}\n\nDe link is ${LINK_MINUTEN} minuten geldig en werkt één keer. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5"><p>Klik op de knop om in te loggen bij Bankoverzicht.</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Inloggen</a></p>
<p style="color:#555;font-size:13px">De link is ${LINK_MINUTEN} minuten geldig en werkt één keer. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.</p></div>`;
  await verstuur(env, { to: email, from, subject: "Inloggen bij Bankoverzicht", text, html });
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

const pagina = (titel, inhoud, script = "", extraHeaders = {}) =>
  new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titel)} · Bankoverzicht</title><style>${STIJL}</style></head><body><main>${inhoud}</main>
${script ? `<script>${HULP_JS}\n${script}</script>` : ""}</body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...extraHeaders } });

function inlogPagina() {
  return pagina("Inloggen", `
<h1>Inloggen bij Bankoverzicht</h1>
<p class="sub">Heb je al een passkey op dit apparaat? Log dan in met Face ID, Touch ID of de pincode van je apparaat.</p>
<div class="kaart">
  <button id="pk" type="button">Inloggen met passkey</button>
  <p class="of">of ontvang een inloglink per e-mail</p>
  <form id="f" style="display:flex;flex-direction:column;gap:10px">
    <input type="email" name="email" required autocomplete="email username webauthn" placeholder="naam@voorbeeld.nl" aria-label="E-mailadres">
    <button type="submit" class="tweede">Stuur inloglink</button>
  </form>
  <p id="status" role="status"></p>
</div>
<p class="sub">Nieuw? Log in met de link; daarna kun je je aanmelden en een passkey aanmaken.</p>`, `
const pk=document.getElementById("pk");if(!kanPasskey)pk.style.display="none";
pk.addEventListener("click",async()=>{pk.disabled=true;meld("Bezig…");try{
 const o=await post("/api/inloggen/passkey/opties");
 const c=await navigator.credentials.get({publicKey:{challenge:vanB64u(o.uitdaging),rpId:o.rpId,userVerification:"preferred",timeout:60000}});
 await post("/api/inloggen/passkey/login",{uitdagingId:o.id,id:c.id,clientDataJSON:b64u(c.response.clientDataJSON),authenticatorData:b64u(c.response.authenticatorData),signature:b64u(c.response.signature)});
 location.href="/";
}catch(e){meld(e.name==="NotAllowedError"?"Geannuleerd of geen passkey gevonden. Gebruik anders de inloglink.":"Inloggen lukte niet: "+e.message,"err")}finally{pk.disabled=false}});
const f=document.getElementById("f");f.addEventListener("submit",async e=>{e.preventDefault();const k=f.querySelector("button");k.disabled=true;meld("Bezig…");
try{await post("/api/inloggen/link",{email:f.email.value});meld("Als dit adres bekend is of nieuw is, staat er binnen een minuut een inloglink in je mailbox. Kijk ook in je spam.","ok")}
catch(x){meld(x.message,"err")}finally{k.disabled=false}});`);
}

function bevestigPagina(token) {
  return pagina("Inloggen", `
<h1>Inloggen bevestigen</h1>
<div class="kaart"><p class="sub" style="margin:0">Klik op de knop om in te loggen op dit apparaat.</p>
<button id="ok" type="button">Inloggen</button><p id="status" role="status"></p></div>`, `
const t=${JSON.stringify(String(token || "").slice(0, 100))};const k=document.getElementById("ok");
k.addEventListener("click",async()=>{k.disabled=true;meld("Bezig…");try{await post("/api/inloggen/link/bevestig",{t});location.href="/inloggen/passkey"}
catch(e){meld(e.message+" Vraag een nieuwe link aan.","err");setTimeout(()=>location.href="/inloggen",2500)}finally{k.disabled=false}});`);
}

function passkeyPagina(email, aantal) {
  return pagina("Passkey", `
<h1>Sneller inloggen</h1>
<p class="sub">Je bent ingelogd als <b>${esc(email)}</b>.${aantal ? ` Je hebt ${aantal} passkey${aantal === 1 ? "" : "s"}.` : ""}
Maak een passkey aan, dan log je voortaan in met Face ID, Touch ID of de pincode van dit apparaat, zonder e-mail.</p>
<div class="kaart">
  <button id="maak" type="button">Passkey aanmaken</button>
  <a class="knop tweede" href="/">${aantal ? "Naar de app" : "Later, naar de app"}</a>
  <p id="status" role="status"></p>
</div>`, `
const k=document.getElementById("maak");if(!kanPasskey){k.style.display="none";meld("Dit apparaat of deze browser ondersteunt geen passkeys.")}
k.addEventListener("click",async()=>{k.disabled=true;meld("Bezig…");try{
 const o=await post("/api/inloggen/passkey/opties-registratie");
 const c=await navigator.credentials.create({publicKey:{challenge:vanB64u(o.uitdaging),rp:o.rp,user:{id:vanB64u(o.gebruiker.id),name:o.gebruiker.naam,displayName:o.gebruiker.naam},
  pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{residentKey:"required",userVerification:"preferred"},
  excludeCredentials:(o.bestaand||[]).map(id=>({type:"public-key",id:vanB64u(id)})),attestation:"none",timeout:60000}});
 await post("/api/inloggen/passkey/registreer",{uitdagingId:o.id,id:c.id,clientDataJSON:b64u(c.response.clientDataJSON),attestationObject:b64u(c.response.attestationObject)});
 meld("Passkey aangemaakt. Je gaat naar de app…","ok");setTimeout(()=>location.href="/",1200);
}catch(e){meld(e.name==="NotAllowedError"?"Geannuleerd.":e.name==="InvalidStateError"?"Op dit apparaat staat al een passkey voor jou.":"Aanmaken lukte niet: "+e.message,"err")}finally{k.disabled=false}});`);
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
    if (p === "/inloggen") return email ? Response.redirect(`${url.origin}/`, 302) : inlogPagina();
    if (p === "/inloggen/link") return bevestigPagina(url.searchParams.get("t"));
    if (p === "/inloggen/passkey") {
      if (!email) return Response.redirect(`${url.origin}/inloggen`, 302);
      const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM passkeys WHERE email = ?").bind(email).first();
      return passkeyPagina(email, Number(r?.n || 0));
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
