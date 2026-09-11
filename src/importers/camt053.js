// CAMT.053/CAMT.054 XML-import — NIET GEÏMPLEMENTEERD, dit is een placeholder voor v2 (zie
// migratieplan, sectie 6). CAMT is een rijker XML-gebaseerd bankexportformaat dat door steeds
// meer Nederlandse banken wordt aangeboden naast CSV/MT940.
//
// Voorgestelde opzet zodra dit wordt opgepakt:
// - DOMParser (browser-native, geen extra dependency nodig) om de XML te parsen
// - Namespace-onafhankelijk zoeken naar <Ntry> (entry) elementen binnen <Stmt>
// - Per <Ntry>: <Amt>, <CdtDbtInd> (credit/debit), <BookgDt>/<ValDt>, en de tegenpartij/
//   omschrijving uit <NtryDtls><TxDtls><RmtInf> resp. <RltdPties>
// - Output in dezelfde rij-vorm als de CSV/MT940-parsers ("Datum", "Naam / Omschrijving",
//   "Af Bij", "Bedrag (EUR)", "Omschrijving"), zodat de rest van de importpijplijn ongewijzigd
//   werkt — zie mt940.js voor het patroon.

export function looksLikeCamt053(text) {
  return text.includes("<Document") && (text.includes("camt.053") || text.includes("BkToCstmrStmt"));
}

export function parseCamt053(_text) {
  throw new Error("CAMT.053-import is nog niet geïmplementeerd — zie src/importers/camt053.js voor de voorgestelde opzet.");
}
