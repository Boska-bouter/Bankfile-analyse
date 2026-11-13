// nieuw-V4R6 — de sleutel van de gedeelde namenlijst is verbeterd (bedrijfSleutel: rechtsvorm, plaats aan het eind, zonder spatie).
// Bestaande keuzes en AI-uitkomsten worden één keer omgezet naar de nieuwe sleutel, zodat er niets verloren gaat.
// Vallen twee oude namen samen, dan wint bij keuzes van gebruikers de nieuwste keuze per account,
// en bij de AI-lijst een keuze van de beheerder, anders de nieuwste uitkomst.
import { bedrijfSleutel } from "../src/classification/bedrijfSleutel.js";

export const SLEUTEL_VERSIE = "2";
const KOLOMMEN = {
  namen_stem: ["sleutel", "teken", "soort", "branche", "account", "categorie", "tijd"],
};
const PK = { namen_stem: "sleutel, teken, soort, branche, account", namen_ai: "sleutel, teken, soort, branche" };

export async function zetSleutelsOm(db, tabel) {
  await db.prepare("CREATE TABLE IF NOT EXISTS namen_meta (naam TEXT PRIMARY KEY, waarde TEXT)").run();
  const merk = `sleutel:${tabel}`;
  const r = await db.prepare("SELECT waarde FROM namen_meta WHERE naam = ?1").bind(merk).first();
  if (r?.waarde === SLEUTEL_VERSIE) return 0;
  const rijen = (await db.prepare(`SELECT * FROM ${tabel}`).all())?.results || [];
  const kol = KOLOMMEN[tabel] || (rijen[0] ? Object.keys(rijen[0]) : []);
  const opdrachten = [];
  const nieuw = [];
  for (const rij of rijen) {
    const k = bedrijfSleutel(rij.sleutel);
    if (k === rij.sleutel) continue;
    opdrachten.push(db.prepare(`DELETE FROM ${tabel} WHERE sleutel = ?1 AND teken = ?2 AND soort = ?3 AND branche = ?4${tabel === "namen_stem" ? " AND account = ?5" : ""}`)
      .bind(rij.sleutel, rij.teken, rij.soort, rij.branche, ...(tabel === "namen_stem" ? [rij.account] : [])));
    if (k) nieuw.push({ ...rij, sleutel: k });
  }
  const zet = kol.filter((c) => !PK[tabel].split(", ").includes(c)).map((c) => `${c} = excluded.${c}`).join(", ");
  const wanneer = tabel === "namen_ai"
    ? "WHERE (excluded.model = 'beheerder' AND IFNULL(namen_ai.model, '') <> 'beheerder') OR (excluded.tijd > namen_ai.tijd AND (IFNULL(namen_ai.model, '') <> 'beheerder' OR excluded.model = 'beheerder'))"
    : `WHERE excluded.tijd > ${tabel}.tijd`;
  for (const rij of nieuw) {
    opdrachten.push(db.prepare(`INSERT INTO ${tabel} (${kol.join(", ")}) VALUES (${kol.map((_, i) => `?${i + 1}`).join(", ")})
      ON CONFLICT(${PK[tabel]}) DO UPDATE SET ${zet} ${wanneer}`).bind(...kol.map((c) => rij[c] ?? null)));
  }
  for (let i = 0; i < opdrachten.length; i += 100) await db.batch(opdrachten.slice(i, i + 100));
  await db.prepare("INSERT INTO namen_meta (naam, waarde) VALUES (?1, ?2) ON CONFLICT(naam) DO UPDATE SET waarde = ?2").bind(merk, SLEUTEL_VERSIE).run();
  return opdrachten.length;
}
