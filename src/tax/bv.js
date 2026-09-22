// BV-specifieke, jaar-cumulatieve overzichten: rekening-courant-stand met de DGA en een indicatief
// eigen-vermogen-verloop. Bouwt bewust voort op dezelfde "Route B"-classificatie als de rest van de
// tool (fiscalTreatmentOf in categories.js) — de resultaatberekening zelf (summary.winst uit
// computeYearlySummary) verandert hier niet: "DGA-salaris" en "Vergoeding/huur aan holding" lopen
// daar al automatisch in mee als "kosten" (net als elke andere kostencategorie), en
// "Dividenduitkering"/"Rekening-courant DGA"/"Kapitaalstorting" tellen daar terecht niet in mee
// ("geen" fiscale behandeling — het zijn balansmutaties). Deze functies voegen alleen die
// balansmutaties toe die de winst zelf niet raken.
import { eur } from "../utils/amounts.js";

// Rekening-courant-stand: cumulatief saldo van alle "Rekening-courant DGA"-transacties op de
// zakelijke rekening, jaar na jaar opgebouwd. Een positief bedrag (geld van de BV naar de DGA, een
// opname) verhoogt de vordering van de BV op de DGA; een negatief bedrag (terugbetaling door de
// DGA) verlaagt die weer. Puur boekhoudkundig — geen rentetoets of "excessief lenen"-drempel, dat
// is een latere, bewuste uitbreiding.
export function computeRekeningCourantVerloop(classified, years) {
  const perJaar = {};
  for (const y of years) perJaar[y] = 0;
  for (const tx of classified) {
    if (tx.category !== "Rekening-courant DGA" || tx.isMirror) continue;
    if (perJaar[tx.year] === undefined) continue;
    perJaar[tx.year] += tx.amount;
  }
  let cumulatief = 0;
  const result = {};
  for (const y of [...years].sort((a, b) => a - b)) {
    cumulatief += perJaar[y];
    result[y] = { mutatieDitJaar: perJaar[y], standEindJaar: cumulatief };
  }
  return result;
}

// Indicatief eigen-vermogen-verloop: kapitaalstorting (verhoogt) + resultaat ná Vpb (verhoogt bij
// winst, verlaagt bij verlies) − dividenduitkering (verlaagt), cumulatief per jaar.
// `resultaatNaVpbPerJaar` moet per jaar worden aangeleverd (winst uit computeYearlySummary minus de
// Vpb-schatting uit estimateVpb) — deze functie combineert dat met de balansmutaties die de winst
// zelf niet raakt. Nadrukkelijk indicatief: een echte balans kent ook nog voorzieningen, langlopende
// schulden en waarderingsverschillen die deze cash-basis tool niet bijhoudt (zie het bouwplan).
export function computeEigenVermogenVerloop(classified, years, resultaatNaVpbPerJaar) {
  const kapitaalPerJaar = {};
  const dividendPerJaar = {};
  for (const y of years) { kapitaalPerJaar[y] = 0; dividendPerJaar[y] = 0; }
  for (const tx of classified) {
    if (tx.isMirror) continue;
    if (tx.category === "Kapitaalstorting" && kapitaalPerJaar[tx.year] !== undefined) kapitaalPerJaar[tx.year] += tx.amount;
    if (tx.category === "Dividenduitkering" && dividendPerJaar[tx.year] !== undefined) dividendPerJaar[tx.year] += Math.abs(tx.amount);
  }
  let cumulatief = 0;
  const result = {};
  for (const y of [...years].sort((a, b) => a - b)) {
    const resultaat = resultaatNaVpbPerJaar[y] || 0;
    cumulatief += kapitaalPerJaar[y] + resultaat - dividendPerJaar[y];
    result[y] = { kapitaalstorting: kapitaalPerJaar[y], resultaatNaVpb: resultaat, dividend: dividendPerJaar[y], standEindJaar: cumulatief };
  }
  return result;
}

// Signalering "stoppen of doorgaan": puur een rode-vlag-detectie op cijfers die de tool al
// berekent — geen advies en geen keuze, dat blijft aan een boekhouder/jurist (zie het bouwplan,
// "Advies bij tegenvallende cijfers"). Drie signalen, elk optioneel aanwezig:
//  - aanhoudend verlies: het actieve jaar én het jaar ervoor allebei een negatief resultaat vóór Vpb;
//  - negatief indicatief eigen vermogen: de cumulatieve stand (uit computeEigenVermogenVerloop) eind
//    het actieve jaar is negatief;
//  - oplopende onbetaalde BTW: het nog openstaande BTW-bedrag (yearlyOpenOB) is dit jaar zowel
//    positief (dus een schuld, geen tegoed) als hoger dan vorig jaar.
// `sortedYears` moet oplopend gesorteerd zijn (zoals `years` elders in de tool al is) zodat het
// "jaar ervoor" simpelweg de vorige waarde in de array is.
export function computeBvSignalering(activeYear, yearlySummaries, evVerloop, yearlyOpenOB, sortedYears) {
  if (!activeYear || !yearlySummaries?.[activeYear]) return null;
  const summary = yearlySummaries[activeYear];
  const idx = sortedYears.indexOf(activeYear);
  const prevYear = idx > 0 ? sortedYears[idx - 1] : null;
  const prevSummary = prevYear != null ? yearlySummaries[prevYear] : null;

  const aanhoudendVerlies = summary.winst < 0 && !!prevSummary && prevSummary.winst < 0;
  const ev = evVerloop?.[activeYear];
  const negatiefEigenVermogen = !!ev && ev.standEindJaar < 0;
  const openOB = yearlyOpenOB?.[activeYear] || 0;
  const prevOpenOB = prevYear != null ? yearlyOpenOB?.[prevYear] || 0 : 0;
  const oplopendeBtwSchuld = openOB > 0 && prevOpenOB > 0 && openOB > prevOpenOB;

  if (!aanhoudendVerlies && !negatiefEigenVermogen && !oplopendeBtwSchuld) return null;

  const redenen = [];
  if (aanhoudendVerlies) redenen.push(`een verlies in zowel ${prevYear} als ${activeYear}`);
  if (negatiefEigenVermogen) redenen.push(`een negatief indicatief eigen vermogen (${eur(ev.standEindJaar)}) eind ${activeYear}`);
  if (oplopendeBtwSchuld) redenen.push(`oplopende openstaande BTW (van ${eur(prevOpenOB)} naar ${eur(openOB)})`);

  return {
    niveau: "rood",
    redenen,
    tekst: `De cijfers laten ${redenen.join(", ")} zien. Dit kan een signaal zijn dat de BV (op deze weg) niet levensvatbaar blijft.`,
  };
}
