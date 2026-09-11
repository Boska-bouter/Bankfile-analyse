import { CATEGORY_ORDER } from "../classification/categories.js";

// Standaard BTW-percentage per categorie — het bedrag op de bank is altijd inclusief BTW.
// Standaard 21%, met een vaste lijst uitzonderingen op 0%.
export const ZERO_BTW_CATEGORIES = new Set([
  "Bankkosten",
  "Belastingen: IB", "Belastingen: IH", "Belastingen: LH", "Belastingen: MRB", "Belastingen: OB", "Belastingen: ZVW",
  "Belastingen: Naheffingen OB voorgaande jaren", "Belastingen: Naheffingen LH voorgaande jaren", "Belastingen: Naheffingen IB voorgaande jaren",
  "Verzekering: Auto", "Verzekering: Overig", "Verzekering: Wonen", "Verzekering: Zakelijk", "Verzekering: Ziektekosten",
  "Inhuur personeel",
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
]);

export const DEFAULT_BTW_RATES = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, ZERO_BTW_CATEGORIES.has(c) ? 0 : 21]));
DEFAULT_BTW_RATES["Reiskosten (OV)"] = 9;

export const DEFAULT_VOORBELASTING_EXCLUDED = [
  "Lease (operationeel)", "Lease (financieel)", "Gemeentelijke kosten", "Webshops & online aankopen",
  "Kinderopvang", "Prive - mobiel/internet", "Prive overige abonnementen", "Prive - vrijetijd-uitgaan-vakantie",
  "Verkoop activa",
];

export const EMPTY_BTW_RATES = {};

// Ophoging bij elke wijziging in welke categorieën standaard 0% BTW hebben — zie mergeBtwRates.
export const BTW_RATES_VERSION = 6;

export function mergeBtwRates(saved, savedVersion, migrateLegacyCategoryName) {
  const migratedSaved = {};
  for (const [key, val] of Object.entries(saved || {})) {
    migratedSaved[migrateLegacyCategoryName(key)] = val;
  }
  const merged = { ...DEFAULT_BTW_RATES, ...migratedSaved };
  if (!savedVersion || savedVersion < BTW_RATES_VERSION) {
    for (const c of ZERO_BTW_CATEGORIES) merged[c] = 0;
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
    if (tx.category === "Zakelijke inkomsten") {
      const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
      if (effectiefVerlegd) {
        map[key].omzetBrutoVerlegd += tx.amount;
      } else if (categoryBtwRates["Zakelijke inkomsten"] === 9) {
        map[key].omzetBruto9 += tx.amount;
        map[key].verschuldigdBtw9 += btw;
      } else {
        map[key].omzetBruto21 += tx.amount;
        map[key].verschuldigdBtw21 += btw;
      }
    } else {
      map[key].kostenBruto += Math.abs(tx.amount);
      if (!voorbelastingExcluded.includes(tx.category)) {
        map[key].voorbelasting += Math.abs(btw);
      }
    }
  }
  return Object.values(map).sort((a, b) => a.year - b.year || a.kwartaal - b.kwartaal);
}
