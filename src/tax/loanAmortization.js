// Splitst de betalingen op een lening (of financiële lease) in rente en aflossing, op basis van
// het oorspronkelijke bedrag, de startdatum en het rentepercentage. Rekent per betaling het
// aantal verstreken maanden sinds de vorige betaling (of de startdatum, voor de eerste), berekent
// daarover de rente over het op dat moment nog openstaande bedrag, en trekt de rest van de
// betaling af als aflossing. Werkt hierdoor ook bij onregelmatige betalingen — er wordt geen vast
// schema aangenomen, alleen de daadwerkelijke betalingen uit de bank tellen.
export function computeLoanAmortization(transactions, details) {
  const hoofdsom = details?.leningbedrag ?? details?.leasebedrag;
  if (!details || !hoofdsom || !details.startdatum || details.rente == null || details.rente === "") return null;
  const startBalance = Number(hoofdsom);
  const monthlyRate = Number(details.rente) / 100 / 12;
  if (!(startBalance > 0) || isNaN(monthlyRate)) return null;
  let balance = startBalance;
  let lastDate = new Date(details.startdatum);
  const rows = [];
  for (const tx of transactions) {
    const maandenVerstreken = Math.max(
      (tx.date.getFullYear() - lastDate.getFullYear()) * 12 + (tx.date.getMonth() - lastDate.getMonth()) +
        (tx.date.getDate() - lastDate.getDate()) / 30,
      0
    );
    const rente = balance * monthlyRate * maandenVerstreken;
    const betaling = Math.abs(tx.amount);
    const aflossing = Math.max(betaling - rente, 0);
    balance = Math.max(balance - aflossing, 0);
    rows.push({ tx, rente: Math.min(rente, betaling), aflossing, saldoNa: balance });
    lastDate = tx.date;
  }
  const totaalRente = rows.reduce((a, r) => a + r.rente, 0);
  const totaalAflossing = rows.reduce((a, r) => a + r.aflossing, 0);
  return { rows, totaalRente, totaalAflossing, saldoNu: balance };
}

// Voor de belastingaangifte telt niet het totaal over de hele looptijd, maar wat er per jaar aan
// rente/aflossing is betaald — de aangifte wordt tenslotte per jaar gedaan. Groepeert de rijen uit
// computeLoanAmortization op het jaar van de betaling, en geeft ook het openstaande saldo aan het
// eind van elk jaar mee (het saldo van de laatste betaling in dat jaar).
export function groupAmortizationByYear(amortization) {
  if (!amortization) return [];
  const byYear = {};
  for (const row of amortization.rows) {
    const year = row.tx.date.getFullYear();
    if (!byYear[year]) byYear[year] = { year, rente: 0, aflossing: 0, saldoEindJaar: null, aantal: 0 };
    byYear[year].rente += row.rente;
    byYear[year].aflossing += row.aflossing;
    byYear[year].saldoEindJaar = row.saldoNa;
    byYear[year].aantal += 1;
  }
  return Object.values(byYear).sort((a, b) => a.year - b.year);
}

// Groepeert "Leningen"-transacties per tegenpartij (niet op teken, zoals bij Overig) — een
// lening kan zowel een opname (positief) als aflossingen (negatief) hebben.
export function computeLoanSummary(classified) {
  const map = {};
  for (const tx of classified) {
    if (tx.category !== "Leningen" || tx.isMirror) continue;
    const key = (tx.counterparty || tx.description || "").trim().toLowerCase();
    if (!key) continue;
    if (!map[key]) map[key] = { key, name: tx.counterparty || tx.description, total: 0, count: 0, transactions: [] };
    map[key].total += tx.amount;
    map[key].count += 1;
    map[key].transactions.push(tx);
  }
  for (const loan of Object.values(map)) {
    loan.transactions.sort((a, b) => a.date - b.date);
  }
  return Object.values(map).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

// Sommige leasemaatschappijen laten meerdere, volledig aparte contracten (verschillende
// voertuigen) onder precies dezelfde tegenpartijnaam lopen — puur op naam groeperen zou die dan
// ten onrechte samenvoegen tot één (onberekenbare) lease. Banken nemen het eigen leasecontract-
// nummer vaak wél letterlijk op in de omschrijving ("...leasecontract 420224 T-588-TV...") — is
// dat aanwezig, dan is dat een veel preciezere sleutel dan de tegenpartijnaam.
const LEASECONTRACT_RE = /leasecontract\s+(\S+)(?:\s+([A-Z0-9-]{5,9}))?/i;

// Lease (operationeel + financieel) — zelfde opzet als computeLoanSummary, maar dan voor beide
// lease-categorieën samen, met de categorie van de eerste transactie erbij (voor de "is dit al
// beantwoord als operationeel/financieel?"-weergave).
export function computeLeaseSummary(classified) {
  const map = {};
  for (const tx of classified) {
    if ((tx.category !== "Lease (operationeel)" && tx.category !== "Lease (financieel)") || tx.isMirror) continue;
    const baseName = (tx.counterparty || tx.description || "").trim();
    if (!baseName) continue;
    const contractMatch = `${tx.description} ${tx.fullDescription}`.match(LEASECONTRACT_RE);
    const key = contractMatch ? `contract::${contractMatch[1].toLowerCase()}` : baseName.toLowerCase();
    if (!map[key]) {
      const label = contractMatch
        ? `${baseName} — contract ${contractMatch[1]}${contractMatch[2] ? ` (${contractMatch[2]})` : ""}`
        : baseName;
      map[key] = { key, name: label, total: 0, count: 0, transactions: [], category: tx.category };
    }
    map[key].total += tx.amount;
    map[key].count += 1;
    map[key].transactions.push(tx);
  }
  for (const lease of Object.values(map)) {
    lease.transactions.sort((a, b) => a.date - b.date);
    lease.category = lease.transactions[0].category;
  }
  return Object.values(map).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}
