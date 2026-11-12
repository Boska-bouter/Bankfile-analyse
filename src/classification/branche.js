// beide-V17R7 — soort bedrijf (wens Boska 6-11, dossier Dakhlaoui: restaurant). Wordt in de wizard gevraagd bij de bedrijfsnaam en
// bewaard als eigenNamen.branche. De herkenning gebruikt het via getBranche() (net als getCategorieProfiel: gezet tijdens het renderen).
export const BRANCHES = [
  { key: "horeca", label: "Horeca, catering of eten" },
  { key: "bouw", label: "Bouw, klussen of installatie" },
  { key: "winkel", label: "Winkel of webshop" },
  { key: "vervoer", label: "Vervoer, taxi of koerier" },
  { key: "kantoor", label: "Kantoor, advies of ICT" },
  { key: "zorg", label: "Zorg, welzijn of beauty" },
  { key: "anders", label: "Anders" },
];
export const brancheLabel = (key) => BRANCHES.find((b) => b.key === key)?.label || "";

// huishoudboekje-V6R5 — wizardvraag "Betaal je ook zakelijke rekeningen vanaf je privérekening?" (besluit Boska 6-11, dossier Koenders).
// Bewaard als eigenNamen.zakelijkVanPrive; bij ja wordt een onbekende betaling met factuurnummer of aan een bedrijf vanaf privé een voorstel
// Zakelijke inkoop (nakijken). Bij R. Meijer zijn zulke betalingen juist privé (energie, zorg), dus niet standaard.
let _zakelijkVanPrive = false;
export function setZakelijkVanPrive(j) { _zakelijkVanPrive = j === true; }
export function getZakelijkVanPrive() { return _zakelijkVanPrive; }

let _branche = null;
export function setBranche(b) { _branche = b || null; }
export function getBranche() { return _branche; }

// Horeca: groothandels altijd zakelijke inkoop; speciaalzaken voor eten (slager, toko, markt, groenteboer …) vanaf € 150 per keer.
// Gewone supermarkten (Jumbo, AH, Plus, Coop, Dirk, Lidl, Aldi …) niet: die blijven zoals de app ze herkent (besluit Boska 6-11).
export const HORECA_GROOTHANDEL = /\b(makro|metro cash|metro nederland|metro \w+ nld|hanos|sligro|bidfood|bidvest|deli ?xl|van hoeckel|horeca ?groothandel|groothandel|cash ?(&|en|and) ?carry)\b/i;
export const HORECA_SUPERMARKT = /\b(jumbo|albert heijn|ah to go|plus|coop|co-op|dirk|netto|lidl|aldi|spar|vomar|hoogvliet|deen|poiesz|dekamarkt|boni|nettorama|picnic|ekoplaza|marqt|jan linders|linders)\b|^ah\b|\bah\s/i;
export const HORECA_ETEN = /slager|toko|tropisch|delicatess|manav|vishandel|groente|poelier|kip ?producten|kipproducten|\bmarkt\b|markt\b|market|supermarkt|supermarket|import ?export|halal|helal|bakkerij|kaashandel|notenbar|oriental|turkse|marokkaanse|aziatische|asian|toko|food ?center|levensmiddelen/i;
export const HORECA_NIET_ETEN = /media ?markt|marktplaats|bouwmarkt|fietsmarkt|automarkt|woonmarkt|tuinmarkt|dekamarkt/i;
export const HORECA_GRENS = 150;

const VAN = new Set(["Boodschappen", "Overig", "Winkels divers", "Overboekingen aan personen", "Privé opnames", "Webshops & online aankopen", "Privé - vrijetijd-uitgaan-vakantie & uit eten"]);

export function brancheCategorie(tx, category, accountType, branche = _branche) {
  if (branche !== "horeca" || accountType !== "Zakelijk" || Number(tx.amount) >= 0 || !VAN.has(category)) return null;
  const naam = String(tx.counterparty || "");
  // Geldopname ("GELDMAAT WOENSELSE MARKT") is geen inkoop.
  if (/geldmaat|geldautomaat|\batm\b/i.test(naam) || /geldautomaat/i.test(String(tx.betaalwijze || ""))) return null;
  if (HORECA_GROOTHANDEL.test(naam)) return "Zakelijke inkoop non-food";
  if (Math.abs(Number(tx.amount)) >= HORECA_GRENS && !HORECA_SUPERMARKT.test(naam) && !HORECA_NIET_ETEN.test(naam) && HORECA_ETEN.test(naam)) return "Zakelijke inkoop non-food";
  return null;
}

// nieuw-V1R9 — bouwmarkt vanaf de zakelijke rekening is alleen bij soort bedrijf "bouw" vanzelf inkoop (melding Boska 10-11, Dakhlaoui:
// restaurant, Hornbach en Gamma stonden op zakelijke inkoop). Bij een andere soort bedrijf: Winkels divers, op controleren (confidence.js).
export const BOUWMARKT = /\b(praxis|gamma|karwei|hornbach|hubo|bauhaus)\b/i;
export function bouwmarktNietZakelijk(tx, category, accountType, branche = _branche) {
  return !!branche && branche !== "bouw" && accountType === "Zakelijk" && category === "Zakelijke inkoop non-food"
    && Number(tx.amount) < 0 && BOUWMARKT.test(String(tx.counterparty || ""));
}

// nieuw-V3R7 — btw 9% bij inkoop van eten (wens Boska 12-11): bij horeca wordt Zakelijke inkoop non-food bij een groothandel, supermarkt of
// winkel in eten (slager, toko, markt …) "Zakelijke inkoop voeding". Ook als de gebruiker zelf "Zakelijke inkoop non-food" koos voor
// de tegenpartij (die keuze was er vóór deze categorie). Een keuze per boeking blijft staan. Drogist, bouwmarkt en winkels als Action: 21%.
export const INKOOP_ETEN = "Zakelijke inkoop voeding";
export const NIET_ETEN_WINKEL = /kruidvat|\betos\b|drogist|trekpleister|\bda\b drogist|holland ?& ?barrett|\baction\b|\bhema\b|blokker|xenos|ikea|praxis|gamma|karwei|hornbach|hubo|bauhaus|media ?markt|coolblue|\bggm\b|gastro ?international|elektro/i;
export function inkoopEten(tx, category, accountType, branche = _branche) {
  if (branche !== "horeca" || accountType !== "Zakelijk" || category !== "Zakelijke inkoop non-food" || Number(tx.amount) >= 0) return false;
  const naam = String(tx.counterparty || "");
  if (NIET_ETEN_WINKEL.test(naam) || HORECA_NIET_ETEN.test(naam)) return false;
  return HORECA_GROOTHANDEL.test(naam) || HORECA_SUPERMARKT.test(naam) || HORECA_ETEN.test(naam) || ETEN_EXTRA.test(naam);
}
// Alcohol valt onder 21%: slijterij en drankenhandel daarom niet hier.
const ETEN_EXTRA = /\b(meat|vlees|vleeswaren|kip|vis|fish|foods?|zuivel|groenten|fruit|bakker|brood|patisserie|kebab ?(groothandel|productie)|döner|doner)\b/i;
