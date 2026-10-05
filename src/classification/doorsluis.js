import { ibansMatch } from "../utils/normalization.js";

// V72 — "Doorsluisrekening": een derde eigen rekening (bijv. een tweede privérekening bij een andere
// bank) waar geld via loopt: zakelijk → derde rekening → privé. De privékant boekt zo'n ontvangst op
// naam als "Ontvangen van zakelijk" (de tegenrekening is geen geladen rekening, dus geen IBAN-match).
// Dat klopt alleen als er aan de zakelijke kant ook echt een uitgaande boeking naar datzelfde IBAN
// staat (zelfde bedrag, binnen enkele dagen). Zonder die tegenboeking komt het geld uit eigen
// privégeld (terugbetaling, Tikkie) en hoort het niet in de controle zakelijk ↔ privé: dan wordt het
// een neutrale "Interne overboeking". Elke zakelijke boeking dekt hooguit één privéboeking.
const DAGEN_MARGE = 5;
const tijd = (d) => (d instanceof Date ? d.getTime() : new Date(d).getTime());

export function koppelDoorsluisOverboekingen(base, heeftZakelijkeRekening) {
  if (!heeftZakelijkeRekening) return base;
  const priveKandidaten = (tx) =>
    tx.accountType === "Prive" && !tx.transferLocked && !tx.isMirror && tx.counterpartyIban &&
    tx.confidence?.level !== "override" &&
    (tx.category === "Ontvangen van zakelijk" || tx.category === "Terugboeking naar zakelijk");
  const kand = base.filter(priveKandidaten);
  if (kand.length === 0) return base;
  const zakelijkVrij = base.filter(
    (t) => t.accountType === "Zakelijk" && !t.isMirror && t.counterpartyIban &&
      (t.category === "Prive opnames" || t.category === "Terugboeking van prive")
  );
  const gebruikt = new Set();
  const naarNeutraal = new Set();
  for (const tx of kand) {
    const match = zakelijkVrij.find(
      (z) => !gebruikt.has(z.id) && ibansMatch(z.counterpartyIban, tx.counterpartyIban) &&
        Math.abs(z.amount + tx.amount) < 0.005 &&
        Math.abs(tijd(z.date) - tijd(tx.date)) <= DAGEN_MARGE * 86400000
    );
    if (match) gebruikt.add(match.id);
    else naarNeutraal.add(tx.id);
  }
  if (naarNeutraal.size === 0) return base;
  return base.map((tx) =>
    naarNeutraal.has(tx.id)
      ? { ...tx, category: "Interne overboeking", confidence: { level: "keyword", label: "Eigen rekening — geen zakelijke tegenboeking, telt niet mee in de controle zakelijk ↔ privé" } }
      : tx
  );
}
