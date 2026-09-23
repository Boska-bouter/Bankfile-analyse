// Generieke percentage-zakelijk-splitsing per (bestaande) categorie per jaar — bijv. "70% van
// Brandstof is zakelijk" of "30% van Boodschappen is toch zakelijk". In tegenstelling tot "Huur
// (deels zakelijk)" (zie gedeeldeHuur.js, dat hiervoor een eigen, aparte categorie gebruikt) werkt
// dit mechanisme direct op elke bestaande "kosten"- of "geen" (privé)-categorie: transacties
// blijven gewoon in hun eigen categorie staan en tx.type blijft gewoon de rekening weergeven
// (Route B, zie categories.js) — alleen het bedrag dat in de winst-/BTW-berekening als zakelijk
// vs. privé meetelt, wordt naar rato verdeeld.
//
// `categoryZakelijkPercentage` is een { categorie: { jaar: percentage(0-100) } }-map. Ontbreekt een
// categorie/jaar (de situatie voor vrijwel elk bestaand dossier), dan geldt het standaardgedrag van
// fiscalTreatmentOf ongewijzigd: 100% voor "kosten" (volledig aftrekbaar, zoals nu), 0% voor "geen"
// (volledig privé, zoals nu) — dus 100% backwards compatible zolang niemand voor een categorie/jaar
// bewust een percentage instelt.
//
// Bewust beperkt tot "kosten"/"geen" ÉN een expliciete, korte lijst categorieën (zie
// SPLITSBARE_CATEGORIEEN hieronder) — een "omzet"-categorie blijft altijd voor 100% omzet, en
// "financiering" (Leningen/Lease financieel) blijft hier altijd buiten — daar is alleen de rente
// aftrekbaar (niet het termijnbedrag), en dat wordt al apart berekend (zie loanAmortization.js).
import { fiscalTreatmentOf } from "../classification/categories.js";

// Alleen deze categorieën komen in aanmerking voor de %-splitsing (in overleg bevestigd) — dit zijn
// kosten die in de praktijk vaak deels zakelijk/deels privé zijn, ongeacht welke rekening betaalt.
// Andere kosten-/privé-categorieën (Zakelijke uitgaven, Uitbetalen loon, Verkoop activa, Boekhouder
// accountant & administratie, Belastingen (incl. naheffingen), Onderhoud apparatuur/machines,
// Betaalautomaat kosten, Uitbetaling aan prive, Prive opnames, Lease (operationeel/financieel),
// etc.) zijn typisch volledig van het ene of het andere type — daar zou een percentage-instelling
// alleen maar voor verwarring zorgen, dus die blijven hier bewust buiten beeld. "Huur (deels
// zakelijk)" staat er ook niet bij: die heeft al zijn eigen, aparte percentage-mechanisme (zie
// gedeeldeHuur.js) — dit is voor de gewone "Huur"-categorie.
export const SPLITSBARE_CATEGORIEEN = [
  "Brandstof",
  "Zakelijk mobiel/internet",
  "Reiskosten (OV)",
  "Parkeren",
  "Huur",
];

export function isSplitsbareCategorie(category) {
  return SPLITSBARE_CATEGORIEEN.includes(category);
}

export function defaultZakelijkPercentage(category) {
  return fiscalTreatmentOf(category) === "kosten" ? 100 : 0;
}

// Negeert een eventueel opgeslagen percentage voor een categorie die niet (meer) op
// SPLITSBARE_CATEGORIEEN staat — zo blijft elke andere categorie altijd op zijn standaardgedrag,
// ook als er ooit ergens per ongeluk toch een percentage voor is opgeslagen.
export function effectiveZakelijkPercentage(category, year, categoryZakelijkPercentage) {
  if (!isSplitsbareCategorie(category)) return defaultZakelijkPercentage(category);
  const override = categoryZakelijkPercentage?.[category]?.[year];
  return override != null ? override : defaultZakelijkPercentage(category);
}

// BTW van een transactie, ZONDER de "fiscalTreatmentOf === 'geen' → altijd 0"-kortsluiting die
// computeBtw (zie btw.js) heeft — nodig omdat een privé-categorie met een ingesteld
// zakelijk-percentage >0% ook een deel van zijn BTW als voorbelasting mag meetellen. Voor een
// "kosten"-categorie (waar die kortsluiting toch nooit triggert) geeft dit exact hetzelfde
// resultaat als computeBtw.
export function rawBtw(tx, categoryBtwRates, btwVerlegd) {
  const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
  if (effectiefVerlegd && tx.category === "Zakelijke inkomsten") return 0;
  const rate = categoryBtwRates[tx.category];
  if (!rate) return 0;
  return tx.amount - tx.amount / (1 + rate / 100);
}

// Voor de instelpaneel-UI: van alle splitsbare (kosten/geen) categorieën met minstens 1 transactie
// in `classified` voor `year`, het totaalbedrag (bruto, som van Math.abs(amount)) — zodat de UI
// alleen categorieën toont die er dit jaar daadwerkelijk toe doen, in plaats van alle categorieën.
export function computeSplitsbareCategorieTotalenVoorJaar(classified, year) {
  const totalen = {};
  for (const tx of classified) {
    if (tx.isMirror || tx.year !== year) continue;
    if (!isSplitsbareCategorie(tx.category)) continue;
    totalen[tx.category] = (totalen[tx.category] || 0) + Math.abs(tx.amount);
  }
  return totalen;
}
