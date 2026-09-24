import { CATEGORY_ORDER, INCOME_TRANSFER_CATEGORIES, fiscalTreatmentOf, GEDEELDE_HUUR_CATEGORIE } from "../classification/categories.js";
import { effectiveZakelijkPercentage, rawBtw } from "./categorySplit.js";

// Standaard BTW-percentage per categorie — het bedrag op de bank is altijd inclusief BTW.
// Standaard 21%, met een vaste lijst uitzonderingen op 0%.
export const ZERO_BTW_CATEGORIES = new Set([
  "Bankkosten",
  "Belastingen: IB", "Belastingen: IH", "Belastingen: LH", "Belastingen: MRB", "Belastingen: OB", "Belastingen: ZVW",
  "Belastingen: Naheffingen OB voorgaande jaren", "Belastingen: Naheffingen LH voorgaande jaren", "Belastingen: Naheffingen IB voorgaande jaren",
  "Belastingen: overig", // hoort net als de rest van de belastingen-subtypes bij 0% — stond er per abuis niet bij
  "Verzekering: Auto", "Verzekering: Overig", "Verzekering: Wonen", "Verzekering: Zakelijk", "Verzekering: Ziektekosten",
  "AOV (arbeidsongeschiktheidsverzekering)",
  "Verzekeringen", // privé-verzekeringen — net als hun zakelijke tegenhangers vrijgesteld van BTW
  "Uitbetalen loon",
  "Uitbetaling aan prive",
  "Prive opnames",
  "Terugboeking van prive",
  // BV-specifiek: loon/dividend/kapitaal/rekening-courant zijn nooit met BTW belast — dit stond hier
  // per abuis niet bij toen deze categorieën zijn toegevoegd, waardoor het toolstandaardtarief van
  // 21% ten onrechte werd toegepast (zie App.jsx/aangiftevoorstel-bv.js: dit vertekende de netto
  // winst zodra een echte DGA-salaris-transactie werd geclassificeerd).
  "DGA-salaris", "Dividenduitkering", "Rekening-courant DGA", "Kapitaalstorting",
  "Overig",
  "Inkomsten/betalingen niet dit jaar",
  "Overboekingen aan personen",
  "Interne overboeking: zakelijk sparen",
  "Huur",
  "Huur (deels zakelijk)", // net als "Huur" standaard vrijgesteld — override desgewenst per dossier bij "belaste verhuur"
  "Incasso, juridisch & schulden",
  "Hypotheek",
  "Lease (financieel)",
  "Leningen",
  "Leningen (privé)",
  "Gemeentelijke kosten", // gemeentelijke heffingen (bijv. OZB) zijn belastingen, geen met-BTW-belaste dienst
  "Kinderopvang", // geregistreerde kinderopvang is vrijgesteld van BTW
  "Toeslagen", // overheidstoeslagen (kindertoeslag, huurtoeslag, ...) zijn geen BTW-belaste omzet
  "Persoonlijk & vertrouwelijk", // nooit een echte (aftrekbare) zakelijke uitgave, ook niet als dit ooit per ongeluk op Zakelijk zou staan
  "Partneralimentatie", "Kinderalimentatie", // alimentatie is geen BTW-belaste dienst/aankoop — hoort net als loon/belastingen/leningen nooit op een BTW-aangifte
]);
// "Inhuur personeel" stond hier eerder ook bij, maar een ingehuurde freelancer/zzp'er factureert je
// in de praktijk vrijwel altijd gewoon mét 21% BTW (tenzij die zelf onder de KOR valt) — verwijderd.

export const DEFAULT_BTW_RATES = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, ZERO_BTW_CATEGORIES.has(c) ? 0 : 21]));
DEFAULT_BTW_RATES["Reiskosten (OV)"] = 9; // personenvervoer valt onder het lage BTW-tarief
DEFAULT_BTW_RATES["Zakelijke inkomsten 9%"] = 9; // voor wie zowel laag- als hoogbelaste diensten factureert
DEFAULT_BTW_RATES["Zakelijke inkomsten 0%"] = 0; // vrijgestelde omzet (bijv. bepaalde zorg-, onderwijs- of financiële diensten)

// v191 — deze drie categorieën bestaan uitsluitend om omzet met een AFWIJKEND tarief dan het
// dossierbrede standaardtarief apart te kunnen zetten (zie SUBTYPE_TO_MAIN in categories.js: alle
// drie vallen onder hoofdcategorie "Zakelijke inkomsten", dus het BTW-instelscherm liet vóór v191
// ook voor déze drie gewoon een vrij te kiezen percentage zien). Hun naam IS het tarief — een
// transactie in "Zakelijke inkomsten 21%" wordt in computeQuarterlyBtwForYear (zie hieronder)
// altijd als 1a-omzet (21%) meegeteld, ongeacht wat hier zou staan, dus een afwijkend opgeslagen
// percentage voor deze categorie levert een intern tegenstrijdige berekening op: de omzet wordt op
// de "verkeerde" aangifterubriek geteld terwijl de BTW zelf tegen het (foutieve) opgeslagen tarief
// wordt uitgerekend — precies dit werd aangetroffen in een regressie-testdossier ("Zakelijke
// inkomsten 21%" stond op 9%, vermoedelijk per ongeluk via ditzelfde instelscherm gewijzigd). Vast
// op hun eigen tarief, zie ook de forcerings-stap onderaan mergeBtwRates hieronder.
export const FIXED_BTW_RATE_CATEGORIES = {
  "Zakelijke inkomsten 0%": 0,
  "Zakelijke inkomsten 9%": 9,
  "Zakelijke inkomsten 21%": 21,
};

export const DEFAULT_VOORBELASTING_EXCLUDED = [
  "Lease (operationeel)", "Lease (financieel)", "Gemeentelijke kosten", "Webshops & online aankopen",
  "Kinderopvang", "Prive - mobiel/internet", "Prive overige abonnementen", "Prive - vrijetijd-uitgaan-vakantie & uit eten",
  "Verkoop activa",
];

export const EMPTY_BTW_RATES = {};

// Ophoging bij elke wijziging in welke categorieën standaard 0% BTW hebben — zie mergeBtwRates.
export const BTW_RATES_VERSION = 9;

export function mergeBtwRates(saved, savedVersion, migrateLegacyCategoryName) {
  const migratedSaved = {};
  for (const [key, val] of Object.entries(saved || {})) {
    migratedSaved[migrateLegacyCategoryName(key)] = val;
  }
  const merged = { ...DEFAULT_BTW_RATES, ...migratedSaved };
  if (!savedVersion || savedVersion < BTW_RATES_VERSION) {
    for (const c of ZERO_BTW_CATEGORIES) merged[c] = 0;
    // "Inhuur personeel" veranderde in versie 7 van standaard 0% naar standaard 21% — een oudere,
    // expliciet opgeslagen 0%-waarde voor deze categorie zou anders altijd blijven "winnen" boven
    // de nieuwe standaard (de merge hierboven overschrijft niet-vrijgestelde categorieën niet).
    if (savedVersion && savedVersion < 7 && migratedSaved["Inhuur personeel"] === 0) {
      merged["Inhuur personeel"] = 21;
    }
  }
  // v191 — onvoorwaardelijk (niet alleen bij een versie-ophoging): zie FIXED_BTW_RATE_CATEGORIES
  // hierboven. Zelfheelt elke keer dat een project geladen/opgeslagen wordt, dus ook als een
  // afwijkende waarde ooit via het instelscherm is binnengeslopen (in plaats van alleen bij een
  // eenmalige versiemigratie, zoals bij ZERO_BTW_CATEGORIES hierboven).
  for (const [c, rate] of Object.entries(FIXED_BTW_RATE_CATEGORIES)) merged[c] = rate;
  return merged;
}

// Rekent de BTW uit een inclusief-BTW-bedrag: bedrag - bedrag / (1 + tarief).
export function computeBtw(tx, categoryBtwRates, btwVerlegd) {
  if (fiscalTreatmentOf(tx.category) === "geen") return 0;
  const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
  if (effectiefVerlegd && tx.category === "Zakelijke inkomsten") return 0;
  const rate = categoryBtwRates[tx.category];
  if (!rate) return 0;
  return tx.amount - tx.amount / (1 + rate / 100);
}

// Categorieën die géén BTW-belaste aankoop/kostenpost zijn, maar een heel andere geldstroom
// (loon, belasting, lening, hypotheek) — die horen nergens op een BTW-aangifte, dus ook niet mee
// te tellen in de "Uitgaven (netto)"/voorbelasting-kolom van het kwartaaloverzicht. Dit is een
// andere lijst dan INCOME_TRANSFER_CATEGORIES: die geldt breder (ook voor het jaaroverzicht, waar
// loon/belasting wél als een echte kostenpost horen te tellen) — hier gaat het puur om wat een
// BTW-aangifte zelf kent.
const BTW_AANGIFTE_NIET_RELEVANT = [
  "Uitbetalen loon",
  "Belastingen: IB", "Belastingen: IH", "Belastingen: LH", "Belastingen: MRB", "Belastingen: OB", "Belastingen: ZVW", "Belastingen: overig",
  "Belastingen: Naheffingen OB voorgaande jaren", "Belastingen: Naheffingen LH voorgaande jaren", "Belastingen: Naheffingen IB voorgaande jaren",
  "Hypotheek", "Leningen", "Leningen (privé)",
];

// `huurZakelijkPercentageStatus` is optioneel — een { jaar: percentage }-map (zie
// tax/gedeeldeHuur.js). Weggelaten (of geen entry voor dit jaar), dan telt de BTW op
// "Huur (deels zakelijk)" hier voor 100% mee als voorbelasting, exact zoals voorheen (dus 100%
// backwards compatible voor elke aanroep die dit argument niet meegeeft). `categoryZakelijkPercentage`
// is de generieke tegenhanger (zie tax/categorySplit.js): dezelfde soort optionele correctie, maar
// dan voor élke "kosten"/"geen"-categorie met een ingesteld percentage, niet alleen Huur.
export function computeQuarterlyBtwForYear(classified, year, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides = {}, huurZakelijkPercentageStatus = null, categoryZakelijkPercentage = null, autoStatus = null, heeftLeaseAuto = false) {
  const map = {};
  for (const tx of classified) {
    if (tx.isMirror) continue;
    const behandeling = fiscalTreatmentOf(tx.category);
    // "omzet"/"financiering" doen niet mee aan de generieke splitsing (altijd 100). Voor "kosten"/
    // "geen" geldt effectiveZakelijkPercentage — zonder ingesteld percentage 100 resp. 0, dus
    // ongewijzigd gedrag zolang niemand een percentage instelt.
    const percentage = (behandeling === "kosten" || behandeling === "geen")
      ? effectiveZakelijkPercentage(tx.category, year, categoryZakelijkPercentage, autoStatus, heeftLeaseAuto)
      : 100;
    if (behandeling === "geen" && percentage <= 0) continue;
    // Standaard: kwartaal op basis van boekingsdatum. Is er een bevestigde periode-verplaatsing
    // (zie periodeMismatches), dan telt die mee in plaats van de boekingsdatum.
    const override = periodeQuarterOverrides[tx.id];
    let y, kwartaal;
    if (override) {
      const [oy, oq] = override.split("-Q");
      y = oy;
      kwartaal = Number(oq);
    } else {
      const [my, mm] = tx.month.split("-");
      y = my;
      kwartaal = Math.ceil(Number(mm) / 3);
    }
    if (Number(y) !== year) continue;
    const key = `${y}-Q${kwartaal}`;
    if (!map[key]) {
      map[key] = {
        year: Number(y), kwartaal,
        omzetBruto21: 0, verschuldigdBtw21: 0,
        omzetBruto9: 0, verschuldigdBtw9: 0,
        omzetBruto0: 0,
        omzetBrutoVerlegd: 0,
        kostenBruto: 0, voorbelasting: 0,
      };
    }
    const factor = percentage / 100;
    const btw = rawBtw(tx, categoryBtwRates, btwVerlegd) * factor;
    const isIncomeCategory = tx.category === "Zakelijke inkomsten" || tx.category === "Zakelijke inkomsten 0%" || tx.category === "Zakelijke inkomsten 9%" || tx.category === "Zakelijke inkomsten 21%";
    if (isIncomeCategory) {
      const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
      if (effectiefVerlegd) {
        map[key].omzetBrutoVerlegd += tx.amount;
      } else if (tx.category === "Zakelijke inkomsten 0%" || (tx.category === "Zakelijke inkomsten" && categoryBtwRates["Zakelijke inkomsten"] === 0)) {
        map[key].omzetBruto0 += tx.amount;
      } else if (tx.category === "Zakelijke inkomsten 9%" || (tx.category === "Zakelijke inkomsten" && categoryBtwRates["Zakelijke inkomsten"] === 9)) {
        map[key].omzetBruto9 += tx.amount;
        map[key].verschuldigdBtw9 += btw;
      } else {
        map[key].omzetBruto21 += tx.amount;
        map[key].verschuldigdBtw21 += btw;
      }
    } else if (BTW_AANGIFTE_NIET_RELEVANT.includes(tx.category)) {
      // Geldstroom die de BTW-aangifte zelf helemaal niet kent (loon, belasting, hypotheek/lening)
      // — geen omzet én geen BTW-kostenpost, telt dus nergens in mee in dit overzicht. Dit is een
      // andere, smallere lijst dan fiscalTreatmentOf hierboven: die bepaalt of iets een
      // zakelijke W&V-kostenpost is, dit bepaalt puur of iets ooit op een BTW-formulier voorkomt.
    } else {
      // Een positief bedrag op een kostencategorie is een terugbetaling/creditnota (bijv. een
      // jaarafrekening energie, of een retour bij een winkel) — die verlaagt de kosten juist,
      // in plaats van er (met het oude Math.abs()) verkeerd bovenop te komen. Het `factor`-deel
      // hierboven (percentage-splitsing, incl. de losstaande "Huur (deels zakelijk)"-uitzondering
      // hieronder) is al in `btw` verwerkt, dus hier alleen nog het bedrag zelf naar rato.
      map[key].kostenBruto += -tx.amount * factor;
      if (!voorbelastingExcluded.includes(tx.category)) {
        // Bij "Huur (deels zakelijk)" is maar een deel van de BTW aftrekbaar als voorbelasting —
        // het percentage-zakelijk-gebruik voor dit jaar (ontbrekend/geen status = 100%, dus
        // volledig aftrekbaar, hetzelfde gedrag als vóór deze correctie bestond). Dit is een apart,
        // ouder mechanisme (eigen categorie) dat naast de generieke categoryZakelijkPercentage-
        // correctie hierboven blijft bestaan — in de praktijk is voor een gegeven transactie maar
        // één van de twee ooit niet 100.
        const huurPercentage = tx.category === GEDEELDE_HUUR_CATEGORIE
          ? (huurZakelijkPercentageStatus?.[year] ?? 100)
          : 100;
        map[key].voorbelasting += -btw * (huurPercentage / 100);
      }
    }
  }
  return Object.values(map).sort((a, b) => a.year - b.year || a.kwartaal - b.kwartaal);
}

// Uitsplitsing naar categorie van "Uitgaven (netto)" per kwartaal — puur voor de pop-up die dit
// bedrag herleidbaar maakt, geen nieuwe indelingslogica: dezelfde categorieën die hierboven
// meetellen in kostenBruto/voorbelasting, hier alleen per categorie apart gehouden in plaats van
// meteen bij elkaar opgeteld. Een categorie met een POSITIEF netto-bedrag is ongewoon (normaal is
// een kostencategorie negatief) — meestal een terugbetaling/creditnota, soms een verkeerd
// geclassificeerde transactie; daarom apart gemarkeerd zodat die in de pop-up opvalt.
// `categoryZakelijkPercentage` optioneel (zie tax/categorySplit.js) — houdt deze uitsplitsing in
// lijn met computeQuarterlyBtwForYear hierboven: een "kosten"-categorie met een ingesteld
// percentage <100 toont hier ook alleen het zakelijke deel, en een "geen"-categorie met een
// ingesteld percentage >0 komt er hier ook bij (in plaats van, zoals voorheen, altijd volledig
// buiten deze pop-up-uitsplitsing te blijven).
export function computeQuarterlyCostBreakdown(classified, year, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides = {}, categoryZakelijkPercentage = null, autoStatus = null, heeftLeaseAuto = false) {
  const map = {}; // "2023-Q2" -> { categorie -> { bruto, btw } }
  for (const tx of classified) {
    if (tx.isMirror) continue;
    const override = periodeQuarterOverrides[tx.id];
    let y, kwartaal;
    if (override) {
      const [oy, oq] = override.split("-Q");
      y = oy;
      kwartaal = Number(oq);
    } else {
      const [my, mm] = tx.month.split("-");
      y = my;
      kwartaal = Math.ceil(Number(mm) / 3);
    }
    if (Number(y) !== year) continue;
    const behandeling = fiscalTreatmentOf(tx.category);
    if (behandeling === "omzet" || BTW_AANGIFTE_NIET_RELEVANT.includes(tx.category)) continue;
    const percentage = (behandeling === "kosten" || behandeling === "geen")
      ? effectiveZakelijkPercentage(tx.category, year, categoryZakelijkPercentage, autoStatus, heeftLeaseAuto)
      : 100;
    if (behandeling === "geen" && percentage <= 0) continue;
    const factor = percentage / 100;
    const key = `${y}-Q${kwartaal}`;
    if (!map[key]) map[key] = {};
    if (!map[key][tx.category]) map[key][tx.category] = { bruto: 0, btw: 0 };
    const btw = voorbelastingExcluded.includes(tx.category) ? 0 : rawBtw(tx, categoryBtwRates, btwVerlegd) * factor;
    map[key][tx.category].bruto += -tx.amount * factor;
    map[key][tx.category].btw += -btw;
  }
  const result = {};
  for (const [key, cats] of Object.entries(map)) {
    result[key] = Object.entries(cats)
      .map(([categorie, { bruto, btw }]) => ({ categorie, bruto, netto: bruto - btw, btw }))
      .sort((a, b) => Math.abs(b.netto) - Math.abs(a.netto));
  }
  return result;
}

// Zelfde uitsplitsing als hierboven, maar voor het hele jaar in één keer (geen kwartaal-sleutel)
// — voor de pop-ups bij "Voorbelasting" en "Zakelijk totaal (netto)" in het meerjarenoverzicht.
export function computeYearlyCostBreakdown(classified, year, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides = {}, categoryZakelijkPercentage = null, autoStatus = null, heeftLeaseAuto = false) {
  const cats = {};
  for (const tx of classified) {
    if (tx.isMirror || tx.year !== year) continue;
    const behandeling = fiscalTreatmentOf(tx.category);
    if (behandeling === "omzet" || BTW_AANGIFTE_NIET_RELEVANT.includes(tx.category)) continue;
    const percentage = (behandeling === "kosten" || behandeling === "geen")
      ? effectiveZakelijkPercentage(tx.category, year, categoryZakelijkPercentage, autoStatus, heeftLeaseAuto)
      : 100;
    if (behandeling === "geen" && percentage <= 0) continue;
    const factor = percentage / 100;
    if (!cats[tx.category]) cats[tx.category] = { bruto: 0, btw: 0 };
    const btw = voorbelastingExcluded.includes(tx.category) ? 0 : rawBtw(tx, categoryBtwRates, btwVerlegd) * factor;
    cats[tx.category].bruto += -tx.amount * factor;
    cats[tx.category].btw += -btw;
  }
  return Object.entries(cats)
    .map(([categorie, { bruto, btw }]) => ({ categorie, bruto, netto: bruto - btw, btw }))
    .sort((a, b) => Math.abs(b.netto) - Math.abs(a.netto));
}
