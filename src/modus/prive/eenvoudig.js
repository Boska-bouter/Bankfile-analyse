// beide-V1R8 — fase 6: de eenvoudige weergave in een privédossier. Nakijken vraagt niet "bedrijf of privé?" maar
// "waarvoor was dit geld?", met een handvol veelvoorkomende budgetcategorieën als knoppen. Data, geen logica in de
// component: EenvoudigeApp krijgt deze keuzes via props.
const k = (category, t, s) => Object.freeze({ k: `cat:${category}`, t, s, keuze: Object.freeze({ category, type: "Prive" }) });

export const PRIVE_KEUZES_IN = Object.freeze([
  k("Loon", "Loon of salaris", "van je werkgever"),
  k("Uitkering", "Uitkering", "bijv. WW, bijstand of WIA"),
  k("Pensioen & AOW", "Pensioen of AOW", "van SVB of pensioenfonds"),
  k("Toeslagen", "Toeslag of kinderbijslag", "van Belastingdienst of SVB"),
  k("Overboeking van bekenden", "Van familie of vrienden", "bijv. terugbetaling of cadeau"),
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
  uitgebreidTip: "Fijner werk (één boeking apart, vaste lasten, vermogen) doe je in",
});
