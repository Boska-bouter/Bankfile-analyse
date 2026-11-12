// nieuw-V1R0 — vaste waarden die eerst bovenin App.jsx stonden (opruimronde 9-11).
// V46 — zie `classified`: categorieën die in een privé-only dossier aan de zakelijke kant gespiegeld worden.
// Alle %-splitsbare kostencategorieën behalve de auto-categorieën (die volgen de wizard).
// Basisvragen die de verkorte wizard in Eenvoudig niet stelt (zie SetupWizardModal); die horen niet in de zekerheidsmeter.
export const NIET_IN_EENVOUDIG = ["klanten", "leaseOverig", "voorraad", "activa", "aov", "overig"];
export const BASISVRAGEN_EENVOUDIG_KEYS = ["mobiel", "leaseSoort", "lease500"]; // beide-V9R7 — beantwoorden in Basisvragen (Eenvoudig), niet in de wizard
export const MOBIEL_CAT = "Zakelijk mobiel"; // beide-V8R4 — zie openBasisvragen / BasisvragenEenvoudig
// beide-V9R4 — Eenvoudig vraagt het zakelijk deel per rekening: betaald vanaf zakelijk en vanaf privé hebben elk een eigen percentage
// (wens Boska 28-10: apart zichtbaar, niet automatisch voor beide).
// beide-V10R6 — mobiel en internet/tv apart (wens Boska 28-10).
export const MOBIEL_CATS = [MOBIEL_CAT, "Privé - mobiel", "Zakelijk internet/TV", "Privé - internet/TV"];
export const MOBIEL_LABEL = {
  [MOBIEL_CAT]: "Mobiele telefoon, betaald vanaf de zakelijke rekening", "Privé - mobiel": "Mobiele telefoon, betaald vanaf de privérekening",
  "Zakelijk internet/TV": "Internet en tv, betaald vanaf de zakelijke rekening", "Privé - internet/TV": "Internet en tv, betaald vanaf de privérekening",
};
export const PRIVE_ONLY_HUISVESTING_STANDAARD_NUL = [
  "Huur", "Energie-water", "Gemeentelijke kosten", "Zakelijk mobiel", "Zakelijk internet/TV", "Reiskosten (OV)", "Reiskosten (vliegtickets)", "Reiskosten (hotel & verblijf)", "Streaming diensten",
  "Software & Online diensten", "Boekhouder, accountant & administratie",
];
export const ZAKELIJKE_SPIEGEL_CATEGORIEEN = ["Zakelijke inkomsten", "Zakelijke inkomsten 0%", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%", "Zakelijke inkoop non-voedingsmiddelen", "Zakelijke inkoop voedingsmiddelen"];
