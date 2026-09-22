// "Huur (deels zakelijk)" — huur van een pand/ruimte (bijv. een schuur/loods) waarvan maar een
// deel zakelijk wordt gebruikt. Anders dan de gewone (100% zakelijke) "Huur" is hier maar een
// handmatig per jaar ingesteld percentage van het bedrag daadwerkelijk aftrekbaar van de winst, en
// hetzelfde percentage van de eventuele BTW aftrekbaar als voorbelasting — de rest is privé en
// mag de winst/voorbelasting niet raken. Zie categories.js voor de categorie zelf en de fiscale
// basisbehandeling ("kosten", exact als "Huur"): deze module berekent alleen de correctie die
// bovenop die basisbehandeling nodig is om het niet-zakelijke deel weer terug te draaien.
import { computeBtw } from "./btw.js";
import { GEDEELDE_HUUR_CATEGORIE } from "../classification/categories.js";

export { GEDEELDE_HUUR_CATEGORIE };

// Berekent de volledige uitsplitsing voor één jaar. Geeft `null` terug zodra er geen enkele
// transactie in deze categorie in dit jaar voorkomt — dat is de situatie voor vrijwel elk
// bestaand dossier (deze categorie is gloednieuw en wordt nooit automatisch toegekend), en
// betekent dus dat elke correctie die hierop voortbouwt eenvoudigweg wegvalt (0/geen wijziging).
//
// `huurZakelijkPercentageStatus` is een { jaar: percentage(0-100) }-map, net als
// zelfstandigenaftrekStatus/startersaftrekStatus — ontbreekt het jaar (of de hele map), dan is het
// percentage 100 (volledig aftrekbaar), zodat een dossier waar dit nog niet is ingesteld zich
// identiek gedraagt aan de gewone, 100% zakelijke "Huur".
export function computeGedeeldeHuurVoorJaar(classified, year, huurZakelijkPercentageStatus, categoryBtwRates, btwVerlegd) {
  let totaalHuurBruto = 0;
  let totaalBtwOpHuur = 0;
  let heeftTransacties = false;
  for (const tx of classified) {
    if (tx.isMirror || tx.year !== year) continue;
    if (tx.category !== GEDEELDE_HUUR_CATEGORIE) continue;
    heeftTransacties = true;
    totaalHuurBruto += Math.abs(tx.amount);
    totaalBtwOpHuur += Math.abs(computeBtw(tx, categoryBtwRates, btwVerlegd));
  }
  if (!heeftTransacties) return null;

  const percentage = huurZakelijkPercentageStatus?.[year] ?? 100;
  const totaalHuurNetto = totaalHuurBruto - totaalBtwOpHuur;
  const aftrekbaarBedrag = totaalHuurNetto * (percentage / 100);
  const nietAftrekbaarBedrag = totaalHuurNetto - aftrekbaarBedrag;
  const aftrekbareVoorbelasting = totaalBtwOpHuur * (percentage / 100);
  const nietAftrekbareVoorbelasting = totaalBtwOpHuur - aftrekbareVoorbelasting;

  return {
    totaalHuurBruto, totaalBtwOpHuur, totaalHuurNetto, percentage,
    aftrekbaarBedrag, nietAftrekbaarBedrag, aftrekbareVoorbelasting, nietAftrekbareVoorbelasting,
  };
}
