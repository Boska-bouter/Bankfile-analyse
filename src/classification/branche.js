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
  if (HORECA_GROOTHANDEL.test(naam)) return "Zakelijke inkoop/uitgaven";
  if (Math.abs(Number(tx.amount)) >= HORECA_GRENS && !HORECA_SUPERMARKT.test(naam) && !HORECA_NIET_ETEN.test(naam) && HORECA_ETEN.test(naam)) return "Zakelijke inkoop/uitgaven";
  return null;
}
