import { counterpartyKey, ibanKey } from "../utils/normalization.js";
import { fiscalTreatmentOf } from "./categories.js";

// beide-V8R4 — een terugbetaling is geen omzet (wens Boska 27-10, vergelijking Eenvoudig ↔ Uitgebreid). Een teruggedraaide incasso
// of refund van een partij waaraan ook betaald wordt (Ziggo, Vodafone, Eneco, een webwinkel) werd op zoekwoorden als
// "factuur" automatisch "Zakelijke inkomsten" en telde dan als omzet mét BTW. Herkend als terugbetaling als:
//  - dezelfde partij (IBAN of naam) binnen 120 dagen een afschrijving van precies hetzelfde bedrag heeft, of
//  - de omschrijving een woord als refund/terugbetaling/storno noemt en dezelfde partij ook afschrijvingen heeft.
// De bijschrijving krijgt dan de categorie van die afschrijving en verlaagt zo de kosten. Alleen automatische uitkomsten:
// een eigen keuze en een opgegeven opdrachtgever blijven zoals ze zijn.
const DAG = 86400000;
const WOORDEN = /\b(refund|terugbetaling|terugbetaald|restitutie|storno|terugboeking|teruggeboekt|retour|creditnota|creditering)\b/i;
const sleutels = (t) => [ibanKey(t.counterpartyIban, -1), counterpartyKey(t.counterparty || t.description, -1)].filter(Boolean);

export function herkenTerugbetalingen(transacties) {
  const af = new Map();
  for (const t of transacties) {
    if (t.isMirror || !(t.amount < 0) || fiscalTreatmentOf(t.category) === "omzet") continue;
    for (const k of sleutels(t)) { if (!af.has(k)) af.set(k, []); af.get(k).push(t); }
  }
  if (af.size === 0) return transacties;
  let gewijzigd = false;
  const uit = transacties.map((t) => {
    if (t.isMirror || !(t.amount > 0) || t.transferLocked || fiscalTreatmentOf(t.category) !== "omzet") return t;
    const lvl = t.confidence?.level;
    if (lvl === "override" || /opdrachtgever/.test(t.confidence?.label || "")) return t;
    const kandidaten = [...new Set(sleutels(t).flatMap((k) => af.get(k) || []))];
    if (kandidaten.length === 0) return t;
    const datum = (x) => (x.date instanceof Date ? x.date.getTime() : new Date(x.date).getTime());
    const gelijk = kandidaten
      .filter((a) => Math.abs(a.amount + t.amount) < 0.005 && Math.abs(datum(t) - datum(a)) <= 120 * DAG)
      .sort((a, b) => Math.abs(datum(t) - datum(a)) - Math.abs(datum(t) - datum(b)))[0];
    let bron = gelijk;
    if (!bron && WOORDEN.test(`${t.description || ""} ${t.fullDescription || ""}`)) {
      const tel = {};
      for (const a of kandidaten) tel[a.category] = (tel[a.category] || 0) + 1;
      const cat = Object.entries(tel).sort((a, b) => b[1] - a[1])[0][0];
      bron = kandidaten.find((a) => a.category === cat);
    }
    if (!bron) return t;
    gewijzigd = true;
    return { ...t, category: bron.category, terugbetalingVan: bron.id, confidence: { level: "heuristic", label: `Geschat: terugbetaling, zelfde categorie als de afschrijving (${bron.category})` } };
  });
  return gewijzigd ? uit : transacties;
}
