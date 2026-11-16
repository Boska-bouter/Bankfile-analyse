// nieuw-V4R6 — eigen module zodat ook de Worker (omzetten van de gedeelde namenlijst) dezelfde sleutel gebruikt.
import { vergelijkWoorden } from "../review/vergelijkbaar.js";
import { PLAATSEN } from "./plaatsen.js";

// Betaalterminals en -diensten vóór de naam ("BCK*Decathlon", "SumUp *Bakker", "Zettle_*Kiosk", "CCV*Kapper").
export const TERMINAL = /^\s*(bck|ccv|sumup|zettle|iz|sq|sp|pp|paypal|pay\.nl|mollie|stripe|adyen|bcc|myp|ecom|cm)\s*[*_]+\s*_?\s*/i;
// Betaaldiensten, banken en tussenpartijen: de categorie hangt af van wie er achter zit, dus nooit in de lijst.
export const TUSSENPARTIJ = /^(paypal|stripe|mollie|stichting mollie|adyen|buckaroo|klarna|riverty|afterpay|multisafepay|pay nl|worldline|ingenico|ccv|sumup|zettle|tikkie|bng|geldmaat|ing|ing bank|rabobank|abn|abn amro|bunq|knab|asn|sns|triodos|regiobank|revolut|wise|n26|stichting derdengelden|derdengelden|stichting beheer)\b/;

// nieuw-V4R6 — sleutel voor de lijst (advies 13-11, akkoord Boska): kleine letters, zonder accenten, cijfers, terminalvoorvoegsel,
// " via …", rechtsvorm (ook SARL, GmbH, Ltd), landcode en plaatsnaam aan het eind; eerste twee woorden aaneen (zonder spatie),
// zodat "The Shopbuilders", "TheShopbuilders BV" en "CCV*The Shopbuilders" één naam zijn, net als "Bonprix SARL" en "Bonprix",
// en "Jumbo Utrecht" en "Jumbo". Een plaats blijft staan als er verder alleen een algemeen woord staat ("Hotel Amsterdam").
const RECHTSVORM_WOORD = new Set(["bv", "nv", "vof", "cv", "sarl", "sas", "sa", "srl", "gmbh", "ug", "kg", "ag", "ltd", "limited", "inc", "llc", "plc",
  "corp", "co", "bvba", "bvb", "spa", "ab", "as", "oy", "aps"]);
const LAND_WOORD = new Set(["nld", "nl", "bel", "be", "deu", "de", "fra", "fr", "gbr", "gb", "uk", "lux", "lu", "irl", "ie", "esp", "es", "usa", "us", "nederland", "netherlands", "holland"]);
const ALGEMEEN = new Set(["hotel", "cafe", "restaurant", "garage", "camping", "bakkerij", "apotheek", "snackbar", "kapsalon", "slagerij", "gemeente",
  "tandarts", "huisarts", "fysio", "praktijk", "ziekenhuis", "bibliotheek", "parkeren", "parking", "station", "markt", "zwembad", "sportschool",
  "taxi", "kapper", "theater", "museum", "dierenarts", "brasserie", "eetcafe", "grand", "stad", "centrum", "station"]);
export function bedrijfSleutel(naam) {
  const t = String(naam || "").replace(TERMINAL, "").replace(TERMINAL, "");
  let w = vergelijkWoorden(t);
  // rechtsvorm en landcode: nooit het eerste woord weghalen
  w = w.filter((x, i) => i === 0 || !(RECHTSVORM_WOORD.has(x) || LAND_WOORD.has(x)));
  // "b v" (B.V.) en "n v" die als losse letters overblijven
  while (w.length > 1 && /^(b|n)$/.test(w[w.length - 2]) && w[w.length - 1] === "v") w = w.slice(0, -2);
  // plaatsnaam aan het eind (ook meerdelig: "den haag", "bergen op zoom")
  for (let ronde = 0; ronde < 2; ronde++) {
    let weg = 0;
    for (const n of [4, 3, 2, 1]) {
      if (w.length > n && PLAATSEN.has(w.slice(-n).join(" "))) { weg = n; break; }
    }
    if (!weg) break;
    const rest = w.slice(0, -weg);
    if (!rest.some((x) => x.length > 1 && !ALGEMEEN.has(x))) break;
    w = rest;
  }
  const kern = w.filter((x) => x.length > 1);
  const basis = kern.length ? kern : w;
  if (!(basis.length >= 2 || (basis[0] && basis[0].length >= 4))) return "";
  const twee = basis.slice(0, 2);
  if (TUSSENPARTIJ.test(twee.join(" "))) return "";
  const k = twee.join("");
  return k.length >= 2 && k.length <= 60 ? k : "";
}
