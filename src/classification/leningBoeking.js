// huishoudboekje-V6R2 — wat telt als leningboeking (besluit Boska 6-11): "lening" of iets wat erop lijkt in de omschrijving
// (aflossing, geleend, voorgeschoten). Gedeeld door het indelen (calc/useClassified.jsx) en het leningenpaneel (App.jsx).
export const LENING_CATS = new Set(["Leningen", "Leningen (privé)"]);
export const LENING_WOORD = /lening|leen\b|geleend|uitgeleend|aflossing|voorgeschot|voorschot|voorgeschiet/i;
// nieuw-V1R9 — strikter: alleen een echte lening (niet "voorgeschoten"/"voorschot"), voor boekingen van/naar een eigen of partnerrekening.
export const LENING_EIGEN = /lening|geleend|uitgeleend|aflossing/i;
export const heeftLeningWoord = (tx) => LENING_WOORD.test(`${tx.description || ""} ${tx.fullDescription || ""}`);

// beide-V17R8 — korte omschrijving van een boeking (zonder Naam/IBAN/Datum), ook getoond onder elke lening.
export function kortOmschrijving(t) {
  return String(t.description || t.fullDescription || "")
    .replace(/^Naam:.*?(?=Omschrijving:|IBAN:|Kenmerk:|$)/, "")
    .replace(/Omschrijving:\s*/, "")
    .replace(/IBAN:\s*\S+\s*/, "")
    .replace(/(Datum\/Tijd|Valutadatum):.*$/, "")
    .replace(/Kenmerk:\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}
// huishoudboekje-V6R3 — boekingen zonder omschrijving blijven bij de lening (besluit Boska 6-11).
export const geenOmschrijving = (tx) => !kortOmschrijving(tx);
export const hoortBijLening = (tx) => heeftLeningWoord(tx) || geenOmschrijving(tx);
