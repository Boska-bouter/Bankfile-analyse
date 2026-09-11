import { normKey, counterpartyKey } from "../utils/normalization.js";

// Groepeert binnenkomende betalingen per tegenpartij — voor de vraag "is dit een zakelijke
// klant, of loondienst/privé-inkomen?". Bestanden die op rekeningniveau al als "Zakelijk" zijn
// aangemerkt slaan deze vraag over (dat is al beantwoord).
export function computeIncomeSummary(transactions, accountTypeByFile) {
  const map = {};
  for (const tx of transactions) {
    if (tx.amount <= 0) continue;
    if (accountTypeByFile[tx.source] === "Zakelijk") continue;
    const key = normKey(tx.counterparty || tx.description);
    if (!key) continue;
    if (!map[key]) {
      map[key] = { key, name: tx.counterparty || tx.description, total: 0, count: 0, source: tx.source, description: "", years: new Set() };
    }
    map[key].total += tx.amount;
    map[key].count += 1;
    map[key].years.add(tx.year);
    map[key].description = tx.fullDescription || tx.description || map[key].description;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// Groepeert transacties in één categorie per tegenpartij + teken (ontvangen/betaald) — gebruikt
// voor zowel "Overboekingen aan personen" als "Overig" opruimen (zelfde soort werkstroom).
export function computeCategorySummary(classified, category) {
  const map = {};
  for (const tx of classified) {
    if (tx.category !== category || tx.isMirror) continue;
    const key = counterpartyKey(tx.counterparty || tx.description, tx.amount);
    if (!key) continue;
    if (!map[key]) {
      map[key] = {
        key, name: tx.counterparty || tx.description, amount: tx.amount, total: 0, count: 0,
        category: tx.category, type: tx.type, description: "", years: new Set(),
      };
    }
    map[key].total += tx.amount;
    map[key].count += 1;
    map[key].years.add(tx.year);
    map[key].description = tx.fullDescription || tx.description || map[key].description;
  }
  return Object.values(map).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}
