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
  if (/geldmaat|storting/.test(tekst)) return "Contant geld"; // contant gestort: het omgekeerde van opnemen
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

// Tegenpartijen waaraan in het dossier ook is betaald (voor de herkenning van terugbetalingen hierboven).
export function herkenningContext(transacties) {
  const betaaldAan = new Set();
  for (const t of transacties) if (t.amount < 0) betaaldAan.add(counterpartyKey(t.counterparty || t.description, -1));
  return { betaaldAan };
}

// Regels voor de gewone herkenning: zonder de regels die alleen voor bijschrijvingen gelden.
export function uitgaveRegels(regels) {
  return regels.some((r) => r.alleenInkomen) ? regels.filter((r) => !r.alleenInkomen) : regels;
}

export function verfijnPrive(tx, uitkomst, regels, ctx = null) {
  const cat = uitkomst?.category;
  if (!cat) return uitkomst;
  if (tx.amount > 0 && ALGEMEEN_INKOMEN.has(cat)) {
    const gevonden = herkenInkomen(tx, regels);
    if (gevonden) return { ...uitkomst, category: gevonden };
    if (cat === "Overboeking van bekenden") return uitkomst;
    if (BEKENDEN.test(tekstVan(tx))) return { ...uitkomst, category: "Overboeking van bekenden" };
    const terug = terugbetaling(tx, regels, ctx);
    if (terug) return { ...uitkomst, category: terug };
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
