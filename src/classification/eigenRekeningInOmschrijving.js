// nieuw-V10R9 — Boska 25-11: een opgegeven eigen rekening (bijv. een ING Oranje spaarrekening) staat bij sommige banken niet als
// tegenrekening in de export, alleen in de omschrijving: "Van Zakelijke oranje spaarrekening L58634679". Zo'n boeking krijgt dan
// het opgegeven nummer of de naam als tegenrekening, zodat de gewone herkenning van eigen rekeningen werkt.
// Nummer (met cijfers, zonder spaties, minstens 6 tekens): moet als los woord in de tekst staan.
// Naam (bijv. "Zakelijke Oranje Spaarrekening"): moet letterlijk in de tekst staan, en alleen in bestanden van hetzelfde soort
// rekening (een zakelijke spaarrekening op naam niet in een privébestand, waar een gelijknamige privé-spaarrekening kan staan).
// Een IBAN mag met spaties zijn ingevoerd ("NL12 INGB 0001 2345 67").
const isNummer = (s) => { const k = s.replace(/\s+/g, ""); return /\d/.test(k) && k.replace(/[^A-Za-z0-9]/g, "").length >= 6 && (!/\s/.test(s.trim()) || /^[A-Za-z]{2}\d{2}[A-Za-z0-9]{10,30}$/.test(k)); };
// Naam als hele woorden: "spaarrekening" niet binnen "spaarrekeningen" of "privéspaarrekening".
const heelWoord = (tekst, naam) => { let i = tekst.indexOf(naam); while (i >= 0) { const v = tekst[i - 1], n = tekst[i + naam.length]; if (!(v && /[\p{L}\p{N}]/u.test(v)) && !(n && /[\p{L}\p{N}]/u.test(n))) return true; i = tekst.indexOf(naam, i + 1); } return false; };
const normTekst = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

export function eigenRekeningenVoorOmschrijving(eigenRekeningenExtra) {
  return (eigenRekeningenExtra || [])
    .filter((r) => r && r.iban && String(r.iban).trim().length >= 6)
    .map((r) => {
      const waarde = String(r.iban).trim();
      return isNummer(waarde)
        ? { waarde, nummer: waarde.replace(/[^A-Za-z0-9]/g, "").toUpperCase(), accountType: r.accountType }
        : { waarde, naam: normTekst(waarde), accountType: r.accountType };
    });
}

export function tegenrekeningUitOmschrijving(tx, lijst, accountType) {
  if (!lijst.length || String(tx.counterpartyIban || "").trim()) return null;
  const tekst = `${tx.fullDescription || ""} ${tx.description || ""} ${tx.counterparty || ""}`;
  let tokens = null;
  for (const r of lijst) {
    if (r.nummer) {
      tokens = tokens || new Set(tekst.toUpperCase().match(/[A-Z0-9]+/g) || []);
      if (tokens.has(r.nummer)) return r.waarde;
    } else if (r.naam && (!accountType || !r.accountType || r.accountType === accountType) && heelWoord(normTekst(tekst), r.naam)) return r.waarde;
  }
  return null;
}

export function metEigenRekeningUitOmschrijving(transactions, eigenRekeningenExtra, accountTypeByFile = {}) {
  const lijst = eigenRekeningenVoorOmschrijving(eigenRekeningenExtra);
  if (!lijst.length) return transactions;
  return transactions.map((tx) => {
    const gevonden = tegenrekeningUitOmschrijving(tx, lijst, accountTypeByFile?.[tx.source] || tx.accountType);
    return gevonden ? { ...tx, counterpartyIban: gevonden, tegenrekeningUitOmschrijving: true } : tx;
  });
}
