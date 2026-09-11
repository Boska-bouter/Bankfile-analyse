import { normKey } from "../utils/normalization.js";

// Dubbele-transacties-check: dezelfde datum + bedrag + tegenpartij/omschrijving komt vaker voor
// dan 1x — kan gebeuren als je een bankexport met overlappende periode nogmaals uploadt. Elke
// transactie krijgt een stabiele "vingerafdruk" (inhoud + volgnummer binnen de groep gelijke
// transacties) zodat een keuze om duplicaten uit te sluiten ook na herladen van het project
// blijft staan — in tegenstelling tot het technische, sessie-gebonden id.
export function computeDuplicateInfo(allTransactions) {
  const counters = {};
  const fingerprintByTxId = {};
  const byFingerprintKey = {};
  for (const tx of allTransactions) {
    const key = `${tx.date.getTime()}::${tx.amount}::${normKey(tx.counterparty)}::${normKey(tx.description)}`;
    const i = counters[key] || 0;
    counters[key] = i + 1;
    const fingerprint = `${key}::${i}`;
    fingerprintByTxId[tx.id] = fingerprint;
    if (!byFingerprintKey[key]) byFingerprintKey[key] = [];
    byFingerprintKey[key].push({ ...tx, fingerprint });
  }
  const duplicateGroups = Object.values(byFingerprintKey).filter((g) => g.length > 1);
  // Bij een duplicaat-groep wordt de EERSTE bewaard, de rest gemarkeerd als "te verwijderen".
  const duplicateFingerprints = new Set(duplicateGroups.flatMap((g) => g.slice(1).map((t) => t.fingerprint)));
  return { fingerprintByTxId, duplicateGroups, duplicateFingerprints };
}
