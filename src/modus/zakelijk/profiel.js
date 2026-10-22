// beide-V1R0 — het zakelijke profiel beschrijft precies het gedrag van de app tot nu toe. Het verwijst naar de
// bestaande zakelijke onderdelen en verandert er niets aan (zie het stappenplan privémodus, fase 0).
import { DEFAULT_RULES, DEFAULT_FIXED_CATEGORIES, CATEGORY_ORDER } from "../../classification/categories.js";

export const ZAKELIJK_PROFIEL = Object.freeze({
  soort: "zakelijk",
  naam: "Zakelijk",
  // Bestaande categorieën en herkenningsregels (classification/categories.js).
  categorieen: Object.freeze({ volgorde: CATEGORY_ORDER, regels: DEFAULT_RULES, vasteLasten: DEFAULT_FIXED_CATEGORIES }),
  // De wizards zijn in zakelijk nog componenten (SetupWizardModal, BasisvragenEenvoudig); de privéwizard wordt data.
  wizard: null,
  // null = alle bestaande kaarten in de bestaande volgorde. Een lijst met sleutels = alleen die, in die volgorde.
  kaarten: Object.freeze({ overzicht: null, controleren: null, instellingen: null }),
  // Rekenmodule voor jaar- en maandcijfers: de bestaande (tax/yearlySummary.js, tax/incomeTax.js, calc/inkomenPerMaand.js).
  berekening: "zakelijk",
  // Secties in aangiftevoorstel, print en Excel: de bestaande rapporten (reports/aangiftevoorstel*.js).
  rapport: "zakelijk",
  // Aan/uit per onderdeel. De privéonderdelen kan een eenmanszaak later aanzetten (besluit 21-10: geen derde modus).
  onderdelen: Object.freeze({
    btw: true, omzet: true, activa: true, auto: true, lease: true, holding: true, ondernemersaftrek: true, vpb: true,
    budget: false, eigenWoning: false, box3: false, partner: false,
  }),
});
