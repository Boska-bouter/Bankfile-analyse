// Generieke kolomherkenning via aliassen — werkt voor de meeste Nederlandse banken zonder dat
// er een specifiek profiel per bank nodig is. Dit blijft de FALLBACK-laag: bankspecifieke
// profielen (zie migratieplan, v2) kunnen hier vóór geschakeld worden voor hogere betrouwbaarheid,
// zonder dat deze generieke herkenning wegvalt voor banken zonder eigen profiel.
export const HEADER_ALIASES = {
  date: ["datum", "date", "transactiedatum", "boekdatum", "rentedatum"],
  amount: ["bedrag (eur)", "bedrag", "amount", "bedrag eur"],
  afbij: ["af/bij", "af bij", "afbij", "creditdebet", "credit debet", "d/c", "mutatiesoort", "debit/credit", "type"],
  counterparty: ["naam tegenpartij", "tegenpartij", "naam / omschrijving", "naam", "tegenrekeninghouder", "naam uiteindelijke partij", "naam initierende partij"],
  counterpartyIban: [
    "tegenrekening iban/bban", "tegenrekening iban", "tegenrekening", "iban tegenpartij", "counterparty iban",
    "iban/bban", "rekening tegenpartij", "iban",
  ],
  description: ["omschrijving", "mededelingen", "omschrijving-1", "description"],
  fullDescription: ["volledige omschrijving", "omschrijving-1", "mededelingen", "omschrijving-2", "omschrijving-3"],
  balance: [
    "saldo na mutatie", "saldo na trn", "saldo na transactie", "nieuw saldo", "eindsaldo",
    "closing balance", "balance after txn", "balance after mutation", "balance after transaction",
    "saldo", "balance",
  ],
};

export function guessColumn(headers, aliases) {
  const lower = headers.map((h) => String(h).trim().toLowerCase());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return headers[idx];
  }
  for (const alias of aliases) {
    const idx = lower.findIndex((h) => h.includes(alias));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function buildColumnMapping(headers) {
  return {
    date: guessColumn(headers, HEADER_ALIASES.date),
    amount: guessColumn(headers, HEADER_ALIASES.amount),
    afbij: guessColumn(headers, HEADER_ALIASES.afbij),
    counterparty: guessColumn(headers, HEADER_ALIASES.counterparty),
    counterpartyIban: guessColumn(headers, HEADER_ALIASES.counterpartyIban),
    description: guessColumn(headers, HEADER_ALIASES.description),
    fullDescription: guessColumn(headers, HEADER_ALIASES.fullDescription),
    balance: guessColumn(headers, HEADER_ALIASES.balance),
  };
}

export function hasUsableHeaders(rows) {
  if (!rows.length) return false;
  const hdrs = Object.keys(rows[0]);
  if (hdrs.length < 3) return false;
  return !!guessColumn(hdrs, HEADER_ALIASES.date) && !!guessColumn(hdrs, HEADER_ALIASES.amount);
}
