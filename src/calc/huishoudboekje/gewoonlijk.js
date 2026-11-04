// huishoudboekje-V3R2 — vergelijken met wat gewoonlijk is (besluit Boska 4-11). Een vergelijking met alleen de vorige maand
// of week geeft een verkeerd beeld: een grote aankoop, een kwartaalbetaling of een maand met minder inkomen geeft dan
// honderden procenten of grote bedragen verschil. Daarom vergelijken we met het eigen gemiddelde van de laatste zes
// volledige maanden vóór de getoonde periode, en noemen we alleen een duidelijke afwijking. Losse grote uitgaven staan
// apart ("Opvallende uitgaven"), zodat een hele categorie er niet vreemd uitziet door één betaling.
import { gemiddeldeLaatsteMaanden, boekingSoort } from "./overzicht.js";
import { grenzen, maandSleutel, verschuif, sleutelVan } from "./periodes.js";

export const GEWOONLIJK_MAANDEN = 6;
export const MIN_MAANDEN = 2; // met minder volledige maanden is er nog geen "gewoonlijk"
const PCT = 0.25;
const EUR = { maand: 25, week: 10 };
const WEEK = 12 / 52;

// Laatste maand die meetelt: de maand vóór de getoonde maand, of vóór de maand waarin de getoonde week begint.
function totMaand(p) {
  const maand = /W/.test(p) ? maandSleutel(new Date(grenzen(p).van.getUTCFullYear(), grenzen(p).van.getUTCMonth(), 1)) : p;
  return verschuif(maand, -1);
}

// → null (te weinig gegevens) of { maanden, inkomsten, uitgaven, vasteLasten, variabel, sparen, over, perCategorie: Map }
//   in bedragen per maand, of per week (× 12/52) als soort "week" is.
export function gewoonlijk(maandOverzicht, p, soort = "maand") {
  if (!maandOverzicht || !p) return null;
  const gem = gemiddeldeLaatsteMaanden(maandOverzicht, GEWOONLIJK_MAANDEN, totMaand(p));
  if (!gem || gem.maanden.length < MIN_MAANDEN) return null;
  if (soort !== "week") return gem;
  const uit = { ...gem, perCategorie: new Map([...gem.perCategorie].map(([c, v]) => [c, v * WEEK])) };
  for (const k of ["inkomsten", "uitgaven", "vasteLasten", "variabel", "sparen", "over"]) uit[k] = gem[k] * WEEK;
  return uit;
}

// "gewoon" | "hoger" | "lager" | "nieuw" (gewoonlijk niets, nu duidelijk wel) | null (niet te vergelijken).
// Een afwijking telt pas vanaf 25% én € 25 (week € 10) verschil.
export function vergelijkGewoonlijk(nu, gem, soort = "maand") {
  if (!Number.isFinite(nu) || !Number.isFinite(gem)) return null;
  const drempel = EUR[soort] || EUR.maand;
  const d = nu - gem;
  if (Math.abs(gem) < 0.5) return Math.abs(nu) >= drempel ? "nieuw" : "gewoon";
  if (Math.abs(d) < drempel || Math.abs(d) < Math.abs(gem) * PCT) return "gewoon";
  return d > 0 ? "hoger" : "lager";
}

// Losse uitgaven in periode p die veel groter zijn dan gewoonlijk voor hun categorie: minstens € 150 en minstens drie keer
// het gemiddelde per maand van die categorie (of de categorie komt gewoonlijk niet voor). Uitgesmeerde vaste lasten niet.
export function opvallendeUitgaven(transacties, p, soort, gem, { onregelmatig = new Set(), max = 5 } = {}) {
  if (!p) return [];
  const perMaand = (c) => (gem?.perCategorie?.get(c) || 0) / (soort === "week" ? WEEK : 1);
  return (transacties || [])
    .filter((t) => t && t.date && Number(t.amount) <= -150 && sleutelVan(t.date instanceof Date ? t.date : new Date(t.date), soort) === p)
    .filter((t) => boekingSoort(t) === "uitgave" && !onregelmatig.has(t.category))
    .filter((t) => -Number(t.amount) >= 3 * perMaand(t.category))
    .sort((a, b) => a.amount - b.amount)
    .slice(0, max)
    .map((t) => ({ datum: t.date instanceof Date ? t.date : new Date(t.date), tegenpartij: t.counterparty || t.description || "", bedrag: -Number(t.amount), categorie: t.category, gemiddeld: perMaand(t.category) }));
}
