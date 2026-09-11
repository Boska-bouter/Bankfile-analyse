import { computeBtw } from "./btw.js";
import { eur } from "../utils/amounts.js";

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
// zakelijke kosten (na aftrek BTW), zonder de onttrekkingen hierboven. `fixedCategories` en
// `incomeTransferCategories` zijn optioneel — zonder die twee worden zakVast/zakVariabel/
// priVast/priVariabel gewoon op 0 gehouden (bijv. voor code die deze uitsplitsing niet nodig heeft).
export function computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd, fixedCategories = [], incomeTransferCategories = [], voorbelastingExcluded = []) {
  let zakBruto = 0, zakBtwTotaal = 0, zakelijkeInkomsten = 0, uitkeringenAanPrive = 0, priUitgegeven = 0;
  let zakVast = 0, zakVariabel = 0, priVast = 0, priVariabel = 0, zakelijkeUitgaven = 0, alBetaaldeZvwIh = 0;
  let verschuldigdBtw = 0, voorbelasting = 0;
  for (const tx of classified) {
    if (tx.type === "Prive" && !tx.isMirror && tx.amount < 0 && tx.year === year) {
      priUitgegeven += Math.abs(tx.amount);
      if (!incomeTransferCategories.includes(tx.category)) {
        if (fixedCategories.includes(tx.category)) priVast += Math.abs(tx.amount);
        else priVariabel += Math.abs(tx.amount);
      }
    }
    if (tx.type !== "Zakelijk" || tx.isMirror || tx.year !== year) continue;
    const btw = computeBtw(tx, categoryBtwRates, btwVerlegd);
    if (!ONTTREKKING_CATS.includes(tx.category)) {
      zakBruto += tx.amount;
      zakBtwTotaal += btw;
    }
    if (tx.category === "Zakelijke inkomsten") {
      zakelijkeInkomsten += tx.amount;
      const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
      if (!effectiefVerlegd) verschuldigdBtw += btw;
    } else {
      if (!voorbelastingExcluded.includes(tx.category)) voorbelasting += Math.abs(btw);
    }
    if (tx.category === "Zakelijke uitgaven") zakelijkeUitgaven += Math.abs(tx.amount);
    if (tx.category === "Belastingen: ZVW" || tx.category === "Belastingen: IH") alBetaaldeZvwIh += Math.abs(tx.amount);
    if (tx.category === "Uitbetaling aan prive" || tx.category === "Prive opnames") {
      uitkeringenAanPrive += Math.abs(tx.amount);
    }
    if (tx.amount < 0 && !incomeTransferCategories.includes(tx.category)) {
      if (fixedCategories.includes(tx.category)) zakVast += Math.abs(tx.amount);
      else zakVariabel += Math.abs(tx.amount);
    }
  }
  return {
    zakBruto, zakBtwTotaal, zakelijkeInkomsten, uitkeringenAanPrive, priUitgegeven,
    winst: zakBruto - zakBtwTotaal, zakVast, zakVariabel, priVast, priVariabel,
    zakelijkeUitgaven, alBetaaldeZvwIh, verschuldigdBtw, voorbelasting,
  };
}

// Welke jaren zijn "volledig" (alle 4 kwartalen hebben minstens 1 zakelijke transactie)? Een
// trendvergelijking tussen twee jaren heeft alleen zin als BEIDE jaren volledig zijn.
export function computeVolledigeJaren(classified) {
  const kwartalenPerJaar = {};
  for (const tx of classified) {
    if (tx.type !== "Zakelijk" || tx.isMirror) continue;
    const [y, m] = tx.month.split("-");
    const kwartaal = Math.ceil(Number(m) / 3);
    if (!kwartalenPerJaar[y]) kwartalenPerJaar[y] = new Set();
    kwartalenPerJaar[y].add(kwartaal);
  }
  const result = new Set();
  for (const [y, kwartalen] of Object.entries(kwartalenPerJaar)) {
    if ([1, 2, 3, 4].every((q) => kwartalen.has(q))) result.add(Number(y));
  }
  return result;
}

// Kwalitatief advies voor het actieve jaar: is het resultaat per saldo positief of negatief,
// en staan er wel typische privé-uitgaven tussen (anders is het beeld mogelijk vertekend omdat
// niet alle privé-uitgaven zijn opgegeven).
const TYPISCHE_PRIVE_CATEGORIEEN = ["Boodschappen", "Huur", "Hypotheek", "Energie-water", "Prive - vrijetijd-uitgaan-vakantie"];
export function computeBusinessAdvies(activeYear, summary, openOB, ibEstimate, ibGedaan, priItems, manualPriveCorrectie) {
  if (!activeYear || !summary) return null;
  const ibBelastingEffectief = ibGedaan ? 0 : ibEstimate.belasting;
  const basisPriveUitgegeven = summary.priUitgegeven > 0 ? summary.priUitgegeven : summary.uitkeringenAanPrive;
  const effectievePriveUitgegeven = basisPriveUitgegeven + manualPriveCorrectie;
  const verschil = summary.winst - effectievePriveUitgegeven - openOB - ibBelastingEffectief;

  let niveau, tekst;
  if (verschil < 0) {
    niveau = "negatief";
    tekst = `Er is in totaal een negatief resultaat: winst ${eur(summary.winst)}, maar de privé-uitgaven (of het bedrag dat is overgemaakt/opgenomen naar privé) en de belastingen samen zijn hoger dan wat de winst dekt (tekort ${eur(Math.abs(verschil))}).`;
  } else {
    niveau = "positief";
    tekst = `Er is in totaal een positief resultaat: winst ${eur(summary.winst)}, en de uitgaven/belastingen worden gedekt (over ${eur(verschil)}).`;
  }
  if (manualPriveCorrectie !== 0) {
    tekst += ` ⚠ Let op: dit is inclusief een tijdelijke, handmatig ingevulde correctie van ${eur(manualPriveCorrectie)} op de privé-uitgaven — controleer of dat nog klopt.`;
  }
  const heeftTypischePriveUitgaven = priItems.some((tx) => !tx.isMirror && TYPISCHE_PRIVE_CATEGORIEEN.includes(tx.category));
  if (summary.uitkeringenAanPrive > 0 && !heeftTypischePriveUitgaven) {
    tekst += ` Let op: er staan geen typische, alledaagse privé-uitgaven tussen (zoals boodschappen, huur/hypotheek, energie-water, vrijetijd-uitgaan/vakantie) — mogelijk zijn niet alle privé-uitgaven opgegeven, waardoor het beeld bij Tekort/Over kan afwijken van de werkelijkheid.`;
  }
  return { niveau, tekst };
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
