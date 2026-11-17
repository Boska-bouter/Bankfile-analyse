// nieuw-V6R8 — één definitie van "open punt" voor het controlevenster, de jaartellingen en de meldingen (analyse 17-11).
// Een open punt is een groep (jaar + tegenpartij + categorie) met minstens één onzekere boeking.
import { counterpartyKey } from "../utils/normalization.js";

export const isLossePinbetaling = (tx) =>
  tx.category === "Winkels divers" && tx.confidence?.level === "heuristic" && /losse pinbetaling/i.test(tx.confidence?.label || "");

export const groepSleutelVan = (tx) =>
  isLossePinbetaling(tx) ? "__losse-pinbetalingen__|Winkels divers" : `${counterpartyKey(tx.counterparty || tx.description, tx.amount) || tx.id}|${tx.category}`;

export const isOnzeker = (tx) => tx.confidence?.level === "heuristic" || tx.confidence?.level === "fallback";

// Aantal open punten in deze boekingen (per jaar geteld).
export const telOpenPunten = (txs) => new Set((txs || []).filter((t) => !t.isMirror && isOnzeker(t)).map((t) => `${t.year}|${groepSleutelVan(t)}`)).size;

// Tekst voor de melding na een keuze, bijv. "3 boekingen aangepast · 1 open punt dicht".
export const keuzeMelding = (werkwoord, txs) => {
  const n = (txs || []).length;
  const p = telOpenPunten(txs);
  return `${n} boeking${n === 1 ? "" : "en"} ${werkwoord}` + (p > 0 ? ` · ${p} open punt${p === 1 ? "" : "en"} dicht` : "");
};
