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
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate } from "./financialLease.js";
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
    for (const segment of segments) {
      if (!segment.soort) continue; // niet ingevuld voor dit contract — geen kapitalisatie, oud gedrag blijft gelden
      const afschrijving = computeLeaseAfschrijvingVoorJaar(segment, year);
      let leaseRente = 0;
      let privegebruikMeerDan500km = false;
      let cataloguswaarde = null;
      let bijtellingspercentage = null;
      let normaleBijtelling = 0;
      if (segment.soort === "auto") {
        leaseRente = computeLeaseRenteVoorJaarVoorEenLease(lease, details, year);
        leaseRenteTotaal += leaseRente;
        privegebruikMeerDan500km = !!segment.privegebruikMeerDan500kmPerJaar?.[year];
        cataloguswaarde = segment.cataloguswaarde || null;
        bijtellingspercentage = segment.bijtellingspercentage || null;
        if (privegebruikMeerDan500km && cataloguswaarde && bijtellingspercentage) {
          heeftAutoMetPrivegebruik = true;
          normaleBijtelling = (Number(bijtellingspercentage) / 100) * Number(cataloguswaarde);
          normaleBijtellingTotaal += normaleBijtelling;
        }
      }
      afschrijvingTotaal += afschrijving;
      contracten.push({
        leaseKey: lease.key, leaseName: lease.name, soort: segment.soort,
        afschrijving, leaseRente, cataloguswaarde, bijtellingspercentage, privegebruikMeerDan500km, normaleBijtelling,
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
