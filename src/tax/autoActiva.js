// Bijtelling/onttrekking + (bij "koop") afschrijving voor een auto op de zaak die GEEN financiële
// lease is — dus een gekochte auto (eigendom) of een operational-leaseauto (zie de wizard-vraag
// "Is die auto gekocht (eigendom), operational lease, of financial lease?", SetupWizardModal.jsx).
// Voor financial lease bestaat dit al in autoBijtelling.js (gekoppeld aan de banktransacties van
// dat leasecontract). Deze twee andere gevallen hebben geen leningschema om aan op te hangen —
// vandaar een los, eenvoudiger model met zijn eigen (optionele) invoer, zie AutoOpDeZaakDetailsModal.
//
// Volledig opt-in en 100% backwards compatible: dit hele bestand doet niets zolang
// `autoActivaDetails` niet is ingevuld (of `autoWizardStatus.soort` niet "koop"/"operational" is) —
// dus voor ieder bestaand dossier verandert er niets.
import { computeAfschrijvingPerJaar } from "./activa.js";
import { AUTOKOSTEN_CATEGORIEN, computeAutoPrivegebruikOnttrekking, MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN } from "./autoBijtelling.js";
import { computeBtw } from "./btw.js";

// Bij een operational-leaseauto is de maandelijkse lease-vergoeding zelf de grootste (en vaak
// enige) "autokosten"-post — die staat in de categorie "Lease (operationeel)" en telt normaal al
// gewoon (100%) mee in de winst via de normale categorie-gedreven berekening. Voor de
// onttrekkings-plafond-berekening hieronder ("nooit meer terugdraaien dan er werkelijk aan
// autokosten was") moet die post wél worden meegeteld, naast de 5 categorieën die autoBijtelling.js
// al gebruikt voor financiële lease (brandstof, parkeren, etc. — de leasetermijn zelf zit daar
// vanzelfsprekend niet in, want bij financiële lease is dat aflossing+rente, geen kostenpost).
const AUTOKOSTEN_CATEGORIEN_OPERATIONAL_LEASE = [...AUTOKOSTEN_CATEGORIEN, "Lease (operationeel)"];

// Zelfde berekening als sumAutokostenTransactiesVoorJaar in autoBijtelling.js, maar met een eigen
// (langere) categorielijst voor operational lease — vandaar hier opnieuw, in plaats van hergebruik
// met een hardcoded lijst.
function sumAutokosten(classified, year, categoryBtwRates, btwVerlegd, categorieen) {
  const nettoOf = (tx) => tx.amount - computeBtw(tx, categoryBtwRates || {}, btwVerlegd);
  return Math.abs(
    (classified || [])
      .filter((tx) => !tx.isMirror && tx.year === year && categorieen.includes(tx.category))
      .reduce((a, tx) => a + nettoOf(tx), 0)
  );
}

// Vertaalt de ingevulde "koop"-gegevens naar een activum compatibel met computeAfschrijvingPerJaar —
// zelfde minimale afschrijvingstermijn van 5 jaar als bij een financieel-geleasede auto (zie
// autoBijtelling.js). Geeft `null` als er niet genoeg is ingevuld.
function buildKoopActivum(details) {
  if (!details?.aanschafwaarde || !details?.aanschafdatum) return null;
  const ingevoerdTermijn = details.afschrijvingstermijnJaren ? Number(details.afschrijvingstermijnJaren) : 0;
  return {
    aanschafwaarde: details.aanschafwaarde,
    restwaarde: details.restwaarde ?? 0,
    afschrijvingstermijnJaren: Math.max(ingevoerdTermijn, MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN),
    aanschafdatum: details.aanschafdatum,
  };
}

// Hoofdfunctie, analoog aan computeLeaseAutoKostenVoorJaar (autoBijtelling.js) maar voor een
// gekochte of operational-leaseauto op de zaak. Geeft `null` als de wizard geen "koop"/"operational"
// heeft aangegeven, of als er nog niets is ingevuld in AutoOpDeZaakDetailsModal — dus zolang dat
// scherm niet gebruikt is, verandert er niets aan de bestaande berekening.
export function computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, year, classified, categoryBtwRates, btwVerlegd) {
  const soort = autoWizardStatus?.soort;
  if (soort !== "koop" && soort !== "operational") return null;
  const details = autoActivaDetails;
  if (!details) return null;

  const afschrijving = soort === "koop" ? (() => {
    const activum = buildKoopActivum(details);
    if (!activum) return 0;
    const r = computeAfschrijvingPerJaar(activum, year);
    return r ? r.afschrijving : 0;
  })() : 0;

  const categorieen = soort === "operational" ? AUTOKOSTEN_CATEGORIEN_OPERATIONAL_LEASE : AUTOKOSTEN_CATEGORIEN;
  const autokostenTransactieTotaal = sumAutokosten(classified, year, categoryBtwRates, btwVerlegd, categorieen);
  const totaleAutokosten = afschrijving + autokostenTransactieTotaal;

  const privegebruikMeerDan500km = !!details.privegebruikMeerDan500kmPerJaar?.[year];
  let onttrekking = 0;
  let normaleBijtelling = 0;
  if (privegebruikMeerDan500km && details.cataloguswaarde && details.bijtellingspercentage) {
    normaleBijtelling = (Number(details.bijtellingspercentage) / 100) * Number(details.cataloguswaarde);
    onttrekking = computeAutoPrivegebruikOnttrekking(totaleAutokosten, details.cataloguswaarde, details.bijtellingspercentage);
  }
  const nettoAftrekbareAutokosten = totaleAutokosten - onttrekking;

  // Zelfde vorm (contracten-array) als computeLeaseAutoKostenVoorJaar teruggeeft, zodat het
  // aangiftevoorstel (aangiftevoorstel.js) de twee kan samenvoegen tot één "Auto"-sectie voor de
  // weergave, ongeacht of de auto financieel geleased, gekocht, of operational geleased is.
  const contracten = [{
    leaseKey: "auto-op-de-zaak", leaseName: soort === "koop" ? "Auto (eigendom)" : "Auto (operational lease)", soort: "auto",
    afschrijving, leaseRente: 0, cataloguswaarde: details.cataloguswaarde || null, bijtellingspercentage: details.bijtellingspercentage || null,
    privegebruikMeerDan500km, normaleBijtelling, kenteken: null, aantalGekoppeldeSegmenten: 1,
  }];

  return {
    contracten,
    afschrijvingTotaal: afschrijving, leaseRenteTotaal: 0, autokostenTransactieTotaal, totaleAutokosten,
    normaleBijtellingTotaal: normaleBijtelling, onttrekking, nettoAftrekbareAutokosten,
    winstCorrectie: afschrijving - onttrekking,
  };
}

// Voegt het resultaat van computeLeaseAutoKostenVoorJaar (autoBijtelling.js, financiële lease) en
// computeAutoActivaKostenVoorJaar hierboven (koop/operational) samen tot één object van dezelfde
// vorm — zodat de rest van de tool (boxMapping.js, aangiftevoorstel.js, de weergave in App.jsx) maar
// met ÉÉN "leaseAutoKosten"-achtig object hoeft te rekenen, ongeacht of de gebruiker een financiële
// leaseauto heeft, een gekochte/operational-leaseauto, allebei (zou in de praktijk niet moeten
// voorkomen, maar wordt hier gewoon correct opgeteld), of geen van beide. Geeft `null` terug als
// geen van beide iets opleverde — exact hetzelfde gedrag als voorheen (alleen leaseAutoKosten, of
// niets) voor ieder dossier dat autoActivaDetails niet gebruikt.
export function combineAutoKosten(leaseAutoKosten, autoActivaKosten) {
  if (!leaseAutoKosten) return autoActivaKosten;
  if (!autoActivaKosten) return leaseAutoKosten;
  return {
    contracten: [...leaseAutoKosten.contracten, ...autoActivaKosten.contracten],
    afschrijvingTotaal: leaseAutoKosten.afschrijvingTotaal + autoActivaKosten.afschrijvingTotaal,
    leaseRenteTotaal: leaseAutoKosten.leaseRenteTotaal + autoActivaKosten.leaseRenteTotaal,
    autokostenTransactieTotaal: leaseAutoKosten.autokostenTransactieTotaal + autoActivaKosten.autokostenTransactieTotaal,
    totaleAutokosten: leaseAutoKosten.totaleAutokosten + autoActivaKosten.totaleAutokosten,
    normaleBijtellingTotaal: leaseAutoKosten.normaleBijtellingTotaal + autoActivaKosten.normaleBijtellingTotaal,
    onttrekking: leaseAutoKosten.onttrekking + autoActivaKosten.onttrekking,
    nettoAftrekbareAutokosten: leaseAutoKosten.nettoAftrekbareAutokosten + autoActivaKosten.nettoAftrekbareAutokosten,
    winstCorrectie: leaseAutoKosten.winstCorrectie + autoActivaKosten.winstCorrectie,
  };
}
