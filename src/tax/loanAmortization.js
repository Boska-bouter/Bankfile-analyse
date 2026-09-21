import { getLeaseSegments, assignLeaseTransactionsToSegments } from "./financialLease.js";

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

// Rente over een specifiek jaar, voor het aangiftevoorstel — dezelfde berekening als in de
// leningen/lease-detailvensters, maar hier opgeteld over alle leningen resp. financiële leases
// samen en gefilterd op het actieve jaar. Onvolledig ingevulde of "onbekend"-gemarkeerde
// leningen/leases tellen niet mee in het bedrag, maar worden wel apart geteld zodat er een
// duidelijke melding kan komen dat het cijfer daardoor niet compleet is.
export function computeLoanRenteForYear(loanSummary, loanDetails, year) {
  let totaalRente = 0;
  let totaalAflossing = 0;
  let onvolledig = 0;
  for (const loan of loanSummary) {
    const details = loanDetails[loan.key];
    if (!details || details.onbekend) { onvolledig++; continue; }
    if (!details.leningbedrag || !details.startdatum || details.rente == null || details.rente === "") { onvolledig++; continue; }
    const amortization = computeLoanAmortization(loan.transactions, details);
    if (!amortization) { onvolledig++; continue; }
    const jaarData = groupAmortizationByYear(amortization).find((j) => j.year === year);
    if (jaarData) {
      totaalRente += jaarData.rente;
      totaalAflossing += jaarData.aflossing;
    }
  }
  return { totaalRente, totaalAflossing, onvolledig };
}

// Combineert het amortisatieschema van een (eventueel meerdelige, zie financialLease.js)
// financiële lease: elk opeenvolgend contract krijgt zijn eigen banktransacties (gesplitst op
// startdatum) en wordt onafhankelijk doorgerekend met zijn eigen bedrag/looptijd/rente — daarna
// worden de rijen simpelweg achter elkaar gezet (ze horen bij niet-overlappende periodes) zodat
// groupAmortizationByYear er verder geen weet van hoeft te hebben dat het om meerdere contracten
// gaat. saldoNu is het openstaande saldo van het LAATSTE (huidige) contract — het saldo van een
// afgesloten, opgevolgd contract is niet meer relevant. onvolledig geeft aan of minstens één van
// de contracten niet compleet genoeg was ingevuld om mee te rekenen (die telt dan simpelweg niet
// mee, in plaats van de hele lease te laten mislukken).
export function computeFinancialLeaseAmortizationMultiSegment(transactions, details, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate) {
  const segments = getLeaseSegments(details);
  if (segments.length === 0) return null;
  const withTx = assignLeaseTransactionsToSegments(transactions, segments);
  const rows = [];
  let onvolledig = false;
  let saldoNu = null;
  for (const { segment, transactions: segTx } of withTx) {
    if (!segment.koopprijs || !segment.looptijd || !segment.maandbedrag || !segment.startdatum) { onvolledig = true; continue; }
    const hoofdsom = computeOnbetaaldGedeelteKoop(segment);
    const rente = computeFinancialLeaseRate(segment);
    if (rente == null) { onvolledig = true; continue; }
    const amortization = computeLoanAmortization(segTx, { leasebedrag: hoofdsom, startdatum: segment.startdatum, rente });
    if (!amortization) continue;
    rows.push(...amortization.rows);
    saldoNu = amortization.saldoNu;
  }
  if (rows.length === 0) return null;
  const totaalRente = rows.reduce((a, r) => a + r.rente, 0);
  const totaalAflossing = rows.reduce((a, r) => a + r.aflossing, 0);
  return { rows, totaalRente, totaalAflossing, saldoNu: saldoNu ?? 0, onvolledig };
}

export function computeLeaseRenteForYear(leaseSummary, leaseDetails, year, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate) {
  let totaalRente = 0;
  let totaalAflossing = 0;
  let onvolledig = 0;
  for (const lease of leaseSummary) {
    if (lease.category !== "Lease (financieel)") continue;
    const details = leaseDetails[lease.key];
    if (!details || details.onbekend) { onvolledig++; continue; }
    const amortization = computeFinancialLeaseAmortizationMultiSegment(lease.transactions, details, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
    if (!amortization) { onvolledig++; continue; }
    if (amortization.onvolledig) onvolledig++;
    const jaarData = groupAmortizationByYear(amortization).find((j) => j.year === year);
    if (jaarData) {
      totaalRente += jaarData.rente;
      totaalAflossing += jaarData.aflossing;
    }
  }
  return { totaalRente, totaalAflossing, onvolledig };
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

// Signaleert lease-groepen die vermoedelijk bij hetzelfde contract horen maar niet zijn
// samengevoegd — bijv. omdat een deel van de betalingen via een net iets andere tegenpartijnaam
// binnenkomt (een reguliere incasso vs. een los verstuurde factuur) waardoor het contractnummer
// er niet (letterlijk) in staat. Gebaseerd op een gedeeld betekenisvol woord tussen de
// tegenpartijnamen — extractKeywordCandidate is hier niet geschikt voor, want die pakt bij dit
// soort langere, generieke bankomschrijvingen vaak een administratief woord ("ontvangsten",
// "stichting") in plaats van het bedrijfsnaam-deel.
const LEASE_MERGE_STOPWOORDEN = new Set([
  "ontvangsten", "stichting", "betaling", "betalingen", "incasso", "lease", "leasing",
  "financieel", "operationeel", "maatschappij", "leasemaatschappij", "contract",
]);
function significanteWoorden(text) {
  return [...((text || "").toLowerCase().match(/[a-z]{5,}/g) || [])].filter((w) => !LEASE_MERGE_STOPWOORDEN.has(w));
}
export function suggestLeaseMerges(leaseSummary) {
  const items = leaseSummary.map((lease) => ({
    lease, woorden: new Set(significanteWoorden(lease.transactions[0]?.counterparty || lease.name)),
  }));
  const groups = [];
  const gebruikt = new Set();
  for (let i = 0; i < items.length; i++) {
    if (gebruikt.has(i)) continue;
    const group = [items[i].lease];
    for (let j = i + 1; j < items.length; j++) {
      if (gebruikt.has(j)) continue;
      const gedeeld = [...items[i].woorden].some((w) => items[j].woorden.has(w));
      if (gedeeld) { group.push(items[j].lease); gebruikt.add(j); }
    }
    if (group.length > 1) { groups.push(group); gebruikt.add(i); }
  }
  return groups;
}
