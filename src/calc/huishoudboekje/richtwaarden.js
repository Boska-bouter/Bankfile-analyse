// huishoudboekje-V1R0 — richtwaarden voor "Past het bij je inkomen?" (akkoord Boska 2-11: Nibud en CBS). Alleen
// gegevens: verhoudingen.js rekent ermee. Bij een nieuwe publicatie hier de cijfers, de stand en de bronnen bijwerken.
// Het zijn indicaties voor een vergelijkbaar huishouden, geen persoonlijk advies.
export const RICHTWAARDEN = Object.freeze({
  stand: "november 2026",
  // Mediane woonquote 2024 (woonlasten als % van het besteedbare inkomen), CBS 16-6-2026 (voorlopige cijfers).
  woonquote: Object.freeze({ huurCorporatie: 24.6, huurParticulier: 30.0, koop: 16.3, onbekend: 24.6 }),
  // Vaste lasten als % van het netto inkomen: het Nibud noemt 40% tot 65%. Tot 50% groen, tot 65% oranje.
  vasteLasten: Object.freeze({ groen: 50, rood: 65 }),
  // Boodschappen (eten en drinken thuis) per maand, Nibud-richtbedragen: 1 volwassene ± € 275, 2 volwassenen ± € 500,
  // 2 volwassenen + 2 kinderen ± € 630 (dus ± € 65 per kind).
  boodschappen: Object.freeze({ eenVolwassene: 275, tweeVolwassenen: 500, perKind: 65 }),
  // Kleding en vrije tijd per maand, afgeleid van het Nibud-voorbeeldbudget voor 2 volwassenen + 2 kinderen
  // (kleding € 95, vrije tijd € 210), omgerekend per persoon.
  kledingPerPersoon: 24,
  vrijeTijdPerPersoon: 52,
  // Sparen: het Nibud adviseert minstens 10% van het netto inkomen opzij te zetten.
  sparen: Object.freeze({ minimaal: 10, oranje: 5 }),
  bronnen: Object.freeze([
    { naam: "CBS, Aandeel woonlasten in inkomen (16 juni 2026)", url: "https://www.cbs.nl/nl-nl/nieuws/2026/25/aandeel-woonlasten-in-inkomen-hoogst-voor-starters-in-private-huurwoning" },
    { naam: "Nibud-richtbedragen boodschappen, via Knab (2026)", url: "https://bieb.knab.nl/inkomsten-uitgaven/boodschappen-per-maand-wat-is-normaal" },
    { naam: "Nibud referentiebudgetten en spaaradvies, via Rekenmachine Pro (2026)", url: "https://rekenmachinepro.nl/blog/maandbudget-gezin/" },
    { naam: "Nibud over vaste lasten (40-65% van het netto inkomen), via HomeFinance (2026)", url: "https://www.homefinance.nl/nieuws-blog/2026/zoveel-geeft-een-gemiddeld-nederlands-huishouden-elke-maand-uit-301972/" },
  ]),
});
