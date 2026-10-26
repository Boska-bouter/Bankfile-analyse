// beide-V1R9 — fase 8: welke tarieftabellen Instellingen → Tarieven in een privédossier toont (data voor
// components/overview/TarievenJaarEditor). Box 1-schijven en kortingen komen uit incomeTax.js (gedeeld met zakelijk),
// de rest uit tax/prive/tarieven.js. Eigen waarden staan in tariefOverrides (privé onder "prive_<groep>").
import { resolveTariefGroep, combineerTariefStatus } from "../../tax/incomeTax.js";
import { priveTarief } from "../../tax/prive/tarieven.js";

export const PRIVE_TARIEF_GROEPEN = Object.freeze([
  { key: "ib", titel: "Inkomstenbelasting box 1", velden: [["aftrekBeperkingPct", "Aftrekposten beperkt tot tarief (%)"]] },
  { key: "prive_aow", titel: "Box 1 met AOW-leeftijd", velden: [["tot", "Eerste schijf tot (€)"], ["tarief", "Tarief eerste schijf (%)", 100]] },
  { key: "ahk", titel: "Algemene heffingskorting", velden: [["max", "Maximum (€)"], ["afbouwGrens", "Afbouw vanaf inkomen (€)"], ["afbouwPct", "Afbouwpercentage (%)"]] },
  { key: "ak", titel: "Arbeidskorting", velden: [["max", "Maximum (€)"], ["afbouwVanaf", "Afbouw vanaf arbeidsinkomen (€)"], ["afbouwPct", "Afbouwpercentage (%)"]] },
  { key: "prive_ouderen", titel: "Ouderenkorting", velden: [["max", "Maximum (€)"], ["grens", "Afbouw vanaf inkomen (€)"], ["afbouwPct", "Afbouwpercentage (%)"]] },
  { key: "prive_woning", titel: "Eigen woning", velden: [["forfaitPct", "Eigenwoningforfait (% van WOZ)"], ["villagrens", "Villagrens WOZ (€)"], ["villaPct", "Forfait boven villagrens (%)"], ["hillenPct", "Aftrek Hillen (%)"]] },
  { key: "prive_aftrek", titel: "Giften en zorgkosten", velden: [
    ["giftenMin", "Giften: drempel minimaal (€)"], ["giftenPct", "Giften: drempel (% drempelinkomen)"], ["giftenMaxPct", "Giften: maximum (% drempelinkomen)"],
    ["zorgVast", "Zorgkosten: vaste drempel (€)"], ["zorgLaag", "Zorgkosten: tot inkomen (€)"], ["zorgPct", "Zorgkosten: drempel daarboven (%)"],
    ["zorgHoog", "Zorgkosten: extra vanaf inkomen (€)"], ["zorgExtraPct", "Zorgkosten: extra drempel (%)"],
  ] },
  { key: "prive_box3", titel: "Box 3", velden: [
    ["heffingsvrij", "Heffingsvrij vermogen per persoon (€)"], ["sparenPct", "Rendement sparen (%)"], ["beleggenPct", "Rendement beleggen (%)"],
    ["schuldenPct", "Rendement schulden (%)"], ["schuldendrempel", "Schuldendrempel per persoon (€)"], ["tariefPct", "Tarief (%)"],
  ] },
]);

export const resolvePriveTarief = (key, jaar) => (key.startsWith("prive_") ? priveTarief(key.slice(6), jaar) : resolveTariefGroep(key, jaar));

export function priveTarievenStatus(jaar) {
  const st = PRIVE_TARIEF_GROEPEN.map((g) => resolvePriveTarief(g.key, jaar).status);
  return combineerTariefStatus(st);
}
