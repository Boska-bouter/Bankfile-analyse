// beide-V1R6 (fase 3) — automatische herkenning in een privédossier. De gewone herkenning (classify.js) blijft
// het werk doen; dit verfijnt alleen haar AUTOMATISCHE uitkomst (nooit een eigen keuze van de gebruiker):
//   - een bijschrijving wordt loon, uitkering, pensioen/AOW, toeslag, kinderbijslag of IB-teruggave;
//   - een uitkomst die alleen zakelijk bestaat, wordt de privétegenhanger (Brandstof → Auto & brandstof).
import { ruleMatchesText } from "../../classification/classify.js";
import { fiscalTreatmentOf, SPLIT_CATEGORY_NAMES } from "../../classification/categories.js";
import { counterpartyKey } from "../../utils/normalization.js";
import { PRIVE_INKOMEN_EXTRA, PRIVE_INKOMEN_VOLGORDE, ZAKELIJK_NAAR_PRIVE } from "./categorieen.js";
import { isPriveCategorie, priveSoort } from "./weergave.js";

// Automatische uitkomsten voor een bijschrijving die nog algemeen zijn en dus verfijnd mogen worden.
const ALGEMEEN_INKOMEN = new Set(["Inkomsten", "Zakelijke inkomsten", "Belastingen: overig", "Overboeking van bekenden"]);

const tekstVan = (tx) => ` ${tx.counterparty || ""} ${tx.description || ""} ${tx.fullDescription || ""}`.toLowerCase();

function herkenInkomen(tx, regels) {
  const tekst = tekstVan(tx);
  for (const naam of PRIVE_INKOMEN_VOLGORDE) {
    const regel = regels.find((r) => r.name === naam);
    const extra = PRIVE_INKOMEN_EXTRA[naam] || [];
    if ((regel && ruleMatchesText(regel, tekst)) || extra.some((w) => tekst.includes(w))) return naam;
  }
  return null;
}

// beide-V2R2 — geld dat binnenkomt van een bedrijf of winkel is meestal een terugbetaling (retour, te veel betaald,
// eindafrekening), geen inkomen. Herkent de app de leverancier (Vodafone, Essent, een verzekeraar), dan gaat het naar
// diens categorie en verlaagt het die uitgave; anders naar "Terugbetalingen & restituties" als de omschrijving of de
// partij daarop wijst, of als je dezelfde partij ook hebt betaald.
const TERUG = "Terugbetalingen & restituties";
const GEEN_TERUG_REGEL = new Set(["Privé opnames", "Contant geld", "Interne overboeking", "Leningen", "Leningen (privé)", "Beleggen", "Overboekingen aan personen"]);
const BETAALDIENST = /\b(paypal|mollie|pay\.nl|adyen|klarna|stripe|ppro|online payment|global ?collect|buckaroo|multisafepay|bol\.com|zalando|amazon|coolblue|wehkamp)\b/;
const BEKENDEN = /\b(tikkie|betaalverzoek)\b/;

function terugbetaling(tx, regels, ctx) {
  const tekst = tekstVan(tx);
  if (tekst.includes("belastingdienst")) return null;
  // beide-V2R3 — alleen echt contant gestort; "storting" alleen zegt niets (Trade Republic "Storting" = beleggen).
  if (/geldmaat|geldautomaat|contant gestort|stortingsautomaat|storting contant/.test(tekst)) return "Contant geld";
  for (const r of regels) {
    if (r.alleenInkomen || GEEN_TERUG_REGEL.has(r.name) || !ruleMatchesText(r, tekst)) continue;
    const naam = SPLIT_CATEGORY_NAMES[r.name] || ZAKELIJK_NAAR_PRIVE[r.name] || r.name;
    if (isPriveCategorie(naam) && priveSoort(naam) === "uitgave") return naam;
  }
  const regel = regels.find((r) => r.name === TERUG);
  if ((regel && ruleMatchesText(regel, tekst)) || BETAALDIENST.test(tekst)) return TERUG;
  if (ctx?.betaaldAan?.has(counterpartyKey(tx.counterparty || tx.description, -1))) return TERUG;
  return null;
}

// beide-V2R3 — een tegenpartij die op een persoon lijkt (voorletters, "e/o", "Hr"/"Mw"): geld van een persoon is
// een terugbetaling door bekenden, geen inkomen en geen terugbetaling van een bedrijf.
const BEDRIJF = /\b(b\.?v|n\.?v|v\.?o\.?f|gmbh|ltd|s\.?a|stichting|stg|vereniging|cooperatie|coöperatie|gemeente|bank|holding|groep|group)\b/i;
function lijktPersoon(naam) {
  const n = String(naam || "").trim();
  if (!n || BEDRIJF.test(n) || /\d/.test(n)) return false;
  return /^(hr|mw|dhr|mevr|mr|mevrouw|de heer)\.?\s/i.test(n) || /\s(e\/o|eo|en\/of)\s/i.test(n)
    || /^([a-z]\.\s?){1,4}\s?[a-z]/i.test(n);
}

// beide-V2R3 — de eigen namen herkennen zoals banken ze schrijven: "Paul Harry Gerits", "P.H. Gerits", "GERITS P H",
// "H. Gerits" (partner met de achternaam van de ander), "Hendrina Beatrix Elisabeth Wildenberg" en een gezamenlijke
// rekening "P.H. Gerits e/o H.B.E. Wildenberg". Familie met andere voorletters ("J.L. Gerits") telt niet.
const TUSSEN = new Set(["van", "de", "der", "den", "ten", "ter", "te", "het", "t", "v", "d", "vd", "op", "in", "la", "le", "von", "di", "da"]);
const AANHEF = new Set(["hr", "mw", "dhr", "mevr", "mr", "mevrouw", "heer", "de heer"]);
const woordenVan = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

function eigenPersonen(eigenNamen) {
  return (eigenNamen || []).map((n) => woordenVan(n).filter((w) => !TUSSEN.has(w))).filter((w) => w.length >= 2)
    .map((w) => ({ voornaam: w[0], achternaam: w[w.length - 1] }));
}

function isEigenNaam(naam, personen) {
  if (!personen?.length || !naam || /\d/.test(naam) || BEDRIJF.test(naam)) return false;
  const achternamen = new Set(personen.map((p) => p.achternaam));
  const voornamen = new Set(personen.map((p) => p.voornaam));
  const letters = new Set(personen.map((p) => p.voornaam[0]));
  // "P.H." moet als twee voorletters tellen, ook zonder spatie ertussen.
  const delen = String(naam).toLowerCase().replace(/\b([a-z])\.(?=[a-z]\b)/g, "$1 ").split(/\s+(?:e\/o|eo|en\/of|en)\s+/);
  return delen.every((deel) => {
    const w = woordenVan(deel.replace(/-/g, " ")).filter((x) => !TUSSEN.has(x) && !AANHEF.has(x));
    const achter = w.filter((x) => achternamen.has(x));
    if (!achter.length) return false;
    const rest = w.filter((x) => !achternamen.has(x));
    if (!rest.length) return false;
    if (rest.some((x) => voornamen.has(x))) return true;
    const voorletters = rest.filter((x) => x.length === 1);
    if (voorletters.length === rest.length) return letters.has(voorletters[0]);
    // Voluit geschreven voornamen vóór de achternaam (officiële naam): alleen bij twee of meer voornamen telt de
    // eerste letter ("Hendrina Beatrix Elisabeth Wildenberg"), niet bij "PJ Wildenberg van Poppel".
    const laatste = achternamen.has(w[w.length - 1]);
    return laatste && rest.length >= 2 && rest.every((x) => x.length >= 3) && letters.has(rest[0][0]);
  });
}

// beide-V2R3 — branchecodes (MCC) die banken als ASN en Rabobank bij een pinbetaling meegeven.
const ALGEMENE_UITGAVE = new Set(["Overig", "Winkels divers", "Privé: overig", "Privé - overige kosten", "Overboekingen aan personen"]);
const MCC_GROEPEN = {
  Boodschappen: ["5411", "5422", "5441", "5451", "5462", "5499", "0763"],
  "Privé - vrijetijd-uitgaan-vakantie & uit eten": ["5812", "5813", "5814", "7011", "7012", "7032", "7033", "7832", "7922", "7991", "7996", "7998", "4722"],
  "Openbaar vervoer": ["4111", "4112", "4131"],
  "Auto & brandstof": ["5541", "5542", "5532", "5533", "7523", "7538", "7542"],
  "Medische uitgaven": ["5912", "8011", "8021", "8042", "8043", "8049", "8062", "8099"],
  "Wonen: onderhoud & inrichting": ["5039", "5200", "5211", "5231", "5251", "5261", "5712", "5713", "5714", "5719"],
};
const MCC_CATEGORIE = Object.fromEntries(Object.entries(MCC_GROEPEN).flatMap(([c, codes]) => codes.map((m) => [m, c])));

const SPAREN = /(sparen|spaarrekening|spaardeposito|spaarpot|spaarrek)\b/;
const GEEN_SPAREN = new Set(["Beleggen", "Lijfrente", "Interne overboeking: privé sparen"]);

// Tegenpartijen waaraan in het dossier ook is betaald (voor de herkenning van terugbetalingen hierboven), de eigen
// namen, en (beide-V2R3) bedrijven die elke maand ongeveer hetzelfde flinke bedrag overmaken: waarschijnlijk loon.
export function herkenningContext(transacties, { eigenNamen = [] } = {}) {
  const betaaldAan = new Set();
  const ontvangen = new Map();
  for (const t of transacties) {
    const naam = t.counterparty || t.description;
    if (t.amount < 0) { betaaldAan.add(counterpartyKey(naam, -1)); continue; }
    if (!t.counterparty || lijktPersoon(t.counterparty)) continue;
    const k = counterpartyKey(naam, 1);
    if (!ontvangen.has(k)) ontvangen.set(k, { maanden: new Set(), bedragen: [] });
    const o = ontvangen.get(k);
    o.maanden.add(t.date instanceof Date ? `${t.date.getFullYear()}-${t.date.getMonth()}` : String(t.date || "").slice(0, 7));
    o.bedragen.push(t.amount);
  }
  const loon = new Set();
  for (const [k, o] of ontvangen) {
    const b = [...o.bedragen].sort((x, y) => x - y);
    if (o.maanden.size >= 6 && b[Math.floor(b.length / 2)] >= 500) loon.add(k);
  }
  return { betaaldAan, loon, personen: eigenPersonen(eigenNamen) };
}

// Regels voor de gewone herkenning: zonder de regels die alleen voor bijschrijvingen gelden.
export function uitgaveRegels(regels) {
  return regels.some((r) => r.alleenInkomen) ? regels.filter((r) => !r.alleenInkomen) : regels;
}

export function verfijnPrive(tx, uitkomst, regels, ctx = null) {
  const cat = uitkomst?.category;
  if (!cat) return uitkomst;
  const tekst = tekstVan(tx);
  // beide-V2R3 — geld van of naar jezelf of je partner is een overboeking tussen eigen rekeningen; gaat de tekst
  // over sparen, dan naar of van de spaarrekening ("spar" van Boodschappen telde "sparen" eerder als supermarkt).
  if (cat !== "Interne overboeking: privé sparen" && SPAREN.test(String(tx.counterparty || "").toLowerCase())) {
    return { ...uitkomst, category: "Interne overboeking: privé sparen" }; // "ASN Ideaalsparen"
  }
  if (!GEEN_SPAREN.has(cat)) {
    if (isEigenNaam(tx.counterparty, ctx?.personen)) {
      return { ...uitkomst, category: SPAREN.test(tekst) ? "Interne overboeking: privé sparen" : "Interne overboeking" };
    }
    if (SPAREN.test(tekst)) return { ...uitkomst, category: "Interne overboeking: privé sparen" };
  }
  // beide-V3R0/V3R1 — een tankstation of laadpaal met meer dan € 300 in één keer is geen tankbeurt: nakijken.
  if (cat === "Auto & brandstof" && Math.abs(tx.amount) > 300) {
    const brandstof = regels.find((r) => r.name === "Brandstof");
    if (brandstof && ruleMatchesText(brandstof, tekst)) return { ...uitkomst, category: "Overig" };
  }
  // beide-V2R3 — een pinbetaling zonder herkend zoekwoord: de branchecode (MCC) van de winkel zegt wat het is.
  if (tx.amount < 0 && ALGEMENE_UITGAVE.has(cat)) {
    const branche = MCC_CATEGORIE[(tekst.match(/\bmcc:?\s?(\d{4})\b/) || [])[1]];
    if (branche) return { ...uitkomst, category: branche };
  }
  if (tx.amount > 0 && ALGEMEEN_INKOMEN.has(cat)) {
    const gevonden = herkenInkomen(tx, regels);
    if (gevonden) return { ...uitkomst, category: gevonden };
    // beide-V2R3 — geld terug van een beleggingsplatform is geen inkomen maar verkoop of opname van beleggingen.
    const beleggen = regels.find((r) => r.name === "Beleggen");
    if (beleggen && ruleMatchesText(beleggen, tekst)) return { ...uitkomst, category: "Beleggen" };
    if (cat === "Overboeking van bekenden") return uitkomst;
    if (BEKENDEN.test(tekst) || lijktPersoon(tx.counterparty)) return { ...uitkomst, category: "Overboeking van bekenden" };
    const terug = terugbetaling(tx, regels, ctx);
    if (terug) return { ...uitkomst, category: terug };
    if (ctx?.loon?.has(counterpartyKey(tx.counterparty || tx.description, 1))) return { ...uitkomst, category: "Loon" };
  }
  // Een terugbetaling van een verzekeraar: de zorgverzekeraar heeft in privé een eigen categorie.
  if (tx.amount > 0 && cat === "Verzekeringen") {
    const terug = terugbetaling(tx, regels, ctx);
    if (terug && terug !== TERUG) return { ...uitkomst, category: terug };
  }
  const tegenhanger = ZAKELIJK_NAAR_PRIVE[cat];
  if (tegenhanger) return { ...uitkomst, category: tegenhanger };
  if (isPriveCategorie(cat)) return uitkomst;
  // Vangnet voor een zakelijke categorie zonder vaste tegenhanger.
  if (tx.amount > 0) return { ...uitkomst, category: "Inkomsten" };
  return { ...uitkomst, category: fiscalTreatmentOf(cat) === "kosten" ? "Privé - overige kosten" : "Privé: overig" };
}

// Wat useClassified nodig heeft (null in een zakelijk dossier).
export const PRIVE_HERKENNING = Object.freeze({ uitgaveRegels, verfijn: verfijnPrive, context: herkenningContext });
