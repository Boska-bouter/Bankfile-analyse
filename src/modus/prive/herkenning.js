// beide-V1R6 (fase 3) — automatische herkenning in een privédossier. De gewone herkenning (classify.js) blijft
// het werk doen; dit verfijnt alleen haar AUTOMATISCHE uitkomst (nooit een eigen keuze van de gebruiker):
//   - een bijschrijving wordt loon, uitkering, pensioen/AOW, toeslag, kinderbijslag of IB-teruggave;
//   - een uitkomst die alleen zakelijk bestaat, wordt de privétegenhanger (Brandstof → Auto & brandstof).
import { ruleMatchesText } from "../../classification/classify.js";
import { fiscalTreatmentOf } from "../../classification/categories.js";
import { PRIVE_INKOMEN_EXTRA, PRIVE_INKOMEN_VOLGORDE, ZAKELIJK_NAAR_PRIVE } from "./categorieen.js";
import { isPriveCategorie } from "./weergave.js";

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

// Regels voor de gewone herkenning: zonder de regels die alleen voor bijschrijvingen gelden.
export function uitgaveRegels(regels) {
  return regels.some((r) => r.alleenInkomen) ? regels.filter((r) => !r.alleenInkomen) : regels;
}

export function verfijnPrive(tx, uitkomst, regels) {
  const cat = uitkomst?.category;
  if (!cat) return uitkomst;
  if (tx.amount > 0 && ALGEMEEN_INKOMEN.has(cat)) {
    const gevonden = herkenInkomen(tx, regels);
    if (gevonden) return { ...uitkomst, category: gevonden };
  }
  const tegenhanger = ZAKELIJK_NAAR_PRIVE[cat];
  if (tegenhanger) return { ...uitkomst, category: tegenhanger };
  if (isPriveCategorie(cat)) return uitkomst;
  // Vangnet voor een zakelijke categorie zonder vaste tegenhanger.
  if (tx.amount > 0) return { ...uitkomst, category: "Inkomsten" };
  return { ...uitkomst, category: fiscalTreatmentOf(cat) === "kosten" ? "Privé - overige kosten" : "Privé: overig" };
}

// Wat useClassified nodig heeft (null in een zakelijk dossier).
export const PRIVE_HERKENNING = Object.freeze({ uitgaveRegels, verfijn: verfijnPrive });
