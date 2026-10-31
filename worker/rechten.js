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
import { logBeheer, leesLogboek, beschrijfRechten, telLogboek, logboekGrens, exporteerLogboek, schoonLogboekOp, controleerLogboekGrootte } from "./logboek.js";
import { schoonPeiling, bewaarPeiling, leesPeiling, wisPeiling, BETALEN } from "./peiling.js";

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
  // beide-V1R0 — zakelijk en privé zijn aparte abonnementen. De bestaande kolommen eenvoudig/uitgebreid/koppelen/geldig_tot
  // zijn zakelijk; privé heeft eigen kolommen. "gebruik" = welke soort(en) het account heeft (zakelijk, prive of beide),
  // "aanvraag_gebruik" = voor welke soort de openstaande aanvraag is.
  ["gebruik", "TEXT"],
  ["aanvraag_gebruik", "TEXT"],
  ["prive_eenvoudig", "INTEGER NOT NULL DEFAULT 0"],
  ["prive_uitgebreid", "INTEGER NOT NULL DEFAULT 0"],
  ["prive_koppelen", "INTEGER NOT NULL DEFAULT 0"],
  ["prive_geldig_tot", "TEXT"],
  // beide-V7R1 — telefoonnummer (verplicht bij aanmelden, alleen om te controleren of de aanvraag echt is; wordt gewist
  // bij goedkeuren of afwijzen, en na TELEFOON_DAGEN bij een aanvraag die blijft liggen) en organisatie (optioneel).
  ["telefoon", "TEXT"],
  ["organisatie", "TEXT"],
  // beide-V7R3 — gratis abonnement loopt GRATIS_DAGEN; "verlenging" = de open aanvraag is een verzoek om te verlengen;
  // herinnerd/prive_herinnerd = voor welke einddatum de herinneringsmail al is verstuurd (zodat hij één keer komt).
  ["verlenging", "INTEGER NOT NULL DEFAULT 0"],
  ["herinnerd", "TEXT"],
  ["prive_herinnerd", "TEXT"],
  // beide-V12R0 — laatste dag dat iemand de app opende (/api/rol), voor "30+ dagen niet ingelogd" in Beheer.
  ["laatst_gezien", "TEXT"],
];
// beide-V7R3 — een gratis abonnement loopt 30 dagen (besluit Boska 26-10), daarna verlengen met één knop. Afwijken kan
// met de variabele GRATIS_DAGEN (0 = zonder einddatum, zoals vóór V7R3). HERINNER_DAGEN vóór het einde komt er een mail.
export const GRATIS_DAGEN = 30;
export const HERINNER_DAGEN = 10;
export const gratisDagen = (env) => {
  const n = Number(String(env?.GRATIS_DAGEN ?? "").trim());
  return String(env?.GRATIS_DAGEN ?? "").trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 3650 ? n : GRATIS_DAGEN;
};
// JJJJ-MM-DD plus een aantal dagen.
export const plusDagen = (iso, dagen) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dagen);
  return d.toISOString().slice(0, 10);
};
export const TELEFOON_DAGEN = 30;
// Telefoonnummers wissen die niet meer nodig zijn: geen open aanvraag meer, of een aanvraag ouder dan TELEFOON_DAGEN.
export async function wisOudeTelefoons(db, nu = Date.now()) {
  const grens = new Date(nu - TELEFOON_DAGEN * 86400000).toISOString();
  await db.prepare("UPDATE rechten SET telefoon = NULL WHERE telefoon IS NOT NULL AND (aanvraag IS NULL OR aangevraagd < ?)").bind(grens).run();
}
// Nederlands of buitenlands nummer: cijfers, spaties, streepjes, haakjes en een + vooraan; 10 tot 15 cijfers.
export function schoonTelefoon(v) {
  const t = String(v ?? "").trim().slice(0, 30);
  if (!/^\+?[\d\s\-()]+$/.test(t)) return null;
  const cijfers = t.replace(/\D/g, "");
  return cijfers.length >= 10 && cijfers.length <= 15 ? t.replace(/\s+/g, " ") : null;
}

// beide-V1R0 — de twee soorten gebruik en de kolommen per soort.
export const GEBRUIK = { zakelijk: "Zakelijk", prive: "Privé" };
export const GEBRUIK_UITLEG = { zakelijk: "eenmanszaak, zzp of BV", prive: "particulier huishouden, zonder onderneming" };
const KOLOM = {
  zakelijk: { eenvoudig: "eenvoudig", uitgebreid: "uitgebreid", koppelen: "koppelen", geldigTot: "geldig_tot", herinnerd: "herinnerd" },
  prive: { eenvoudig: "prive_eenvoudig", uitgebreid: "prive_uitgebreid", koppelen: "prive_koppelen", geldigTot: "prive_geldig_tot", herinnerd: "prive_herinnerd" },
};
const heeftSoort = (s) => `(${KOLOM[s].eenvoudig} = 1 OR ${KOLOM[s].uitgebreid} = 1)`;
// "gebruik" volgt uit de rechten; wie (nog) niets heeft, krijgt de soort van de aanvraag.
const GEBRUIK_SQL = `CASE WHEN ${heeftSoort("zakelijk")} AND ${heeftSoort("prive")} THEN 'beide'
  WHEN ${heeftSoort("prive")} THEN 'prive' WHEN ${heeftSoort("zakelijk")} THEN 'zakelijk' ELSE aanvraag_gebruik END`;
const werkGebruikBij = (db, email) => db.prepare(`UPDATE rechten SET gebruik = ${GEBRUIK_SQL} WHERE email = ?`).bind(email).run();

// nieuw-V5R2 — korte uitleg per abonnement, voor de aanmeldpagina en de bevestigingsmail.
// beide-V1R0 — per soort gebruik.
export const PLAN_UITLEG = {
  zakelijk: {
    eenvoudig: "in vier stappen de bankbestanden indelen en een indicatie krijgen van de btw en inkomstenbelasting.",
    uitgebreid: "alle tabbladen, controles, de aangifteberekening en het maandoverzicht van de inkomsten en uitgaven.",
    koppelen: "alles van Uitgebreid, en de transacties rechtstreeks bij de bank ophalen in plaats van bestanden te downloaden. De bankkoppeling is nog in ontwikkeling en komt beschikbaar zodra er genoeg gebruikers zijn.",
  },
  prive: {
    eenvoudig: "in vier stappen de bankbestanden indelen en een overzicht krijgen van de inkomsten en uitgaven per maand.",
    uitgebreid: "alle tabbladen: budget per maand en categorie, vaste lasten, sparen en een indicatie van de inkomstenbelasting (ook eigen woning en box 3).",
    koppelen: "alles van Uitgebreid, en de transacties rechtstreeks bij de bank ophalen in plaats van bestanden te downloaden. De bankkoppeling is nog in ontwikkeling en komt beschikbaar zodra er genoeg gebruikers zijn.",
  },
};
export const PLANNEN = {
  eenvoudig: "Eenvoudig",
  uitgebreid: "Uitgebreid",
  koppelen: "Uitgebreid met bankkoppeling",
};
const NIVEAU = { eenvoudig: 1, uitgebreid: 2, koppelen: 3 };
// beide-V5R8 — de bankkoppeling staat standaard uit, voor zakelijk en privé (besluit Boska 25-10). Aanzetten met de
// variabele BANKKOPPELING = "aan". Staat hij uit, dan is "Uitgebreid met bankkoppeling" niet aan te vragen, heeft
// niemand (ook de beheerder niet) het recht "koppelen" en weigert de Worker /api/bank/ en /bank/terug.
// beide-V5R9 — BANKKOPPELING = "beheerders": alleen de adressen in BEHEERDERS kunnen koppelen (om zelf in productie te
// testen); voor anderen blijft alles zoals bij "uit" (geen knoppen, niet aan te vragen).
const schakelaar = (env) => String(env?.BANKKOPPELING || "").trim().toLowerCase();
export const bankkoppelingAan = (env) => schakelaar(env) === "aan";
export const bankkoppelingVoor = (env, beheerder) => bankkoppelingAan(env) || (schakelaar(env) === "beheerders" && !!beheerder);
export const bankkoppelingHelemaalUit = (env) => !bankkoppelingAan(env) && schakelaar(env) !== "beheerders";
export const plannenVoor = (env) => (bankkoppelingAan(env) ? PLANNEN : { eenvoudig: PLANNEN.eenvoudig, uitgebreid: PLANNEN.uitgebreid });
function zonderKoppelen(r, env) {
  if (!r || bankkoppelingVoor(env, r.beheerder)) return r;
  const soorten = r.soorten ? Object.fromEntries(Object.entries(r.soorten).map(([s, x]) => [s, { ...x, koppelen: false }])) : r.soorten;
  return { ...r, koppelen: false, soorten };
}
export const planNaam = (gebruik, plan) => `${GEBRUIK[gebruik] || GEBRUIK.zakelijk} · ${PLANNEN[plan] || plan}`;
const geldigGebruik = (g) => (GEBRUIK[g] ? g : null);

// nieuw-V4R6 — prijzen per abonnement in euro per maand (inclusief btw). Voorlopig alles €0: aanmelden is gratis en
// de beheerder keurt goed. Later via de variabele PRIJZEN, bijv. {"eenvoudig":0,"uitgebreid":4.95,"koppelen":7.5}.
// Is de prijs hoger dan 0, dan gaat de aanmelding via de betaalstap (Mollie, nog te bouwen) in plaats van direct.
// beide-V1R0 — prijzen per soort: {"zakelijk":{...},"prive":{...}}. De oude vorm zonder soort geldt voor zakelijk.
export function prijzen(env) {
  const p = { zakelijk: { eenvoudig: 0, uitgebreid: 0, koppelen: 0 }, prive: { eenvoudig: 0, uitgebreid: 0, koppelen: 0 } };
  let x = {};
  try { x = JSON.parse(env.PRIJZEN || "{}") || {}; } catch { /* standaard */ }
  const vul = (doel, bron) => { for (const k of Object.keys(doel)) if (bron && Number.isFinite(+bron[k]) && +bron[k] >= 0 && bron[k] !== null && bron[k] !== "") doel[k] = +bron[k]; };
  vul(p.zakelijk, x.zakelijk && typeof x.zakelijk === "object" ? x.zakelijk : x);
  vul(p.prive, x.prive && typeof x.prive === "object" ? x.prive : {});
  return p;
}
export const prijsTekst = (bedrag) => (bedrag > 0 ? `€ ${bedrag.toFixed(2).replace(".", ",")} per maand` : "€ 0,00 · voorlopig gratis");

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
// beide-V1R0 — per database bijgehouden (de binding is per isolate hetzelfde object; in de tests elke keer een nieuwe).
const tabelKlaar = new WeakSet();
async function zorgVoorTabel(db) {
  if (tabelKlaar.has(db)) return;
  await db.prepare(SCHEMA).run();
  const { results } = await db.prepare("PRAGMA table_info(rechten)").all();
  const bestaand = new Set((results || []).map((k) => k.name));
  for (const [naam, type] of EXTRA_KOLOMMEN) {
    if (!bestaand.has(naam)) await db.prepare(`ALTER TABLE rechten ADD COLUMN ${naam} ${type}`).run();
  }
  // beide-V1R0 — alles van vóór de privémodus is zakelijk.
  if (!bestaand.has("gebruik")) {
    await db.prepare("UPDATE rechten SET aanvraag_gebruik = 'zakelijk' WHERE aanvraag IS NOT NULL AND aanvraag_gebruik IS NULL").run();
    await db.prepare(`UPDATE rechten SET gebruik = ${GEBRUIK_SQL} WHERE gebruik IS NULL`).run();
  }
  tabelKlaar.add(db);
}

// Ruwe rechten van één soort uit een rij (zonder te kijken of ze verlopen zijn).
const soortUitRij = (r, s) => {
  const k = KOLOM[s];
  return { eenvoudig: !!r[k.eenvoudig] || !!r[k.uitgebreid], uitgebreid: !!r[k.uitgebreid], koppelen: !!r[k.uitgebreid] && !!r[k.koppelen], geldigTot: r[k.geldigTot] || null };
};
// Wat iemand vandaag mag binnen één soort.
const soortActief = (r, s, nu = vandaag()) => {
  const x = soortUitRij(r, s);
  const actief = !x.geldigTot || x.geldigTot >= nu;
  // beide-V7R3 — niveauRuw: welk abonnement iemand heeft of had (ook na het einde), om te kunnen verlengen.
  return { eenvoudig: actief && x.eenvoudig, uitgebreid: actief && x.uitgebreid, koppelen: actief && x.koppelen, geldigTot: x.geldigTot, verlopen: !actief && x.eenvoudig, niveauRuw: niveauVan(x) };
};
const ALLES = { eenvoudig: true, uitgebreid: true, koppelen: true, geldigTot: null, verlopen: false };
const NIETS = { eenvoudig: false, uitgebreid: false, koppelen: false, geldigTot: null, verlopen: false };

export const rijNaarRecht = (r) => {
  const zakelijk = soortUitRij(r, "zakelijk"), prive = soortUitRij(r, "prive");
  return {
    email: r.email, zakelijk, prive,
    // Samen over beide soorten (voor wie alleen wil weten of iemand iets heeft).
    eenvoudig: zakelijk.eenvoudig || prive.eenvoudig, uitgebreid: zakelijk.uitgebreid || prive.uitgebreid, koppelen: zakelijk.koppelen || prive.koppelen,
    geldigTot: zakelijk.geldigTot || null, gebruik: r.gebruik || null, aanvraagGebruik: r.aanvraag ? (r.aanvraag_gebruik || "zakelijk") : null,
    bron: r.bron, notitie: r.notitie || "", gewijzigd: r.gewijzigd, gewijzigdDoor: r.gewijzigd_door || null,
    telefoon: r.telefoon || null, organisatie: r.organisatie || "", verlenging: !!r.verlenging && !!r.aanvraag,
    aanvraag: r.aanvraag || null, aangevraagd: r.aangevraagd || null, naam: r.naam || "", reden: r.reden || "",
    laatstGezien: r.laatst_gezien || null,
  };
};

// beide-V12R0 — onthoud de dag waarop iemand de app opent. Hooguit één keer per dag per adres naar de database
// (per isolate onthouden), en alleen voor wie al in de lijst staat.
const gezienVandaag = new Map();
export async function registreerGezien(env, email) {
  const e = String(email || "").trim().toLowerCase();
  const dag = vandaag();
  if (!e || !env.DB || gezienVandaag.get(e) === dag) return;
  gezienVandaag.set(e, dag);
  await zorgVoorTabel(env.DB);
  await env.DB.prepare("UPDATE rechten SET laatst_gezien = ? WHERE email = ? AND (laatst_gezien IS NULL OR laatst_gezien < ?)").bind(dag, e, dag).run();
}

// Hoogste niveau binnen één soort: 0 niets, 1 Eenvoudig, 2 Uitgebreid, 3 met bankkoppeling.
export const niveauVan = (x) => (x?.koppelen ? 3 : x?.uitgebreid ? 2 : x?.eenvoudig ? 1 : 0);

// Wat mag deze gebruiker? Uitgebreid geeft ook toegang; koppelen kan alleen samen met Uitgebreid.
// beide-V1R0 — per soort (zakelijk, prive) in "soorten"; toegang/uitgebreid/koppelen bovenaan gelden voor "minstens één soort".
export function rechtenUitRij(r, { open = false, nu = vandaag() } = {}) {
  const leegSoort = open ? { ...NIETS, eenvoudig: true } : NIETS;
  if (!r) return { toegang: open, uitgebreid: false, koppelen: false, beheerder: false, geldigTot: null, bron: null, aanvraag: null, aanvraagGebruik: null, gebruik: null, soorten: { zakelijk: leegSoort, prive: leegSoort } };
  const soorten = {};
  for (const s of Object.keys(GEBRUIK)) {
    const x = soortActief(r, s, nu);
    soorten[s] = open && !x.eenvoudig ? { ...x, eenvoudig: true } : x; // zonder slot mag iedereen Eenvoudig
  }
  const z = soorten.zakelijk, p = soorten.prive;
  const hadIets = soortUitRij(r, "zakelijk").eenvoudig || soortUitRij(r, "prive").eenvoudig;
  return {
    toegang: open || z.eenvoudig || p.eenvoudig, uitgebreid: z.uitgebreid || p.uitgebreid, koppelen: z.koppelen || p.koppelen, beheerder: false,
    geldigTot: z.geldigTot || p.geldigTot || null, bron: r.bron, verlopen: hadIets && !z.eenvoudig && !p.eenvoudig && (z.verlopen || p.verlopen),
    aanvraag: r.aanvraag || null, aanvraagGebruik: r.aanvraag ? (r.aanvraag_gebruik || "zakelijk") : null, aangevraagd: r.aangevraagd || null,
    verlenging: !!r.verlenging && !!r.aanvraag, gebruik: r.gebruik || null, naam: r.naam || "", organisatie: r.organisatie || "", soorten,
  };
}

export async function rechtenVan(email, env) {
  return zonderKoppelen(await rechtenZonderSchakelaar(email, env), env);
}
async function rechtenZonderSchakelaar(email, env) {
  const e = String(email || "").trim().toLowerCase();
  const open = !toegangVerplicht(env); // zonder slot mag iedereen die via Access binnenkomt de app (Eenvoudig) gebruiken
  const leeg = rechtenUitRij(null, { open });
  if (!e) return { ...rechtenUitRij(null), toegang: false };
  const beheerder = opLijst(e, env.BEHEERDERS);
  if (beheerder || opLijst(e, env.AccessAll)) {
    return { toegang: true, uitgebreid: true, koppelen: true, beheerder, geldigTot: null, bron: beheerder ? "beheerder" : "AccessAll", aanvraag: null, aanvraagGebruik: null, gebruik: "beide", soorten: { zakelijk: ALLES, prive: ALLES } };
  }
  if (!env.DB) return leeg;
  try {
    await zorgVoorTabel(env.DB);
    const r = await env.DB.prepare("SELECT * FROM rechten WHERE email = ?").bind(e).first();
    return rechtenUitRij(r, { open });
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

export function controleerPost(request, url) {
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
  try { await verstuur(env, { to: doel, from, subject: `RekeningNaarAangifte: ${onderwerp}`, text, html }); return null; }
  catch (e) { console.error("aanvrager: e-mail mislukt", e?.message); return String(e?.message || e).slice(0, 200); }
}

async function meldBeheerder(env, onderwerp, tekst) {
  const from = env.INLOG_FROM || env.FEEDBACK_FROM;
  if (!env.EMAIL || !env.FEEDBACK_TO || !from) return;
  try { await env.EMAIL.send({ to: env.FEEDBACK_TO, from, subject: `[RekeningNaarAangifte] ${onderwerp}`, text: tekst }); }
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
  if (body?.verlengen === true) return verlengRoute(env, e, body, ctx);
  const plan = String(body?.plan || "");
  if (!plannenVoor(env)[plan]) return json({ ok: false, fout: "Kies een abonnement" }, 400);
  // beide-V1R0 — verplichte keuze zakelijk of privé.
  const gebruik = geldigGebruik(String(body?.gebruik || ""));
  if (!gebruik) return json({ ok: false, fout: "Kies of je RekeningNaarAangifte zakelijk of privé gebruikt." }, 400);
  // nieuw-V5R4 — voor- en achternaam verplicht (samen opgeslagen in de kolom naam).
  const voornaam = schoon(body?.voornaam, 60);
  const achternaam = schoon(body?.achternaam, 80);
  if (!voornaam || !achternaam) return json({ ok: false, fout: "Vul je voornaam en achternaam in." }, 400);
  const naam = `${voornaam} ${achternaam}`;
  // beide-V7R1 — telefoonnummer verplicht (om te bellen of de aanvrager echt is), organisatie optioneel.
  const telefoon = schoonTelefoon(body?.telefoon);
  if (!telefoon) return json({ ok: false, fout: "Vul een telefoonnummer in waarop je bereikbaar bent (10 tot 15 cijfers)." }, 400);
  const organisatie = schoon(body?.organisatie, 120);
  const reden = schoonTekst(body?.reden, 1000);
  if (reden.length < MIN_REDEN) return json({ ok: false, fout: `Geef aan waarom je toegang vraagt en waarvoor je de app wilt gebruiken (minimaal ${MIN_REDEN} tekens).` }, 400);
  // nieuw-V4R6 — betaalstap. Bij prijs 0 (zoals nu) gaat de aanvraag direct naar de beheerder.
  if (prijzen(env)[gebruik][plan] > 0) {
    // Hier komt de Mollie-betaling: /api/betaal/start maakt een betaling en stuurt de gebruiker naar Mollie; de webhook
    // zet daarna de rechten. Zolang dat er niet is, kan een betaald abonnement niet worden aangevraagd.
    return json({ ok: false, betalen: true, fout: "Betalen is nog niet beschikbaar. Neem contact op met de beheerder." }, 402);
  }
  const nu = await rechtenVan(e, env);
  // Zonder slot heeft iedereen al Eenvoudig, maar een aanvraag voor Eenvoudig mag dan toch (de soort wordt vastgelegd).
  const eigen = nu.soorten?.[gebruik];
  const huidig = toegangVerplicht(env) ? niveauVan(eigen) : niveauVan({ ...eigen, eenvoudig: false });
  if (huidig >= NIVEAU[plan]) return json({ ok: true, alActief: true, melding: `Je hebt ${planNaam(gebruik, plan)} al.` });
  try {
    await zorgVoorTabel(env.DB);
    const tijd = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO rechten (email, gewijzigd, gewijzigd_door, bron, aanvraag, aanvraag_gebruik, aangevraagd, naam, reden, telefoon, organisatie)
       VALUES (?1, ?2, ?1, 'aanmelding', ?3, ?6, ?2, ?4, ?5, ?7, ?8)
       ON CONFLICT(email) DO UPDATE SET aanvraag = ?3, aanvraag_gebruik = ?6, aangevraagd = ?2, naam = ?4, reden = ?5, telefoon = ?7, organisatie = ?8, verlenging = 0`
    ).bind(e, tijd, plan, naam, reden, gebruik, telefoon, organisatie || null).run();
    await werkGebruikBij(env.DB, e);
    slotCache.delete(e);
  } catch (err) {
    return json({ ok: false, fout: "Databasefout", detail: String(err?.message || err).slice(0, 300) }, 500);
  }
  const heeftAl = Object.keys(GEBRUIK).filter((s) => s !== gebruik && niveauVan(nu.soorten?.[s]) > 0 && toegangVerplicht(env))
    .map((s) => `Heeft al: ${planNaam(s, ["", "eenvoudig", "uitgebreid", "koppelen"][niveauVan(nu.soorten[s])])}.`);
  const mail = meldBeheerder(env, `Nieuwe aanmelding: ${planNaam(gebruik, plan)}`,
    [`${naam || "(geen naam)"}${organisatie ? ` (${organisatie})` : ""} <${e}> vraagt ${PLANNEN[plan]} aan voor ${gebruik === "prive" ? "privégebruik" : "zakelijk gebruik"} (${GEBRUIK_UITLEG[gebruik]}).`,
      ...heeftAl, `Reden:\n${reden}`, "Keur de aanvraag goed in de app: Gebruikers en rechten (personen-icoon onderin de zijbalk)."].join("\n\n"));
  // nieuw-V5R2 — bevestiging aan de aanvrager, met een korte uitleg van de drie abonnementen.
  const bevestiging = meldAanvrager(env, e, "je aanvraag is ontvangen", [
    `Bedankt voor je aanvraag voor ${PLANNEN[plan]} bij RekeningNaarAangifte, de app die je inzicht geeft in je bankgegevens en overzichten maakt van je inkomsten en uitgaven.`,
    `Je hebt gekozen voor ${gebruik === "prive" ? "privégebruik (particulier huishouden)" : "zakelijk gebruik (eenmanszaak, zzp of BV)"}.`,
    `Ter herinnering, dit zijn de ${Object.keys(plannenVoor(env)).length === 3 ? "drie" : "twee"} abonnementen voor ${gebruik === "prive" ? "privé" : "zakelijk"}:`,
  ], null, naam, Object.entries(plannenVoor(env)).map(([k, v]) => [v, PLAN_UITLEG[gebruik][k]]), [
    "Ik beoordeel je aanvraag zo snel mogelijk. Je krijgt een e-mail zodra hij is goedgekeurd; daarna kun je meteen aan de slag.",
    "Heb je vragen? Beantwoord dan gerust deze e-mail.",
  ]);
  if (ctx?.waitUntil) { ctx.waitUntil(mail); ctx.waitUntil(bevestiging); } else { await mail; await bevestiging; }
  return json({ ok: true, aangevraagd: plan, gebruik });
}

// beide-V7R3 — verlengen: wie een abonnement heeft of had, vraagt met één knop verlenging aan voor dezelfde soort en
// hetzelfde niveau. Geen formulier opnieuw (naam, telefoon en reden zijn al bekend); wel de vrijwillige peilvraag.
// De beheerder keurt het goed of af zoals een gewone aanvraag (/api/beheer/goedkeuren verlengt dan de einddatum).
export const NIVEAU_PLAN = ["", "eenvoudig", "uitgebreid", "koppelen"];
async function verlengRoute(env, e, body, ctx) {
  const gebruik = geldigGebruik(String(body?.gebruik || ""));
  if (!gebruik) return json({ ok: false, fout: "Kies welk abonnement verlengd moet worden." }, 400);
  await zorgVoorTabel(env.DB);
  const r = await env.DB.prepare("SELECT * FROM rechten WHERE email = ?").bind(e).first();
  const n = r ? niveauVan(soortUitRij(r, gebruik)) : 0;
  if (!n) return json({ ok: false, fout: `Er is geen abonnement ${GEBRUIK[gebruik].toLowerCase()} om te verlengen. Vraag een nieuw abonnement aan.` }, 400);
  const plan = plannenVoor(env)[NIVEAU_PLAN[n]] ? NIVEAU_PLAN[n] : "uitgebreid";
  const antwoord = schoonPeiling(body?.peiling);
  const tijd = new Date().toISOString();
  try {
    await env.DB.prepare("UPDATE rechten SET aanvraag = ?2, aanvraag_gebruik = ?3, aangevraagd = ?4, verlenging = 1 WHERE email = ?1")
      .bind(e, plan, gebruik, tijd).run();
    if (antwoord) await bewaarPeiling(env.DB, { email: e, naam: r.naam || null, organisatie: r.organisatie || null, gebruik, plan, antwoord });
    slotCache.delete(e);
  } catch (err) {
    return json({ ok: false, fout: "Databasefout", detail: String(err?.message || err).slice(0, 300) }, 500);
  }
  const einde = soortUitRij(r, gebruik).geldigTot;
  const peilTekst = antwoord ? `Betalen voor de app: ${BETALEN[antwoord.betalen]}${antwoord.bedrag != null ? `, € ${antwoord.bedrag.toFixed(2).replace(".", ",")} per maand` : ""}${antwoord.toelichting ? `\nToelichting: ${antwoord.toelichting}` : ""}` : "Peilvraag niet beantwoord.";
  const mail = meldBeheerder(env, `Verlenging: ${planNaam(gebruik, plan)}`,
    [`${r.naam || "(geen naam)"}${r.organisatie ? ` (${r.organisatie})` : ""} <${e}> vraagt verlenging van ${planNaam(gebruik, plan)}${einde ? ` (einddatum ${einde})` : ""}.`,
      peilTekst, "Keur de verlenging goed in de app: Gebruikers en rechten (personen-icoon onderin de zijbalk)."].join("\n\n"));
  if (ctx?.waitUntil) ctx.waitUntil(mail); else await mail;
  return json({ ok: true, verlenging: plan, gebruik });
}

// beide-V7R3 — herinneringsmail HERINNER_DAGEN vóór het einde van een abonnement, met de knop om te verlengen. Eén keer
// per einddatum (kolom herinnerd). Niet als er al een aanvraag openstaat. Draait in scheduled() (dagelijkse Cron Trigger).
export async function verloopHerinneringen(env, { nu = vandaag(), origin = null } = {}) {
  if (!env.DB) return { verstuurd: 0 };
  await zorgVoorTabel(env.DB);
  const grens = plusDagen(nu, HERINNER_DAGEN);
  const basis = origin || env.APP_URL || null;
  let verstuurd = 0;
  for (const s of Object.keys(GEBRUIK)) {
    const k = KOLOM[s];
    const { results } = await env.DB.prepare(`SELECT * FROM rechten WHERE ${heeftSoort(s)} AND ${k.geldigTot} IS NOT NULL
      AND ${k.geldigTot} >= ?1 AND ${k.geldigTot} <= ?2 AND (${k.herinnerd} IS NULL OR ${k.herinnerd} != ${k.geldigTot}) AND aanvraag IS NULL`).bind(nu, grens).all();
    for (const r of results || []) {
      const einde = r[k.geldigTot];
      const plan = NIVEAU_PLAN[niveauVan(soortUitRij(r, s))];
      const link = basis ? `${String(basis).replace(/\/+$/, "")}/aanmelden?verlengen=${s}` : null;
      const fout = await meldAanvrager(env, r.email, `je abonnement loopt af op ${datumNl(einde)}`, [
        `Je abonnement ${planNaam(s, plan)} bij RekeningNaarAangifte loopt af op ${datumNl(einde)}.`,
        "Wil je de app blijven gebruiken? Vraag dan verlenging aan. Dat is één knop; ik keur het verzoek daarna goed en je krijgt een e-mail.",
        "Je dossiers bewaar je zelf als bestand. Die blijven altijd van jou, ook als het abonnement afloopt.",
      ], link ? { link, tekst: "Verlenging aanvragen" } : null, r.naam || "", [],
      link ? [] : ["Verlengen kan in de app via het kaart-icoon onderin de zijbalk (Abonnementen)."]);
      if (!fout) {
        await env.DB.prepare(`UPDATE rechten SET ${k.herinnerd} = ?2 WHERE email = ?1`).bind(r.email, einde).run();
        verstuurd++;
      }
      await logBeheer(env.DB, { door: "systeem", email: r.email, actie: "herinnering verlengen", details: `${planNaam(s, plan)} t/m ${einde}${fout ? `; mail NIET verstuurd: ${fout}` : "; mail verstuurd"}` });
    }
  }
  return { verstuurd };
}
// beide-V7R7 — mail aan de beheerders als het logboek boven de grens komt (zie logboek.js).
export function logboekControle(env) {
  const from = env.INLOG_FROM || env.FEEDBACK_FROM;
  if ((!env.EMAIL && !env.RESEND_API_KEY) || !from) return Promise.resolve({ gemeld: false });
  return controleerLogboekGrootte(env, async (to, onderwerp, regels) => {
    const { text, html } = opmaakMail(env, { regels });
    await verstuur(env, { to, from, subject: `RekeningNaarAangifte: ${onderwerp}`, text, html });
  });
}
const datumNl = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });

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
      await wisOudeTelefoons(env.DB);
      const { results } = await env.DB.prepare("SELECT * FROM rechten ORDER BY aanvraag IS NULL, aangevraagd DESC, email").all();
      return json({ ok: true, vandaag: vandaag(), slot: toegangVerplicht(env), rechten: (results || []).map(rijNaarRecht) });
    }
    // beide-V7R3 — antwoorden op de peilvraag bij verlengen
    if (url.pathname === "/api/beheer/peiling" && request.method === "GET") {
      return json({ ok: true, ...(await leesPeiling(env.DB)) });
    }
    // beide-V6R8 — logboek (laatste 200, met zoeken). beide-V7R7 — met het aantal regels en de grens, exporteren en opschonen.
    if (url.pathname === "/api/beheer/logboek" && request.method === "GET") {
      return json({ ok: true, logboek: await leesLogboek(env.DB, { zoek: url.searchParams.get("zoek") }), aantal: await telLogboek(env.DB), grens: logboekGrens(env) });
    }
    if (url.pathname === "/api/beheer/logboek/export" && request.method === "GET") {
      return json({ ok: true, ...(await exporteerLogboek(env.DB)) });
    }
    if (url.pathname === "/api/beheer/logboek/opschonen" && request.method === "POST") {
      let b;
      try { b = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
      return json({ ok: true, verwijderd: await schoonLogboekOp(env.DB, b?.totId, String(email).toLowerCase()) });
    }
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
    const doel = String(body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(doel) || doel.length > 200) return json({ ok: false, fout: "Ongeldig e-mailadres" }, 400);
    const tijd = new Date().toISOString();
    const door = String(email).toLowerCase();
    slotCache.delete(doel);

    if (url.pathname === "/api/beheer/rechten" && request.method === "POST") {
      // beide-V1R0 — rechten per soort: body.zakelijk en body.prive, elk {eenvoudig, uitgebreid, koppelen, geldigTot}.
      // Een bericht zonder soorten (oude app) geldt alleen voor zakelijk; privé blijft dan zoals het was.
      const bestaand = await env.DB.prepare("SELECT * FROM rechten WHERE email = ?").bind(doel).first();
      const waarden = {};
      for (const s of Object.keys(GEBRUIK)) {
        const x = body?.[s] && typeof body[s] === "object" ? body[s] : s === "zakelijk" && !body?.prive ? body : bestaand ? soortUitRij(bestaand, s) : {};
        const geldigTot = x?.geldigTot ? String(x.geldigTot) : null;
        if (geldigTot && !DATUM_RE.test(geldigTot)) return json({ ok: false, fout: "Einddatum moet JJJJ-MM-DD zijn" }, 400);
        const uitgebreid = x?.uitgebreid ? 1 : 0;
        waarden[s] = [uitgebreid || x?.eenvoudig ? 1 : 0, uitgebreid, uitgebreid && x?.koppelen ? 1 : 0, geldigTot];
      }
      const notitie = schoon(body?.notitie, 300);
      await env.DB.prepare(
        `INSERT INTO rechten (email, eenvoudig, uitgebreid, koppelen, geldig_tot, prive_eenvoudig, prive_uitgebreid, prive_koppelen, prive_geldig_tot, bron, notitie, gewijzigd, gewijzigd_door)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'handmatig', ?10, ?11, ?12)
         ON CONFLICT(email) DO UPDATE SET eenvoudig = ?2, uitgebreid = ?3, koppelen = ?4, geldig_tot = ?5,
           prive_eenvoudig = ?6, prive_uitgebreid = ?7, prive_koppelen = ?8, prive_geldig_tot = ?9, notitie = ?10, gewijzigd = ?11, gewijzigd_door = ?12`
      ).bind(doel, ...waarden.zakelijk, ...waarden.prive, notitie, tijd, door).run();
      await werkGebruikBij(env.DB, doel);
      const naarSoort = (w) => ({ eenvoudig: !!w[0], uitgebreid: !!w[1], koppelen: !!w[2], geldigTot: w[3] });
      const oud = bestaand ? Object.fromEntries(Object.keys(GEBRUIK).map((x) => [x, soortUitRij(bestaand, x)])) : {};
      const nieuw = Object.fromEntries(Object.keys(GEBRUIK).map((x) => [x, naarSoort(waarden[x])]));
      await logBeheer(env.DB, { door, email: doel, actie: bestaand ? "rechten gewijzigd" : "gebruiker toegevoegd",
        details: beschrijfRechten(oud, nieuw, GEBRUIK) + (notitie !== (bestaand?.notitie || "") ? `; notitie: ${notitie || "leeg"}` : "") });
      return json({ ok: true });
    }
    // nieuw-V4R5 — aanvraag goedkeuren: rechten volgens het gevraagde abonnement, de aanvraag vervalt.
    if (url.pathname === "/api/beheer/goedkeuren" && request.method === "POST") {
      const r = await env.DB.prepare("SELECT * FROM rechten WHERE email = ?").bind(doel).first();
      const plan = r?.aanvraag;
      if (!PLANNEN[plan]) return json({ ok: false, fout: "Geen openstaande aanvraag" }, 404);
      const gebruik = geldigGebruik(r.aanvraag_gebruik) || "zakelijk";
      const k = KOLOM[gebruik];
      const n = NIVEAU[plan];
      const verlenging = !!r.verlenging;
      // beide-V7R3 — einddatum: gratis abonnement GRATIS_DAGEN vanaf vandaag, of bij verlengen vanaf de huidige einddatum
      // als die nog in de toekomst ligt. Een latere einddatum die er al stond, blijft staan. Betaald: einddatum ongewijzigd.
      const dagen = prijzen(env)[gebruik][plan] > 0 ? 0 : gratisDagen(env);
      const oudEinde = r[k.geldigTot] || null;
      const start = verlenging && oudEinde && oudEinde > vandaag() ? oudEinde : vandaag();
      // Verlengen van een abonnement zonder einddatum maakt het niet korter.
      const nieuwEinde = verlenging && !oudEinde ? null : dagen ? (oudEinde && oudEinde > plusDagen(start, dagen) ? oudEinde : plusDagen(start, dagen)) : oudEinde;
      await env.DB.prepare(
        `UPDATE rechten SET ${k.eenvoudig} = 1, ${k.uitgebreid} = MAX(${k.uitgebreid}, ?2), ${k.koppelen} = MAX(${k.koppelen}, ?3), ${k.geldigTot} = ?6,
         ${k.herinnerd} = NULL, aanvraag = NULL, aanvraag_gebruik = NULL, verlenging = 0, telefoon = NULL, gewijzigd = ?4, gewijzigd_door = ?5 WHERE email = ?1`
      ).bind(doel, n >= 2 ? 1 : 0, n >= 3 ? 1 : 0, tijd, door, nieuwEinde).run();
      await werkGebruikBij(env.DB, doel);
      // nieuw-V5R7 — met eigen inlog zit er een inloglink in de mail: de knop logt meteen in en biedt dan de passkey aan.
      let link = null;
      try { link = await maakInloglink(env, doel, url.origin); } catch { /* dan de gewone knop naar de app */ }
      const totTekst = nieuwEinde ? ` Het abonnement loopt tot en met ${datumNl(nieuwEinde)}; daarna kun je met één knop verlengen.` : "";
      const mailFout = verlenging
        ? await meldAanvrager(env, doel, "je abonnement is verlengd",
          [`Je abonnement ${planNaam(gebruik, plan)} is verlengd${nieuwEinde ? ` tot en met ${datumNl(nieuwEinde)}` : ""}. Je kunt RekeningNaarAangifte gewoon blijven gebruiken.`],
          { link: `${url.origin}/`, tekst: "Open RekeningNaarAangifte" }, r?.naam || "")
        : await meldAanvrager(env, doel, "je aanmelding is goedgekeurd", link
        ? [`Goed nieuws: je aanmelding voor ${planNaam(gebruik, plan)} is goedgekeurd. Je kunt RekeningNaarAangifte nu ${gebruik === "prive" ? "privé" : "zakelijk"} gebruiken.${totTekst}`,
          "Klik op de knop om in te loggen. Daarna stel je een wachtwoord in, of maak je een passkey aan zodat je inlogt met Face ID, Touch ID of de pincode van je apparaat."]
        : [`Goed nieuws: je aanmelding voor ${planNaam(gebruik, plan)} is goedgekeurd. Je kunt RekeningNaarAangifte nu ${gebruik === "prive" ? "privé" : "zakelijk"} gebruiken.${totTekst}`],
        { link: link || `${url.origin}/`, tekst: link ? "Inloggen en wachtwoord instellen" : "Open RekeningNaarAangifte" }, r?.naam || "", [],
        link ? [`De knop is ${GOEDKEUR_LINK_UREN / 24} dagen geldig en werkt één keer. Daarna vraag je op de inlogpagina een nieuwe inloglink aan.`] : []);
      await logBeheer(env.DB, { door, email: doel, actie: verlenging ? "verlenging goedgekeurd" : "aanvraag goedgekeurd", details: `${planNaam(gebruik, plan)}${nieuwEinde !== oudEinde ? `; einddatum ${oudEinde || "geen"} → ${nieuwEinde || "geen"}` : ""}${mailFout ? `; mail NIET verstuurd: ${mailFout}` : "; mail verstuurd"}` });
      return json({ ok: true, mailFout, geldigTot: nieuwEinde });
    }
    if (url.pathname === "/api/beheer/afwijzen" && request.method === "POST") {
      const r = await env.DB.prepare("SELECT aanvraag, aanvraag_gebruik, naam, verlenging FROM rechten WHERE email = ?").bind(doel).first();
      const verlenging = !!r?.verlenging;
      // Bij een verlenging blijft de reden van de oorspronkelijke aanmelding staan.
      await env.DB.prepare(`UPDATE rechten SET aanvraag = NULL, aanvraag_gebruik = NULL, ${verlenging ? "" : "reden = NULL, "}verlenging = 0, telefoon = NULL, gewijzigd = ?2, gewijzigd_door = ?3 WHERE email = ?1`).bind(doel, tijd, door).run();
      await werkGebruikBij(env.DB, doel);
      // Een rij die alleen uit een aanvraag bestond, heeft geen nut meer.
      await env.DB.prepare(`DELETE FROM rechten WHERE email = ?1 AND eenvoudig = 0 AND uitgebreid = 0 AND koppelen = 0
        AND prive_eenvoudig = 0 AND prive_uitgebreid = 0 AND prive_koppelen = 0 AND aanvraag IS NULL`).bind(doel).run();
      const mailFout = !PLANNEN[r?.aanvraag] ? null : verlenging ? await meldAanvrager(env, doel, "over je verzoek om te verlengen",
        [`Je verzoek om ${planNaam(geldigGebruik(r.aanvraag_gebruik) || "zakelijk", r.aanvraag)} te verlengen, is op dit moment niet goedgekeurd.`,
          "Heb je vragen? Beantwoord dan gerust deze e-mail. Je dossiers bewaar je zelf als bestand; die blijven van jou."],
        null, r?.naam || "") : await meldAanvrager(env, doel, "over je aanvraag",
        [`Bedankt voor je aanvraag voor ${planNaam(geldigGebruik(r.aanvraag_gebruik) || "zakelijk", r.aanvraag)} bij RekeningNaarAangifte.`,
          "Helaas kan ik je aanvraag op dit moment niet goedkeuren, omdat er te weinig informatie is gegeven om je toegang tot de app te geven.",
          "Je kunt op deze e-mail reageren met de vraag wat er ontbreekt. Je kunt ook meteen meer informatie sturen over waarom je toegang vraagt en waarvoor je de app wilt gebruiken. Daarna bekijk ik je aanvraag opnieuw."],
        null, r?.naam || "");
      await logBeheer(env.DB, { door, email: doel, actie: verlenging ? "verlenging afgewezen" : "aanvraag afgewezen", details: `${PLANNEN[r?.aanvraag] ? planNaam(geldigGebruik(r.aanvraag_gebruik) || "zakelijk", r.aanvraag) : "geen open aanvraag"}${mailFout ? `; mail NIET verstuurd: ${mailFout}` : ""}` });
      return json({ ok: true, mailFout });
    }
    if (url.pathname === "/api/beheer/verwijder" && request.method === "POST") {
      await env.DB.prepare("DELETE FROM rechten WHERE email = ?").bind(doel).run();
      // nieuw-V5R6 — ook uitloggen: sessies, openstaande inloglinks en passkeys van dit adres weg.
      for (const t of ["sessies", "inloglinks", "passkeys", "wachtwoorden", "voorwaarden_akkoord"]) {
        try { await env.DB.prepare(`DELETE FROM ${t} WHERE email = ?`).bind(doel).run(); } catch { /* tabel bestaat (nog) niet */ }
      }
      await wisPeiling(env.DB, doel);
      slotCache.delete(doel);
      await logBeheer(env.DB, { door, email: doel, actie: "gebruiker verwijderd", details: "toegang, sessies, inloglinks, passkeys, wachtwoord, akkoord voorwaarden en antwoorden peilvraag gewist" });
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
// beide-V1R9 — privé heeft eigen voorwaarden met een eigen versie; het akkoord staat per soort in dezelfde tabel
// (kolommen versie/tijd = zakelijk, versie_prive/tijd_prive = privé). Bestaande tabellen krijgen ze via ALTER TABLE.
async function zorgVoorVoorwaarden(db) {
  await db.prepare(VOORWAARDEN_SCHEMA).run();
  const bestaand = new Set(((await db.prepare("PRAGMA table_info(voorwaarden_akkoord)").all())?.results || []).map((k) => k.name));
  for (const k of ["versie_prive", "tijd_prive"]) if (!bestaand.has(k)) await db.prepare(`ALTER TABLE voorwaarden_akkoord ADD COLUMN ${k} TEXT`).run();
}
// Geeft { zakelijk, prive }: de versie waarmee deze gebruiker per soort akkoord ging (of null).
export async function voorwaardenVan(email, env) {
  if (!email || !env.DB) return { zakelijk: null, prive: null };
  try {
    await zorgVoorVoorwaarden(env.DB);
    const r = await env.DB.prepare("SELECT versie, versie_prive FROM voorwaarden_akkoord WHERE email = ?").bind(String(email).toLowerCase()).first();
    return { zakelijk: r?.versie || null, prive: r?.versie_prive || null };
  } catch { return { zakelijk: null, prive: null }; }
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
  const prive = body?.soort === "prive";
  await zorgVoorVoorwaarden(env.DB);
  const nu = new Date().toISOString(), adres = String(email).toLowerCase();
  // Een rij moet een zakelijke versie hebben (NOT NULL); wie alleen privé akkoord gaf, krijgt daar een lege waarde.
  if (prive) {
    await env.DB.prepare(`INSERT INTO voorwaarden_akkoord (email, versie, tijd, versie_prive, tijd_prive) VALUES (?1, '', ?3, ?2, ?3)
      ON CONFLICT(email) DO UPDATE SET versie_prive = ?2, tijd_prive = ?3`).bind(adres, versie, nu).run();
  } else {
    await env.DB.prepare(`INSERT INTO voorwaarden_akkoord (email, versie, tijd) VALUES (?1, ?2, ?3)
      ON CONFLICT(email) DO UPDATE SET versie = ?2, tijd = ?3`).bind(adres, versie, nu).run();
  }
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
