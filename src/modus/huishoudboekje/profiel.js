// huishoudboekje-V1R0 — het profiel van een Huishoudboekje (wens Boska 2-11): de privécategorieën met een fijnere
// indeling, alleen inkomsten en uitgaven per maand en per week, zonder belasting en zonder aangifte. Eén abonnement:
// er is geen Eenvoudig/Uitgebreid (de app opent altijd de volledige weergave, met een eigen overzicht).
import { PRIVE_PROFIEL } from "../prive/profiel.js";
import { HUISHOUD_STANDAARD_REGELS, HUISHOUD_VASTE_LASTEN, metHuishoudRegels, metHuishoudVasteLasten } from "./regels.js";
import { HUISHOUD_WIZARD } from "./wizard.js";

export const HUISHOUD_PROFIEL = Object.freeze({
  soort: "huishoudboekje",
  naam: "Huishoudboekje",
  categorieen: Object.freeze({
    ...PRIVE_PROFIEL.categorieen,
    regels: HUISHOUD_STANDAARD_REGELS,
    vasteLasten: HUISHOUD_VASTE_LASTEN,
    regelsBijwerken: metHuishoudRegels,
    vasteLastenBijwerken: metHuishoudVasteLasten,
  }),
  wizard: HUISHOUD_WIZARD,
  kaarten: PRIVE_PROFIEL.kaarten,
  rekeningen: PRIVE_PROFIEL.rekeningen,
  berekening: "huishoudboekje",
  rapport: "huishoudboekje",
  eenWeergave: true, // geen keuze Eenvoudig/Uitgebreid
  onderdelen: Object.freeze({
    btw: false, omzet: false, activa: false, auto: false, lease: false, holding: false, ondernemersaftrek: false, vpb: false,
    budget: true, eigenWoning: false, box3: false, partner: false, belasting: false,
  }),
});
