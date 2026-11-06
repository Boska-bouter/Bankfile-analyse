// huishoudboekje-V1R0 — inkomsten en uitgaven per maand of week, met vaste lasten en variabele uitgaven apart.
// Zelfde indeling als het privébudget (calc/prive/budget.js): sparen en overboekingen tussen eigen rekeningen tellen niet
// mee, een terugbetaling verlaagt de uitgave, geld dat binnenkomt in een algemene categorie is inkomen.
import { budgetSoort } from "../prive/budget.js";
import { PRIVE_WEERGAVE, isTerugbetaling } from "../../modus/prive/weergave.js";
import { sleutelVan, periodesTussen, isVolledig } from "./periodes.js";

const OVERIG = "Overig";
const datumVan = (t) => (t.date instanceof Date ? t.date : new Date(t.date));

// Soort van één boeking voor het huishoudboekje: "inkomen" | "uitgave" | "sparen" | null.
export function boekingSoort(t) {
  let soort = budgetSoort(t.category);
  const bedrag = Number(t.amount) || 0;
  if (soort === "uitgave" && bedrag > 0 && PRIVE_WEERGAVE.hoofdVan(t.category) === OVERIG && !isTerugbetaling(t.category)) soort = "inkomen";
  return soort;
}

const leeg = () => ({ inkomsten: 0, uitgaven: 0, vasteLasten: 0, variabel: 0, sparen: 0, over: 0, perCategorie: new Map(), inkomstenPerCategorie: new Map(), aantal: 0 });

// Vaste lasten die maar een paar keer per jaar komen (gemeentelijke belastingen, een jaarpremie): in minder dan de helft
// van de maanden met gegevens. Die kunnen worden uitgesmeerd over twaalf maanden.
export function onregelmatigeVasteLasten(transacties, vast) {
  const maanden = new Set(), per = new Map();
  for (const t of transacties) {
    const m = sleutelVan(datumVan(t), "maand");
    maanden.add(m);
    if (!vast.has(t.category) || boekingSoort(t) !== "uitgave" || !(Number(t.amount) < 0)) continue;
    if (!per.has(t.category)) per.set(t.category, new Set());
    per.get(t.category).add(m);
  }
  const n = maanden.size;
  if (n < 3) return new Set();
  return new Set([...per].filter(([, ms]) => ms.size / n < 0.5).map(([c]) => c));
}

// → { periodes: [sleutels], per: Map(sleutel → totalen), volledig: Map(sleutel → bool), eerste, laatste, onregelmatig }
export function huishoudOverzicht(transacties, { soort = "maand", vasteCategorieen = [], uitsmeren = true, vandaag = new Date() } = {}) {
  const vast = new Set(vasteCategorieen);
  const tx = (transacties || []).filter((t) => t && t.date && Number.isFinite(Number(t.amount)));
  if (!tx.length) return { soort, periodes: [], per: new Map(), volledig: new Map(), eerste: null, laatste: null, onregelmatig: new Set() };
  const datums = tx.map(datumVan).sort((a, b) => a - b);
  const eerste = datums[0], laatste = datums[datums.length - 1];
  const periodes = periodesTussen(eerste, laatste, soort);
  const per = new Map(periodes.map((p) => [p, leeg()]));
  const onregelmatig = uitsmeren ? onregelmatigeVasteLasten(tx, vast) : new Set();
  const jaarTotaal = new Map(); // onregelmatige vaste last → [{datum, bedrag}]
  for (const t of tx) {
    const soortB = boekingSoort(t);
    if (!soortB) continue;
    const bedrag = Number(t.amount) || 0;
    const x = per.get(sleutelVan(datumVan(t), soort));
    if (!x) continue;
    x.aantal++;
    if (soortB === "inkomen") { x.inkomsten += bedrag; x.inkomstenPerCategorie.set(t.category, (x.inkomstenPerCategorie.get(t.category) || 0) + bedrag); continue; }
    if (soortB === "sparen") { x.sparen -= bedrag; continue; }
    if (onregelmatig.has(t.category)) { if (!jaarTotaal.has(t.category)) jaarTotaal.set(t.category, []); jaarTotaal.get(t.category).push({ d: datumVan(t), b: -bedrag }); continue; }
    voegUitgave(x, t.category, -bedrag, vast.has(t.category));
  }
  // Uitsmeren: een gelijk bedrag per maand, het totaal gedeeld door het aantal maanden met gegevens (één betaling in
  // minder dan een jaar gegevens = een jaarbedrag, gedeeld door 12). Een week krijgt 12/52 van het maandbedrag.
  const aantalMaanden = new Set(tx.map((t) => sleutelVan(datumVan(t), "maand"))).size;
  for (const [cat, lijst] of jaarTotaal) {
    const som = lijst.reduce((a, r) => a + r.b, 0);
    const deler = lijst.length === 1 && aantalMaanden < 12 ? 12 : Math.max(aantalMaanden, 1);
    const perMaand = som / deler;
    const bedrag = soort === "week" ? (perMaand * 12) / 52 : perMaand;
    for (const p of periodes) if (bedrag) voegUitgave(per.get(p), cat, bedrag, true, true);
  }
  for (const x of per.values()) x.over = x.inkomsten - x.uitgaven;
  const volledig = new Map(periodes.map((p) => [p, isVolledig(p, { eerste, laatste, vandaag })]));
  return { soort, periodes, per, volledig, eerste, laatste, onregelmatig };
}

function voegUitgave(x, cat, bedrag, isVast, uitgesmeerd = false) {
  x.uitgaven += bedrag;
  if (isVast) x.vasteLasten += bedrag; else x.variabel += bedrag;
  const c = x.perCategorie.get(cat) || { bedrag: 0, vast: isVast, uitgesmeerd: false, aantal: 0 };
  c.bedrag += bedrag; c.aantal += uitgesmeerd ? 0 : 1; c.uitgesmeerd = c.uitgesmeerd || uitgesmeerd;
  x.perCategorie.set(cat, c);
}

// Verschil met de vorige periode in procenten; null = geen vergelijking mogelijk ("nieuw" als vorige 0 is).
export function verschilPct(nu, vorig) {
  if (!Number.isFinite(nu) || !Number.isFinite(vorig)) return null;
  if (Math.abs(vorig) < 0.005) return Math.abs(nu) < 0.005 ? 0 : "nieuw";
  return ((nu - vorig) / Math.abs(vorig)) * 100;
}

// Gemiddelde per maand over de laatste n volledige maanden (voor inkomen en verhoudingen).
export function gemiddeldeLaatsteMaanden(maandOverzicht, n = 3, tot = null) {
  const volledig = maandOverzicht.periodes.filter((p) => maandOverzicht.volledig.get(p) && (!tot || p <= tot));
  const gekozen = volledig.slice(-n);
  if (!gekozen.length) return null;
  const som = { inkomsten: 0, uitgaven: 0, vasteLasten: 0, variabel: 0, sparen: 0, perCategorie: new Map() };
  for (const p of gekozen) {
    const x = maandOverzicht.per.get(p);
    for (const k of ["inkomsten", "uitgaven", "vasteLasten", "variabel", "sparen"]) som[k] += x[k];
    for (const [c, v] of x.perCategorie) som.perCategorie.set(c, (som.perCategorie.get(c) || 0) + v.bedrag);
  }
  const d = gekozen.length;
  const gem = { maanden: gekozen, perCategorie: new Map([...som.perCategorie].map(([c, v]) => [c, v / d])) };
  for (const k of ["inkomsten", "uitgaven", "vasteLasten", "variabel", "sparen"]) gem[k] = som[k] / d;
  gem.over = gem.inkomsten - gem.uitgaven;
  return gem;
}
