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
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, normalizeKenteken } from "./financialLease.js";
import { computeAfschrijvingPerJaar } from "./activa.js";
import { computeFinancialLeaseAmortizationMultiSegment, groupAmortizationByYear } from "./loanAmortization.js";

// Fiscale ondergrens voor de afschrijvingstermijn van een auto (ook bij financiële lease) — een
// kortere termijn dan dit mag niet, ook al zou de leaselooptijd zelf korter zijn.
export const MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN = 5;

// Exact de 5 categorieën die de gebruiker heeft bevestigd voor "totale autokosten" — bewust NIET
// "Lease (operationeel)" of "Reiskosten (OV)", die zijn iets anders.
export const AUTOKOSTEN_CATEGORIEN = ["Autokosten", "Brandstof", "Parkeren", "Verzekering: Auto", "Belastingen: MRB"];

// Vertaalt een leasecontract-segment (zie financialLease.js/FinancialLeaseDetailsModal.jsx) naar
// een "activum" compatibel met computeAfschrijvingPerJaar uit activa.js — zodat we exact dezelfde,
// al geteste afschrijvingslogica (incl. tijdklem in het jaar van aanschaf) hergebruiken in plaats
// van een aparte berekening te bouwen. Geeft `null` als er niets te kapitaliseren valt (`soort` niet
// gezet — het overgrote deel van bestaande dossiers).
//
// Aanschafwaarde = het gefinancierde bedrag bij aanvang van dít contract (computeOnbetaaldGedeelteKoop),
// NIET de cataloguswaarde (die is alleen relevant voor de bijtelling hieronder). Restwaarde: bij een
// financiële lease is er, anders dan bij een los aangeschaft bedrijfsmiddel, meestal geen apart
// ingevulde restwaarde-verwachting — 0 is hier de behoudende, gebruikelijke aanname (zie ook hoe
// activa.js zelf restwaarde behandelt: leeg/ontbrekend = 0).
export function buildLeaseActivumFromSegment(segment) {
  if (!segment || !segment.soort) return null;
  const aanschafwaarde = computeOnbetaaldGedeelteKoop(segment);
  const ingevoerdTermijn = segment.afschrijvingstermijnJaren ? Number(segment.afschrijvingstermijnJaren) : 0;
  const afschrijvingstermijnJaren =
    segment.soort === "auto" ? Math.max(ingevoerdTermijn, MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN) : ingevoerdTermijn;
  return {
    aanschafwaarde,
    restwaarde: segment.restwaarde ?? 0,
    afschrijvingstermijnJaren,
    aanschafdatum: segment.startdatum,
  };
}

// Berekende afschrijving van dit ene leasecontract-segment voor een specifiek jaar. 0 als `soort`
// niet is gezet, of als er nog niet genoeg is ingevuld om een termijn/aanschafdatum te bepalen (een
// "machine"-segment zonder ingevulde afschrijvingstermijn levert bijvoorbeeld bewust 0 op, in plaats
// van te gokken naar een termijn — net als een onvolledig ingevuld activum in activa.js).
export function computeLeaseAfschrijvingVoorJaar(segment, year) {
  const activum = buildLeaseActivumFromSegment(segment);
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
export function sumAutokostenTransactiesVoorJaar(classified, year) {
  return Math.abs(
    (classified || [])
      .filter((tx) => !tx.isMirror && tx.year === year && AUTOKOSTEN_CATEGORIEN.includes(tx.category))
      .reduce((a, tx) => a + tx.amount, 0)
  );
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
// leasecontract — NIET tussen verschillende leases) op genormaliseerd kenteken. Dit is de kern van
// de v150-fix voor een tussentijds vervangen/geherfinancierd leasecontract van DEZELFDE auto (zie
// het "nieuw vervolgcontract"-mechanisme in financialLease.js/FinancialLeaseDetailsModal.jsx): zo'n
// 2e (of latere) segment heeft vaak hetzelfde kenteken als het vorige, en moet dan als DEZELFDE
// fiscale auto behandeld worden (één doorlopende afschrijving, één bijtelling/onttrekking per jaar),
// in plaats van als een tweede, apart bedrijfsmiddel.
//
// Een segment zonder (of met leeg) kenteken vormt altijd zijn eigen, aparte groep van precies 1 —
// dat geldt voor IEDER bestaand dossier (het kenteken-veld is nieuw in v150 en staat nergens al
// ingevuld), dus voor die dossiers is elke groep hieronder per definitie een singleton en verandert
// er ten opzichte van v148/v149 helemaal niets: dezelfde segmenten, in dezelfde volgorde, elk
// onafhankelijk doorgerekend zoals voorheen. Groepen ontstaan alleen als er daadwerkelijk 2+
// segmenten met hetzelfde (genormaliseerde) kenteken zijn.
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
export function computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, year, classified) {
  const autokostenTransactieTotaal = sumAutokostenTransactiesVoorJaar(classified, year);
  const contracten = [];
  let afschrijvingTotaal = 0;
  let leaseRenteTotaal = 0;
  let normaleBijtellingTotaal = 0;
  let heeftAutoMetPrivegebruik = false;

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
      const afschrijving = computeLeaseAfschrijvingVoorJaar(primary, year);
      afschrijvingTotaal += afschrijving;

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
          normaleBijtelling = (Number(bijtellingspercentage) / 100) * Number(cataloguswaarde);
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
      });
    }
  }

  if (contracten.length === 0) return null;

  // "Totale autokosten" = afschrijving + lease-rente + de 5 gecategoriseerde kostenposten — precies
  // zoals bevestigd. De lease-rente en de gecategoriseerde kosten stromen AL mee in de winst via de
  // bestaande mechanismes (renteAftrekbaar resp. de normale categorie-gedreven kostenberekening) —
  // dit totaal is puur voor de onttrekkingsberekening en de transparante weergave hieronder.
  const totaleAutokosten = afschrijvingTotaal + leaseRenteTotaal + autokostenTransactieTotaal;
  const onttrekking = heeftAutoMetPrivegebruik ? Math.min(normaleBijtellingTotaal, totaleAutokosten) : 0;
  const nettoAftrekbareAutokosten = totaleAutokosten - onttrekking;

  return {
    contracten,
    afschrijvingTotaal, leaseRenteTotaal, autokostenTransactieTotaal, totaleAutokosten,
    normaleBijtellingTotaal, onttrekking, nettoAftrekbareAutokosten,
    // Het bedrag waarmee de winst per saldo extra gecorrigeerd moet worden, BOVENOP wat er al aan
    // rente/gecategoriseerde kosten wordt afgetrokken: de nieuwe afschrijving is een kostenpost die
    // er nog niet was (verlaagt de winst), de onttrekking draait een deel daarvan (en eventueel ook
    // een deel van de al aftrekbare rente/gecategoriseerde kosten) weer terug (verhoogt de winst).
    // Kan dus negatief zijn (bijv. bij een forse onttrekking) — dat betekent dat de winst per saldo
    // hóger uitkomt dan zonder deze correctie, niet lager. Bedoeld om bij de bestaande
    // renteAftrekbaar-parameter van computeYearlySummary opgeteld te worden (zie yearlySummary.js).
    winstCorrectie: afschrijvingTotaal - onttrekking,
  };
}
