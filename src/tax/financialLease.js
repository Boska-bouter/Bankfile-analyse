// Nieuwe, realistische invoer voor financiële lease: in plaats van dat de gebruiker zelf een
// rentepercentage moet weten (wat bij een leasecontract meestal niet met dat woord genoemd wordt),
// vult die de aankoop- en leasestructuur in zoals die op een leasecontract staat, en leidt de tool
// daaruit het jaarlijkse rentepercentage af.

// Sectie 1 — wat er daadwerkelijk gefinancierd moet worden.
export function computeOnbetaaldGedeelteKoop(details) {
  const n = (v) => (v === "" || v == null ? 0 : Number(v));
  return n(details.koopprijs) + n(details.teBetalenBtw) - n(details.aanbetaling) - n(details.inruilwaarde) + n(details.inlossingLopendeLening);
}

// v180 — twee verschillende bedragen die tot nu toe (per ongeluk) door elkaar liepen:
//   - "Gefinancierd bedrag" (computeOnbetaaldGedeelteKoop hierboven) is wat er via DEZE lease nog
//     openstaat/terugbetaald moet worden — koopprijs+BTW, verminderd met wat al op een andere manier
//     is voldaan (aanbetaling, inruilwaarde, aflossing van een lopende lening). Dat is de juiste basis
//     voor de leaseschuld/rente-amortisatie (computeFinancialLeaseRate/computeLoanAmortization) — die
//     rekent immers alleen over het bedrag waarover daadwerkelijk rente wordt betaald.
//   - "Aanschafwaarde bedrijfsmiddel" is wat het bedrijfsmiddel zelf waard is/heeft gekost — koopprijs
//     + de daarover verschuldigde BTW, ZONDER de financieringswijze te verrekenen. Een aanbetaling,
//     een ingeruild ander bedrijfsmiddel of het aflossen van een oude lening veranderen niets aan wat
//     de auto/machine zelf heeft gekost, en horen dus niet in de afschrijvingsbasis te worden
//     afgetrokken — dat drukt anders de afschrijving ten onrechte omlaag. Dit is de juiste basis voor
//     de afschrijving (zie buildLeaseActivumFromSegment in tax/autoBijtelling.js).
//
// `koopprijs` is in deze tool altijd EXCLUSIEF BTW en `teBetalenBtw` is de daar afzonderlijk over
// verschuldigde/betaalde BTW (vandaar dat het twee losse velden zijn in plaats van één "koopprijs
// incl. BTW") — koopprijs + teBetalenBtw dubbelt dus niet, dat is precies de BTW-inclusieve
// aanschafwaarde van het bedrijfsmiddel.
export function computeAanschafwaardeBedrijfsmiddel(details) {
  const n = (v) => (v === "" || v == null ? 0 : Number(v));
  return n(details?.koopprijs) + n(details?.teBetalenBtw);
}

// Sectie 2 — de leasestructuur zelf. Lost de kasstromen (aanbetaling van de hoofdsom, dan de
// betalingen) op naar het maandelijkse rentepercentage waarvoor de netto contante waarde van alle
// betalingen precies gelijk is aan het gefinancierde bedrag (dezelfde soort berekening als IRR/
// interne-rentevoet in een spreadsheet) — met bisectie, want hier is geen nette formule voor.
export function computeFinancialLeaseRate(details) {
  const principal = computeOnbetaaldGedeelteKoop(details);
  const looptijd = Number(details.looptijd);
  const maandbedrag = Number(details.maandbedrag);
  const eindbetaling = details.eindbetaling === "" || details.eindbetaling == null ? 0 : Number(details.eindbetaling);
  const extra = details.extraBedrag1eTermijn === "" || details.extraBedrag1eTermijn == null ? 0 : Number(details.extraBedrag1eTermijn);

  if (!(principal > 0) || !(looptijd > 0) || !(maandbedrag > 0)) return null;

  const cashflow = (month) => {
    let v = month === 1 ? maandbedrag + extra : maandbedrag;
    if (month === looptijd) v += eindbetaling;
    return v;
  };
  const npv = (monthlyRate) => {
    let total = -principal;
    for (let m = 1; m <= looptijd; m++) total += cashflow(m) / Math.pow(1 + monthlyRate, m);
    return total;
  };

  // Bisectie tussen 0% en 5%/maand (~60%+ per jaar, ruim boven wat een reële lease ooit zou zijn).
  // NPV daalt monotoon met een stijgende rente (hogere rente = betalingen minder waard nu), dus
  // een simpele bisectie is hier voldoende en robuuster dan Newton-Raphson (geen afgeleide nodig,
  // geen risico op divergeren).
  let lo = 0;
  let hi = 0.05;
  if (npv(0) < 0) return null; // zelfs bij 0% rente wordt de hoofdsom niet terugbetaald door de ingevulde betalingen — invoer klopt niet
  if (npv(hi) > 0) return null; // ook bij 5%/maand nog steeds niet passend — onrealistische invoer
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  const monthlyRate = (lo + hi) / 2;
  return monthlyRate * 12 * 100; // jaarlijks percentage, zoals de rest van de tool dat al gebruikt
}

// Genereert het volledige, theoretische betaalschema voor de hele looptijd — op basis van wat er
// is ingevuld (niet van de daadwerkelijke bankbetalingen), zodat je meteen het hele overzicht ziet
// en kunt controleren of de berekening klopt, ook voor termijnen die nog moeten komen. Bij een
// vroegtijdige beëindiging stopt het schema bij de einddatum in plaats van door te lopen tot het
// einde van de oorspronkelijke looptijd.
export function generateProjectedLeasePayments(details) {
  const looptijd = Number(details.looptijd);
  const maandbedrag = Number(details.maandbedrag);
  if (!(looptijd > 0) || !(maandbedrag > 0) || !details.startdatum) return [];
  const eindbetaling = details.eindbetaling === "" || details.eindbetaling == null ? 0 : Number(details.eindbetaling);
  const extra = details.extraBedrag1eTermijn === "" || details.extraBedrag1eTermijn == null ? 0 : Number(details.extraBedrag1eTermijn);
  const start = new Date(details.startdatum);
  const einddatumBeeindiging = details.contractBeeindigd && details.einddatumContract ? new Date(details.einddatumContract) : null;
  // De eerste termijn valt in de praktijk vaak (binnen twee weken) na het afsluiten van het
  // contract, niet precies een maand erna zoals de vervolgtermijnen — bij een expliciet
  // opgegeven datum wordt die als anker voor de eerste termijn gebruikt, en lopen de
  // vervolgtermijnen daar maandelijks vanaf door. Zonder opgave: het oude gedrag (1 maand na
  // startdatum) als beste gok.
  const eersteTermijnDatum = details.datumEersteTermijn ? new Date(details.datumEersteTermijn) : null;

  const payments = [];
  for (let m = 1; m <= looptijd; m++) {
    let date;
    if (eersteTermijnDatum) {
      date = new Date(eersteTermijnDatum);
      date.setMonth(date.getMonth() + (m - 1));
    } else {
      date = new Date(start);
      date.setMonth(date.getMonth() + m);
    }
    if (einddatumBeeindiging && date > einddatumBeeindiging) break;
    let amount = maandbedrag;
    if (m === 1) amount += extra;
    if (m === looptijd && !einddatumBeeindiging) amount += eindbetaling;
    payments.push({ date, amount: -amount });
  }
  return payments;
}
const WORKDAY_MARGIN = 10;
const AMOUNT_MARGIN = 5;

function addWorkingDays(date, days) {
  const d = new Date(date);
  let added = 0;
  const step = days >= 0 ? 1 : -1;
  const target = Math.abs(days);
  while (added < target) {
    d.setDate(d.getDate() + step);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

// Vergelijkt het verwachte (geprojecteerde) betaalschema met de daadwerkelijke banktransacties
// van deze lease — zodat zichtbaar wordt of alle termijnen ook echt zijn afgeschreven. Een
// termijn hoeft niet op de kalenderdag exact te matchen (een incasso schuift weleens) — daarom
// een marge van 10 werkdagen op de datum en €5 op het bedrag. Grotere afwijkingen worden niet
// als "ontbrekend" gezien maar als "gevonden, bedrag wijkt af" — dat is juist waardevol om te
// laten zien (bijv. een extra aflossing of een prijswijziging), niet iets om te verbergen.
export function matchLeasePaymentsToSchedule(projectedPayments, actualTransactions, maandbedrag) {
  const lastDataDate = actualTransactions.reduce((max, t) => (!max || t.date > max ? t.date : max), null);
  const available = actualTransactions.map((t) => ({ tx: t, claimed: false }));
  const results = projectedPayments.map((p) => ({ projected: p, status: null, matchedTx: null, bedragVerschil: null }));

  // Ronde 1: gewone 1-op-1 match — dichtstbijzijnde datum binnen het venster wint.
  for (const r of results) {
    const windowStart = addWorkingDays(r.projected.date, -WORKDAY_MARGIN);
    const windowEnd = addWorkingDays(r.projected.date, WORKDAY_MARGIN);
    let best = null;
    let bestDiff = Infinity;
    for (const a of available) {
      if (a.claimed) continue;
      // Een bijschrijving (positief bedrag) is nooit een leasetermijn — dat is een terugboeking/
      // correctie van de leasemaatschappij, geen betaling. Laat 'm ongebruikt liggen zodat hij
      // hieronder bij "onverwachteBetalingen" opduikt, in plaats van een echte termijn te maskeren.
      if (a.tx.amount >= 0) continue;
      if (a.tx.date < windowStart || a.tx.date > windowEnd) continue;
      // Een duidelijk veelvoud van het maandbedrag (2x, 3x, ...) is vermoedelijk een gecombineerde
      // betaling van meerdere termijnen tegelijk — die hoort bij ronde 2 hieronder, niet hier
      // grijpig aan één termijn toegekend te worden.
      if (maandbedrag > 0) {
        const veelvoud = Math.round(Math.abs(a.tx.amount) / maandbedrag);
        if (veelvoud >= 2 && Math.abs(Math.abs(a.tx.amount) - veelvoud * maandbedrag) <= AMOUNT_MARGIN) continue;
      }
      const diff = Math.abs(a.tx.date - r.projected.date);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = a;
      }
    }
    if (best) {
      best.claimed = true;
      const bedragVerschil = Math.round((Math.abs(best.tx.amount) - Math.abs(r.projected.amount)) * 100) / 100;
      r.status = Math.abs(bedragVerschil) <= AMOUNT_MARGIN ? "gevonden" : "gevonden-afwijkend";
      r.matchedTx = best.tx;
      r.bedragVerschil = bedragVerschil;
    }
  }

  // Ronde 2: termijnen die nog geen match hebben — kijk of een niet-geclaimde transactie een
  // veelvoud van het maandbedrag is (bijv. 2 termijnen tegelijk betaald bij een achterstand) en
  // dek daarmee dan net zoveel opeenvolgende, nog niet gevonden termijnen als dat veelvoud is.
  if (maandbedrag > 0) {
    for (const a of available) {
      if (a.claimed) continue;
      if (a.tx.amount >= 0) continue; // zie toelichting bij ronde 1 — nooit een termijn
      const veelvoud = Math.round(Math.abs(a.tx.amount) / maandbedrag);
      if (veelvoud < 2) continue;
      if (Math.abs(Math.abs(a.tx.amount) - veelvoud * maandbedrag) > AMOUNT_MARGIN) continue;
      const windowStart = addWorkingDays(a.tx.date, -WORKDAY_MARGIN * veelvoud);
      const windowEnd = addWorkingDays(a.tx.date, WORKDAY_MARGIN);
      const startIdx = results.findIndex((r) => !r.matchedTx && r.projected.date >= windowStart && r.projected.date <= windowEnd);
      if (startIdx === -1) continue;
      const covered = [];
      for (let i = startIdx; i < results.length && covered.length < veelvoud; i++) {
        if (!results[i].matchedTx) covered.push(i);
        else break;
      }
      if (covered.length === veelvoud) {
        a.claimed = true;
        for (const i of covered) {
          results[i].status = "gevonden-samen";
          results[i].matchedTx = a.tx;
          results[i].bedragVerschil = 0;
        }
      }
    }
  }

  // Ronde 3: nog steeds geen match — "ontbrekend" als de verwachte datum vóór de laatst
  // geïmporteerde transactiedatum ligt (dus echt gemist), anders "nog niet in beeld" (simpelweg
  // nog niet aan de beurt in de geïmporteerde periode).
  for (const r of results) {
    if (r.status) continue;
    r.status = lastDataDate && r.projected.date <= lastDataDate ? "ontbrekend" : "nog-niet-in-beeld";
  }

  const onverwachteBetalingen = available.filter((a) => !a.claimed).map((a) => a.tx);
  return { results, onverwachteBetalingen };
}

// ---- Opeenvolgende contracten (herfinanciering/vervanging halverwege de looptijd) ----
//
// Soms wordt een lopend financieel-leasecontract halverwege vervangen door een nieuw contract met
// een ander bedrag/looptijd (bijv. het oude contract stopt op 1-3-2025, en vanaf dan loopt er een
// nieuw contract van 16 maanden met een ander maandbedrag) — zonder dat het per se om een
// verkoop/afkoop gaat zoals bij "contract vroegtijdig beëindigd" hierboven. `leaseDetails[key]`
// kan dit op twee manieren vastleggen: het oude, simpele formaat (de details zelf zijn het ene,
// enige contract) blijft gewoon werken, of — als er meerdere opeenvolgende contracten zijn — een
// `contracts`-array met per contract exact dezelfde velden als voorheen (inclusief een eigen
// `contractBeeindigd`/`einddatumContract` als dat contract op zijn beurt weer is opgevolgd).
// getLeaseSegments() maakt dat verschil voor de rest van de tool onzichtbaar: die geeft altijd een
// array van contracten terug, ook als het er maar één is.
// Normaliseert een kenteken voor vergelijking tussen contractsegmenten (zie autoBijtelling.js en
// FinancialLeaseDetailsModal.jsx): hoofdletterongevoelig en zonder spaties/streepjes, zodat
// "12-ABC-3", "12 abc 3" en "12ABC3" allemaal als hetzelfde kenteken herkend worden. Een leeg/
// ontbrekend kenteken normaliseert naar "" — die telt bewust nergens als "match" (elk segment zonder
// kenteken blijft een volledig op zichzelf staand, onafhankelijk gerekend contract, exact zoals vóór
// dit veld bestond).
export function normalizeKenteken(kenteken) {
  return (kenteken || "").toString().trim().toUpperCase().replace(/[\s-]/g, "");
}

export function getLeaseSegments(details) {
  if (!details) return [];
  if (Array.isArray(details.contracts) && details.contracts.length > 0) return details.contracts;
  return [details];
}

export function isCompleteLeaseSegment(segment) {
  return !!(segment && segment.koopprijs && segment.looptijd && segment.maandbedrag && segment.startdatum);
}

// Is de (eventueel meerdelige) financiële lease compleet genoeg ingevuld om te kunnen splitsen in
// rente/aflossing? Bij meerdere contracten moeten ze dat ALLEMAAL zijn — een onvolledig ingevuld
// vervolgcontract zou anders een deel van de rente/aflossing stilzwijgend laten verdwijnen.
export function isCompleteFinancialLeaseDetails(details) {
  const segments = getLeaseSegments(details);
  return segments.length > 0 && segments.every(isCompleteLeaseSegment);
}

// Verdeelt de daadwerkelijke banktransacties van een lease over de opeenvolgende contracten, op
// basis van elk contract zijn eigen startdatum — een transactie hoort bij het LAATSTE contract
// waarvan de startdatum niet ná de transactiedatum ligt. Contracten moeten hiervoor chronologisch
// staan (oudste eerst), wat vanzelf zo is omdat een nieuw contract altijd wordt toegevoegd ná het
// vorige.
export function assignLeaseTransactionsToSegments(transactions, segments) {
  return segments.map((segment, idx) => {
    const segStart = segment.startdatum ? new Date(segment.startdatum) : null;
    const nextStart = segments[idx + 1]?.startdatum ? new Date(segments[idx + 1].startdatum) : null;
    const segTx = transactions.filter((tx) => {
      if (segStart && tx.date < segStart) return false;
      if (nextStart && tx.date >= nextStart) return false;
      return true;
    });
    return { segment, transactions: segTx };
  });
}

// Totaal van alle leasebetalingen (informatief, ter controle tegen het zelf opgegeven "Lease
// vergoeding"-bedrag).
export function computeTotaleLeaseBetalingen(details) {
  const looptijd = Number(details.looptijd);
  const maandbedrag = Number(details.maandbedrag);
  if (!(looptijd > 0) || !(maandbedrag > 0)) return null;
  const eindbetaling = details.eindbetaling === "" || details.eindbetaling == null ? 0 : Number(details.eindbetaling);
  const extra = details.extraBedrag1eTermijn === "" || details.extraBedrag1eTermijn == null ? 0 : Number(details.extraBedrag1eTermijn);
  return maandbedrag * looptijd + eindbetaling + extra;
}
