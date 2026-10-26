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
