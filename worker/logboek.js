// beide-V6R8 — logboek van het beheer: wie wijzigde wanneer wat bij welk e-mailadres (rechten, aanvragen, verwijderen,
// tarievenbestand). D1-tabel "beheer_log"; de Worker maakt hem zelf aan. Een mislukte logregel houdt de actie zelf niet tegen.

const SCHEMA = "CREATE TABLE IF NOT EXISTS beheer_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tijd TEXT NOT NULL, door TEXT, email TEXT, actie TEXT NOT NULL, details TEXT)";
const klaar = new WeakSet();
async function zorg(db) {
  if (klaar.has(db)) return;
  await db.prepare(SCHEMA).run();
  klaar.add(db);
}

export async function logBeheer(db, { door, email = null, actie, details = "" }) {
  if (!db) return;
  try {
    await zorg(db);
    await db.prepare("INSERT INTO beheer_log (tijd, door, email, actie, details) VALUES (?, ?, ?, ?, ?)")
      .bind(new Date().toISOString(), door ? String(door).toLowerCase() : null, email, String(actie).slice(0, 60), String(details || "").slice(0, 1000)).run();
  } catch (e) { console.error("logboek: schrijven mislukt", e?.message); }
}

export async function leesLogboek(db, { zoek = "", max = 200 } = {}) {
  await zorg(db);
  const z = String(zoek || "").trim().toLowerCase().slice(0, 100);
  const st = z
    ? db.prepare("SELECT tijd, door, email, actie, details FROM beheer_log WHERE instr(lower(coalesce(email,'') || ' ' || coalesce(door,'') || ' ' || actie || ' ' || coalesce(details,'')), ?) > 0 ORDER BY id DESC LIMIT ?").bind(z, max)
    : db.prepare("SELECT tijd, door, email, actie, details FROM beheer_log ORDER BY id DESC LIMIT ?").bind(max);
  const { results } = await st.all();
  return results || [];
}

// Leesbare omschrijving van een wijziging in de rechten, per soort: "Zakelijk: Eenvoudig → Uitgebreid; einddatum geen → 2026-12-31".
const NIVEAU = ["geen toegang", "Eenvoudig", "Uitgebreid", "Uitgebreid + bankkoppeling"];
const niveau = (x) => NIVEAU[x?.koppelen ? 3 : x?.uitgebreid ? 2 : x?.eenvoudig ? 1 : 0];
export function beschrijfRechten(oud, nieuw, namen) {
  const delen = [];
  for (const [s, naam] of Object.entries(namen)) {
    const a = oud?.[s] || {}, b = nieuw?.[s] || {};
    const stukken = [];
    if (niveau(a) !== niveau(b)) stukken.push(`${niveau(a)} → ${niveau(b)}`);
    if ((a.geldigTot || null) !== (b.geldigTot || null)) stukken.push(`einddatum ${a.geldigTot || "geen"} → ${b.geldigTot || "geen"}`);
    if (stukken.length) delen.push(`${naam}: ${stukken.join(", ")}`);
  }
  return delen.join("; ") || "geen wijziging in rechten";
}

// beide-V7R7 — logboek exporteren en opschonen, en een mail aan de beheerders als het te groot wordt (wens Boska 26-10).
// Grens in regels: variabele LOGBOEK_GRENS, standaard 2000. De mail komt één keer; na opschonen kan er weer een komen.
export const LOGBOEK_GRENS = 2000;
export const logboekGrens = (env) => {
  const n = Number(String(env?.LOGBOEK_GRENS ?? "").trim());
  return Number.isInteger(n) && n >= 100 ? n : LOGBOEK_GRENS;
};
const GEMELD = "logboek te groot gemeld";
const OPGESCHOOND = "logboek opgeschoond";

export async function telLogboek(db) {
  await zorg(db);
  const r = await db.prepare("SELECT COUNT(*) AS n FROM beheer_log").first();
  return Number(r?.n || 0);
}

// Alles (oudste eerst) als CSV met puntkomma's (opent zo in Excel met Nederlandse instellingen), en het hoogste id:
// daarmee verwijdert opschonen precies wat geëxporteerd is, ook als er intussen nieuwe regels zijn bijgekomen.
export async function exporteerLogboek(db) {
  await zorg(db);
  const { results } = await db.prepare("SELECT id, tijd, door, email, actie, details FROM beheer_log ORDER BY id").all();
  const rijen = results || [];
  const veld = (v) => { const t = String(v ?? ""); return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const csv = ["tijd;door;e-mailadres;actie;details", ...rijen.map((r) => [r.tijd, r.door, r.email, r.actie, r.details].map(veld).join(";"))].join("\r\n");
  return { csv: `﻿${csv}\r\n`, totId: rijen.length ? rijen[rijen.length - 1].id : 0, aantal: rijen.length };
}

export async function schoonLogboekOp(db, totId, door) {
  await zorg(db);
  const id = Number(totId);
  if (!Number.isInteger(id) || id <= 0) return 0;
  const r = await db.prepare("DELETE FROM beheer_log WHERE id <= ?").bind(id).run();
  const weg = Number(r?.meta?.changes ?? 0);
  await logBeheer(db, { door, actie: OPGESCHOOND, details: `${weg} regel${weg === 1 ? "" : "s"} verwijderd na exporteren` });
  return weg;
}

// Te groot en nog niet gemeld sinds het laatste opschonen? Dan een mail aan alle BEHEERDERS. `mail(to, onderwerp, regels)`
// verstuurt (meegegeven door de aanroeper, zodat dit bestand geen mailcode hoeft te importeren).
export async function controleerLogboekGrootte(env, mail) {
  if (!env.DB) return { gemeld: false };
  const aantal = await telLogboek(env.DB);
  const grens = logboekGrens(env);
  if (aantal < grens) return { gemeld: false, aantal };
  const laatste = async (actie) => Number((await env.DB.prepare("SELECT MAX(id) AS id FROM beheer_log WHERE actie = ?").bind(actie).first())?.id || 0);
  if ((await laatste(GEMELD)) > (await laatste(OPGESCHOOND))) return { gemeld: false, aantal, alGemeld: true };
  const aan = String(env.BEHEERDERS || "").split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter((x) => x && !x.startsWith("*@"));
  let verstuurd = 0;
  for (const to of aan) {
    try {
      await mail(to, `het logboek heeft ${aantal} regels`, [
        `Het beheerlogboek van RekeningNaarAangifte heeft ${aantal} regels; de grens is ${grens}.`,
        "Exporteer het logboek en schoon het daarna op: Gebruikers en rechten → Logboek → Exporteren. Het bestand opent in Excel.",
      ]);
      verstuurd++;
    } catch (e) { console.error("logboek: melding mislukt", e?.message); }
  }
  if (verstuurd) await logBeheer(env.DB, { door: "systeem", actie: GEMELD, details: `${aantal} regels, grens ${grens}; mail aan ${verstuurd} beheerder${verstuurd === 1 ? "" : "s"}` });
  return { gemeld: verstuurd > 0, aantal };
}
