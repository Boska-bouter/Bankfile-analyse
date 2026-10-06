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
    // "Terugboeking van prive" was tot v213 ook de naam voor de PRIVÉ-kant van deze overboeking
    // (geld terug náár zakelijk) — sindsdien heet dat aan de privékant "Terugboeking naar zakelijk"
    // (zie classify.js), zodat de twee kanten van deze boeking niet meer dezelfde naam delen. De
    // generieke migrateLegacyCategoryName hieronder kan deze migratie niet doen (die kent geen
    // `type`), dus dit specifieke geval eerst, vóór de generieke hernoeming.
    const category = val.category === "Terugboeking van prive" && val.type === "Prive"
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

