// "Huur (deels zakelijk)" — huur van een pand/ruimte (bijv. een schuur/loods) waarvan maar een
// deel zakelijk wordt gebruikt. Anders dan de gewone (100% zakelijke) "Huur" is hier maar een
// handmatig per jaar ingesteld percentage van het bedrag daadwerkelijk aftrekbaar van de winst, en
// hetzelfde percentage van de eventuele BTW aftrekbaar als voorbelasting — de rest is privé en
// mag de winst/voorbelasting niet raken. Zie categories.js voor de categorie zelf en de fiscale
// basisbehandeling ("kosten", exact als "Huur"): deze module berekent alleen de correctie die
// bovenop die basisbehandeling nodig is om het niet-zakelijke deel weer terug te draaien.
//
// v291 — zelfde constructie, nu ook voor "Energie-water (deels zakelijk)" en "Gemeentelijke kosten
// (deels zakelijk)": een aansluiting/pand kan net als huur structureel deels zakelijk/deels privé
// gebruikt worden (bijv. dezelfde loods), en dan is ook daar één blended percentage over de hele
// (gewone) categorie fiscaal onjuist — vandaar drie losse, elk apart aan te vinken categorieën in
// plaats van één gedeeld percentage. computeGedeeldeHuisvestingVoorJaar hieronder is de generieke
// berekening; de drie category-specifieke functies zijn dunne wrappers eromheen, zodat de rest van
// de app (App.jsx/btw.js/yearlySummary.js/aangiftevoorstel.js) gewoon per categorie zijn eigen
// percentage-status-map en resultaat blijft doorgeven, net als voorheen bij Huur alleen.
import { computeBtw } from "./btw.js";
import { GEDEELDE_HUUR_CATEGORIE, GEDEELDE_ENERGIE_CATEGORIE, GEDEELDE_GEMEENTELIJKE_KOSTEN_CATEGORIE, GEDEELDE_HUISVESTING_CATEGORIEEN } from "../classification/categories.js";

export { GEDEELDE_HUUR_CATEGORIE, GEDEELDE_ENERGIE_CATEGORIE, GEDEELDE_GEMEENTELIJKE_KOSTEN_CATEGORIE, GEDEELDE_HUISVESTING_CATEGORIEEN };

// Berekent de volledige uitsplitsing voor één jaar, voor één van de drie "(deels zakelijk)"-
// categorieën hierboven. Geeft `null` terug zodra er geen enkele transactie in deze categorie in dit
// jaar voorkomt — dat is de situatie voor vrijwel elk bestaand dossier (deze categorieën worden nooit
// automatisch toegekend), en betekent dus dat elke correctie die hierop voortbouwt eenvoudigweg
// wegvalt (0/geen wijziging).
//
// `percentageStatus` is een { jaar: percentage(0-100) }-map, net als zelfstandigenaftrekStatus/
// startersaftrekStatus — ontbreekt het jaar (of de hele map), dan is het percentage 100 (volledig
// aftrekbaar), zodat een dossier waar dit nog niet is ingesteld zich identiek gedraagt aan de
// gewone, 100% zakelijke basiscategorie.
export function computeGedeeldeHuisvestingVoorJaar(classified, year, category, percentageStatus, categoryBtwRates, btwVerlegd) {
  let totaalBruto = 0;
  let totaalBtw = 0;
  let heeftTransacties = false;
  for (const tx of classified) {
    if (tx.isMirror || tx.year !== year) continue;
    if (tx.category !== category) continue;
    heeftTransacties = true;
    totaalBruto += Math.abs(tx.amount);
    totaalBtw += Math.abs(computeBtw(tx, categoryBtwRates, btwVerlegd));
  }
  if (!heeftTransacties) return null;

  const percentage = percentageStatus?.[year] ?? 100;
  const totaalNetto = totaalBruto - totaalBtw;
  const aftrekbaarBedrag = totaalNetto * (percentage / 100);
  const nietAftrekbaarBedrag = totaalNetto - aftrekbaarBedrag;
  const aftrekbareVoorbelasting = totaalBtw * (percentage / 100);
  const nietAftrekbareVoorbelasting = totaalBtw - aftrekbareVoorbelasting;

  return {
    // Backwards-compatibele veldnamen (totaalHuurBruto e.d.) blijven bestaan voor de "Huur"-wrapper
    // hieronder, zodat bestaande call sites (aangiftevoorstel.js) ongewijzigd kunnen blijven werken.
    totaalHuurBruto: totaalBruto, totaalBtwOpHuur: totaalBtw, totaalHuurNetto: totaalNetto,
    totaalBruto, totaalBtw, totaalNetto,
    percentage, aftrekbaarBedrag, nietAftrekbaarBedrag, aftrekbareVoorbelasting, nietAftrekbareVoorbelasting,
  };
}

export function computeGedeeldeHuurVoorJaar(classified, year, huurZakelijkPercentageStatus, categoryBtwRates, btwVerlegd) {
  return computeGedeeldeHuisvestingVoorJaar(classified, year, GEDEELDE_HUUR_CATEGORIE, huurZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
}

export function computeGedeeldeEnergieVoorJaar(classified, year, energieZakelijkPercentageStatus, categoryBtwRates, btwVerlegd) {
  return computeGedeeldeHuisvestingVoorJaar(classified, year, GEDEELDE_ENERGIE_CATEGORIE, energieZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
}

export function computeGedeeldeGemeentelijkeKostenVoorJaar(classified, year, gemeentelijkeKostenZakelijkPercentageStatus, categoryBtwRates, btwVerlegd) {
  return computeGedeeldeHuisvestingVoorJaar(classified, year, GEDEELDE_GEMEENTELIJKE_KOSTEN_CATEGORIE, gemeentelijkeKostenZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
}
