// huishoudboekje-V1R0 — "Past het bij je inkomen?": een paar uitgaven als deel van het netto inkomen, naast een
// richtwaarde voor een vergelijkbaar huishouden (RICHTWAARDEN, Nibud/CBS). Rekent met het gemiddelde van de laatste
// drie volledige maanden (gemiddeldeLaatsteMaanden), zodat één maand met vakantiegeld de uitkomst niet vertekent.
import { RICHTWAARDEN as R } from "./richtwaarden.js";

export const WOONLASTEN = ["Privé - huur", "Hypotheek", "Privé - energie", "Privé - water", "Privé - energie-water", "Privé - gemeentelijke kosten"];
export const UIT_EN_VRIJE_TIJD = ["Uit eten & afhalen", "Vakantie & dagjes uit", "Cultuur & concerten", "Privé - vrijetijd-uitgaan-vakantie & uit eten", "Sport & hobby"];
const som = (perCategorie, namen) => namen.reduce((a, n) => a + (perCategorie.get(n) || 0), 0);

// Kleur bij "hoger is slechter": groen tot de grens, oranje tot grens + marge, daarna rood.
const kleurHoog = (w, grens, marge) => (w <= grens ? "groen" : w <= grens + marge ? "oranje" : "rood");

export function boodschappenNorm({ volwassenen = 1, kinderen = 0 } = {}) {
  return (volwassenen >= 2 ? R.boodschappen.tweeVolwassenen : R.boodschappen.eenVolwassene) + kinderen * R.boodschappen.perKind;
}

// gem: uitkomst van gemiddeldeLaatsteMaanden; huishouden: huishoudenUit(antwoorden).
export function verhoudingen(gem, huishouden = {}) {
  if (!gem || !(gem.inkomsten > 0)) return { inkomen: gem?.inkomsten || 0, regels: [], zonderInkomen: true };
  const ink = gem.inkomsten;
  const pct = (b) => (b / ink) * 100;
  const personen = (huishouden.volwassenen || 1) + (huishouden.kinderen || 0);
  const regels = [];
  const wonen = som(gem.perCategorie, WOONLASTEN);
  const woonNorm = R.woonquote[huishouden.wonen] ?? R.woonquote.onbekend;
  const woonNaam = { huurCorporatie: "huurders bij een corporatie", huurParticulier: "huurders bij een particuliere verhuurder", koop: "huiseigenaren" }[huishouden.wonen] || "huurders";
  if (wonen > 0) regels.push({ id: "wonen", label: "Woonlasten (huur of hypotheek, energie, water, gemeente)", bedrag: wonen, waarde: pct(wonen), eenheid: "%",
    richt: woonNorm, richtTekst: `${fmtPct(woonNorm)} is het midden bij ${woonNaam} (CBS)`, kleur: kleurHoog(pct(wonen), woonNorm, 5) });
  regels.push({ id: "vast", label: "Alle vaste lasten", bedrag: gem.vasteLasten, waarde: pct(gem.vasteLasten), eenheid: "%",
    richt: R.vasteLasten.groen, richtTekst: `Nibud: meestal 40% tot 65%; tot ${R.vasteLasten.groen}% is ruim`, kleur: kleurHoog(pct(gem.vasteLasten), R.vasteLasten.groen, R.vasteLasten.rood - R.vasteLasten.groen) });
  const bood = gem.perCategorie.get("Boodschappen") || 0;
  const bNorm = boodschappenNorm(huishouden);
  if (bood > 0) regels.push({ id: "boodschappen", label: "Boodschappen (eten en drinken)", bedrag: bood, waarde: bood, eenheid: "€",
    richt: bNorm, richtTekst: `Nibud: ± € ${Math.round(bNorm)} per maand voor dit huishouden`, kleur: kleurHoog(bood, bNorm, bNorm * 0.15) });
  const vrij = som(gem.perCategorie, UIT_EN_VRIJE_TIJD);
  const vNorm = R.vrijeTijdPerPersoon * personen;
  if (vrij > 0) regels.push({ id: "vrijetijd", label: "Uit eten, uitjes, vakantie en hobby", bedrag: vrij, waarde: vrij, eenheid: "€",
    richt: vNorm, richtTekst: `afgeleid van Nibud: ± € ${Math.round(vNorm)} per maand`, kleur: kleurHoog(vrij, vNorm, vNorm * 0.15) });
  const kled = gem.perCategorie.get("Kleding & schoenen") || 0;
  const kNorm = R.kledingPerPersoon * personen;
  if (kled > 0) regels.push({ id: "kleding", label: "Kleding en schoenen", bedrag: kled, waarde: kled, eenheid: "€",
    richt: kNorm, richtTekst: `afgeleid van Nibud: ± € ${Math.round(kNorm)} per maand`, kleur: kleurHoog(kled, kNorm, kNorm * 0.15) });
  const sp = pct(gem.sparen);
  regels.push({ id: "sparen", label: "Sparen en beleggen", bedrag: gem.sparen, waarde: sp, eenheid: "%", richt: R.sparen.minimaal,
    richtTekst: `Nibud: minstens ${R.sparen.minimaal}% opzij zetten`, kleur: sp >= R.sparen.minimaal ? "groen" : sp >= R.sparen.oranje ? "oranje" : "rood", hogerIsBeter: true });
  return { inkomen: ink, regels, maanden: gem.maanden, zonderInkomen: false };
}
export const fmtPct = (v) => `${(Math.round(v * 10) / 10).toLocaleString("nl-NL")}%`;
