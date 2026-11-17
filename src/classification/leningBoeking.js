// huishoudboekje-V6R2 — wat telt als leningboeking (besluit Boska 6-11): "lening" of iets wat erop lijkt in de omschrijving
// (aflossing, geleend, voorgeschoten). Gedeeld door het indelen (calc/useClassified.jsx) en het leningenpaneel (App.jsx).
export const LENING_CATS = new Set(["Leningen", "Leningen (privé)"]);
export const LENING_WOORD = /lening|leen\b|geleend|uitgeleend|aflossing|voorgeschot|voorschot|voorgeschiet/i;
// nieuw-V1R9 — strikter: alleen een echte lening (niet "voorgeschoten"/"voorschot"), voor boekingen van/naar een eigen of partnerrekening.
export const LENING_EIGEN = /lening|geleend|uitgeleend|aflossing/i;
// nieuw-V7R1 — terugbetaling van kosten die de ondernemer of partner zelf heeft voorgeschoten (Dakhlaoui 17-11: "voorgeschoten inkopen").
// Zo'n overboeking naar een eigen of partnerrekening ligt niet vast: hij komt op controleren en je kiest zelf de kostencategorie.
export const VOORGESCHOTEN_EIGEN = /voorgeschot|voorschot|declaratie|onkosten|\binkop(en)?\b|\binkoop\b|\bbonnetje|tankbon|brandstof|\btanken\b|parkeer|parkvia|huurauto|snappcar|vliegticket|zakenreis/i;
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
