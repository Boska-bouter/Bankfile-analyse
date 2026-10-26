import { normalizeIban } from "../utils/normalization.js";

// beide-V6R5 — dezelfde rekening via een bankbestand én via de bankkoppeling: in de periode die de koppeling
// dekt, telt de koppeling (besluit Boska 26-10). De gewone duplicatencontrole vond deze dubbelingen niet,
// want Ponto schrijft tegenpartij en omschrijving anders dan de bank in zijn CSV.
// - Binnen de koppelingsperiode vallen alle boekingen uit het bestand weg.
// - Op de rand (eerste en laatste dag van de koppeling, en één dag ervoor/erna) alleen als er een boeking in
//   de koppeling is met hetzelfde bedrag, hooguit een dag verschoven (boek- of valutadatum).
// - Buiten die periode telt het bestand gewoon, zodat oud bestand + nieuwe koppeling één doorlopende reeks geven.
// De bestanden zelf blijven ongewijzigd (importcontrole, saldocontrole); alleen de berekeningen slaan ze over.
// paren: boeking uit het bestand → bijbehorende boeking uit de koppeling, om eigen keuzes over te nemen.

const dag = (d) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
const centen = (n) => Math.round(n * 100);

export function overlapBestandKoppeling(allTransactions, parsedFiles, ownAccountByFile = {}) {
  const koppelIban = {};
  for (const pf of parsedFiles || []) {
    if (!pf.bankKoppeling) continue;
    const iban = normalizeIban(pf.bankKoppeling.iban || pf.eigenRekening || "");
    if (iban) koppelIban[pf.fileName] = iban;
  }
  const leeg = { weg: new Set(), overlap: [], paren: new Map() };
  if (!Object.keys(koppelIban).length) return leeg;

  const perIban = new Map();
  for (const tx of allTransactions) {
    const iban = koppelIban[tx.source];
    if (!iban || !tx.date) continue;
    const d = dag(tx.date);
    let r = perIban.get(iban);
    if (!r) perIban.set(iban, (r = { van: d, tot: d, koppelingen: new Set(), opBedrag: new Map() }));
    r.van = Math.min(r.van, d);
    r.tot = Math.max(r.tot, d);
    r.koppelingen.add(tx.source);
    const k = centen(tx.amount);
    if (!r.opBedrag.has(k)) r.opBedrag.set(k, []);
    r.opBedrag.get(k).push({ d, id: tx.id, gebruikt: false });
  }

  const weg = new Set();
  const paren = new Map();
  const perBestand = new Map();
  // Eerst de boekingen binnen de periode, dan de randen: zo pakt een randboeking geen tegenhanger af van binnen.
  const kandidaten = [];
  for (const tx of allTransactions) {
    if (koppelIban[tx.source] || !tx.date) continue;
    const iban = normalizeIban(ownAccountByFile[tx.source] || tx.ownAccount || "");
    const r = iban && perIban.get(iban);
    if (!r) continue;
    const d = dag(tx.date);
    if (d < r.van - 1 || d > r.tot + 1) continue;
    kandidaten.push({ tx, r, d, iban, binnen: d > r.van && d < r.tot });
  }
  kandidaten.sort((a, b) => (b.binnen - a.binnen) || (a.d - b.d));
  for (const { tx, r, d, iban, binnen } of kandidaten) {
    const lijst = r.opBedrag.get(centen(tx.amount)) || [];
    const tegen = lijst.find((k) => !k.gebruikt && k.d === d) || lijst.find((k) => !k.gebruikt && Math.abs(k.d - d) <= 1);
    if (tegen) { tegen.gebruikt = true; paren.set(tx.id, tegen.id); }
    if (!binnen && !tegen) continue;
    weg.add(tx.id);
    const sleutel = `${tx.source}|${iban}`;
    let o = perBestand.get(sleutel);
    if (!o) perBestand.set(sleutel, (o = { bestand: tx.source, iban, koppelingen: [...r.koppelingen], van: tx.date, tot: tx.date, weggelaten: 0, zonderTegenhanger: 0 }));
    o.weggelaten++;
    if (!tegen) o.zonderTegenhanger++;
    if (tx.date < o.van) o.van = tx.date;
    if (tx.date > o.tot) o.tot = tx.date;
  }
  return { weg, overlap: [...perBestand.values()], paren };
}
