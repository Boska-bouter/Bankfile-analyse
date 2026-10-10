// Migraties bij het inladen van oudere dossierbestanden/instellingen (uit App.jsx gehaald).
import { migrateLegacyCategoryName } from "../classification/categories.js";

// Bepaalt de rechtsvorm bij het inladen van bestaande instellingen/een dossierbestand. Ontbreekt
// het veld helemaal (een bestand/instellingen van vóór deze functie bestond) dan is dat altijd een
// bestaand zzp-dossier — direct "zzp", nooit de nieuwe vraag. Staat het veld er al wel (ook al is
// de waarde nog null, dus nog niet beantwoord), dan wordt die waarde gerespecteerd.
export function resolveRechtsvorm(obj) {
  if (!obj || !Object.prototype.hasOwnProperty.call(obj, "rechtsvorm")) return "zzp";
  return typeof obj.rechtsvorm === "string" ? obj.rechtsvorm : null;
}

// Zelfde migratie-redenering als resolveRechtsvorm hierboven: ontbreekt het veld helemaal (een
// bestand van vóór deze vraag bestond), dan is er nooit een holding-vraag gesteld — behandel dat
// als "nee" (nooit meer vragen). Staat het veld er al wel (ook al is de waarde nog null, dus nog
// niet beantwoord), dan wordt die waarde gerespecteerd.
export function resolveHeeftHolding(obj) {
  if (!obj || !Object.prototype.hasOwnProperty.call(obj, "heeftHolding")) return false;
  return typeof obj.heeftHolding === "boolean" ? obj.heeftHolding : null;
}

// mergeCategoryRules/mergeBtwRates migreren een oude categorienaam (bijv. "Boekhouder & advies" →
// "Boekhouder, accountant & administratie") al voor de categorieregels en de BTW-tarieven, maar
// overridesByCounterparty/overridesByRow zijn losse, per-transactie opgeslagen keuzes die dezelfde
// oude naam net zo goed nog letterlijk kunnen bevatten (bijv. een handmatige override die vóór de
// hernoeming is gezet). Zonder deze migratie blijven die transacties voor altijd onder de oude,
// niet meer bestaande naam hangen — ze vallen dan uit de win-en-verliesrekening in "Nog niet
// ingedeeld", ook al is er geen categorisatieprobleem, alleen een verouderde naam.
export function migrateOverridesCategories(overrides) {
  if (!overrides || typeof overrides !== "object") return overrides || {};
  const out = {};
  for (const [key, val] of Object.entries(overrides)) {
    if (!val || typeof val !== "object" || !val.category) {
      out[key] = val;
      continue;
    }
    // "Terugboeking van privé" was tot v213 ook de naam voor de PRIVÉ-kant van deze overboeking
    // (geld terug náár zakelijk) — sindsdien heet dat aan de privékant "Terugboeking naar zakelijk"
    // (zie classify.js), zodat de twee kanten van deze boeking niet meer dezelfde naam delen. De
    // generieke migrateLegacyCategoryName hieronder kan deze migratie niet doen (die kent geen
    // `type`), dus dit specifieke geval eerst, vóór de generieke hernoeming.
    const category = val.category === "Terugboeking van privé" && val.type === "Prive"
      ? "Terugboeking naar zakelijk"
      : migrateLegacyCategoryName(val.category);
    out[key] = { ...val, category };
  }
  return out;
}

// V62 — de oude keuze "beide" bestaat niet meer; een oud dossier met "beide" wordt "prive" (privéauto zakelijk gebruikt).
export function normalizeAutoStatus(v) {
  if (!v || typeof v !== "object") return {};
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k] = x === "beide" ? "prive" : x;
  return out;
}
export function normalizeAutoWizard(v) {
  if (!v || typeof v !== "object") return v ?? null;
  return v.status === "beide" ? { ...v, status: "prive", soort: null } : v;
}


// 14V9 — de aparte categorieën "Huur/Energie-water/Gemeentelijke kosten (deels zakelijk)" bestaan niet
// meer: transacties, regels en BTW-tarieven zijn via LEGACY_CATEGORY_RENAMES al naar de gewone
// categorie gegaan. Hier verhuist ook het ingestelde percentage zakelijk (eerder een apart veld per jaar)
// naar de generieke "Percentage zakelijk per categorie". Het oude, jaarspecifieke percentage wint van
// een eventueel al ingesteld categorie-percentage voor datzelfde jaar — dat was het percentage dat op de
// transacties in de aparte categorie daadwerkelijk werd toegepast.
// Geeft { categoryZakelijkPercentage, meldingen } terug; meldingen is leeg als er niets te migreren was.
export function migreerGedeeldeHuisvesting(categoryZakelijkPercentage, statussen) {
  const basis = categoryZakelijkPercentage && typeof categoryZakelijkPercentage === "object" ? categoryZakelijkPercentage : {};
  const paren = [
    ["Huur", statussen?.huur],
    ["Energie-water", statussen?.energie],
    ["Gemeentelijke kosten", statussen?.gemeentelijk],
  ];
  const result = { ...basis };
  const meldingen = [];
  for (const [categorie, status] of paren) {
    if (!status || typeof status !== "object") continue;
    const perJaar = { ...(result[categorie] || {}) };
    let gewijzigd = false;
    for (const [jaar, waarde] of Object.entries(status)) {
      const nieuw = Number(waarde);
      if (!Number.isFinite(nieuw)) continue;
      const oud = perJaar[jaar];
      if (oud != null && Number(oud) !== nieuw) {
        meldingen.push(`${categorie} ${jaar}: ${nieuw}% zakelijk overgenomen van "(deels zakelijk)" (stond bij de gewone categorie op ${oud}%).`);
      }
      perJaar[jaar] = nieuw;
      gewijzigd = true;
    }
    if (gewijzigd) result[categorie] = perJaar;
  }
  return { categoryZakelijkPercentage: result, meldingen };
}

// Lijsten met categorienamen (bijv. voorbelastingExcluded, fixedCategories) kunnen nog een hernoemde
// categorie bevatten; zet ze om en haal dubbelen weg.
export function migreerCategorieLijst(lijst) {
  if (!Array.isArray(lijst)) return lijst;
  return [...new Set(lijst.map((n) => (typeof n === "string" ? migrateLegacyCategoryName(n) : n)))];
}
