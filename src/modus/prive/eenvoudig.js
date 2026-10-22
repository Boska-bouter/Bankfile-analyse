// beide-V1R8 — fase 6: de eenvoudige weergave in een privédossier. Nakijken vraagt niet "bedrijf of privé?" maar
// "waarvoor was dit geld?", met een handvol veelvoorkomende budgetcategorieën als knoppen. Data, geen logica in de
// component: EenvoudigeApp krijgt deze keuzes via props.
import UitlegEenvoudigPrive from "../../content/uitlegEenvoudigPrive.jsx";

const k = (category, t, s) => Object.freeze({ k: `cat:${category}`, t, s, keuze: Object.freeze({ category, type: "Prive" }) });

export const PRIVE_KEUZES_IN = Object.freeze([
  k("Loon", "Loon of salaris", "van je werkgever"),
  k("Uitkering", "Uitkering", "bijv. WW, bijstand of WIA"),
  k("Pensioen & AOW", "Pensioen of AOW", "van SVB of pensioenfonds"),
  k("Toeslagen", "Toeslag of kinderbijslag", "van Belastingdienst of SVB"),
  // beide-V2R2 — terugbetalingen zijn geen inkomen: ze verlagen de uitgaven.
  k("Overboeking van bekenden", "Terugbetaling door bekenden", "bijv. Tikkie of gedeelde kosten"),
  k("Terugbetalingen & restituties", "Terugbetaling van een bedrijf of winkel", "retour, te veel betaald of eindafrekening"),
  k("Inkomsten", "Ander inkomen", "bijv. verkoop, huur of een prijs"),
  k("Interne overboeking", "Van mijn eigen rekening", "geld tussen je eigen rekeningen"),
]);

export const PRIVE_KEUZES_UIT = Object.freeze([
  k("Boodschappen", "Boodschappen", "supermarkt, bakker, markt"),
  k("Winkels divers", "Winkels", "kleding, drogist, huishouden"),
  k("Privé - vrijetijd-uitgaan-vakantie & uit eten", "Vrije tijd", "uit eten, uitjes, vakantie"),
  k("Auto & brandstof", "Vervoer", "tanken, parkeren, garage"),
  k("Overboekingen aan personen", "Aan familie of vrienden", "betaald aan een persoon"),
  k("Interne overboeking: privé sparen", "Sparen", "naar je eigen spaarrekening"),
  k("Interne overboeking", "Naar mijn eigen rekening", "geld tussen je eigen rekeningen"),
  k("Privé: overig", "Overige privé-uitgaven", "past nergens anders bij"),
]);

// Kleine pinbetalingen: de gangbare antwoorden staan bovenaan.
const KLEINE_PIN = ["Boodschappen", "Winkels divers", "Privé - vrijetijd-uitgaan-vakantie & uit eten", "Auto & brandstof"];

export function priveKeuzes(vraag) {
  if (!vraag) return [];
  if (vraag.soort === "kleinePin") return PRIVE_KEUZES_UIT.filter((c) => KLEINE_PIN.includes(c.keuze.category));
  return vraag.teken > 0 ? PRIVE_KEUZES_IN : PRIVE_KEUZES_UIT;
}

// Voorstel = de (onzekere) categorie die de app nu heeft gekozen, als die tussen de knoppen staat.
export function priveVoorstel(vraag) {
  const c = vraag?.voorbeeld?.category;
  const sleutel = c ? `cat:${c}` : null;
  return priveKeuzes(vraag).some((x) => x.k === sleutel) ? sleutel : null;
}

export const PRIVE_EENVOUDIG = Object.freeze({
  keuzes: priveKeuzes,
  voorstel: priveVoorstel,
  soort: "Prive",
  vraagKleinePin: "Waaraan gaf je dit uit?",
  bestandenLeeg: "Er zijn nog geen bankbestanden. Voeg de afschriften van je betaalrekening toe (en die van je partner, als je samen een overzicht wilt); de app leest ze daarna in.",
  onzeker: "je budgetoverzicht kan daardoor nog verschuiven",
  uitleg: UitlegEenvoudigPrive,
  eigenRekeningen: "Heb je nog een spaarrekening, een rekening van je partner of een gezamenlijke rekening? Voeg het bankbestand toe met de knop hierboven. Wil je dat niet, geef dan alleen het rekeningnummer op: geld van en naar die rekening telt dan als overboeking tussen je eigen rekeningen, niet als inkomen of uitgave.",
  uitgebreidTip: "Fijner werk (één boeking apart, vaste lasten, vermogen) doe je in",
});
