// nieuw-V4R3 — rechten per gebruiker: wie mag de app, de uitgebreide weergave en de bankkoppeling gebruiken?
//
// Drie bronnen, in deze volgorde:
// 1. "BEHEERDERS": e-mailadressen die het beheerscherm mogen openen (en zelf alles mogen).
// 2. "AccessAll": vaste lijst (zoals sinds nieuw-V2R0), krijgt alles.
// 3. D1-database (binding "DB"), tabel "rechten": per e-mailadres Eenvoudig, Uitgebreid en/of bankkoppeling, met een
//    optionele einddatum. Deze tabel vult de beheerder via het beheerscherm; vanaf de betaalstap ook de betaalwebhook.
// Zonder binding DB werkt alles zoals voorheen (alleen de twee lijsten).
// Lijsten: adressen gescheiden door komma's of spaties, "*@domein.nl" voor een heel domein.
//
// nieuw-V4R5 — aanmelden: wie inlogt kan een abonnement aanvragen (Eenvoudig, Uitgebreid, Uitgebreid met bankkoppeling).
// De aanvraag komt in dezelfde tabel (kolommen aanvraag/aangevraagd/naam) en de beheerder keurt hem goed of af.
// Met de variabele TOEGANG_VERPLICHT = "ja" levert de Worker de app alleen aan wie toegang heeft; anderen zien de
// aanmeldpagina (zie aanmeldPagina). Zonder die variabele mag iedereen die via Access binnenkomt Eenvoudig gebruiken.

import { verstuur, opmaakMail, maakInloglink, GOEDKEUR_LINK_UREN } from "./inloggen.js";

const SCHEMA = `CREATE TABLE IF NOT EXISTS rechten (
  email TEXT PRIMARY KEY,
  uitgebreid INTEGER NOT NULL DEFAULT 0,
  koppelen INTEGER NOT NULL DEFAULT 0,
  geldig_tot TEXT,
  bron TEXT NOT NULL DEFAULT 'handmatig',
  notitie TEXT,
  gewijzigd TEXT NOT NULL,
  gewijzigd_door TEXT
)`;
// nieuw-V4R5 — kolommen die later zijn bijgekomen (bestaande tabellen krijgen ze via ALTER TABLE).
const EXTRA_KOLOMMEN = [
  ["eenvoudig", "INTEGER NOT NULL DEFAULT 0"],
  ["aanvraag", "TEXT"],
  ["aangevraagd", "TEXT"],
  ["naam", "TEXT"],
  ["reden", "TEXT"], // nieuw-V5R2 — waarom iemand toegang vraagt (verplicht bij aanmelden)
];

// nieuw-V5R2 — korte uitleg per abonnement, voor de aanmeldpagina en de bevestigingsmail.
export const PLAN_UITLEG = {
  eenvoudig: "in vier stappen je bankbestanden indelen en een indicatie krijgen van je btw en inkomstenbelasting.",
  uitgebreid: "alle tabbladen, controles, de aangifteberekening en het maandoverzicht van je inkomsten en uitgaven.",
  koppelen: "alles van Uitgebreid, en je transacties rechtstreeks bij je bank ophalen in plaats van bestanden te downloaden. De bankkoppeling is nog in ontwikkeling en komt beschikbaar zodra er genoeg gebruikers zijn.",
};
export const PLANNEN = {
  eenvoudig: "Eenvoudig",
  uitgebreid: "Uitgebreid",
  koppelen: "Uitgebreid met bankkoppeling",
};
const NIVEAU = { eenvoudig: 1, uitgebreid: 2, koppelen: 3 };

// nieuw-V4R6 — prijzen per abonnement in euro per maand (inclusief btw). Voorlopig alles €0: aanmelden is gratis en
// de beheerder keurt goed. Later via de variabele PRIJZEN, bijv. {"eenvoudig":0,"uitgebreid":4.95,"koppelen":7.5}.
// Is de prijs hoger dan 0, dan gaat de aanmelding via de betaalstap (Mollie, nog te bouwen) in plaats van direct.
export function prijzen(env) {
  const p = { eenvoudig: 0, uitgebreid: 0, koppelen: 0 };
  try { const x = JSON.parse(env.PRIJZEN || "{}"); for (const k of Object.keys(p)) if (Number.isFinite(+x[k]) && +x[k] >= 0) p[k] = +x[k]; } catch { /* standaard */ }
  return p;
}
const prijsTekst = (bedrag) => (bedrag > 0 ? `€ ${bedrag.toFixed(2).replace(".", ",")} per maand` : "€ 0,00 · voorlopig gratis");

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function opLijst(email, lijst) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  return String(lijst || "").split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
    .some((x) => x === e || (x.startsWith("*@") && e.endsWith(x.slice(1))));
}

export const toegangVerplicht = (env) => ["ja", "true", "1", "aan"].includes(String(env.TOEGANG_VERPLICHT || "").trim().toLowerCase());

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;
const vandaag = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }); // JJJJ-MM-DD
const schoon = (v, max) => String(v ?? "").replace(/[\u0000-\u001F]/g, " ").trim().slice(0, max);
const schoonTekst = (v, max) => String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F]/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
export const MIN_REDEN = 20;

// Tabel één keer per isolate aanmaken en bijwerken: de beheerder hoeft geen SQL uit te voeren.
let tabelKlaar = false;
async function zorgVoorTabel(db) {
  if (tabelKlaar) return;
  await db.prepare(SCHEMA).run();
  const { results } = await db.prepare("PRAGMA table_info(rechten)").all();
  const bestaand = new Set((results || []).map((k) => k.name));
  for (const [naam, type] of EXTRA_KOLOMMEN) {
    if (!bestaand.has(naam)) await db.prepare(`ALTER TABLE rechten ADD COLUMN ${naam} ${type}`).run();
  }
  tabelKlaar = true;
}

const rijNaarRecht = (r) => ({
  email: r.email, eenvoudig: !!r.eenvoudig || !!r.uitgebreid, uitgebreid: !!r.uitgebreid, koppelen: !!r.koppelen,
  geldigTot: r.geldig_tot || null, bron: r.bron, notitie: r.notitie || "", gewijzigd: r.gewijzigd, gewijzigdDoor: r.gewijzigd_door || null,
  aanvraag: r.aanvraag || null, aangevraagd: r.aangevraagd || null, naam: r.naam || "", reden: r.reden || "",
});

// Wat mag deze gebruiker? Uitgebreid geeft ook toegang; koppelen kan alleen samen met Uitgebreid.
export async function rechtenVan(email, env) {
  const e = String(email || "").trim().toLowerCase();
  const open = !toegangVerplicht(env); // zonder slot mag iedereen die via Access binnenkomt de app (Eenvoudig) gebruiken
  const leeg = { toegang: open, uitgebreid: false, koppelen: false, beheerder: false, geldigTot: null, bron: null, aanvraag: null };
  if (!e) return { ...leeg, toegang: false };
  const beheerder = opLijst(e, env.BEHEERDERS);
  if (beheerder || opLijst(e, env.AccessAll)) return { toegang: true, uitgebreid: true, koppelen: true, beheerder, geldigTot: null, bron: beheerder ? "beheerder" : "AccessAll", aanvraag: null };
  if (!env.DB) return leeg;
  try {
    await zorgVoorTabel(env.DB);
    const r = await env.DB.prepare("SELECT * FROM rechten WHERE email = ?").bind(e).first();
    if (!r) return leeg;
    const actief = !r.geldig_tot || r.geldig_tot >= vandaag();
    const uitgebreid = actief && !!r.uitgebreid;
    return {
      toegang: open || uitgebreid || (actief && !!r.eenvoudig), uitgebreid, koppelen: uitgebreid && !!r.koppelen, beheerder: false,
      geldigTot: r.geldig_tot || null, bron: r.bron, verlopen: !actief, aanvraag: r.aanvraag || null, aangevraagd: r.aangevraagd || null,
    };
  } catch (err) {
    console.error("rechten: D1-fout", err?.message);
    return { ...leeg, dbFout: true };
  }
}

// Korte cache voor het toegangsslot: elk bestand van de app gaat langs de Worker, dan niet elke keer naar D1.
const slotCache = new Map();
export async function heeftToegang(email, env) {
  const e = String(email || "").trim().toLowerCase();
  const c = slotCache.get(e);
  if (c && c.tot > Date.now()) return c.r;
  const r = await rechtenVan(e, env);
  if (!r.dbFout) slotCache.set(e, { r, tot: Date.now() + 30_000 });
  if (slotCache.size > 500) slotCache.clear();
  return r;
}

function controleerPost(request, url) {
  // Alleen JSON van de app zelf (een formulier van een andere site kan dit niet nabootsen).
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ ok: false, fout: "Verkeerde herkomst" }, 403);
  if (!String(request.headers.get("content-type") || "").includes("application/json")) return json({ ok: false, fout: "Alleen JSON" }, 415);
  return null;
}

// nieuw-V4R8 — de aanvrager krijgt een e-mail als de beheerder de aanvraag goedkeurt of afwijst.
// Een mislukte mail maakt de beslissing niet ongedaan; het beheerscherm meldt het wel.
async function meldAanvrager(env, doel, onderwerp, regels, knop, naam = "", lijst = [], naLijst = []) {
  const from = env.INLOG_FROM || env.FEEDBACK_FROM;
  if ((!env.EMAIL && !env.RESEND_API_KEY) || !from) return "geen afzender ingesteld";
  const { text, html } = opmaakMail(env, { naam, zonderNaam: "Beste aanvrager,", regels, knop, lijst, naLijst });
  try { await verstuur(env, { to: doel, from, subject: `Bankoverzicht: ${onderwerp}`, text, html }); return null; }
  catch (e) { console.error("aanvrager: e-mail mislukt", e?.message); return String(e?.message || e).slice(0, 200); }
}

async function meldBeheerder(env, onderwerp, tekst) {
  const from = env.INLOG_FROM || env.FEEDBACK_FROM;
  if (!env.EMAIL || !env.FEEDBACK_TO || !from) return;
  try { await env.EMAIL.send({ to: env.FEEDBACK_TO, from, subject: `[Bankoverzicht] ${onderwerp}`, text: tekst }); }
  catch (e) { console.error("aanmelden: e-mail mislukt", e?.message); }
}

// /api/aanmelden — GET: stand van zaken; POST {plan, naam}: abonnement aanvragen.
export async function aanmeldRoute(request, env, url, email, ctx) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return json({ ok: false, fout: "Niet ingelogd" }, 401);
  if (request.method === "GET") return json({ ok: true, email: e, ...(await rechtenVan(e, env)) });
  if (request.method !== "POST") return json({ ok: false, fout: "Alleen GET of POST" }, 405);
  const fout = controleerPost(request, url);
  if (fout) return fout;
  if (!env.DB) return json({ ok: false, fout: "Aanmelden is nog niet beschikbaar (database niet gekoppeld)" }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
  const plan = String(body?.plan || "");
  if (!PLANNEN[plan]) return json({ ok: false, fout: "Kies een abonnement" }, 400);
  // nieuw-V5R4 — voor- en achternaam verplicht (samen opgeslagen in de kolom naam).
  const voornaam = schoon(body?.voornaam, 60);
  const achternaam = schoon(body?.achternaam, 80);
  if (!voornaam || !achternaam) return json({ ok: false, fout: "Vul je voornaam en achternaam in." }, 400);
  const naam = `${voornaam} ${achternaam}`;
  const reden = schoonTekst(body?.reden, 1000);
  if (reden.length < MIN_REDEN) return json({ ok: false, fout: `Geef aan waarom je toegang vraagt en waarvoor je de app wilt gebruiken (minimaal ${MIN_REDEN} tekens).` }, 400);
  // nieuw-V4R6 — betaalstap. Bij prijs 0 (zoals nu) gaat de aanvraag direct naar de beheerder.
  if (prijzen(env)[plan] > 0) {
    // Hier komt de Mollie-betaling: /api/betaal/start maakt een betaling en stuurt de gebruiker naar Mollie; de webhook
    // zet daarna de rechten. Zolang dat er niet is, kan een betaald abonnement niet worden aangevraagd.
    return json({ ok: false, betalen: true, fout: "Betalen is nog niet beschikbaar. Neem contact op met de beheerder." }, 402);
  }
  const nu = await rechtenVan(e, env);
  const huidig = nu.koppelen ? 3 : nu.uitgebreid ? 2 : nu.toegang && toegangVerplicht(env) ? 1 : 0;
  if (huidig >= NIVEAU[plan]) return json({ ok: true, alActief: true, melding: `Je hebt ${PLANNEN[plan]} al.` });
  try {
    await zorgVoorTabel(env.DB);
    const tijd = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO rechten (email, gewijzigd, gewijzigd_door, bron, aanvraag, aangevraagd, naam, reden)
       VALUES (?1, ?2, ?1, 'aanmelding', ?3, ?2, ?4, ?5)
       ON CONFLICT(email) DO UPDATE SET aanvraag = ?3, aangevraagd = ?2, naam = ?4, reden = ?5`
    ).bind(e, tijd, plan, naam, reden).run();
    slotCache.delete(e);
  } catch (err) {
    return json({ ok: false, fout: "Databasefout", detail: String(err?.message || err).slice(0, 300) }, 500);
  }
  const mail = meldBeheerder(env, `Nieuwe aanmelding: ${PLANNEN[plan]}`,
    `${naam || "(geen naam)"} <${e}> vraagt ${PLANNEN[plan]} aan.\n\nReden:\n${reden}\n\nKeur de aanvraag goed in de app: Gebruikers en rechten (personen-icoon onderin de zijbalk).`);
  // nieuw-V5R2 — bevestiging aan de aanvrager, met een korte uitleg van de drie abonnementen.
  const bevestiging = meldAanvrager(env, e, "je aanvraag is ontvangen", [
    `Bedankt voor je aanvraag voor ${PLANNEN[plan]} bij Bankoverzicht, de app die je inzicht geeft in je bankgegevens en overzichten maakt van je inkomsten en uitgaven.`,
    "Ter herinnering, dit zijn de drie abonnementen:",
  ], null, naam, Object.entries(PLANNEN).map(([k, v]) => [v, PLAN_UITLEG[k]]), [
    "Ik beoordeel je aanvraag zo snel mogelijk. Je krijgt een e-mail zodra hij is goedgekeurd; daarna kun je meteen aan de slag.",
    "Heb je vragen? Beantwoord dan gerust deze e-mail.",
  ]);
  if (ctx?.waitUntil) { ctx.waitUntil(mail); ctx.waitUntil(bevestiging); } else { await mail; await bevestiging; }
  return json({ ok: true, aangevraagd: plan });
}

// De pagina die iemand zonder toegang ziet als TOEGANG_VERPLICHT aan staat. Op zichzelf staand (geen app-bestanden nodig).
export function aanmeldPagina(email, r, env = {}) {
  const prijs = prijzen(env);
  const keuzes = Object.entries(PLANNEN).map(([k, v], i) => `
    <label class="keuze"><input type="radio" name="plan" value="${k}"${i === 0 ? " checked" : ""}>
      <span><b>${v}</b> <span class="prijs">${prijsTekst(prijs[k])}</span><small>${{
        eenvoudig: "In vier stappen je bankbestanden indelen en een indicatie van je btw- en inkomstenbelasting.",
        uitgebreid: "Alle tabbladen, controles, aangifteberekening en maandoverzicht.",
        koppelen: "Uitgebreid, en je transacties rechtstreeks bij je bank ophalen in plaats van bestanden te downloaden. De bankkoppeling is nog in ontwikkeling en komt beschikbaar zodra er genoeg gebruikers zijn.",
      }[k]}</small></span></label>`).join("");
  const loopt = r?.aanvraag && PLANNEN[r.aanvraag]
    ? `<p class="melding">Je aanvraag voor <b>${esc(PLANNEN[r.aanvraag])}</b> is ontvangen${r.aangevraagd ? ` op ${esc(new Date(r.aangevraagd).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" }))}` : ""}. Zodra hij is goedgekeurd, krijg je een e-mail met een knop om in te loggen. Je kunt dit tabblad nu sluiten. Wil je toch een ander abonnement, kies het dan hieronder.</p>`
    : "";
  return new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aanmelden · Bankoverzicht</title>
<style>
:root{--bg:#f6f8f7;--fg:#0f172a;--muted:#475569;--card:#fff;--line:#d8e2de;--accent:#0f766e;--ok:#065f46;--okbg:#ecfdf5;--err:#b42318}
@media (prefers-color-scheme:dark){:root{--bg:#0f1715;--fg:#e4ece9;--muted:#9aaba5;--card:#16211e;--line:#2a3833;--accent:#2fb3a6;--ok:#a7f3d0;--okbg:#0b2b22;--err:#f97066}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif}
main{max-width:560px;margin:0 auto;padding:32px 16px;display:flex;flex-direction:column;gap:16px}
h1{margin:0;font-size:1.4rem}.sub{margin:0;color:var(--muted)}
form,.melding{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
form{display:flex;flex-direction:column;gap:10px}
.keuze{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:10px;cursor:pointer}
.keuze small{display:block;color:var(--muted)}.prijs{color:var(--accent);font-weight:600;font-size:13px}
textarea{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);resize:vertical}
.namen{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:420px){.namen{grid-template-columns:1fr}}
.hint{display:block;color:var(--muted);font-size:13px;margin-top:4px}
input[type=text]{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}
button{font:inherit;font-weight:600;background:var(--accent);color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer;align-self:flex-start}
button[disabled]{opacity:.6}.melding{background:var(--okbg);color:var(--ok)}#status.err{color:var(--err)}
a{color:var(--accent)}
</style></head><body><main>
<h1>Aanmelden voor Bankoverzicht</h1>
<p class="sub">Je bent ingelogd als <b>${esc(email)}</b>. Kies een abonnement en vertel kort waarom je toegang vraagt; de beheerder keurt je aanmelding goed en je krijgt daarover een e-mail.</p>
${loopt}
<form id="f">
${keuzes}
<div class="namen"><label>Voornaam<br><input type="text" name="voornaam" required maxlength="60" autocomplete="given-name" style="width:100%;box-sizing:border-box"></label>
<label>Achternaam<br><input type="text" name="achternaam" required maxlength="80" autocomplete="family-name" style="width:100%;box-sizing:border-box"></label></div>
<label>Waarom vraag je toegang aan? (verplicht)<br><textarea name="reden" required minlength="${MIN_REDEN}" maxlength="1000" rows="4" placeholder="Bijvoorbeeld: ik ben zzp'er en wil mijn zakelijke rekening indelen voor de btw-aangifte." style="width:100%;box-sizing:border-box"></textarea>
<small class="hint">Vertel kort wie je bent en waarvoor je de app wilt gebruiken. Zonder duidelijke reden kan ik je aanvraag niet goedkeuren.</small></label>
<button type="submit">Aanmelding versturen</button>
<p id="status" role="status"></p>
</form>
<p class="sub">Ander e-mailadres? <a href="/uitloggen">Uitloggen</a></p>
</main><script>
const f=document.getElementById("f"),st=document.getElementById("status");
f.addEventListener("submit",async(e)=>{e.preventDefault();const k=f.querySelector("button");k.disabled=true;st.className="";st.textContent="Bezig…";
try{const r=await fetch("/api/aanmelden",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({plan:f.plan.value,voornaam:f.voornaam.value,achternaam:f.achternaam.value,reden:f.reden.value})});
const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.fout||("Fout "+r.status));
if(d.alActief){location.reload();return}st.textContent="Je aanmelding is verstuurd. Je krijgt een e-mail zodra de beheerder hem heeft beoordeeld. Je kunt dit tabblad daarna sluiten.";setTimeout(()=>location.reload(),2500)}
catch(x){st.className="err";st.textContent="Versturen lukte niet: "+x.message}finally{k.disabled=false}});
</script></body></html>`, { status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

// /api/beheer/* — alleen voor adressen in BEHEERDERS.
export async function beheerRoute(request, env, url, email) {
  if (!opLijst(email, env.BEHEERDERS)) return json({ ok: false, fout: "Alleen voor beheerders" }, 403);
  if (!env.DB) return json({ ok: false, fout: "De database is nog niet gekoppeld (binding DB ontbreekt in de Worker)" }, 503);
  if (request.method === "POST") {
    const fout = controleerPost(request, url);
    if (fout) return fout;
  }
  try {
    await zorgVoorTabel(env.DB);
    if (url.pathname === "/api/beheer/rechten" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM rechten ORDER BY aanvraag IS NULL, aangevraagd DESC, email").all();
      return json({ ok: true, vandaag: vandaag(), slot: toegangVerplicht(env), rechten: (results || []).map(rijNaarRecht) });
    }
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
    const doel = String(body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(doel) || doel.length > 200) return json({ ok: false, fout: "Ongeldig e-mailadres" }, 400);
    const tijd = new Date().toISOString();
    const door = String(email).toLowerCase();
    slotCache.delete(doel);

    if (url.pathname === "/api/beheer/rechten" && request.method === "POST") {
      const geldigTot = body?.geldigTot ? String(body.geldigTot) : null;
      if (geldigTot && !DATUM_RE.test(geldigTot)) return json({ ok: false, fout: "Einddatum moet JJJJ-MM-DD zijn" }, 400);
      const uitgebreid = body?.uitgebreid ? 1 : 0;
      const eenvoudig = uitgebreid || body?.eenvoudig ? 1 : 0;
      const koppelen = uitgebreid && body?.koppelen ? 1 : 0;
      const notitie = schoon(body?.notitie, 300);
      await env.DB.prepare(
        `INSERT INTO rechten (email, eenvoudig, uitgebreid, koppelen, geldig_tot, bron, notitie, gewijzigd, gewijzigd_door)
         VALUES (?1, ?2, ?3, ?4, ?5, 'handmatig', ?6, ?7, ?8)
         ON CONFLICT(email) DO UPDATE SET eenvoudig = ?2, uitgebreid = ?3, koppelen = ?4, geldig_tot = ?5, notitie = ?6, gewijzigd = ?7, gewijzigd_door = ?8`
      ).bind(doel, eenvoudig, uitgebreid, koppelen, geldigTot, notitie, tijd, door).run();
      return json({ ok: true });
    }
    // nieuw-V4R5 — aanvraag goedkeuren: rechten volgens het gevraagde abonnement, de aanvraag vervalt.
    if (url.pathname === "/api/beheer/goedkeuren" && request.method === "POST") {
      const r = await env.DB.prepare("SELECT aanvraag, naam FROM rechten WHERE email = ?").bind(doel).first();
      const plan = r?.aanvraag;
      if (!PLANNEN[plan]) return json({ ok: false, fout: "Geen openstaande aanvraag" }, 404);
      const n = NIVEAU[plan];
      await env.DB.prepare(
        `UPDATE rechten SET eenvoudig = 1, uitgebreid = MAX(uitgebreid, ?2), koppelen = MAX(koppelen, ?3),
         aanvraag = NULL, gewijzigd = ?4, gewijzigd_door = ?5 WHERE email = ?1`
      ).bind(doel, n >= 2 ? 1 : 0, n >= 3 ? 1 : 0, tijd, door).run();
      // nieuw-V5R7 — met eigen inlog zit er een inloglink in de mail: de knop logt meteen in en biedt dan de passkey aan.
      let link = null;
      try { link = await maakInloglink(env, doel, url.origin); } catch { /* dan de gewone knop naar de app */ }
      const mailFout = await meldAanvrager(env, doel, "je aanmelding is goedgekeurd", link
        ? [`Goed nieuws: je aanmelding voor ${PLANNEN[plan]} is goedgekeurd. Je kunt Bankoverzicht nu gebruiken.`,
          "Klik op de knop om in te loggen. Daarna stel je een wachtwoord in, of maak je een passkey aan zodat je inlogt met Face ID, Touch ID of de pincode van je apparaat."]
        : [`Goed nieuws: je aanmelding voor ${PLANNEN[plan]} is goedgekeurd. Je kunt Bankoverzicht nu gebruiken.`],
        { link: link || `${url.origin}/`, tekst: link ? "Inloggen en wachtwoord instellen" : "Open Bankoverzicht" }, r?.naam || "", [],
        link ? [`De knop is ${GOEDKEUR_LINK_UREN / 24} dagen geldig en werkt één keer. Daarna vraag je op de inlogpagina een nieuwe inloglink aan.`] : []);
      return json({ ok: true, mailFout });
    }
    if (url.pathname === "/api/beheer/afwijzen" && request.method === "POST") {
      const r = await env.DB.prepare("SELECT aanvraag, naam FROM rechten WHERE email = ?").bind(doel).first();
      await env.DB.prepare("UPDATE rechten SET aanvraag = NULL, reden = NULL, gewijzigd = ?2, gewijzigd_door = ?3 WHERE email = ?1").bind(doel, tijd, door).run();
      // Een rij die alleen uit een aanvraag bestond, heeft geen nut meer.
      await env.DB.prepare("DELETE FROM rechten WHERE email = ?1 AND eenvoudig = 0 AND uitgebreid = 0 AND koppelen = 0 AND aanvraag IS NULL").bind(doel).run();
      const mailFout = PLANNEN[r?.aanvraag] ? await meldAanvrager(env, doel, "over je aanvraag",
        [`Bedankt voor je aanvraag voor ${PLANNEN[r.aanvraag]} bij Bankoverzicht.`,
          "Helaas kan ik je aanvraag op dit moment niet goedkeuren, omdat er te weinig informatie is gegeven om je toegang tot de app te geven.",
          "Je kunt op deze e-mail reageren met de vraag wat er ontbreekt. Je kunt ook meteen meer informatie sturen over waarom je toegang vraagt en waarvoor je de app wilt gebruiken. Daarna bekijk ik je aanvraag opnieuw."],
        null, r?.naam || "") : null;
      return json({ ok: true, mailFout });
    }
    if (url.pathname === "/api/beheer/verwijder" && request.method === "POST") {
      await env.DB.prepare("DELETE FROM rechten WHERE email = ?").bind(doel).run();
      // nieuw-V5R6 — ook uitloggen: sessies, openstaande inloglinks en passkeys van dit adres weg.
      for (const t of ["sessies", "inloglinks", "passkeys", "wachtwoorden", "voorwaarden_akkoord"]) {
        try { await env.DB.prepare(`DELETE FROM ${t} WHERE email = ?`).bind(doel).run(); } catch { /* tabel bestaat (nog) niet */ }
      }
      slotCache.delete(doel);
      return json({ ok: true });
    }
    return json({ ok: false, fout: "Onbekende route" }, 404);
  } catch (err) {
    return json({ ok: false, fout: "Databasefout", detail: String(err?.message || err).slice(0, 300) }, 500);
  }
}

// nieuw-V5R9 — akkoord met de gebruiksvoorwaarden op de server, per e-mailadres en versie. Voorheen alleen in de browser
// (localStorage); de app die je via het beginscherm-icoon opent heeft op de iPad eigen opslag, en die raakt soms leeg.
const VOORWAARDEN_SCHEMA = "CREATE TABLE IF NOT EXISTS voorwaarden_akkoord (email TEXT PRIMARY KEY, versie TEXT NOT NULL, tijd TEXT NOT NULL)";
export async function voorwaardenVan(email, env) {
  if (!email || !env.DB) return null;
  try {
    await env.DB.prepare(VOORWAARDEN_SCHEMA).run();
    return (await env.DB.prepare("SELECT versie FROM voorwaarden_akkoord WHERE email = ?").bind(String(email).toLowerCase()).first())?.versie || null;
  } catch { return null; }
}
export async function voorwaardenRoute(request, env, url, email) {
  if (request.method !== "POST") return json({ ok: false, fout: "Alleen POST" }, 405);
  const fout = controleerPost(request, url);
  if (fout) return fout;
  if (!email) return json({ ok: false, fout: "Niet ingelogd" }, 401);
  if (!env.DB) return json({ ok: false, fout: "Database niet gekoppeld" }, 503);
  let body = {};
  try { body = await request.json(); } catch { /* leeg */ }
  const versie = schoon(body?.versie, 10);
  if (!versie) return json({ ok: false, fout: "Versie ontbreekt" }, 400);
  await env.DB.prepare(VOORWAARDEN_SCHEMA).run();
  await env.DB.prepare(`INSERT INTO voorwaarden_akkoord (email, versie, tijd) VALUES (?1, ?2, ?3)
    ON CONFLICT(email) DO UPDATE SET versie = ?2, tijd = ?3`).bind(String(email).toLowerCase(), versie, new Date().toISOString()).run();
  return json({ ok: true });
}

// nieuw-V4R5 — aantal openstaande aanvragen, voor de teller bij het personen-icoon van de beheerder.
export async function telAanvragen(env) {
  if (!env.DB) return 0;
  try {
    await zorgVoorTabel(env.DB);
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM rechten WHERE aanvraag IS NOT NULL").first();
    return Number(r?.n || 0);
  } catch { return 0; }
}
