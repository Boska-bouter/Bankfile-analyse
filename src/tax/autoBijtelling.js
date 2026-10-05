// Financiële lease van een auto of machine, voor een zzp'er (eenmanszaak): de geleasede zaak IS een
// eigen bedrijfsmiddel dat gekapitaliseerd en afgeschreven moet worden (in tegenstelling tot een
// eerdere, onjuiste aanname in deze tool dat er bij financiële lease meestal geen eigen
// bedrijfsmiddel is om af te schrijven — zie de (gecorrigeerde) toelichting bij "Financiële baten
// en lasten" in boxMapping.js). Voor een geleasede AUTO komt daar ook nog bijtelling privégebruik
// bovenop, die bij een zzp'er anders werkt dan bij een werknemer: het is feitelijk een onttrekking,
// afgetopt op de werkelijke totale autokosten (zie computeAutoPrivegebruikOnttrekking).
//
// Volledig opt-in en 100% backwards compatible: alles hier draait om het (nieuwe, optionele)
// `soort`-veld op een leasecontract-segment ("auto" | "machine"). Een segment zonder `soort` — dus
// ieder bestaand dossier — telt nergens in mee; de bestaande berekening verandert dan totaal niet.
import { computeOnbetaaldGedeelteKoop, computeAanschafwaardeBedrijfsmiddel, computeFinancialLeaseRate, normalizeKenteken } from "./financialLease.js";
import { computeAfschrijvingPerJaar } from "./activa.js";
import { computeFinancialLeaseAmortizationMultiSegment, groupAmortizationByYear } from "./loanAmortization.js";
import { computeBtw } from "./btw.js";
import { effectiveZakelijkPercentage } from "./categorySplit.js";

// Fiscale ondergrens voor de afschrijvingstermijn van een bedrijfsmiddel: de Belastingdienst staat
// voor de normale fiscale afschrijving maximaal 20% van de aanschafwaarde per jaar toe, dus nooit
// een kortere termijn dan 5 jaar — dit geldt voor elk leaseobject met een "soort" ingevuld (auto,
// machine of overig bedrijfsmiddel), niet alleen voor een auto. De naam van de constante blijft
// "AUTO" (elders al gebruikt, o.a. tax/autoActiva.js) ook al is de toepassing breder.
export const MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN = 5;
// Bijtelling/onttrekking wordt bij een auto die niet het hele kalenderjaar beschikbaar is naar rato
// van de daadwerkelijke beschikbaarheidsdagen berekend. Dit voorkomt een volledige jaarbijtelling
// wanneer een auto pas later in het jaar op de zaak komt of tussentijds wordt beëindigd.
export function computeAutoBeschikbaarheidsfactor(startdatum, einddatum, year) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const start = startdatum ? new Date(startdatum) : yearStart;
  const end = einddatum ? new Date(einddatum) : yearEnd;
  const from = start > yearStart ? start : yearStart;
  const to = end < yearEnd ? end : yearEnd;
  if (to < from) return 0;
  const dagen = Math.floor((to - from) / 86400000) + 1;
  const jaarDagen = ((new Date(year + 1, 0, 1) - yearStart) / 86400000);
  return Math.max(0, Math.min(1, dagen / jaarDagen));
}


// Exact de 5 categorieën die de gebruiker heeft bevestigd voor "totale autokosten" — bewust NIET
// "Lease (operationeel)" of "Reiskosten (OV)", die zijn iets anders.
export const AUTOKOSTEN_CATEGORIEN = ["Autokosten", "Brandstof", "Parkeren", "Verzekering: Auto", "Belastingen: MRB"];

// Vertaalt een leasecontract-segment (zie financialLease.js/FinancialLeaseDetailsModal.jsx) naar
// een "activum" compatibel met computeAfschrijvingPerJaar uit activa.js — zodat we exact dezelfde,
// al geteste afschrijvingslogica (incl. tijdklem in het jaar van aanschaf) hergebruiken in plaats
// van een aparte berekening te bouwen. Geeft `null` als er niets te kapitaliseren valt (`soort` niet
// gezet — het overgrote deel van bestaande dossiers).
//
// Aanschafwaarde = de volledige aanschafwaarde van het bedrijfsmiddel (koopprijs + BTW,
// computeAanschafwaardeBedrijfsmiddel), NIET het gefinancierde bedrag (computeOnbetaaldGedeelteKoop):
// een aanbetaling, inruilwaarde of het aflossen van een lopende lening mag de afschrijving niet
// verlagen — wat het bedrijfsmiddel zelf heeft gekost verandert niet door de manier waarop het is
// gefinancierd — zie de toelichting bij computeAanschafwaardeBedrijfsmiddel in financialLease.js.
// Ook NIET de cataloguswaarde (die is alleen relevant voor de bijtelling hieronder). Restwaarde: bij
// een financiële lease is er, anders dan bij een los aangeschaft bedrijfsmiddel, meestal geen apart
// ingevulde restwaarde-verwachting — 0 is hier de behoudende, gebruikelijke aanname (zie ook hoe
// activa.js zelf restwaarde behandelt: leeg/ontbrekend = 0).
// v205: `einddatum` is optioneel — geeft mee dat het leasecontract vroegtijdig is beëindigd (verkoop/
// veiling van het bedrijfsmiddel) op die datum, zodat computeAfschrijvingPerJaar de afschrijving vanaf
// dat moment bevriest (zie de toelichting daar). `null`/weggelaten = ongewijzigd gedrag (afschrijving
// loopt gewoon door over de volledige termijn) — dit geldt voor ieder bestaand dossier én voor een
// simpele herfinanciering/vervolgcontract (waar geen daadwerkelijke verkoop plaatsvond).
export function buildLeaseActivumFromSegment(segment, einddatum = null) {
  if (!segment || !segment.soort) return null;
  const aanschafwaarde = computeAanschafwaardeBedrijfsmiddel(segment);
  const ingevoerdTermijn = segment.afschrijvingstermijnJaren ? Number(segment.afschrijvingstermijnJaren) : 0;
  // De fiscale 5-jaars-ondergrens (20%-afschrijvingscap) geldt voor ELK leaseobject met een "soort"
  // ingevuld, niet alleen voor een auto — anders zou een financieel-geleasede machine met een kortere
  // ingevulde termijn sneller afschrijven dan fiscaal is toegestaan.
  const afschrijvingstermijnJaren = Math.max(ingevoerdTermijn, MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN);
  return {
    aanschafwaarde,
    restwaarde: segment.restwaarde ?? 0,
    afschrijvingstermijnJaren,
    aanschafdatum: segment.startdatum,
    einddatum,
  };
}

// Berekende afschrijving van dit ene leasecontract-segment voor een specifiek jaar. 0 als `soort`
// niet is gezet, of als er nog niet genoeg is ingevuld om een termijn/aanschafdatum te bepalen (een
// "machine"-segment zonder ingevulde afschrijvingstermijn levert bijvoorbeeld bewust 0 op, in plaats
// van te gokken naar een termijn — net als een onvolledig ingevuld activum in activa.js). `einddatum`:
// zie buildLeaseActivumFromSegment hierboven.
export function computeLeaseAfschrijvingVoorJaar(segment, year, einddatum = null) {
  const activum = buildLeaseActivumFromSegment(segment, einddatum);
  if (!activum) return 0;
  const r = computeAfschrijvingPerJaar(activum, year);
  return r ? r.afschrijving : 0;
}

// De "onttrekking" (bijtelling-achtige correctie) voor een zzp'er met een geleasede auto: de
// normale bijtelling (percentage × cataloguswaarde) wordt afgetopt op de werkelijke totale
// autokosten van dat jaar — je kunt nooit meer terugdraaien dan er daadwerkelijk aan kosten was.
// 0 als een van de invoerwaarden ontbreekt/nul is (bijv. bijtellingspercentage nog niet ingevuld).
export function computeAutoPrivegebruikOnttrekking(totaleAutokosten, cataloguswaarde, bijtellingspercentage) {
  if (!(totaleAutokosten > 0) || !(cataloguswaarde > 0) || !(bijtellingspercentage > 0)) return 0;
  const normaleBijtelling = (Number(bijtellingspercentage) / 100) * Number(cataloguswaarde);
  return Math.min(normaleBijtelling, totaleAutokosten);
}

// Som van de 5 bevestigde autokosten-categorieën voor een specifiek jaar — dit bedrag stroomt via
// de normale categorie-gedreven kostenberekening (yearlySummary.js) al mee in de winst; hier wordt
// het alleen apart opgeteld om de "totale autokosten" (voor de onttrekkingsberekening en de
// weergave in het aangiftevoorstel) te kunnen tonen — NIET om het nogmaals van de winst af te
// trekken.
//
// NETTO (exclusief BTW), niet het bruto bankbedrag: afschrijving en lease-rente (waarmee dit wordt
// opgeteld tot "totale autokosten") zijn altijd al netto, en de rest van het rapport rekent ook
// overal netto. Bij categorieën met 0% BTW (het gebruikelijke geval voor bijv. Belastingen: MRB)
// maakt dit niets uit; bij een categorie mét BTW (bijv. Brandstof, Onderhoud) zou een bruto bedrag de
// aftopping op "totale autokosten" te hoog laten uitvallen.
export function sumAutokostenTransactiesVoorJaar(classified, year, categoryBtwRates, btwVerlegd, categoryZakelijkPercentage = null, autoStatus = null) {
  const nettoOf = (tx) => tx.amount - computeBtw(tx, categoryBtwRates || {}, btwVerlegd);
  const nettoTotaal = (classified || [])
    .filter((tx) => !tx.isMirror && tx.year === year && AUTOKOSTEN_CATEGORIEN.includes(tx.category))
    .reduce((a, tx) => {
      const percentage = (tx.category === "Brandstof" || tx.category === "Parkeren")
        ? effectiveZakelijkPercentage(tx.category, year, categoryZakelijkPercentage, autoStatus, true)
        : 100;
      return a + nettoOf(tx) * (percentage / 100);
    }, 0);
  return Math.max(0, -nettoTotaal);
}

// Lease-rente van precies één leasecontract (één item uit leaseSummary) voor één jaar — zelfde
// berekening als computeLeaseRenteForYear in loanAmortization.js, maar niet opgeteld over alle
// leases samen: nodig om de "totale autokosten" van specifiek de auto-lease(s) te kunnen isoleren
// (deze rente zat, en blijft zitten, in de bestaande renteAftrekbaar-optelling elders — hier wordt
// hij alleen ter informatie/weergave herhaald, niet nogmaals afgetrokken).
function computeLeaseRenteVoorJaarVoorEenLease(lease, details, year) {
  if (!details || details.onbekend) return 0;
  const amortization = computeFinancialLeaseAmortizationMultiSegment(lease.transactions, details, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
  if (!amortization) return 0;
  const jaarData = groupAmortizationByYear(amortization).find((j) => j.year === year);
  return jaarData ? jaarData.rente : 0;
}

// Groepeert de contractsegmenten van ÉÉN lease (dus alleen binnen `details.contracts` van dat ene
// leasecontract — NIET tussen verschillende leases) op genormaliseerd kenteken. Dit behandelt een
// tussentijds vervangen/geherfinancierd leasecontract van DEZELFDE auto correct (zie het "nieuw
// vervolgcontract"-mechanisme in financialLease.js/FinancialLeaseDetailsModal.jsx): zo'n 2e (of
// latere) segment heeft vaak hetzelfde kenteken als het vorige, en moet dan als DEZELFDE fiscale auto
// behandeld worden (één doorlopende afschrijving, één bijtelling/onttrekking per jaar), in plaats van
// als een tweede, apart bedrijfsmiddel.
//
// Een segment zonder (of met leeg) kenteken vormt altijd zijn eigen, aparte groep van precies 1 —
// dat geldt voor elk dossier zonder ingevuld kenteken, dus voor die dossiers is elke groep hieronder
// per definitie een singleton: dezelfde segmenten, in dezelfde volgorde, elk onafhankelijk
// doorgerekend. Groepen ontstaan alleen als er daadwerkelijk 2+ segmenten met hetzelfde
// (genormaliseerde) kenteken zijn.
function groupSegmentenOpKenteken(segments) {
  const groups = [];
  const byKenteken = new Map();
  for (const segment of segments) {
    if (!segment.soort) continue; // niet ingevuld — telt nergens in mee, zoals voorheen
    const norm = normalizeKenteken(segment.kenteken);
    if (!norm) {
      groups.push([segment]);
      continue;
    }
    let group = byKenteken.get(norm);
    if (!group) {
      group = [];
      byKenteken.set(norm, group);
      groups.push(group);
    }
    group.push(segment);
  }
  return groups;
}

// KIA-grondslag vanuit financiële lease (auto/machine met "soort" ingevuld) — zelfde
// kenteken-groepering als de afschrijving hierboven: bij een herfinanciering/vervolgcontract van
// dezelfde auto is alleen het EERSTE (oudste) segment van de groep de daadwerkelijke aanschaf, dus
// telt alleen dát segment (en alleen in het jaar van zijn eigen startdatum) mee als investering.
// KIA geldt fiscaal niet voor personenauto's — alleen een lease-auto expliciet aangemerkt als
// "bestelauto/bedrijfsbus" (voertuigtype, zie FinancialLeaseDetailsModal.jsx) telt hier mee; een
// personenauto, of een auto zonder ingevuld voertuigtype (elk bestaand dossier — dat is het
// gebruikelijke geval), telt bewust niet mee. Een machine kent dit onderscheid niet en telt gewoon
// mee. Een handmatig ingevulde `kiaStatus: "uitgesloten"` sluit een object hoe dan ook uit, ook een
// bestelauto/machine die anders zou meetellen.
export function computeLeaseInvesteringenForYear(leaseSummary, leaseDetails, year) {
  let totaalInvestering = 0;
  let onvolledig = 0;
  for (const lease of leaseSummary || []) {
    if (lease.category !== "Lease (financieel)") continue;
    const details = leaseDetails?.[lease.key];
    if (!details || details.onbekend) continue;
    const segments = Array.isArray(details.contracts) && details.contracts.length > 0 ? details.contracts : [details];
    for (const group of groupSegmentenOpKenteken(segments)) {
      const primary = group[0];
      if (primary.kiaStatus === "uitgesloten") continue;
      if (primary.soort === "auto" && primary.voertuigtype !== "bestelauto") continue; // personenauto (of onbekend) — geen KIA
      if (!primary.koopprijs || !primary.startdatum) { onvolledig++; continue; }
      if (new Date(primary.startdatum).getFullYear() === year) {
        totaalInvestering += computeAanschafwaardeBedrijfsmiddel(primary);
      }
    }
  }
  return { totaalInvestering, onvolledig };
}

// Volledige uitsplitsing, voor het aangiftevoorstel, van alle financiële-lease-contracten die als
// auto of machine zijn gekapitaliseerd (soort ingevuld), voor één specifiek jaar. Geeft `null`
// terug als er dat jaar helemaal geen enkel contract met `soort` ingevuld is — dus voor de
// overgrote meerderheid van dossiers (en voor ieder jaar vóór deze functie is aangeroepen met de
// nieuwe velden) verandert er niets.
//
// Let op de gekozen, bewuste vereenvoudiging bij MEERDERE gelijktijdig actieve auto-contracten in
// hetzelfde jaar (bijv. twee geleasede auto's): de 5 categorieën met autokosten-transacties zijn in
// deze tool niet per auto/contract herleidbaar (het zijn simpelweg alle transacties in die
// categorie, dossierbreed) — daarom wordt die pot hier ÉÉN keer meegeteld in het gecombineerde
// totaal (niet dubbel per contract), en wordt ook de onttrekking op het GECOMBINEERDE totaal
// afgetopt, in plaats van per auto apart. Bij één geleasede auto (het gebruikelijke geval) maakt dit
// geen verschil met een per-contract-berekening.
export function computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, year, classified, categoryBtwRates, btwVerlegd, categoryZakelijkPercentage = null, autoStatus = null) {
  const autokostenTransactieTotaal = sumAutokostenTransactiesVoorJaar(classified, year, categoryBtwRates, btwVerlegd, categoryZakelijkPercentage, autoStatus);
  const contracten = [];
  let afschrijvingTotaal = 0;
  let leaseRenteTotaal = 0;
  let normaleBijtellingTotaal = 0;
  let heeftAutoMetPrivegebruik = false;
  // v205: boekwinst/-verlies bij een daadwerkelijke, vroegtijdige verkoop/veiling van een
  // gekapitaliseerd leaseobject (zie hieronder) — opgeteld over alle contracten die in ÉÉN specifiek
  // jaar (dit jaar) zijn beëindigd. Voor ieder ander jaar (en voor elk bestaand dossier zonder
  // ingevulde beëindiging-met-opbrengst) blijft dit gewoon 0.
  let boekresultaatBeeindigingTotaal = 0;

  for (const lease of leaseSummary || []) {
    if (lease.category !== "Lease (financieel)") continue;
    const details = leaseDetails?.[lease.key];
    if (!details || details.onbekend) continue;
    const segments = Array.isArray(details.contracts) && details.contracts.length > 0 ? details.contracts : [details];

    for (const group of groupSegmentenOpKenteken(segments)) {
      // De EERSTE (oudste) segment van de groep — bij een singleton-groep (geen/leeg kenteken, dus
      // ieder bestaand dossier) is dit gewoon het segment zelf en verandert er niets. Bij een echte
      // kenteken-groep (2+ segmenten, dezelfde auto) is dit het segment van de OORSPRONKELIJKE
      // aanschaf/financiering.
      const primary = group[0];
      const isGroep = group.length > 1;
      const laatsteInGroep = group[group.length - 1];

      // v205: vroegtijdige beëindiging (verkoop/veiling) van DEZE (kenteken-)groep — alleen als op
      // het LAATSTE segment van de groep zowel "contract vroegtijdig beëindigd" is aangevinkt ALS een
      // verkoop-/veilingopbrengst is ingevuld. Zonder ingevulde opbrengst is dit gewoon een
      // herfinanciering/vervolgcontract (zie de toelichting in FinancialLeaseDetailsModal.jsx) — dan
      // verandert er niets aan de doorlopende afschrijving hieronder.
      const isBeeindigdMetOpbrengst = !!laatsteInGroep.contractBeeindigd && laatsteInGroep.verkoopsom != null && !!laatsteInGroep.einddatumContract;
      const terminationEinddatum = isBeeindigdMetOpbrengst ? laatsteInGroep.einddatumContract : null;
      const terminationYear = isBeeindigdMetOpbrengst ? new Date(laatsteInGroep.einddatumContract).getFullYear() : null;

      // --- Afschrijving: ÉÉN doorlopende tijdlijn per (kenteken-)groep, geankerd op het EERSTE
      // segment. Bewuste, door de gebruiker (accountant) te controleren vereenvoudiging: een 2e/
      // latere segment binnen dezelfde kentekengroep wordt fiscaal gezien als een HERFINANCIERING
      // van dezelfde auto (bijv. het openstaande bedrag wordt overgesloten in een nieuw
      // leasecontract), niet als een nieuwe aanschaf — het eigen `koopprijs`/aanschafwaarde-bedrag
      // van zo'n later segment telt daarom NIET nogmaals mee in de afschrijvingsbasis (dat zou de
      // afschrijving dubbel/te hoog maken). Alleen de RENTE van elk segment blijft apart doorlopen
      // (zie hieronder) — dat is onafhankelijk van welk bedrag als afschrijvingsbasis geldt. Wijkt
      // de werkelijkheid af (bijv. is er bij de herfinanciering daadwerkelijk extra geïnvesteerd in
      // de auto, niet alleen het openstaande saldo overgesloten), dan is dit een bewuste,
      // documenteerde aanname die per geval gecontroleerd moet worden — geen automatisch afgeleid
      // fiscaal feit.
      const afschrijving = computeLeaseAfschrijvingVoorJaar(primary, year, terminationEinddatum);
      afschrijvingTotaal += afschrijving;

      // v205: boekwinst/-verlies — alleen berekend in het jaar van beëindiging zelf (een eenmalige
      // gebeurtenis, geen jaarlijks terugkerend bedrag). boekwaardeBijBeeindiging komt uit dezelfde,
      // nu bevroren afschrijvingsberekening als hierboven; restschuldOfOverwaarde vergelijkt de
      // opbrengst met de daadwerkelijk op basis van de bankbetalingen berekende openstaande
      // lease-hoofdsom — bewust een ANDER bedrag dan de boekwaarde (zie de toelichting in de Bijlage).
      // Beide zijn `null` als er nog te weinig is ingevuld om ze te kunnen bepalen (bijv. geen "Soort"
      // ingevuld voor de boekwaarde, of een lease die te onvolledig is voor een amortisatieschema).
      let beeindigingsresultaat = null;
      if (isBeeindigdMetOpbrengst && terminationYear === year) {
        const opbrengst = Number(laatsteInGroep.verkoopsom);
        const activumBijBeeindiging = buildLeaseActivumFromSegment(primary, terminationEinddatum);
        const r = activumBijBeeindiging ? computeAfschrijvingPerJaar(activumBijBeeindiging, terminationYear) : null;
        const boekwaardeBijBeeindiging = r ? r.boekwaardeEindJaar : null;
        const boekresultaat = r ? opbrengst - boekwaardeBijBeeindiging : null;
        // v208 — "openstaande hoofdsom" is bewust NIET (meer) de kale bank-amortisatie van de
        // geleende hoofdsom (dat blijft de basis voor de jaarlijkse fiscale renteaftrek, zie
        // leaseRente hieronder), maar de manier waarop een leasemaatschappij zelf een
        // afkoopsom/eindafrekening bij vroegtijdige beëindiging bepaalt: de totale, bij het afsluiten
        // afgesproken leasesom (koopprijs + lease vergoeding, over de HELE groep — bij een
        // herfinanciering telt elk segment zijn eigen leasesom mee) minus wat er tot de beëindiging
        // daadwerkelijk is betaald (dezelfde, al geteste betalingen/matching als de renteberekening
        // hieronder, dus inclusief de v207-correctie voor "extra bedrag 1e termijn"). Dat ligt hoger
        // dan de kale hoofdsom, omdat het ook de rente omvat die de leasemaatschappij bij het
        // uitdienen van het volledige contract nog zou hebben ontvangen.
        const leaseVergoedingNum = (s) => (s.leaseVergoeding === "" || s.leaseVergoeding == null ? 0 : Number(s.leaseVergoeding));
        const totaleLeaseInvesteringGroep = group.reduce((a, s) => a + computeOnbetaaldGedeelteKoop(s) + leaseVergoedingNum(s), 0);
        const amortizationBijBeeindiging = computeFinancialLeaseAmortizationMultiSegment(lease.transactions, details, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
        const terminationDate = new Date(terminationEinddatum);
        const totaalBetaald = (amortizationBijBeeindiging?.rows || [])
          .filter((row) => row.tx.date <= terminationDate)
          .reduce((a, row) => a + Math.abs(row.tx.amount), 0);
        const openstaandeHoofdsom = amortizationBijBeeindiging ? totaleLeaseInvesteringGroep - totaalBetaald : null;
        beeindigingsresultaat = {
          opbrengst,
          boekwaardeBijBeeindiging,
          boekresultaat,
          openstaandeHoofdsom,
          restschuldOfOverwaarde: openstaandeHoofdsom != null ? openstaandeHoofdsom - opbrengst : null,
        };
        if (boekresultaat != null) boekresultaatBeeindigingTotaal += boekresultaat;
      }

      let leaseRente = 0;
      let privegebruikMeerDan500km = false;
      let cataloguswaarde = null;
      let bijtellingspercentage = null;
      let normaleBijtelling = 0;

      if (primary.soort === "auto") {
        // Lease-rente: computeLeaseRenteVoorJaarVoorEenLease geeft altijd het GECOMBINEERDE
        // rentetotaal van de HELE lease (alle segmenten samen, elk over zijn eigen periode/bedrag —
        // zie computeFinancialLeaseAmortizationMultiSegment) voor dit jaar terug, nooit een bedrag
        // per los segment. Bij een singleton-groep is dat exact hetzelfde als voorheen (per
        // "auto"-segment één keer opgeteld). Bij een echte meerdere-segmenten-kenteken-groep mag dit
        // totaal daarom maar ÉÉN keer voor de hele groep worden opgeteld, niet nogmaals per segment
        // in de groep (dat zou de rente van de lease als geheel N keer meetellen).
        leaseRente = computeLeaseRenteVoorJaarVoorEenLease(lease, details, year);
        leaseRenteTotaal += leaseRente;

        // Privégebruik >500km: als DEZELFDE auto ooit (in een van de gekoppelde segmenten) voor dit
        // jaar is aangevinkt, geldt dat voor de hele groep — het is per definitie hetzelfde
        // voertuig, ongeacht onder welk segment het vinkje precies staat.
        privegebruikMeerDan500km = group.some((s) => !!s.privegebruikMeerDan500kmPerJaar?.[year]);

        // Cataloguswaarde/bijtellingspercentage: bij een kenteken-groep horen deze — het is immers
        // dezelfde auto — in de praktijk aan elkaar gelijk te zijn (de UI vult ze bij een 2e/latere
        // gekoppelde segment automatisch over, zie FinancialLeaseDetailsModal.jsx). Vult de
        // gebruiker toch bewust een afwijkende waarde in bij een later segment (met een
        // waarschuwing in de UI), dan geldt hier — als expliciete, gedocumenteerde keuze — de
        // waarde van het EERSTE (oudste) segment als leidend voor de berekening, dezelfde logica als
        // bij de afschrijvingsbasis hierboven.
        cataloguswaarde = primary.cataloguswaarde || null;
        bijtellingspercentage = primary.bijtellingspercentage || null;
        if (privegebruikMeerDan500km && cataloguswaarde && bijtellingspercentage) {
          heeftAutoMetPrivegebruik = true;
          const beschikbaarheidsfactor = computeAutoBeschikbaarheidsfactor(primary.startdatum, terminationEinddatum, year);
          normaleBijtelling = (Number(bijtellingspercentage) / 100) * Number(cataloguswaarde) * beschikbaarheidsfactor;
          normaleBijtellingTotaal += normaleBijtelling;
        }
      }

      contracten.push({
        leaseKey: lease.key, leaseName: lease.name, soort: primary.soort,
        afschrijving, leaseRente, cataloguswaarde, bijtellingspercentage, privegebruikMeerDan500km, normaleBijtelling,
        // Alleen relevant voor weergave/toelichting in het aangiftevoorstel: is dit een gecombineerde
        // rij van meerdere aan elkaar gekoppelde contractsegmenten (zelfde kenteken)?
        kenteken: isGroep ? (primary.kenteken || null) : null,
        aantalGekoppeldeSegmenten: group.length,
        // v205: alleen gezet in het jaar van een daadwerkelijke, vroegtijdige verkoop/veiling — zie
        // hierboven.
        beeindigingsresultaat,
      });
    }
  }

  if (contracten.length === 0) return null;

  // "Totale autokosten" (het plafond waarop de bijtelling wordt afgetopt) = afschrijving + de 5
  // gecategoriseerde kostenposten. De rente van een financiële lease hoort hier NIET bij — dat is een
  // aparte financieringskost (bij "Financiële baten en lasten"), geen autokostenpost, en blijft altijd
  // volledig en ongewijzigd aftrekbaar, ongeacht de bijtelling (zie winstCorrectie hieronder, die de
  // rente ook nooit aanraakt). leaseRenteTotaal mag daarom niet meetellen in het plafond zelf — de
  // rente wordt zelf nooit teruggedraaid, dus meetellen in het plafond zou de ruimte voor de
  // onttrekking verruimen zonder dat daar iets tegenover staat. Alleen afschrijving + de
  // gecategoriseerde autokosten tellen mee voor het plafond; leaseRenteTotaal blijft wel apart
  // beschikbaar (voor weergave) via het veld hieronder.
  const totaleAutokosten = afschrijvingTotaal + autokostenTransactieTotaal;
  const onttrekking = heeftAutoMetPrivegebruik ? Math.min(normaleBijtellingTotaal, totaleAutokosten) : 0;
  const nettoAftrekbareAutokosten = totaleAutokosten - onttrekking;

  return {
    contracten,
    afschrijvingTotaal, leaseRenteTotaal, autokostenTransactieTotaal, totaleAutokosten,
    normaleBijtellingTotaal, onttrekking, nettoAftrekbareAutokosten,
    // v205: boekwinst (positief) of boekverlies (negatief) op een dit jaar verkocht/geveild
    // leaseobject — zie de toelichting bij boekresultaat hierboven. 0 als er dit jaar geen enkele
    // daadwerkelijke beëindiging-met-opbrengst was (elk bestaand dossier).
    boekresultaatBeeindigingTotaal,
    // Het bedrag waarmee de winst per saldo extra gecorrigeerd moet worden, BOVENOP wat er al aan
    // rente/gecategoriseerde kosten wordt afgetrokken: de nieuwe afschrijving is een kostenpost die
    // er nog niet was (verlaagt de winst), de onttrekking draait een deel daarvan (en eventueel ook
    // een deel van de al aftrekbare rente/gecategoriseerde kosten) weer terug (verhoogt de winst), en
    // een boekwinst/-verlies bij verkoop verhoogt resp. verlaagt de winst nog een keer extra (vandaar
    // het aftrekken hieronder: winst = ... - winstCorrectie, dus een boekWINST moet winstCorrectie
    // verlágen om de winst te verhogen). Kan dus negatief zijn (bijv. bij een forse onttrekking of een
    // boekwinst) — dat betekent dat de winst per saldo hóger uitkomt dan zonder deze correctie, niet
    // lager. Bedoeld om bij de bestaande renteAftrekbaar-parameter van computeYearlySummary opgeteld
    // te worden (zie yearlySummary.js).
    winstCorrectie: afschrijvingTotaal - onttrekking - boekresultaatBeeindigingTotaal,
  };
}
