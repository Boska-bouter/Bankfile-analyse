// nieuw-V7R6 — hoe breed is een zoekwoord? (mockup akkoord Boska 17-11). Een eigen zoekwoord als "eindhoven" (plaatsnaam in elke
// pinbetaling daar) of "trans" (stond in "Transactie:") raakte honderden boekingen van allerlei winkels. Bij meer dan BREED_GRENS
// verschillende tegenpartijen waarschuwt de app voordat het woord wordt toegevoegd, en markeert hij zo'n woord als het al in het dossier staat.
// Tegenpartijen tellen op het eerste woord van de naam: alle filialen van één keten ("Jumbo Boschdijk", "Jumbo Woensel") zijn één partij.
import { keywordInText, zonderBetaalmiddel, isCardPaymentTx, VASTE_BANKTEKST } from "../classification/classify.js";

export const BREED_GRENS = 10;
export const fmtAantal = (n) => Number(n || 0).toLocaleString("nl-NL");
const VOORVOEGSEL = /^(?:bck|zettle|izettle|sumup|ccv|pay\.nl|sq|ppro|paypal|mollie|adyen|buckaroo)\s*\*\s*/;
const RUIS = new Set(["de", "het", "den", "der", "van", "the", "fa", "firma", "stg", "stichting", "bv", "b.v.", "nv", "vof", "mw", "hr", "dhr", "mevr", "fam", "ccv"]);

export function naamKern(naam) {
  let t = String(naam || "").toLowerCase().trim();
  if (t.includes("*")) t = t.slice(t.lastIndexOf("*") + 1);
  t = t.replace(VOORVOEGSEL, "").replace(/[^a-z0-9à-ÿ&\s]/g, " ");
  const woorden = t.split(/\s+/).filter((w) => w && !RUIS.has(w) && !/^\d+$/.test(w));
  return woorden[0] || "";
}

const tekstVan = (t) => zonderBetaalmiddel(` ${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase());

export function zoekwoordBereik(keyword, transacties) {
  const kw = String(keyword || "").toLowerCase();
  if (!kw.trim()) return null;
  const perNaam = new Map(), perCat = new Map();
  let boekingen = 0, pin = 0, inNaam = 0;
  for (const t of transacties || []) {
    if (t.isMirror || !keywordInText(tekstVan(t), kw)) continue;
    boekingen++;
    const kern = naamKern(t.counterparty || t.description) || "?";
    const naam = String(t.counterparty || "").replace(VASTE_BANKTEKST, " ").trim() || String(t.description || "").replace(VASTE_BANKTEKST, " ").trim().slice(0, 30);
    const p = perNaam.get(kern) || { naam, aantal: 0 };
    p.aantal++; perNaam.set(kern, p);
    if (t.category) perCat.set(t.category, (perCat.get(t.category) || 0) + 1);
    if (isCardPaymentTx(t)) pin++;
    if (String(t.counterparty || "").toLowerCase().includes(kw.trim()) && naamKern(t.counterparty) !== naamKern(kw)) inNaam++;
  }
  const tegenpartijen = perNaam.size;
  return {
    keyword: kw.trim(), boekingen, tegenpartijen,
    breed: tegenpartijen > BREED_GRENS,
    // Plaatsnaam: vooral pinbetalingen, en het woord staat in de naam maar niet vooraan ("Jumbo Boschdijk EINDHOVEN").
    plaatsnaam: tegenpartijen > BREED_GRENS && pin >= boekingen * 0.6 && inNaam >= boekingen * 0.6,
    voorbeelden: [...perNaam.values()].sort((a, b) => b.aantal - a.aantal).slice(0, 3),
    perCategorie: [...perCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
  };
}
