// Normalisatie van tegenpartij-/omschrijvingsnamen — voor het herkennen van dezelfde
// tegenpartij ondanks kleine schrijfwijzeverschillen tussen transacties.

const PERSON_TITLES = ["mw ", "hr ", "dhr ", "mevr ", "mevrouw ", "de heer ", "meneer "];
const COMPANY_HINTS = [
  "b.v", "bv", "n.v.", "nv", "stichting", "vof", "gemeente", "bank", "verzekering", "insurance", "services",
  "holding", "limited", "betalingsverkeer", "incasso", "stadsbestuur", "buckaroo", "u.a.", "geldmaat",
  // Internationale rechtsvormen — net zo gangbaar als "B.V." maar ontbraken hier nog, en komen
  // in een echte test met buitenlandse tegenpartijen (leveranciers, advertentieplatforms) juist
  // veel voor.
  "ltd", "inc", "gmbh", "s.a", "s.p.a", "sp. z o.o", "a/s",
  // Generieke Nederlandse bedrijfswoorden — "bedri" (i.p.v. het volledige "bedrijf") omdat een
  // bank een lange tegenpartijnaam kan afkappen vóór het einde van het woord.
  "bedri", "commercial cards", "cjib",
];

// Getest tegen echte bankbestanden (ING, ABN MT940, Knab — 6000+ regels in totaal): de eerdere,
// simpelere versie van deze heuristiek herkende tientallen overduidelijk-geen-persoon
// pinbetalingen als "persoon" — vooral kaarttransacties met een "CCV*"/"BCK*"-voorvoegsel en/of
// een plaats+landcode-achtervoegsel ("... NLD"), en volledig in hoofdletters gezette
// automatische/institutionele omschrijvingen (bijv. "STORTING ING", "STEDIN NETBEH"). Een tweede
// testronde bracht twee tegenovergestelde fouten aan het licht: "J.M. van Schaik via Rabo
// Betaalverzoek" werd tén onrechte uitgesloten (de "via"-regel is bedoeld voor externe platforms
// als Tikkie, niet voor de eigen betaalverzoek-functie van de bank), en "K.A.Eshmanova" (dezelfde
// persoon als de wél herkende "K A.Eshmanova") werd gemist omdat voorletters-met-punten zonder
// spaties als één woord tellen. Beide zijn hieronder gericht gerepareerd.
export function looksLikePerson(text) {
  const raw = String(text || "").trim();
  const t = raw.toLowerCase();
  if (COMPANY_HINTS.some((h) => t.includes(h))) return false;
  if (PERSON_TITLES.some((p) => t.startsWith(p))) return true;
  // Kaarttransactie-voorvoegsels (CCV*, BCK*, MOL*, ...) en een land-/plaatscode-achtervoegsel
  // ("... NLD") zijn typerend voor automatisch gegenereerde pin-omschrijvingen, nooit een mens.
  if (raw.includes("*")) return false;
  if (/\b(nld|deu)\b$/i.test(raw)) return false;
  if (t === "rente buiten limiet") return false;
  // De eigen betaalverzoek-functie van een bank (ING/Rabo/ABN/...) blijft een naam-gedreven
  // persoonsbetaling, ook zonder titel ervoor — in tegenstelling tot een betaling via een écht
  // extern platform (Tikkie, MultiSafepay, Takeaway.com, ...). Staat er een naam vóór "via ...
  // Betaalverzoek", beoordeel dan alleen dat naam-gedeelte; staat er geen naam (kaal "Rabo
  // Betaalverzoek"), dan valt er niets te herkennen en is het bewust geen persoon.
  const betaalverzoekMatch = raw.match(/^(.*?)\s*\bvia\b\s*.*betaalverzoek/i);
  if (betaalverzoekMatch) {
    const namePart = betaalverzoekMatch[1].trim();
    if (!namePart) return false;
    const nameWords = namePart.split(/\s+/).filter(Boolean);
    return nameWords.length >= 1 && nameWords.length <= 4 && !/\d/.test(namePart);
  }
  if (/^(ing|rabo|abn|sns|knab|triodos|regiobank|bunq)?\s*betaalverzoek$/i.test(t)) return false;
  // Een betaling via een platform (Tikkie, MultiSafepay, Takeaway.com, ...) loopt niet
  // rechtstreeks naar een persoon, ook al staat er een naam in de omschrijving.
  if (/\bvia\b/i.test(t)) return false;
  if (t.startsWith("sepa ")) return false;
  // Instellings-/automatische omschrijvingen staan vrijwel altijd volledig in hoofdletters; een
  // SEPA-overschrijving naar een persoon behoudt meestal de eigen schrijfwijze van de afzender.
  const letters = raw.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 0 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return false;
  // Voorletters-met-punten of -komma's zonder spatie ("K.A.Eshmanova", "D,K.Tobiaski") tellen bij
  // een gewone spatie-telling als één woord en worden zo gemist — apart als geldig naampatroon
  // herkennen: één of meer losse hoofdletter-voorletters gevolgd door een achternaam.
  if (/^([A-Z][.,]){1,3}\s*[A-Z][a-zà-ÿ]+$/.test(raw)) return true;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 4 && !/\d/.test(t);
}

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
// Extraheert een korte, herbruikbare trefwoord-kandidaat uit een tegenpartijnaam — voor het
// voorstellen van een nieuw trefwoord op basis van een net bevestigde correctie. Bewust maar één
// woord: kort genoeg om ook licht afwijkende schrijfwijzen van dezelfde tegenpartij te raken
// (bijv. "Coolblue" bij zowel "Coolblue.nl" als "COOLBLUE B.V."), lang genoeg (4+ tekens) om
// valse matches op een toevallig woordje als "de"/"van" te vermijden.
export function extractKeywordCandidate(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const cleaned = raw
    .replace(/\b(b\.?v\.?|n\.?v\.?|ltd|inc|gmbh)\b/gi, " ")
    .replace(/\.(nl|com|de|be)\b/gi, " ")
    .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const words = cleaned.split(" ").filter(Boolean);
  return words.find((w) => w.length >= 4) || "";
}

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

// IBAN is een stabielere sleutel dan de naam: een bank kan "KPN B.V." de ene keer en "KPN Mobile
// The Netherlands" de andere keer noemen, terwijl het rekeningnummer gelijk blijft. Alleen
// beschikbaar als het bankbestand een tegenrekening-IBAN-kolom had (of, bij MT940, een
// gestructureerd /IBAN/-subveld).
export function normalizeIban(raw) {
  return String(raw || "").replace(/\s+/g, "").toUpperCase();
}

export function ibanKey(iban, amount) {
  const base = normalizeIban(iban);
  if (!base || base.length < 8) return ""; // te kort om een echte IBAN te zijn
  return `IBAN::${base}::${amount >= 0 ? "pos" : "neg"}`;
}
