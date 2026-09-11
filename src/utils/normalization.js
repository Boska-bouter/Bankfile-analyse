// Normalisatie van tegenpartij-/omschrijvingsnamen — voor het herkennen van dezelfde
// tegenpartij ondanks kleine schrijfwijzeverschillen tussen transacties.

const PERSON_TITLES = ["mw ", "hr ", "dhr ", "mevr ", "mevrouw ", "de heer "];
const COMPANY_HINTS = ["b.v.", "bv", "n.v.", "nv", "stichting", "vof", "gemeente", "bank", "verzekering", "services", "b.v", "n.v"];

export function normKey(s) {
  // Punten strippen en meervoudige spaties samenvoegen — zorgt dat bijv. "Essent Retail
  // Energie B.V" en "Essent Retail Energie B.V." als dezelfde tegenpartij worden herkend.
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

// Voor het herkennen van terugkerende betalingen: strip datum/tijd/pasvolgnummer-ruis en houd
// alleen de eerste paar woorden aan — de naam staat vrijwel altijd vooraan.
export function extractRecurringName(tx) {
  const raw = (tx.counterparty || tx.description || "").trim();
  if (!raw) return "";
  const cleaned = raw
    .replace(/\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}/g, " ")
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, " ")
    .replace(/pasvolgnr\.?:?\s*\d+/gi, " ")
    .replace(/\bnr\.?:?\s*\d+/gi, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.split(" ").filter(Boolean).slice(0, 3).join(" ").toLowerCase();
}

// Zoekt een datum (bijv. een factuurdatum) in de vrije omschrijvingstekst van een transactie.
export function extractDescriptionDate(tx) {
  const text = `${tx.fullDescription || ""} ${tx.description || ""}`;
  const m = text.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  return isNaN(d) ? null : d;
}

// Overrides zijn keyed op tegenpartij ÉN teken, omdat dezelfde tegenpartij een andere categorie
// kan vragen voor binnenkomend vs. uitgaand geld (bijv. een terugbetaling vs. een aankoop).
export function counterpartyKey(name, amount) {
  const base = normKey(name);
  if (!base) return "";
  return `${base}::${amount >= 0 ? "pos" : "neg"}`;
}

export function looksLikePerson(text) {
  const t = text.toLowerCase();
  if (COMPANY_HINTS.some((h) => t.includes(h))) return false;
  if (PERSON_TITLES.some((p) => t.startsWith(p))) return true;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 4 && !/\d/.test(t);
}
