import { getLeaseSegments, assignLeaseTransactionsToSegments } from "./financialLease.js";

// v181 — punt 3 uit de leasereview: een bijschrijving (terugboeking, bijv. "Terugboeking op verzoek
// klant") corrigeert vrijwel altijd een eerdere betaling (een deel van een eerder geïncasseerde
// termijn wordt teruggestort, bijv. na een foutieve incasso of een klacht) — de rente/aflossing-
// verdeling van DIE eerdere betaling moet dan mee gecorrigeerd worden, niet alleen het openstaande
// saldo. In plaats van een aparte, foutgevoelige "achteraf terugdraaien"-berekening bovenop de
// bestaande rente/aflossing-splitsing te bouwen, wordt een gematchte terugboeking hier AL vóór die
// splitsing verrekend met het bedrag van de betaling die hij corrigeert — de bestaande, al geteste
// berekening hieronder rekent daardoor vanzelf met het per saldo daadwerkelijk (netto) betaalde
// bedrag, en de terugboeking zelf verdwijnt als aparte transactie (hij zit al verwerkt in de
// gecorrigeerde betaling).
//
// Is er geen betrouwbare match, dan wordt de terugboeking bewust NIET meegenomen in de rente/
// aflossing-berekening — niet als (foutieve) extra aflossing, en ook niet als saldoverhoging zoals
// vóór v181 — maar apart teruggegeven (`ongekoppeldeTerugboekingen`) zodat hij zichtbaar blijft als
// een door de accountant zelf te beoordelen, ongekoppelde correctie, in plaats van een gok te wagen
// die het saldo/de rente stilzwijgend verkeerd zou kunnen maken.
//
// "Betrouwbare match" = de dichtstbijzijnde EERDERE (negatieve) betaling binnen
// TERUGBOEKING_MAX_DAGEN_TERUG dagen die nog genoeg "niet-teruggedraaid" bedrag over heeft om het
// teruggeboekte bedrag te dekken (met een kleine marge voor centenverschillen). Een terugboeking die
// een veel oudere betaling zou corrigeren is zeldzaam genoeg en onzeker genoeg om liever ongekoppeld
// te laten zien dan verkeerd te koppelen — 6 maanden is hierin een bewuste, redelijke aanname.
const TERUGBOEKING_MAX_DAGEN_TERUG = 182;
const TERUGBOEKING_BEDRAG_MARGE = 5;

function netTerugboekingenTegenBetalingen(transactions) {
  const sorted = [...transactions].sort((a, b) => a.date - b.date);
  // Per betaling (index in `sorted`): hoeveel van het oorspronkelijke, betaalde bedrag nog niet is
  // teruggedraaid door een (eerder verwerkte, in tijdsvolgorde) terugboeking.
  const resterend = sorted.map((tx) => (tx.amount < 0 ? Math.abs(tx.amount) : 0));
  const gecorrigeerdBedrag = sorted.map((tx) => tx.amount);
  const ongekoppeldeTerugboekingen = [];

  for (let i = 0; i < sorted.length; i++) {
    const tx = sorted[i];
    if (tx.amount < 0) continue; // alleen bijschrijvingen (terugboekingen) zoeken een match
    const terugboekingBedrag = tx.amount;
    let bestIdx = -1;
    let bestDagenTussen = Infinity;
    for (let j = i - 1; j >= 0; j--) {
      const kandidaat = sorted[j];
      if (kandidaat.amount >= 0) continue; // alleen echte betalingen zijn een correctiedoel
      const dagenTussen = (tx.date - kandidaat.date) / (1000 * 60 * 60 * 24);
      if (dagenTussen > TERUGBOEKING_MAX_DAGEN_TERUG) break; // sorted op datum: verder terug wordt alleen groter
      if (resterend[j] < terugboekingBedrag - TERUGBOEKING_BEDRAG_MARGE) continue;
      if (dagenTussen < bestDagenTussen) {
        bestDagenTussen = dagenTussen;
        bestIdx = j;
      }
    }
    if (bestIdx === -1) {
      ongekoppeldeTerugboekingen.push(tx);
      continue;
    }
    // Marge kan de correctie net iets groter maken dan wat er nog resteerde — geklemd op 0 zodat de
    // gecorrigeerde betaling nooit (per abuis) in een bijschrijving verandert.
    resterend[bestIdx] = Math.max(0, resterend[bestIdx] - terugboekingBedrag);
    gecorrigeerdBedrag[bestIdx] = Math.min(0, gecorrigeerdBedrag[bestIdx] + terugboekingBedrag);
  }

  const transactiesNaVerrekening = [];
  for (let i = 0; i < sorted.length; i++) {
    const tx = sorted[i];
    if (tx.amount >= 0) continue; // terugboeking: gekoppeld = al verwerkt hierboven, ongekoppeld = apart teruggegeven
    if (gecorrigeerdBedrag[i] === 0) continue; // volledig teruggedraaid: geen echte betaling meer over
    transactiesNaVerrekening.push({ ...tx, amount: gecorrigeerdBedrag[i] });
  }
  return { transactions: transactiesNaVerrekening, ongekoppeldeTerugboekingen };
}

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
  const { transactions: genetteTransacties, ongekoppeldeTerugboekingen } = netTerugboekingenTegenBetalingen(transactions);
  let balance = startBalance;
  let lastDate = new Date(details.startdatum);
  const rows = [];
  for (const tx of genetteTransacties) {
    const maandenVerstreken = Math.max(
      (tx.date.getFullYear() - lastDate.getFullYear()) * 12 + (tx.date.getMonth() - lastDate.getMonth()) +
        (tx.date.getDate() - lastDate.getDate()) / 30,
      0
    );
    // Na de verrekening hierboven is elke overgebleven transactie een echte (negatieve) betaling —
    // een niet-gekoppelde terugboeking is al uitgefilterd (zie ongekoppeldeTerugboekingen) en raakt
    // dus bewust noch de rente/aflossing-berekening, noch het saldo.
    const rente = balance * monthlyRate * maandenVerstreken;
    const betaling = Math.abs(tx.amount);
    const aflossing = Math.max(betaling - rente, 0);
    balance = Math.max(balance - aflossing, 0);
    rows.push({ tx, rente: Math.min(rente, betaling), aflossing, saldoNa: balance });
    lastDate = tx.date;
  }
  const totaalRente = rows.reduce((a, r) => a + r.rente, 0);
  const totaalAflossing = rows.reduce((a, r) => a + r.aflossing, 0);
  return { rows, totaalRente, totaalAflossing, saldoNu: balance, ongekoppeldeTerugboekingen };
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
  // Apart van "nog niet (volledig) ingevuld": een segment kan wél helemaal ingevuld zijn, maar met
  // bedragen die niet bij elkaar passen (bijv. de opgetelde termijnen zijn lager dan de hoofdsom die
  // gefinancierd wordt) — dan levert computeFinancialLeaseRate bewust null op (zie financialLease.js)
  // in plaats van een misleidend percentage. Dat verdient in de aangifte een ANDERE melding dan "nog
  // niet ingevuld", want de gebruiker heeft hier al wél iets ingevuld — het klopt alleen niet.
  let renteNietBerekenbaar = false;
  // Welke kalenderjaren precies een niet-berekenbaar segment hebben — anders zou de waarschuwing
  // óók verschijnen bij jaren die alleen te maken hebben met een eerder, prima werkend contract
  // (bijv. 2020 t/m 2024 bij een lease die pas in 2025 een kapot vervolgcontract kreeg).
  const renteNietBerekenbaarJaren = new Set();
  let saldoNu = null;
  // v181: ongekoppelde terugboekingen (zie netTerugboekingenTegenBetalingen) van alle segmenten
  // samen — puur ter informatie/weergave, ze zijn al buiten de rente/aflossing-berekening gehouden.
  const ongekoppeldeTerugboekingen = [];
  for (const { segment, transactions: segTx } of withTx) {
    if (!segment.koopprijs || !segment.looptijd || !segment.maandbedrag || !segment.startdatum) { onvolledig = true; continue; }
    const hoofdsom = computeOnbetaaldGedeelteKoop(segment);
    const rente = computeFinancialLeaseRate(segment);
    if (rente == null) {
      renteNietBerekenbaar = true;
      for (const tx of segTx) renteNietBerekenbaarJaren.add(tx.date.getFullYear());
      renteNietBerekenbaarJaren.add(new Date(segment.startdatum).getFullYear());
      continue;
    }
    const amortization = computeLoanAmortization(segTx, { leasebedrag: hoofdsom, startdatum: segment.startdatum, rente });
    if (!amortization) continue;
    rows.push(...amortization.rows);
    saldoNu = amortization.saldoNu;
    ongekoppeldeTerugboekingen.push(...(amortization.ongekoppeldeTerugboekingen || []));
  }
  if (rows.length === 0) return renteNietBerekenbaar ? { rows: [], totaalRente: 0, totaalAflossing: 0, saldoNu: 0, onvolledig, renteNietBerekenbaar, renteNietBerekenbaarJaren, ongekoppeldeTerugboekingen } : null;
  const totaalRente = rows.reduce((a, r) => a + r.rente, 0);
  const totaalAflossing = rows.reduce((a, r) => a + r.aflossing, 0);
  return { rows, totaalRente, totaalAflossing, saldoNu: saldoNu ?? 0, onvolledig, renteNietBerekenbaar, renteNietBerekenbaarJaren, ongekoppeldeTerugboekingen };
}

export function computeLeaseRenteForYear(leaseSummary, leaseDetails, year, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate) {
  let totaalRente = 0;
  let totaalAflossing = 0;
  let onvolledig = 0;
  let renteNietBerekenbaar = 0;
  for (const lease of leaseSummary) {
    if (lease.category !== "Lease (financieel)") continue;
    const details = leaseDetails[lease.key];
    if (!details || details.onbekend) { onvolledig++; continue; }
    const amortization = computeFinancialLeaseAmortizationMultiSegment(lease.transactions, details, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
    if (!amortization) { onvolledig++; continue; }
    if (amortization.onvolledig) onvolledig++;
    if (amortization.renteNietBerekenbaarJaren?.has(year)) renteNietBerekenbaar++;
    const jaarData = groupAmortizationByYear(amortization).find((j) => j.year === year);
    if (jaarData) {
      totaalRente += jaarData.rente;
      totaalAflossing += jaarData.aflossing;
    }
  }
  return { totaalRente, totaalAflossing, onvolledig, renteNietBerekenbaar };
}

// Groepeert leningtransacties van één categorie per tegenpartij (niet op teken, zoals bij Overig)
// — een lening kan zowel een opname (positief) als aflossingen (negatief) hebben. `category` is
// standaard "Leningen" (zakelijk, ongewijzigd gedrag voor bestaande aanroepen); geef "Leningen
// (privé)" mee om precies dezelfde groepering te krijgen voor de leningen die als privé zijn
// gemarkeerd (zie LoanInterestPanel.jsx, waar dit gebruikt wordt om een "toch zakelijk"-knop terug
// te kunnen tonen voor een eerder als privé aangemerkte lening).
export function computeLoanSummary(classified, category = "Leningen") {
  const map = {};
  for (const tx of classified) {
    if (tx.category !== category || tx.isMirror) continue;
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
