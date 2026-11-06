// huishoudboekje-V1R0 — "Waar kun je het meest besparen?" (wens Boska 2-11). Alleen als de uitgaven hoger zijn dan
// de inkomsten, of als een verhouding op rood staat. Maximaal vijf plekken, gesorteerd op wat het per maand oplevert.
// Het zijn suggesties in gewone taal, geen financieel advies op maat.
import { budgetSoort } from "../prive/budget.js";
import { sleutelVan } from "./periodes.js";

const datumVan = (t) => (t.date instanceof Date ? t.date : new Date(t.date));
const partij = (t) => String(t.counterparty || t.description || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
const STREAMING = [["netflix", "Netflix"], ["disney", "Disney+"], ["videoland", "Videoland"], ["hbo", "HBO Max"], ["max.com", "HBO Max"], ["prime video", "Prime Video"],
  ["amazon prime", "Amazon Prime"], ["viaplay", "Viaplay"], ["spotify", "Spotify"], ["apple music", "Apple Music"], ["youtube premium", "YouTube Premium"],
  ["deezer", "Deezer"], ["nlziet", "NLZIET"], ["skyshowtime", "SkyShowtime"], ["dazn", "DAZN"], ["ziggo sport", "Ziggo Sport"]];

// Terugkerende afschrijvingen: dezelfde partij in minstens 3 van de laatste 6 maanden. → [{partij, categorie, perMaand, perJaar, maanden}]
export function terugkerend(transacties, { vast = new Set(), tot = null } = {}) {
  const uit = (transacties || []).filter((t) => budgetSoort(t.category) === "uitgave" && Number(t.amount) < 0);
  if (!uit.length) return [];
  const laatste = tot || sleutelVan(new Date(Math.max(...uit.map((t) => datumVan(t)))), "maand");
  const [j, m] = laatste.split("-").map(Number);
  const grens = sleutelVan(new Date(j, m - 6, 1), "maand");
  const per = new Map();
  const metGegevens = new Set(); // maanden in het venster waarin bankgegevens staan (deler voor het maandbedrag)
  for (const t of uit) {
    const mk = sleutelVan(datumVan(t), "maand");
    if (mk < grens || mk > laatste) continue;
    metGegevens.add(mk);
    const k = partij(t);
    if (!k) continue;
    const x = per.get(k) || { partij: t.counterparty || t.description, categorie: t.category, maanden: new Set(), som: 0, bedragen: [] };
    x.maanden.add(mk); x.som += -Number(t.amount); x.bedragen.push({ mk, b: -Number(t.amount) });
    per.set(k, x);
  }
  return [...per.values()].filter((x) => x.maanden.size >= 3 && (vast.has(x.categorie) || /abonnement|overige abonnementen|mobiel|internet/i.test(x.categorie)))
    .map((x) => ({ partij: x.partij, categorie: x.categorie, perMaand: x.som / metGegevens.size, perJaar: (x.som / metGegevens.size) * 12, maanden: x.maanden.size, bedragen: x.bedragen }))
    .sort((a, b) => b.perJaar - a.perJaar);
}

// Dubbele diensten: meer dan één streamingdienst.
export function dubbeleDiensten(lijst) {
  const gevonden = new Map();
  for (const x of lijst) {
    const naam = STREAMING.find(([w]) => String(x.partij).toLowerCase().includes(w))?.[1];
    if (naam && !gevonden.has(naam)) gevonden.set(naam, x);
  }
  return gevonden.size > 1 ? [...gevonden.entries()].map(([naam, x]) => ({ naam, perMaand: x.perMaand })) : [];
}

// Vaste last die duurder is geworden: het laatste bedrag ligt meer dan 5% boven het gemiddelde ervoor.
export function prijsstijgingen(lijst) {
  const uit = [];
  for (const x of lijst) {
    const per = new Map();
    for (const { mk, b } of x.bedragen) per.set(mk, (per.get(mk) || 0) + b);
    const maanden = [...per.keys()].sort();
    if (maanden.length < 3) continue;
    const laatst = per.get(maanden[maanden.length - 1]);
    const eerder = maanden.slice(0, -1).map((k) => per.get(k));
    const gem = eerder.reduce((a, b) => a + b, 0) / eerder.length;
    if (gem > 5 && laatst > gem * 1.05 && laatst - gem >= 2) uit.push({ partij: x.partij, categorie: x.categorie, van: gem, naar: laatst, verschil: laatst - gem });
  }
  return uit.sort((a, b) => b.verschil - a.verschil);
}

// gem / vorig: gemiddeldeLaatsteMaanden over de laatste 3 en de 3 maanden daarvoor; verh: verhoudingen(); budget: budgetStatus().
export function bespaarPlekken({ gem, vorig, verh, budget = [], abonnementen = [], label = (c) => c }) {
  if (!gem) return { tonen: false, tekort: 0, plekken: [] };
  const tekort = gem.uitgaven - gem.inkomsten;
  const rood = (verh?.regels || []).some((r) => r.kleur === "rood");
  const plekken = [];
  for (const b of budget) if (b.status === "over") plekken.push({ soort: "budget", titel: label(b.categorie), tekst: `Boven je budget: € ${r0(b.besteed)} uitgegeven, budget € ${r0(b.budget)}.`, perMaand: b.besteed - b.budget });
  for (const r of verh?.regels || []) {
    if (r.eenheid !== "€" || r.kleur === "groen") continue;
    plekken.push({ soort: "richtwaarde", titel: r.label, tekst: `€ ${r0(r.waarde)} per maand; ${r.richtTekst}. Mogelijk € ${r0(r.waarde - r.richt)} per maand minder.`, perMaand: r.waarde - r.richt });
  }
  if (vorig) {
    for (const [cat, nu] of gem.perCategorie) {
      const toen = vorig.perCategorie.get(cat) || 0;
      if (toen > 20 && nu > toen * 1.15 && nu - toen >= 20) plekken.push({ soort: "gestegen", titel: label(cat), tekst: `Gestegen van € ${r0(toen)} naar € ${r0(nu)} per maand (+${Math.round(((nu - toen) / toen) * 100)}%) in de laatste drie maanden.`, perMaand: nu - toen });
    }
  }
  const dubbel = dubbeleDiensten(abonnementen);
  if (dubbel.length) {
    const goedkoopste = Math.min(...dubbel.map((d) => d.perMaand));
    plekken.push({ soort: "abonnement", titel: "Streaming en muziek", tekst: `Je betaalt voor ${dubbel.map((d) => d.naam).join(", ")}. Zeg er een op of wissel per maand af.`, perMaand: goedkoopste });
  }
  for (const p of prijsstijgingen(abonnementen).slice(0, 2)) plekken.push({ soort: "prijs", titel: `${p.partij} (${label(p.categorie)})`, tekst: `Duurder geworden: van € ${r0(p.van)} naar € ${r0(p.naar)} per maand. Vergelijk aanbieders of vraag een beter tarief.`, perMaand: p.verschil });
  // Eén plek per categorie: de grootste besparing telt.
  const beste = new Map();
  for (const p of plekken) { const k = p.titel; if (!beste.has(k) || beste.get(k).perMaand < p.perMaand) beste.set(k, p); }
  const lijst = [...beste.values()].filter((p) => p.perMaand > 1).sort((a, b) => b.perMaand - a.perMaand).slice(0, 5);
  return { tonen: tekort > 0 || rood, tekort, plekken: lijst, samen: lijst.reduce((a, p) => a + p.perMaand, 0) };
}
const r0 = (v) => Math.round(v).toLocaleString("nl-NL");
