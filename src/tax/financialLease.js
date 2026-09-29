// Nieuwe, realistische invoer voor financiële lease: in plaats van dat de gebruiker zelf een
// rentepercentage moet weten (wat bij een leasecontract meestal niet met dat woord genoemd wordt),
// vult die de aankoop- en leasestructuur in zoals die op een leasecontract staat, en leidt de tool
// daaruit het jaarlijkse rentepercentage af.

// Sectie 1 — wat er daadwerkelijk gefinancierd moet worden.
export function computeOnbetaaldGedeelteKoop(details) {
  const n = (v) => (v === "" || v == null ? 0 : Number(v));
  return n(details.koopprijs) + n(details.teBetalenBtw) - n(details.aanbetaling) - n(details.inruilwaarde) + n(details.inlossingLopendeLening);
}

// Twee verschillende bedragen die bewust apart gehouden worden:
//   - "Gefinancierd bedrag" (computeOnbetaaldGedeelteKoop hierboven) is wat er via DEZE lease nog
//     openstaat/terugbetaald moet worden — koopprijs+BTW, verminderd met wat al op een andere manier
//     is voldaan (aanbetaling, inruilwaarde, aflossing van een lopende lening). Dat is de juiste basis
//     voor de leaseschuld/rente-amortisatie (computeFinancialLeaseRate/computeLoanAmortization) — die
//     rekent immers alleen over het bedrag waarover daadwerkelijk rente wordt betaald. De BTW blijft
//     hier WEL in zitten: de leasemaatschappij financiert doorgaans ook het BTW-bedrag mee, dus dat
//     is wél onderdeel van de leaseschuld waarover rente wordt betaald.
//   - "Aanschafwaarde bedrijfsmiddel" (de AFSCHRIJVINGSbasis) is wat het bedrijfsmiddel zelf waard is
//     — v256, op expliciet verzoek gecorrigeerd naar UITSLUITEND de koopprijs (excl. BTW), zonder de
//     BTW erbij. Eerder (t/m v255) stond hier koopprijs + BTW, maar BTW bij een financial lease van
//     een zakelijk bedrijfsmiddel is (behoudens KOR/vrijgestelde prestaties) meteen volledig
//     aftrekbaar als voorbelasting — dat is geen meerjarige afschrijvingspost, en zou hier dus
//     dubbelop zijn (eerst in één keer terug via de BTW-aangifte, dan nogmaals via 5+ jaar
//     afschrijving). Het nettoresultaat van de BTW op de winstberekening is dus bewust nul: hij komt
//     hier nergens meer in voor (niet in de afschrijving, en dit dossier houdt BTW-aangifte/
//     voorbelasting sowieso los bij, buiten dit veld om). Een aanbetaling, een ingeruild ander
//     bedrijfsmiddel of het aflossen van een oude lening veranderen niets aan wat de auto/machine
//     zelf heeft gekost, en horen dus sowieso niet in de afschrijvingsbasis te worden afgetrokken —
//     dat drukt de afschrijving ten onrechte omlaag. Zie buildLeaseActivumFromSegment in
//     tax/autoBijtelling.js voor waar dit gebruikt wordt.
//
// `koopprijs` is in deze tool altijd EXCLUSIEF BTW.
export function computeAanschafwaardeBedrijfsmiddel(details) {
  const n = (v) => (v === "" || v == null ? 0 : Number(v));
  return n(details?.koopprijs);
}

// De rentepercentage-afleiding hieronder en de amortisatie in loanAmortization.js moeten met
// dezelfde tijdrekening rekenen: échte kalenderdatums en een exacte dagtelling (dag/365), niet een
// geïdealiseerde maand-index. Anders past het afgeleide rentepercentage niet exact bij de manier
// waarop de amortisatie het toepast zodra een leasecontract in de praktijk niet perfect elke
// kalendermaand op precies dezelfde dag afschrijft (weekend/feestdag-verschuivingen, een net iets
// afwijkende eerste termijn). buildNominaleLeaseSchedule hieronder genereert daarvoor de volledige
// contractuele betaalreeks met echte datums (op dezelfde manier geankerd als
// generateProjectedLeasePayments — datumEersteTermijn indien ingevuld, anders startdatum + 1 maand,
// dan maandelijks door) — bewust een aparte, eenvoudigere functie die geen rekening houdt met een
// eventuele vroegtijdige beëindiging: de rentepercentage-afleiding gaat over de volledige
// CONTRACTUELE reeks, niet over wat er in de praktijk (mogelijk voortijdig) daadwerkelijk is betaald
// — dat blijft een apart vraagstuk (zie "Contract vroegtijdig beëindigd" elders).
// v207 — "Extra bedrag 1e termijn" is in de praktijk vrijwel altijd een eenmalige
// administratiekostenpost van de leasemaatschappij, geen onderdeel van de financiering zelf: het
// verhoogt niet wat er wordt geleend (computeOnbetaaldGedeelteKoop hierboven telt dit bedrag dan ook
// terecht niet mee), dus hoort het ook niet mee te tellen in de kasstroom waarmee het jaarlijkse
// rentepercentage wordt afgeleid — vóór deze fix werd dit bedrag wél bij de eerste termijn opgeteld,
// waardoor de rentepercentage-afleiding hieronder ten onrechte een hoger percentage berekende (méér
// terugbetaald voor dezelfde hoofdsom, dus "moet wel een hogere rente zijn" — terwijl het gewoon een
// losse kostenpost is).
function buildNominaleLeaseSchedule(details) {
  const looptijd = Number(details.looptijd);
  const maandbedrag = Number(details.maandbedrag);
  if (!(looptijd > 0) || !(maandbedrag > 0) || !details.startdatum) return [];
  const eindbetaling = details.eindbetaling === "" || details.eindbetaling == null ? 0 : Number(details.eindbetaling);
  const start = new Date(details.startdatum);
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
    let amount = maandbedrag;
    if (m === looptijd) amount += eindbetaling;
    payments.push({ date, amount });
  }
  return payments;
}

// Sectie 2 — de leasestructuur zelf. Lost de kasstromen (aanbetaling van de hoofdsom, dan de
// betalingen, elk op hun échte kalenderdatum) op naar het jaarlijkse rentepercentage waarvoor de
// netto contante waarde van alle betalingen — verdisconteerd op dag/365 sinds de startdatum —
// precies gelijk is aan het gefinancierde bedrag (dezelfde soort berekening als IRR/interne-
// rentevoet in een spreadsheet, XIRR-stijl op échte datums in plaats van gelijke periodes) — met
// bisectie, want hier is geen nette formule voor.
export function computeFinancialLeaseRate(details) {
  const principal = computeOnbetaaldGedeelteKoop(details);
  if (!(principal > 0)) return null;
  const payments = buildNominaleLeaseSchedule(details);
  if (payments.length === 0) return null;
  const start = new Date(details.startdatum);

  const npv = (annualRate) => {
    let total = -principal;
    for (const p of payments) {
      const dagen = (p.date - start) / (1000 * 60 * 60 * 24);
      total += p.amount / Math.pow(1 + annualRate, dagen / 365);
    }
    return total;
  };

  // Bisectie tussen 0% en 300%/jaar, ruim boven wat een reële lease ooit zou zijn. NPV daalt
  // monotoon met een stijgende rente (hogere rente = betalingen minder waard nu), dus een simpele
  // bisectie is hier voldoende en robuuster dan Newton-Raphson (geen afgeleide nodig, geen risico
  // op divergeren).
  let lo = 0;
  let hi = 3;
  if (npv(0) < 0) return null; // zelfs bij 0% rente wordt de hoofdsom niet terugbetaald door de ingevulde betalingen — invoer klopt niet
  if (npv(hi) > 0) return null; // ook bij 300%/jaar nog steeds niet passend — onrealistische invoer
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  const annualRate = (lo + hi) / 2;
  return annualRate * 100; // jaarlijks percentage, zoals de rest van de tool dat al gebruikt
}

// Genereert het volledige, theoretische betaalschema voor de hele looptijd — op basis van wat er
// is ingevuld (niet van de daadwerkelijke bankbetalingen), zodat je meteen het hele overzicht ziet
// en kunt controleren of de berekening klopt, ook voor termijnen die nog moeten komen. Bij een
// vroegtijdige beëindiging stopt het schema bij de einddatum in plaats van door te lopen tot het
// einde van de oorspronkelijke looptijd.
//
// v207 — het bedrag van de eerste termijn zelf ("amount") is nu altijd gewoon het kale maandbedrag,
// nooit meer plus "extra bedrag 1e termijn" (zie de toelichting bij buildNominaleLeaseSchedule
// hierboven: dat extra bedrag is een administratiekostenpost, geen onderdeel van de financiering/
// aflossing). Het bedrag zelf komt in de praktijk in de bankfile op een van twee manieren voor: als
// twee losse afschrijvingen (het kale maandbedrag, en los daarvan de administratiekosten), of als
// één gecombineerde afschrijving (maandbedrag + administratiekosten samen). matchLeasePaymentsToSchedule
// hieronder moet dus BEIDE mogelijkheden herkennen als "de eerste termijn is betaald" — vandaar het
// meegegeven `extraBedrag1eTermijn`-veld op deze eerste termijn, puur als matchtolerantie (telt niet
// mee in "amount" zelf, dus ook niet in de rente/aflossing-berekening die op dit schema voortbouwt).
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
    if (m === looptijd && !einddatumBeeindiging) amount += eindbetaling;
    const payment = { date, amount: -amount };
    if (m === 1 && extra > 0) payment.extraBedrag1eTermijn = extra;
    payments.push(payment);
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
      let bedragVerschil = Math.round((Math.abs(best.tx.amount) - Math.abs(r.projected.amount)) * 100) / 100;
      // v207 — de eerste termijn mag ook precies "extra bedrag 1e termijn" méér zijn dan het kale
      // maandbedrag: dat is dan de leasemaatschappij die het maandbedrag en de administratiekosten
      // in één keer heeft afgeschreven, in plaats van als twee losse regels. Zonder deze tolerantie
      // werd zo'n heel normale, correct betaalde eerste termijn ten onrechte als "bedrag wijkt af"
      // (of, vóór v207, zelfs als volledig "ontbrekend") aangemerkt.
      if (r.projected.extraBedrag1eTermijn && Math.abs(bedragVerschil - r.projected.extraBedrag1eTermijn) <= AMOUNT_MARGIN) {
        bedragVerschil = 0;
        r.gecombineerdMetExtra = true; // de gematchte transactie bevat ook de administratiekosten
      }
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

// v207 — is de eerste termijn daadwerkelijk in één bankafschrijving betaald sámen met "extra bedrag
// 1e termijn" (de administratiekosten, zie de toelichting bij buildNominaleLeaseSchedule/
// generateProjectedLeasePayments hierboven), dan bevat de bijbehorende banktransactie dat bedrag nu
// nog steeds — en zou computeLoanAmortization (loanAmortization.js) die transactie in zijn geheel
// als aflossing/rente van de lease verwerken, inclusief de administratiekosten. Dat drukt de
// aflossing dat jaar ten onrechte omhoog (en het openstaande saldo dus te snel omlaag), voor een
// bedrag dat helemaal geen onderdeel van de financiering is. Trekt daarom, vlak vóórdat de
// transacties de rente/aflossing-splitsing ingaan, het administratiekosten-deel eraf van precies de
// ene transactie waarin het (aantoonbaar, via dezelfde matching als hierboven) is meegenomen — de
// rest van het bedrag (het kale maandbedrag) blijft daarna normaal meetellen. Zonder een ingevulde
// "extra bedrag 1e termijn" (elk bestaand dossier) verandert er niets.
export function stripExtraBedrag1eTermijnUitTransacties(segment, segTx) {
  const extra = segment?.extraBedrag1eTermijn === "" || segment?.extraBedrag1eTermijn == null ? 0 : Number(segment.extraBedrag1eTermijn);
  if (!(extra > 0)) return segTx;
  const projected = generateProjectedLeasePayments(segment);
  const eersteTermijn = projected.find((p) => p.extraBedrag1eTermijn);
  if (!eersteTermijn) return segTx;
  const { results } = matchLeasePaymentsToSchedule([eersteTermijn], segTx, Number(segment.maandbedrag) || 0);
  const match = results[0];
  if (!match?.gecombineerdMetExtra || !match.matchedTx) return segTx;
  return segTx.map((tx) => (tx === match.matchedTx ? { ...tx, amount: tx.amount + extra } : tx));
}

// v206: sommige leasetermijnen worden soms van een andere bankrekening betaald die niet in dit
// dossier is geïmporteerd (bijv. een privérekening, of een rekening bij een andere bank) — zonder
// correctie zou de tool dan ten onrechte denken dat die termijnen nooit zijn betaald, met een te hoog
// berekend openstaande saldo (en dus rente/aflossing/restschuld-bij-beëindiging) tot gevolg.
// `segment.handmatigBetaaldTotEnMet` (optioneel, een datum) laat de gebruiker bevestigen dat ALLE
// termijnen tot en met die datum zijn betaald, ook als ze niet als banktransactie in dit dossier
// voorkomen. Vult hier alleen de daadwerkelijk ONTBREKENDE termijnen synthetisch aan (op basis van het
// contractuele schema, generateProjectedLeasePayments) — een termijn die al als echte banktransactie
// is gevonden telt niet dubbel. Zonder ingevulde datum (elk bestaand dossier) verandert er niets.
export function mergeHandmatigeTermijnen(segment, segTx) {
  if (!segment?.handmatigBetaaldTotEnMet) return segTx;
  const grens = new Date(segment.handmatigBetaaldTotEnMet);
  const projected = generateProjectedLeasePayments(segment).filter((p) => p.date <= grens);
  if (projected.length === 0) return segTx;
  const { results } = matchLeasePaymentsToSchedule(projected, segTx, Number(segment.maandbedrag) || 0);
  const synthetic = results
    .filter((r) => r.status === "ontbrekend" || r.status === "nog-niet-in-beeld")
    .map((r) => ({ date: r.projected.date, amount: r.projected.amount, synthetic: true }));
  if (synthetic.length === 0) return segTx;
  return [...segTx, ...synthetic].sort((a, b) => a.date - b.date);
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
