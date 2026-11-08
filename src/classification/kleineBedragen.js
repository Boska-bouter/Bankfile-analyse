import { counterpartyKey } from "../utils/normalization.js";
import { fiscalTreatmentOf } from "./categories.js";

// huishoudboekje-V6R9 — kleine onzekere boekingen hoeven niet met de hand nagelopen te worden (wens Boska 8-11:
// "al die kleine bedragen controleren is enorm veel werk en levert nauwelijks iets op").
// Een tegenpartij (met categorie) telt als "klein" als ál haar onzekere afschrijvingen onder de bedraggrens blijven.
// Zulke boekingen houden hun categorie (Overig en personen tellen fiscaal niet mee), krijgen tx.kleinBedrag = true
// en tellen niet meer als open punt. Op een dossier met omzet blijven ze samen onder `procent` van de omzet:
// de kleinste tegenpartijen eerst, de rest blijft gewoon open.
export const KLEIN_STANDAARD = { grens: 50, procent: 2.5 };

const isOpen = (t) => t.confidence?.level === "heuristic" || t.confidence?.level === "fallback";

export function kleinInstelling(instelling) {
  const grens = Number(instelling?.grens ?? KLEIN_STANDAARD.grens);
  const procent = Number(instelling?.procent ?? KLEIN_STANDAARD.procent);
  return { grens: Number.isFinite(grens) && grens > 0 ? grens : 0, procent: Number.isFinite(procent) && procent >= 0 ? procent : KLEIN_STANDAARD.procent };
}

export function omzetVan(classified) {
  return (classified || []).reduce((s, t) => (t.amount > 0 && !t.isMirror && fiscalTreatmentOf(t.category) === "omzet" ? s + t.amount : s), 0);
}

export function markeerKleineBedragen(classified, instelling) {
  const { grens, procent } = kleinInstelling(instelling);
  if (!grens || !classified?.length) return classified;
  const groepen = new Map();
  for (const t of classified) {
    if (t.isMirror || t.transferLocked || !(Number(t.amount) < 0) || !isOpen(t)) continue;
    const k = `${counterpartyKey(t.counterparty || t.description, t.amount) || `rij:${t.id}`}|${t.category}`;
    const g = groepen.get(k) || { ids: [], totaal: 0, max: 0 };
    g.ids.push(t.id); g.totaal += Math.abs(Number(t.amount)); g.max = Math.max(g.max, Math.abs(Number(t.amount)));
    groepen.set(k, g);
  }
  const omzet = omzetVan(classified);
  const ruimte = omzet > 0 ? (omzet * procent) / 100 : Infinity;
  const ids = new Set();
  let som = 0;
  for (const g of [...groepen.values()].filter((x) => x.max < grens).sort((a, b) => a.totaal - b.totaal)) {
    if (som + g.totaal > ruimte) break;
    som += g.totaal;
    g.ids.forEach((id) => ids.add(id));
  }
  if (!ids.size) return classified;
  return classified.map((t) => (ids.has(t.id) ? { ...t, kleinBedrag: true } : t));
}

// huishoudboekje-V6R9 — de kleine boekingen per tegenpartij + categorie, voor "alsnog nalopen" (wens Boska 8-11).
export function kleineGroepen(classified) {
  const m = new Map();
  for (const t of classified || []) {
    if (!t.kleinBedrag || t.isMirror) continue;
    const k = `${counterpartyKey(t.counterparty || t.description, t.amount) || `rij:${t.id}`}|${t.category}|${t.type}`;
    const g = m.get(k) || { key: k, name: t.counterparty || t.description || "(geen naam)", category: t.category, type: t.type, ids: [], total: 0, count: 0 };
    g.ids.push(t.id); g.total += Number(t.amount); g.count++;
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.total - b.total);
}

// Samenvatting voor de melding in Controleren.
export function kleinOverzicht(classified, instelling) {
  let aantal = 0, totaal = 0;
  const partijen = new Set();
  for (const t of classified || []) {
    if (!t.kleinBedrag || t.isMirror) continue;
    aantal++; totaal += Math.abs(Number(t.amount)); partijen.add(`${counterpartyKey(t.counterparty || t.description, t.amount) || t.id}|${t.category}`);
  }
  const omzet = omzetVan(classified);
  return { ...kleinInstelling(instelling), aantal, totaal, partijen: partijen.size, omzet, aandeel: omzet > 0 ? (totaal / omzet) * 100 : null };
}
