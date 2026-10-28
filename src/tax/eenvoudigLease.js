// beide-V9R7 — lease in de eenvoudige weergave (besluit Boska 28-10). Eenvoudig kent geen leasegegevens (contract, bijtelling,
// afschrijving); daarom twee eenvoudige vragen, met een waarschuwing dat Uitgebreid het volledig kan uitwerken:
// - is de lease voor een auto of voor apparatuur/machines? (herkend aan de leasemaatschappij, anders gevraagd)
// - auto: wordt hij meer dan 500 km per jaar privé gebruikt? Ja = de autokosten (lease, brandstof, verzekering …) vallen weg
//   tegen de bijtelling (die nooit hoger is dan de autokosten zelf). Nee = alles telt als kosten. Alleen voor de inkomstenbelasting;
//   de btw-correctie voor privégebruik is niet meegerekend (staat in de waarschuwing).
// Apparatuur/machines worden zelden privé gebruikt: geen vraag, de leasekosten tellen volledig.
// Antwoorden staan in bevestigdeControles.eenvoudigLease = { soort: { [leaseKey]: "auto"|"apparatuur" }, prive500: { [jaar]: true|false } }.

const AUTO_RE = /leaseplan|alphabet|\bathlon|arval|ayvens|directlease|hiltermann|van mossel|autolease|car lease|\biclh\b|friesland lease|business lease|mkb lease|zuidlease|wagenplan|financial services|ford credit|\brci\b|private lease|\bauto\b|\bkenteken|volkswagen|\baudi\b|\bbmw\b|mercedes|toyota|renault|peugeot|\bkia\b|hyundai|tesla|volvo|skoda|\bford\b|\bopel\b|nissan|stellantis/i;
const APPARATUUR_RE = /grenke|de lage landen|\bdll\b|leasing solutions|machine|apparatuur|kopieer|printer|xerox|canon|ricoh|konica|sharp|heftruck|toyota material|still\b|linde material|caterpillar|zeppelin|kraan/i;

export function herkenLeaseSoort(tekst) {
  const t = String(tekst || "");
  if (APPARATUUR_RE.test(t)) return "apparatuur";
  if (AUTO_RE.test(t)) return "auto";
  return null;
}

// Per leasegroep (zie computeLeaseSummary): soort (antwoord gaat voor herkenning), jaren en transactie-id's.
export function leaseGroepen(leaseSummary, antwoorden) {
  return (leaseSummary || []).filter((l) => (l.transactions || []).length > 0).map((l) => {
    const tekst = `${l.name} ${l.transactions.slice(0, 3).map((t) => `${t.counterparty || ""} ${t.description || ""}`).join(" ")}`;
    const herkend = herkenLeaseSoort(tekst);
    const soort = antwoorden?.soort?.[l.key] || herkend;
    return { key: l.key, name: l.name, category: l.category, soort, herkend, txIds: new Set(l.transactions.map((t) => t.id)), jaren: [...new Set(l.transactions.map((t) => String(t.year)))].sort() };
  });
}

// Jaren waarin de vraag "meer dan 500 km privé?" geldt: een autolease, of bij Auto "Auto van de zaak".
export function autoJaren(groepen, autoStatus) {
  const s = new Set();
  for (const g of groepen) if (g.soort === "auto") g.jaren.forEach((j) => s.add(j));
  for (const [j, v] of Object.entries(autoStatus || {})) if (v === "zaak") s.add(String(j));
  return [...s].sort();
}

// Markering voor effectiveZakelijkPercentage (tax/categorySplit.js): in deze jaren telt de auto niet als kosten.
// `exact` = de auto is in Uitgebreid volledig ingevuld (bijtelling wordt daar berekend): dan geen aanname.
export function autoPriveMarkering(groepen, antwoorden, autoStatus, exact) {
  if (exact) return null;
  const jaren = autoJaren(groepen, autoStatus).filter((j) => antwoorden?.prive500?.[j] === true);
  if (!jaren.length) return null;
  const txIds = new Set();
  for (const g of groepen) if (g.soort === "auto") g.txIds.forEach((id) => txIds.add(id));
  return { jaren: new Set(jaren), txIds };
}

// Waarschuwingen voor "Hoe zeker is de uitkomst?" in een jaar.
export function leaseWaarschuwingen(groepen, autoStatus, jaar) {
  const j = String(jaar);
  const uit = [];
  if (autoJaren(groepen, autoStatus).includes(j)) {
    uit.push("Auto van de zaak / leaseauto: Eenvoudig rekent vereenvoudigd (bij meer dan 500 km privé vallen de autokosten weg tegen de bijtelling) en de btw-correctie voor privégebruik is niet meegerekend. In Uitgebreid kan dit volledig worden uitgewerkt.");
  }
  if (groepen.some((g) => g.category === "Lease (financieel)" && g.jaren.includes(j))) {
    uit.push("Financiële lease: afschrijving en rente in plaats van de termijnen staan alleen in Uitgebreid.");
  }
  return uit;
}
