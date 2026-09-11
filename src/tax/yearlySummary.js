import { computeBtw } from "./btw.js";

// Categorieën die geen omzet of kosten zijn maar onttrekkingen/persoonlijke belastingen — tellen
// niet mee in de winstberekening (WUO is een BRUTO bedrag, dus deze moeten er expliciet buiten
// blijven, anders schuift WUO ongemerkt richting een nettobedrag). Zie ook DEFAULT_RULES-comments
// in categories.js voor de achtergrond bij de naheffingen-volgorde.
const ONTTREKKING_CATS = [
  "Uitbetaling aan prive", "Prive opnames", "Terugboeking van prive",
  "Belastingen: ZVW", "Belastingen: IH",
  "Belastingen: Naheffingen OB voorgaande jaren", "Belastingen: Naheffingen IB voorgaande jaren",
];

// Winst uit onderneming (bruto) voor één jaar = Zakelijke inkomsten min BTW min de overige
// zakelijke kosten (na aftrek BTW), zonder de onttrekkingen hierboven.
export function computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd) {
  let zakBruto = 0, zakBtwTotaal = 0, zakelijkeInkomsten = 0, uitkeringenAanPrive = 0, priUitgegeven = 0;
  for (const tx of classified) {
    if (tx.type === "Prive" && !tx.isMirror && tx.amount < 0 && tx.year === year) {
      priUitgegeven += Math.abs(tx.amount);
    }
    if (tx.type !== "Zakelijk" || tx.isMirror || tx.year !== year) continue;
    const btw = computeBtw(tx, categoryBtwRates, btwVerlegd);
    if (!ONTTREKKING_CATS.includes(tx.category)) {
      zakBruto += tx.amount;
      zakBtwTotaal += btw;
    }
    if (tx.category === "Zakelijke inkomsten") zakelijkeInkomsten += tx.amount;
    if (tx.category === "Uitbetaling aan prive" || tx.category === "Prive opnames") {
      uitkeringenAanPrive += Math.abs(tx.amount);
    }
  }
  return { zakBruto, zakBtwTotaal, zakelijkeInkomsten, uitkeringenAanPrive, priUitgegeven, winst: zakBruto - zakBtwTotaal };
}

// Nog te betalen/terug te vragen OB per jaar — alleen de kwartalen die nog NIET als "betaald"
// zijn aangevinkt tellen mee (een al betaald kwartaal hoort niet meer als openstaand).
export function computeYearlyOpenOB(classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, kwartaalStatus) {
  const perQuarter = {};
  for (const tx of classified) {
    if (tx.type !== "Zakelijk" || tx.isMirror) continue;
    const [y, m] = tx.month.split("-");
    const kwartaal = Math.ceil(Number(m) / 3);
    const key = `${y}-Q${kwartaal}`;
    if (!perQuarter[key]) perQuarter[key] = { year: Number(y), verschuldigdBtw: 0, voorbelasting: 0 };
    const btw = computeBtw(tx, categoryBtwRates, btwVerlegd);
    if (tx.category === "Zakelijke inkomsten") {
      const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
      if (!effectiefVerlegd) perQuarter[key].verschuldigdBtw += btw;
    } else if (!voorbelastingExcluded.includes(tx.category)) {
      perQuarter[key].voorbelasting += Math.abs(btw);
    }
  }
  const result = {};
  for (const [key, q] of Object.entries(perQuarter)) {
    const status = kwartaalStatus[key] || {};
    if (!result[q.year]) result[q.year] = 0;
    if (!status.betaald) result[q.year] += q.verschuldigdBtw - q.voorbelasting;
  }
  return result;
}
