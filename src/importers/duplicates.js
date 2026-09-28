import { normKey } from "../utils/normalization.js";

// v237 — Zekerheid inbouwen: een letterlijke boekingstijdstempel is niet beschikbaar in dit soort
// bank-exports (datum zonder tijd-component, geen uniek mutatienummer per regel), maar het LOPENDE
// SALDO na elke mutatie (wanneer de bron een saldokolom heeft) is een veel sterker signaal dan de
// tekstuele match (datum+bedrag+tegenpartij+omschrijving) alleen: twee losse, opeenvolgende
// transacties kunnen nooit toevallig hetzelfde lopende saldo achterlaten, terwijl exact dezelfde
// boeking twee keer ingelezen vanzelfsprekend wél hetzelfde saldo laat zien. Dus waar mogelijk wordt
// het saldo nu ook echt gebruikt om een match te bevestigen ("duplicaat") of te ontkrachten ("apart"
// — gegarandeerd losse, echte transacties), in plaats van alleen informatief in de UI getoond te
// worden zoals voorheen.
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

  const rawGroups = Object.values(byFingerprintKey).filter((g) => g.length > 1);

  const duplicateGroups = [];
  const confirmedSeparateGroups = [];
  for (const group of rawGroups) {
    const saldos = group.map((t) => t.balance);
    const heeftAlleSaldos = saldos.every((s) => s != null);
    const alleGelijk = heeftAlleSaldos && saldos.every((s) => s === saldos[0]);
    if (heeftAlleSaldos && !alleGelijk) {
      // Saldo loopt door bij elke boeking in de groep → onmogelijk dezelfde boeking twee keer,
      // gegarandeerd losse, echte transacties. Deze tellen niet meer mee als (mogelijke) duplicaten.
      confirmedSeparateGroups.push(group.map((t) => ({ ...t, certainty: "apart" })));
      continue;
    }
    // Met saldo én allemaal gelijk: harde bevestiging. Zonder (volledige) saldo-informatie: nog
    // steeds onzeker, net als voorheen — puur op tekst/bedrag/datum gebaseerd.
    const certainty = heeftAlleSaldos ? "duplicaat" : "onzeker";
    duplicateGroups.push(group.map((t) => ({ ...t, certainty })));
  }

  const duplicateFingerprints = new Set(duplicateGroups.flatMap((g) => g.slice(1).map((t) => t.fingerprint)));
  return { fingerprintByTxId, duplicateGroups, duplicateFingerprints, confirmedSeparateGroups };
}
