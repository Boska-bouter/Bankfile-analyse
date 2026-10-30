import { counterpartyKey, ibanKey } from "../utils/normalization.js";
import { fiscalTreatmentOf } from "./categories.js";

// beide-V11R7 — signalen uit de vergelijking met de accountant (Koenders 2024/2025, wens Boska 30-10). Alleen automatische
// uitkomsten: een eigen keuze ("override") blijft altijd zoals hij is.
//  - Een teruggekregen borg is geen omzet → "Overig" (nakijken).
//  - Een eenmalige grote ontvangst (≥ € 10.000) van een partij die verder niets betaalt: omzet, of verkoop van een bedrijfsmiddel?
//  - Een opdrachtgever die op de privérekening betaalt terwijl er een zakelijke rekening is: omzet, of loon?
//  - Een privé-verzekering die vanaf de zakelijke rekening wordt betaald: zakelijk of privé?
// De laatste drie houden hun categorie en komen op "nakijken" (confidence "heuristic").
export const BORG = /\bborg(som)?\b|\bwaarborg/i;
export const EENMALIG_GRENS = 10000;
const PRIVE_VERZEKERING = new Set(["Verzekeringen", "Verzekering: Overig", "Verzekering: Wonen"]);
const tekstVan = (t) => `${t.description || ""} ${t.fullDescription || ""}`;
const sleutel = (t) => ibanKey(t.counterpartyIban, 1) || counterpartyKey(t.counterparty || t.description, 1);

export function markeerNakijkSignalen(lijst) {
  const heeftZakelijk = lijst.some((t) => t.accountType === "Zakelijk");
  const ontvangsten = new Map();
  for (const t of lijst) {
    if (t.isMirror || !(t.amount > 0)) continue;
    const k = sleutel(t);
    if (k) ontvangsten.set(k, (ontvangsten.get(k) || 0) + 1);
  }
  return lijst.map((t) => {
    if (t.isMirror || t.transferLocked || t.confidence?.level === "override") return t;
    const omzet = t.amount > 0 && fiscalTreatmentOf(t.category) === "omzet";
    if (omzet && BORG.test(tekstVan(t))) {
      return { ...t, category: "Overig", confidence: { level: "fallback", label: "Teruggekregen borg: geen omzet — controleren" } };
    }
    if (omzet && t.amount >= EENMALIG_GRENS && ontvangsten.get(sleutel(t)) === 1 && !/opdrachtgever/.test(t.confidence?.label || "")) {
      return { ...t, confidence: { level: "heuristic", label: "Eenmalige grote ontvangst: omzet, of verkoop van een bedrijfsmiddel (kies dan \"Verkoop activa\")?" } };
    }
    if (omzet && heeftZakelijk && t.accountType === "Prive") {
      return { ...t, confidence: { level: "heuristic", label: "Ontvangst op de privérekening: omzet, of loon? Zo nodig \"Splitsen per rekening\"" } };
    }
    if (t.amount < 0 && t.accountType === "Zakelijk" && PRIVE_VERZEKERING.has(t.category)) {
      return { ...t, confidence: { level: "heuristic", label: "Verzekering vanaf de zakelijke rekening: zakelijk of privé?" } };
    }
    return t;
  });
}
