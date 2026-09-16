import { computeBtw } from "./btw.js";
import { fiscalTreatmentOf } from "../classification/categories.js";
import { eur } from "../utils/amounts.js";

// Winst uit onderneming (bruto) voor één jaar = Zakelijke inkomsten min BTW min de overige
// zakelijke kosten (na aftrek BTW), plus alleen de aftrekbare rente op leningen/financiële lease
// (niet de volledige termijn). Welke categorie meetelt als omzet/kosten/financiering/geheel-niet
// wordt bepaald door fiscalTreatmentOf (zie categories.js) — dus op basis van de CATEGORIE, niet
// van tx.type: een privé-uitgave betaald vanaf de zakelijke rekening telt hier niet mee, en een
// zakelijke uitgave betaald vanaf de privérekening telt wél mee. `renteAftrekbaar` is de som van
// de rente-over-dit-jaar op leningen en financiële lease (positief getal, een kostenpost) — laat
// je dit weg, dan wordt er conservatief 0 rente afgetrokken (nooit te veel winst wegschrijven).
// `fixedCategories` en `incomeTransferCategories` zijn optioneel — zonder die twee worden
// zakVast/zakVariabel/priVast/priVariabel gewoon op 0 gehouden (bijv. voor code die deze
// uitsplitsing niet nodig heeft).
export function computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd, fixedCategories = [], incomeTransferCategories = [], voorbelastingExcluded = [], renteAftrekbaar = 0) {
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
    if (tx.isMirror || tx.year !== year) continue;

    // Wat is er al vanaf de zakelijke rekening zelf betaald/opgenomen? Dit is een rekeningvraag
    // (welke rekening het geld verliet, voor de "Tekort/Over"-vergelijking) — blijft dus bewust
    // op tx.type gebaseerd, niet op categorie.
    if (tx.type === "Zakelijk") {
      if (tx.category === "Belastingen: ZVW" || tx.category === "Belastingen: IH") alBetaaldeZvwIh += Math.abs(tx.amount);
      if (tx.category === "Uitbetaling aan prive" || tx.category === "Prive opnames") uitkeringenAanPrive += Math.abs(tx.amount);
    }

    // De fiscale zakelijke berekening (winst/BTW) zelf: gebaseerd op de categorie, niet op
    // tx.type — zie fiscalTreatmentOf hierboven.
    const behandeling = fiscalTreatmentOf(tx.category);
    if (behandeling === "geen") continue;

    const btw = computeBtw(tx, categoryBtwRates, btwVerlegd);
    if (behandeling !== "financiering") {
      zakBruto += tx.amount;
      zakBtwTotaal += btw;
    }
    if (behandeling === "omzet") {
      zakelijkeInkomsten += tx.amount;
      const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
      if (!effectiefVerlegd) verschuldigdBtw += btw;
    } else {
      // Een positief bedrag hier is een terugbetaling/creditnota — die verlaagt de kosten
      // (en de bijbehorende voorbelasting) juist, in plaats van er verkeerd bovenop te komen.
      if (!voorbelastingExcluded.includes(tx.category)) voorbelasting += -btw;
    }
    if (tx.category === "Zakelijke uitgaven") zakelijkeUitgaven += -tx.amount;
    if (tx.amount < 0) {
      if (fixedCategories.includes(tx.category)) zakVast += Math.abs(tx.amount);
      else zakVariabel += Math.abs(tx.amount);
    }
  }
  return {
    zakBruto, zakBtwTotaal, zakelijkeInkomsten, uitkeringenAanPrive, priUitgegeven,
    winst: zakBruto - zakBtwTotaal - renteAftrekbaar, zakVast, zakVariabel, priVast, priVariabel,
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
const TYPISCHE_PRIVE_CATEGORIEEN = ["Boodschappen", "Huur", "Hypotheek", "Energie-water", "Prive - vrijetijd-uitgaan-vakantie & uit eten"];
export function computeBusinessAdvies(activeYear, summary, openOB, ibEstimate, ibGedaan, priItems, manualPriveCorrectie) {
  if (!activeYear || !summary) return null;
  const ibBelastingEffectief = ibEstimate.belasting;
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
    if (tx.isMirror || fiscalTreatmentOf(tx.category) === "geen") continue;
    const [y, m] = tx.month.split("-");
    const kwartaal = Math.ceil(Number(m) / 3);
    const key = `${y}-Q${kwartaal}`;
    if (!perQuarter[key]) perQuarter[key] = { year: Number(y), verschuldigdBtw: 0, voorbelasting: 0 };
    const btw = computeBtw(tx, categoryBtwRates, btwVerlegd);
    if (tx.category === "Zakelijke inkomsten" || tx.category === "Zakelijke inkomsten 9%" || tx.category === "Zakelijke inkomsten 21%") {
      const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
      if (!effectiefVerlegd) perQuarter[key].verschuldigdBtw += btw;
    } else if (!voorbelastingExcluded.includes(tx.category)) {
      perQuarter[key].voorbelasting += -btw;
    }
  }
  const result = {};
  for (const [key, q] of Object.entries(perQuarter)) {
    if (!result[q.year]) result[q.year] = 0;
    result[q.year] += q.verschuldigdBtw - q.voorbelasting;
  }
  return result;
}
