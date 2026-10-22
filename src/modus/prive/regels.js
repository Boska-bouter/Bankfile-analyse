// beide-V1R6 (fase 3) — de categorieregels (zoekwoorden) van een privédossier. De nieuwe privéregels staan
// vooraan in categoryRules, gemarkeerd met prive: true, zodat ze bij uitgaven vóór de standaardregels winnen
// (bijv. "Zorgverzekering" vóór het algemene "Verzekeringen"). In een zakelijk dossier worden ze weer weggehaald.
import { DEFAULT_RULES, DEFAULT_FIXED_CATEGORIES, CATEGORY_COLOR } from "../../classification/categories.js";
import { PRIVE_REGELS, PRIVE_CATEGORIEEN, PRIVE_EXTRA_WOORDEN, PRIVE_VOORRANG } from "./categorieen.js";
import { registreerPriveCategorie } from "./weergave.js";

const standaardWoorden = (naam) => DEFAULT_RULES.find((r) => r.name === naam)?.keywords || [];

export const PRIVE_STANDAARD_REGELS = Object.freeze(PRIVE_REGELS.map((r) => Object.freeze({
  name: r.naam,
  color: CATEGORY_COLOR[r.naam] || "bg-slate-200 text-slate-700",
  keywords: [...new Set([...r.woorden, ...(r.leen || []).flatMap(standaardWoorden)])],
  prive: true,
  ...(r.alleenInkomen ? { alleenInkomen: true, description: "Herkent alleen bijschrijvingen: geld dat binnenkomt." } : {}),
})));

const STANDAARD_NAMEN = new Set(PRIVE_STANDAARD_REGELS.map((r) => r.name));

export const PRIVE_VASTE_LASTEN = Object.freeze(PRIVE_CATEGORIEEN.filter((c) => c.vast).map((c) => c.naam));

// Privéregels vooraan: de standaard, aangevuld met opgeslagen zoekwoorden (zoals mergeCategoryRules dat voor de
// zakelijke regels doet), daarna zelf toegevoegde privécategorieën. Geeft `regels` zelf terug als er niets
// verandert, zodat een effect hierop niet blijft herhalen.
export function metPriveRegels(regels) {
  const opgeslagen = regels.filter((r) => r.prive);
  // beide-V2R2 — standaardregels met de privé-extra zoekwoorden, en de voorrangsregels vooraan.
  const overig = regels.filter((r) => !r.prive).map(metExtraWoorden);
  overig.sort((a, b) => voorrang(a) - voorrang(b));
  const standaard = PRIVE_STANDAARD_REGELS.map((d) => {
    const eerder = opgeslagen.find((r) => r.name === d.name);
    if (!eerder) return d;
    const woorden = [...new Set([...d.keywords, ...(eerder.keywords || [])])];
    return woorden.length === eerder.keywords.length && eerder.alleenInkomen === d.alleenInkomen ? eerder : { ...d, keywords: woorden };
  });
  const zelf = opgeslagen.filter((r) => !STANDAARD_NAMEN.has(r.name));
  for (const r of zelf) registreerPriveCategorie(r.name, r.mainCategory);
  const nieuw = [...standaard, ...zelf, ...overig];
  const gelijk = nieuw.length === regels.length && nieuw.every((r, i) => r === regels[i]);
  return gelijk ? regels : nieuw;
}

// beide-V2R3 — alleen de woorden die de standaardregel nog niet had (anders haalt zonderExtraWoorden ze weg).
const EXTRA = Object.fromEntries(Object.entries(PRIVE_EXTRA_WOORDEN)
  .map(([naam, woorden]) => [naam, woorden.filter((w) => !standaardWoorden(naam).includes(w))]));

function metExtraWoorden(r) {
  const extra = EXTRA[r.name];
  if (!extra) return r;
  const woorden = r.keywords || [];
  return extra.every((w) => woorden.includes(w)) ? r : { ...r, keywords: [...new Set([...woorden, ...extra])] };
}
const voorrang = (r) => (PRIVE_VOORRANG.includes(r.name) ? 0 : 1);

// beide-V2R2 — ook de privé-extra zoekwoorden gaan er weer af, zodat een zakelijk dossier ze nooit gebruikt.
function zonderExtraWoorden(r) {
  const extra = EXTRA[r.name];
  if (!extra || !(r.keywords || []).some((w) => extra.includes(w))) return r;
  return { ...r, keywords: r.keywords.filter((w) => !extra.includes(w)) };
}
export function zonderPriveRegels(regels) {
  let nieuw = regels.filter((r) => !r.prive).map(zonderExtraWoorden);
  // De voorrangsregels terug op hun standaardplek (direct na hun voorganger in DEFAULT_RULES).
  for (const naam of PRIVE_VOORRANG) {
    const i = nieuw.findIndex((r) => r.name === naam), d = DEFAULT_RULES.findIndex((r) => r.name === naam);
    if (i < 0 || d < 1) continue;
    const voor = DEFAULT_RULES[d - 1].name;
    if (nieuw[i - 1]?.name === voor) continue;
    const r = nieuw[i];
    nieuw = nieuw.filter((_, j) => j !== i);
    const v = nieuw.findIndex((x) => x.name === voor);
    nieuw.splice(v < 0 ? i : v + 1, 0, r);
  }
  return nieuw.length === regels.length && nieuw.every((r, i) => r === regels[i]) ? regels : nieuw;
}

// Standaard vaste lasten van een privédossier: alleen als de lijst nog de zakelijke standaard is (dus nog
// nooit aangepast), dan komen de privé vaste lasten erbij. Een eigen keuze blijft altijd staan.
export function metPriveVasteLasten(vast) {
  const standaard = new Set(DEFAULT_FIXED_CATEGORIES);
  const isStandaard = vast.length === standaard.size && vast.every((c) => standaard.has(c));
  return isStandaard ? [...new Set([...vast, ...PRIVE_VASTE_LASTEN])] : vast;
}
