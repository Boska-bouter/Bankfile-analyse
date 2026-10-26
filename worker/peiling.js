// beide-V7R3 — peilvraag bij verlengen (besluit Boska 26-10): zou de gebruiker voor de app willen betalen, en zo ja
// hoeveel per maand? Vrijwillig. D1-tabel "peiling"; de Worker maakt hem zelf aan. De antwoorden blijven staan na
// goedkeuren (ze zijn bedoeld voor het besluit over betaalde abonnementen) en gaan weg als de gebruiker wordt verwijderd.

const SCHEMA = `CREATE TABLE IF NOT EXISTS peiling (id INTEGER PRIMARY KEY AUTOINCREMENT, tijd TEXT NOT NULL, email TEXT NOT NULL,
  naam TEXT, organisatie TEXT, gebruik TEXT, plan TEXT, betalen TEXT NOT NULL, bedrag REAL, toelichting TEXT)`;
const klaar = new WeakSet();
async function zorg(db) {
  if (klaar.has(db)) return;
  await db.prepare(SCHEMA).run();
  klaar.add(db);
}

export const BETALEN = { ja: "Ja", misschien: "Misschien", nee: "Nee" };
const MAX_BEDRAG = 1000;

// Controleert het antwoord uit het formulier. null = geen antwoord gegeven (mag: de vraag is vrijwillig).
export function schoonPeiling(p) {
  const betalen = BETALEN[p?.betalen] ? p.betalen : null;
  if (!betalen) return null;
  const n = Number(String(p?.bedrag ?? "").replace(",", "."));
  const bedrag = betalen !== "nee" && String(p?.bedrag ?? "").trim() !== "" && Number.isFinite(n) && n >= 0 && n <= MAX_BEDRAG ? Math.round(n * 100) / 100 : null;
  const toelichting = String(p?.toelichting ?? "").replace(/[\u0000-\u0009\u000B-\u001F]/g, " ").trim().slice(0, 500) || null;
  return { betalen, bedrag, toelichting };
}

export async function bewaarPeiling(db, { email, naam = null, organisatie = null, gebruik, plan, antwoord }) {
  await zorg(db);
  await db.prepare(`INSERT INTO peiling (tijd, email, naam, organisatie, gebruik, plan, betalen, bedrag, toelichting) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(new Date().toISOString(), email, naam, organisatie, gebruik, plan, antwoord.betalen, antwoord.bedrag, antwoord.toelichting).run();
}

// Alle antwoorden (nieuwste eerst) en een samenvatting: aantallen per antwoord, en gemiddelde en mediaan van de bedragen.
export async function leesPeiling(db) {
  await zorg(db);
  const { results } = await db.prepare("SELECT tijd, email, naam, organisatie, gebruik, plan, betalen, bedrag, toelichting FROM peiling ORDER BY id DESC LIMIT 500").all();
  const rijen = results || [];
  const aantal = { ja: 0, misschien: 0, nee: 0 };
  for (const r of rijen) if (aantal[r.betalen] != null) aantal[r.betalen]++;
  const bedragen = rijen.map((r) => r.bedrag).filter((b) => b != null).sort((a, b) => a - b);
  const midden = bedragen.length ? (bedragen.length % 2 ? bedragen[(bedragen.length - 1) / 2] : (bedragen[bedragen.length / 2 - 1] + bedragen[bedragen.length / 2]) / 2) : null;
  const gemiddeld = bedragen.length ? Math.round((bedragen.reduce((a, b) => a + b, 0) / bedragen.length) * 100) / 100 : null;
  return { antwoorden: rijen, samenvatting: { totaal: rijen.length, aantal, bedragen: bedragen.length, gemiddeld, mediaan: midden } };
}

export async function wisPeiling(db, email) {
  try { await zorg(db); await db.prepare("DELETE FROM peiling WHERE email = ?").bind(email).run(); } catch { /* geen tabel */ }
}
