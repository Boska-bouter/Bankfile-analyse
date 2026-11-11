// Normalisatie van tegenpartij-/omschrijvingsnamen — voor het herkennen van dezelfde
// tegenpartij ondanks kleine schrijfwijzeverschillen tussen transacties.

import { VOORNAMEN, GEEN_NAAMWOORD } from "./voornamen.js";

const PERSON_TITLES = ["mw ", "hr ", "dhr ", "mevr ", "mevrouw ", "de heer ", "meneer ", "mr ", "mrs ", "ms "];
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
  // release30V8 — gezien in een Knab/ING-dossier als "persoon": administratiekantoor, CBR, Sony, platenzaak.
  "administratie", "bureau", "entertainment", "records",
];

// huishoudboekje-V6R6 — losse woorden die op een bedrijf wijzen, nooit op een persoon (alleen als heel woord).
export const BEDRIJFSWOORD = /\b(meat|vlees|koekjes|bakkerij|slagerij|patisserie|import|export|importexport|handel|groothandel|food|foods|market|markt|supermarkt|shop|winkel|kapsalon|garage|techniek|bouw|transport|verhuur|rent|consult|consultancy|solutions|trading|group|groep|catering|logistiek|logistics|webshop|store|travel|reizen|installatie|schilders|hoveniers|loodgieter|autobedrijf|zonen|management|consultants|media|schade|performance|welding|automotive|benefits|merken|advocaten|advocatuur|notaris|notarissen|atletiek|vereniging|stg|pensioenfonds|fonds|foundation|hotel|hostel|camping|restaurant|cafe|bistro|pizzeria|horeca|autos|occasions|events|impex|touristik|spices|naturals|deli|outlet|discounter|brands|veilingen|bedrukt|textiel|rechtshulp|letselschade|factoring|derdengelden|systems|inschrijfgelden|kruidvat|mister|belgie|nederland)\b/i;
// huishoudboekje-V6R7 — samengestelde bedrijfsnamen ("Ongediertewinkel", "Oogwereld", "VakantieVeilingen").
const BEDRIJFSACHTERVOEGSEL = /[a-zà-ÿ]{3,}(winkel|shop|markt|wereld|veilingen|discounter|outlet|store|centrum|fonds|service|deli|verzorging|kantoor|deurwaarders|bewaking|smederij|systems)\b/i;
// huishoudboekje-V6R7 — tekens en vormen die bij een persoonsnaam niet voorkomen: webadres, "X by MultiSafepay",
// "A & B", "A/B", landcode achteraan ("Kruidvat NL").
export function heeftBedrijfsVorm(raw) {
  const t = String(raw || "").trim();
  return /\.(nl|com|nu|be|de|eu|org|net|shop|io|fr|uk)\b/i.test(t) || /\sby\s/i.test(t) || /\s&\s|\//.test(t) || /\s(nl|be|bv|oy|ab|aps|kft|ltd)$/i.test(t)
    || BEDRIJFSWOORD.test(t) || BEDRIJFSACHTERVOEGSEL.test(t);
}

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
  const raw = String(text || "").trim().replace(/^[.,\s]+/, "");
  // nieuw-V1R8 — "S.R. Reijnhout eo M. Reijnhout-van der Sluis" (eo = en/of): een gezamenlijke rekening; beoordeel de eerste naam.
  const eo = raw.split(/\s+(?:eo|e\/o|en\/of)\s+/i);
  if (eo.length > 1 && eo[0].trim()) return looksLikePerson(eo[0]);
  const t = raw.toLowerCase();
  if (COMPANY_HINTS.some((h) => t.includes(h))) return false;
  if (/\s(ag|se|sarl|srl)$/i.test(raw)) return false; // buitenlandse rechtsvorm achteraan (bijv. "Autodoc AG")
  // huishoudboekje-V6R6 — bedrijfswoorden als los woord (ChatGPT-analyse 6-11, Dakhlaoui: "hmp meat", "al baraka koekjes").
  if (heeftBedrijfsVorm(raw)) return false;
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
  return words.length >= 2 && words.length <= 4 && !/\d/.test(t) && lijktOpNaam(raw);
}

// huishoudboekje-V6R8 — een naam van 2-4 woorden telt pas als persoon als er iets in staat dat op een mens wijst
// (wens Boska 8-11: "Pro Curo", "che bello", "NYPD Best" zijn geen personen):
// - voorletters: "P. Gerits", "P Gerits", "P.Gerits", "C.J.G.M. Gilsing", "j r gerad", "Gerits P", "CJGM Gilsing";
// - een bekende voornaam (VOORNAMEN) vooraan of achteraan: "Inge Cox", "Achour Bouliche";
// - een tussenvoegsel midden in de naam: "Saleh al Mussa", "Oualid Ben Naceur", "Miranda Van De Wiel";
// - een dubbele achternaam met streepje: "Anke Giesler-Lakhdar".
// Een woord dat vaak in bedrijfsnamen staat (GEEN_NAAMWOORD: best, pro, bello, lune, golden, ...) maakt het nooit een persoon.
const TUSSENVOEGSEL = new Set(["van", "de", "den", "der", "ter", "ten", "te", "el", "al", "ben", "bin", "ait", "abu", "abou", "da", "dos", "du", "von", "le", "la", "di", "del", "op", "in", "t", "'t", "vd", "v/d"]);
const zonderAccent = (w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function lijktOpNaam(raw) {
  const delen = String(raw || "").replace(/,/g, " ").trim().split(/\s+/).filter(Boolean);
  const woorden = delen.map((w) => zonderAccent(w.toLowerCase()).replace(/[^a-z'.-]/g, ""));
  const kaal = woorden.map((w) => w.replace(/[.']/g, ""));
  if (kaal.some((w) => w.split("-").some((d) => GEEN_NAAMWOORD.has(d)))) return false;
  // Voorletters: één letter (met of zonder punt), of een reeks met punten ("C.J.G.M."), of hoofdletters vóór een naam ("CJGM Gilsing").
  const isVoorletters = (orig, i) => /^([a-zà-ÿ]\.?)$/i.test(orig) || /^([a-z]\.){1,5}[a-z]?$/i.test(orig) || (i === 0 && delen.length > 1 && /^[b-df-hj-np-tv-xz]{2,3}$/i.test(orig.replace(/y/gi, "x"))) || (i < delen.length - 1 && /^[A-Z]{2,5}$/.test(orig) && /[aeiouy]/i.test(delen[delen.length - 1]) && delen.length <= 3 && /^[A-Z][a-z]/.test(delen[delen.length - 1]));
  if (delen.some((w, i) => isVoorletters(w, i))) return true;
  if (/^([A-Z]\.){1,5}[A-Z][a-zà-ÿ]+/.test(delen[0])) return true; // "P.Gerits", "Y.Ben Mansour"
  const eerste = kaal[0], laatste = kaal[kaal.length - 1];
  if (VOORNAMEN.has(eerste) || VOORNAMEN.has(laatste)) return true;
  if (kaal.slice(1, -1).some((w) => TUSSENVOEGSEL.has(w))) return true;
  if (kaal.length <= 3 && ["van", "de", "ter", "ten", "el", "al"].includes(eerste)) return true; // alleen achternaam: "Van beurden", "de Vries"
  if (delen.some((w) => /^[A-Z][a-zà-ÿ]+-[A-Z][a-zà-ÿ]+$/.test(w))) return true;
  return false;
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

// Normaliseert een volledige (rekeninghouder-/partner-)naam voor de "eigen naam"-herkenning in
// classify.js (v223) — puur leestekens weg en spaties gelijktrekken, zonder (zoals
// extractKeywordCandidate hierboven) tot één los woord terug te brengen. Dat ene-woord-gedrag is
// juist gemaakt voor bedrijfsnamen (een kort, kenmerkend woord is daar een prima signaal), maar bij
// een persoonsnaam blijft er dan vaak niets anders over dan de kale ACHTERNAAM — en een veelvoorkomende
// Nederlandse achternaam ("Meijer", "De Vries", ...) is op zichzelf veel te zwak: die staat ook op de
// rekening van niet-geladen familieleden/naamgenoten, of duikt toevallig op in een heel andere
// overboeking (bijv. de eigen naam als incasso-referentie bij de verhuurder). Door voorletter(s) EN
// achternaam samen als één vaste woordgroep te eisen (i.p.v. van elkaar los), moet de tekst veel
// specifieker overeenkomen voor een match telt.
export function normalizePersonName(naam) {
  const raw = String(naam || "").trim();
  if (!raw) return "";
  return raw
    .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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
// nieuw-V2R8 — wens Boska 11-11: "CCV" (betaalterminal) vóór de echte naam weglaten, overal: "CCV*ESSO ADRIAANSE", "CCVESSO …",
// "CCV ESSO …" → "ESSO …". Niet bij het bedrijf CCV zelf ("CCV Nederland B.V.", servicekosten van de terminal).
const CCV_VOOR = /(^|[^a-z0-9])ccv(?:\s*[*_]+\s*|\s+|(?=[a-z]{3}))(?!(?:nederland|group|holland|bv\b|b\.v\.|services|benelux|belgium|belgie)\b)(?=[a-z0-9])/gi;
export function zonderCcv(t) {
  return String(t ?? "").replace(CCV_VOOR, "$1");
}

export function counterpartyKey(name, amount) {
  const base = normKey(name);
  if (!base) return "";
  return `${base}::${amount >= 0 ? "pos" : "neg"}`;
}

// IBAN is een stabielere sleutel dan de naam: een bank kan "KPN B.V." de ene keer en "KPN Mobile
// The Netherlands" de andere keer noemen, terwijl het rekeningnummer gelijk blijft. Alleen
// beschikbaar als het bankbestand een tegenrekening-IBAN-kolom had (of, bij MT940, een
// gestructureerd /IBAN/-subveld).
// Sommige MT940-exports (bijv. ING's ":25:"-veld met het eigen rekeningnummer) plakken de
// valutacode direct achter de IBAN, zonder scheidingsteken (":25:NL63INGB0008292483EUR" i.p.v.
// ":25:NL63INGB0008292483"). Zonder correctie faalt ibansMatch() hieronder voor zo'n rekening: de
// "een kaal rekeningnummer staat als staart in de volledige IBAN"-vergelijking klopt dan niet meer,
// omdat de IBAN zelf niet meer de staart van de string is (de valutacode is dat wel). Gevolg: een
// overboeking tussen de zakelijke en de privérekening van dezelfde cliënt werd op de kant van de
// rekening met deze valutacode-staart NIET herkend als "eigen rekening", en dus ook niet als
// zodanig geclassificeerd — met als resultaat dat zo'n overboeking niet tegen elkaar werd
// weggestreept en in plaats daarvan aan een kant (ten onrechte) als gewone inkomsten/uitgaven werd
// meegeteld. Hier alleen een bekende, veelgebruikte valutacode strippen, en alleen als wat overblijft
// nog op een geldige IBAN lijkt (landcode + 2 controlecijfers, gevolgd door minstens 6 tekens) —
// zodat een toevallige rekeningnummer-staart die op een valutacode lijkt niet per ongeluk wordt
// afgekapt.
const IBAN_WITH_TRAILING_CURRENCY_RE = /^([A-Z]{2}\d{2}[A-Z0-9]{6,30})(EUR|USD|GBP|CHF|JPY|SEK|NOK|DKK)$/;

export function normalizeIban(raw) {
  const s = String(raw || "").replace(/\s+/g, "").toUpperCase();
  const match = s.match(IBAN_WITH_TRAILING_CURRENCY_RE);
  return match ? match[1] : s;
}

// Vergelijkt twee rekeningnummers waarvan er één een volledig IBAN kan zijn en de ander een kaal
// rekeningnummer zonder landcode/bankcode (zoals het :25:-veld van sommige MT940-bestanden, bijv.
// "107975432" i.p.v. "NL13ABNA0107975432") — zodat "is dit dezelfde rekening" ook werkt tussen
// bestanden van verschillende bankformaten.
// beide-V8R6 — sommige MT940-bestanden zetten de BIC achter het IBAN ("NL27KNAB0775942480/BIC/KNABNL2H"). Voor de vergelijking
// telt alleen het deel vóór de "/" (ibanKey blijft ongewijzigd, zodat bestaande keuzes op IBAN blijven gelden).
const zonderBic = (n) => n.replace(/\/.*$/, "");
export function ibansMatch(a, b) {
  const na = zonderBic(normalizeIban(a));
  const nb = zonderBic(normalizeIban(b));
  if (!na || !nb || na.length < 6 || nb.length < 6) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  // Een kaal rekeningnummer staat als staart in het volledige IBAN (na landcode+checkcijfers+
  // bankcode) — alleen als betrouwbaar signaal gebruiken vanaf een minimale lengte.
  return shorter.length >= 6 && longer.endsWith(shorter);
}

export function ibanKey(iban, amount) {
  const base = normalizeIban(iban);
  if (!base || base.length < 8) return ""; // te kort om een echte IBAN te zijn
  return `IBAN::${base}::${amount >= 0 ? "pos" : "neg"}`;
}

// V73 — tekstmatch voor door de gebruiker opgegeven opdrachtgevers/leveranciers: leestekens en
// meervoudige spaties tellen niet mee, zodat "Bouwbedrijf L. vd Ven BV" ook "BOUWBEDRIJF L VD VEN BV"
// uit het bankbestand vindt (de wizard bewaart de naam zoals getypt, de bank schrijft 'm anders).
const normTekstRuw = (s) => ` ${String(s || "").toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, " ").trim()} `;
// nieuw-V1R8 — onthouden (snelheid): dezelfde boekingstekst werd bij elke wijziging voor elk zoekwoord opnieuw genormaliseerd.
const NORM = new Map();
const normTekst = (s) => {
  const k = String(s || "");
  let v = NORM.get(k);
  if (v === undefined) { if (NORM.size > 100000) NORM.clear(); v = normTekstRuw(k); NORM.set(k, v); }
  return v;
};
export function textHasKeyword(text, kw) {
  if (!kw) return false;
  const raw = String(kw).toLowerCase();
  if (String(text || "").toLowerCase().includes(raw)) return true;
  const nk = normTekst(kw);
  if (nk.trim().length < 3) return false;
  return normTekst(text).includes(nk);
}
