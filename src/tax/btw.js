import { CATEGORY_ORDER, INCOME_TRANSFER_CATEGORIES } from "../classification/categories.js";

// Standaard BTW-percentage per categorie — het bedrag op de bank is altijd inclusief BTW.
// Standaard 21%, met een vaste lijst uitzonderingen op 0%.
export const ZERO_BTW_CATEGORIES = new Set([
  "Bankkosten",
  "Belastingen: IB", "Belastingen: IH", "Belastingen: LH", "Belastingen: MRB", "Belastingen: OB", "Belastingen: ZVW",
  "Belastingen: Naheffingen OB voorgaande jaren", "Belastingen: Naheffingen LH voorgaande jaren", "Belastingen: Naheffingen IB voorgaande jaren",
  "Belastingen: overig", // hoort net als de rest van de belastingen-subtypes bij 0% — stond er per abuis niet bij
  "Verzekering: Auto", "Verzekering: Overig", "Verzekering: Wonen", "Verzekering: Zakelijk", "Verzekering: Ziektekosten",
  "Verzekeringen", // privé-verzekeringen — net als hun zakelijke tegenhangers vrijgesteld van BTW
  "Uitbetalen loon",
  "Uitbetaling aan prive",
  "Prive opnames",
  "Terugboeking van prive",
  "Overig",
  "Inkomsten/betalingen niet dit jaar",
  "Overboekingen aan personen",
  "Huur",
  "Incasso, juridisch & schulden",
  "Hypotheek",
  "Lease (financieel)",
  "Leningen",
  "Gemeentelijke kosten", // gemeentelijke heffingen (bijv. OZB) zijn belastingen, geen met-BTW-belaste dienst
  "Kinderopvang", // geregistreerde kinderopvang is vrijgesteld van BTW
  "Toeslagen", // overheidstoeslagen (kindertoeslag, huurtoeslag, ...) zijn geen BTW-belaste omzet
  "Persoonlijk & vertrouwelijk", // nooit een echte (aftrekbare) zakelijke uitgave, ook niet als dit ooit per ongeluk op Zakelijk zou staan
]);
// "Inhuur personeel" stond hier eerder ook bij, maar een ingehuurde freelancer/zzp'er factureert je
// in de praktijk vrijwel altijd gewoon mét 21% BTW (tenzij die zelf onder de KOR valt) — verwijderd.

export const DEFAULT_BTW_RATES = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, ZERO_BTW_CATEGORIES.has(c) ? 0 : 21]));
DEFAULT_BTW_RATES["Reiskosten (OV)"] = 9; // personenvervoer valt onder het lage BTW-tarief
DEFAULT_BTW_RATES["Zakelijke inkomsten 9%"] = 9; // voor wie zowel laag- als hoogbelaste diensten factureert

export const DEFAULT_VOORBELASTING_EXCLUDED = [
  "Lease (operationeel)", "Lease (financieel)", "Gemeentelijke kosten", "Webshops & online aankopen",
  "Kinderopvang", "Prive - mobiel/internet", "Prive overige abonnementen", "Prive - vrijetijd-uitgaan-vakantie & uit eten",
  "Verkoop activa",
];

export const EMPTY_BTW_RATES = {};

// Ophoging bij elke wijziging in welke categorieën standaard 0% BTW hebben — zie mergeBtwRates.
export const BTW_RATES_VERSION = 8;

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
  return merged;
}

// Rekent de BTW uit een inclusief-BTW-bedrag: bedrag - bedrag / (1 + tarief).
export function computeBtw(tx, categoryBtwRates, btwVerlegd) {
  const isZakelijkLike = tx.type === "Zakelijk" || tx.isMirror;
  if (!isZakelijkLike) return 0;
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
  "Hypotheek", "Leningen",
];

export function computeQuarterlyBtwForYear(classified, year, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides = {}) {
  const map = {};
  for (const tx of classified) {
    if (tx.type !== "Zakelijk" || tx.isMirror) continue;
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
        omzetBrutoVerlegd: 0,
        kostenBruto: 0, voorbelasting: 0,
      };
    }
    const btw = computeBtw(tx, categoryBtwRates, btwVerlegd);
    const isIncomeCategory = tx.category === "Zakelijke inkomsten" || tx.category === "Zakelijke inkomsten 9%" || tx.category === "Zakelijke inkomsten 21%";
    if (isIncomeCategory) {
      const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
      if (effectiefVerlegd) {
        map[key].omzetBrutoVerlegd += tx.amount;
      } else if (tx.category === "Zakelijke inkomsten 9%" || (tx.category === "Zakelijke inkomsten" && categoryBtwRates["Zakelijke inkomsten"] === 9)) {
        map[key].omzetBruto9 += tx.amount;
        map[key].verschuldigdBtw9 += btw;
      } else {
        map[key].omzetBruto21 += tx.amount;
        map[key].verschuldigdBtw21 += btw;
      }
    } else if (INCOME_TRANSFER_CATEGORIES.includes(tx.category) || BTW_AANGIFTE_NIET_RELEVANT.includes(tx.category)) {
      // Pure geldbeweging (lening-uitkering, verkoop activa, overboeking naar/van prive, ...) of
      // een geldstroom die de BTW-aangifte helemaal niet kent (loon, belasting, hypotheek/lening)
      // — geen omzet én geen BTW-kostenpost, telt dus nergens in mee in dit overzicht.
    } else {
      // Een positief bedrag op een kostencategorie is een terugbetaling/creditnota (bijv. een
      // jaarafrekening energie, of een retour bij een winkel) — die verlaagt de kosten juist,
      // in plaats van er (met het oude Math.abs()) verkeerd bovenop te komen.
      map[key].kostenBruto += -tx.amount;
      if (!voorbelastingExcluded.includes(tx.category)) {
        map[key].voorbelasting += -btw;
      }
    }
  }
  return Object.values(map).sort((a, b) => a.year - b.year || a.kwartaal - b.kwartaal);
}
