// release31V5 — inkomen per maand: zakelijke omzet en privé-inkomen in aparte kolommen, per maand van één jaar.
// Pure berekening (geen React), zodat hij los te testen is.
import { computeBtw } from "../tax/btw.js";
import { betaalSoort } from "../classification/classify.js";

export const INKOMEN_KOLOMMEN = [
  { key: "omzetExcl", label: "Omzet excl. BTW", soort: "zakelijk" },
  { key: "omzetIncl", label: "Omzet incl. BTW", soort: "zakelijk", alleenInfo: true },
  { key: "loon", label: "Loon, uitkering en overig", soort: "prive" },
  { key: "toeslagen", label: "Toeslagen", soort: "prive" },
  { key: "alimentatie", label: "Alimentatie (ontvangen)", soort: "prive" },
];

const ZAKELIJKE_OMZET = new Set(["Zakelijke inkomsten", "Zakelijke inkomsten 0%", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%"]);

// Welke kolom hoort bij deze boeking? null = geen inkomen.
export function inkomenKolom(tx) {
  if (tx.isMirror) return null;
  if (ZAKELIJKE_OMZET.has(tx.category)) return "omzet";
  if (tx.category === "Inkomsten") return "loon";
  // DGA-salaris telt als inkomen op de privérekening (op de BV-rekening is het een uitgave).
  if (tx.category === "DGA-salaris" && tx.amount > 0 && (tx.accountType || tx.type) !== "Zakelijk") return "loon";
  if (tx.category === "Toeslagen" && tx.amount > 0) return "toeslagen";
  if ((tx.category === "Partneralimentatie" || tx.category === "Kinderalimentatie") && tx.amount > 0) return "alimentatie";
  return null;
}

const r2 = (x) => Math.round(x * 100) / 100;

// release32V2 — privé-uitgaven: afschrijvingen op de privérekening(en), plus wat met de zakelijke pas privé is
// uitgegeven (privé opnames per pin of geldautomaat). Geen uitgaven: geld tussen eigen rekeningen, sparen, BV.
const GEEN_UITGAVE = new Set([
  "Interne overboeking", "Interne overboeking: zakelijk sparen", "Interne overboeking: privé sparen",
  "Terugboeking naar zakelijk", "Ontvangen van zakelijk", "Kapitaalstorting", "Rekening-courant DGA",
  "Inkomsten/betalingen niet dit jaar",
]);
export function isPriveUitgave(tx) {
  if (tx.isMirror || !(tx.amount < 0)) return false;
  const rekening = tx.accountType || tx.type;
  if (rekening === "Zakelijk") {
    if (tx.category !== "Privé opnames") return false;
    const soort = betaalSoort(tx);
    return soort === "pin" || soort === "contant";
  }
  return !GEEN_UITGAVE.has(tx.category);
}

// periodeZak / periodePri: { van: Date, tot: Date } of null (niet geladen).
export function berekenInkomenPerMaand({ classified, jaar, categoryBtwRates = {}, btwVerlegd = false, periodeZak = null, periodePri = null, isBV = false }) {
  const maanden = Array.from({ length: 12 }, (_, m) => ({
    maand: m, omzetExcl: 0, omzetIncl: 0, loon: 0, toeslagen: 0, alimentatie: 0, uitgaven: 0, boekingen: {},
  }));
  for (const tx of classified) {
    if (tx.year !== jaar) continue;
    if (isPriveUitgave(tx)) {
      const mu = maanden[tx.date.getMonth()];
      mu.uitgaven += -tx.amount;
      (mu.boekingen.uitgaven ||= []).push(tx);
    }
    const k = inkomenKolom(tx);
    if (!k) continue;
    const m = maanden[tx.date.getMonth()];
    if (k === "omzet") {
      const btw = computeBtw(tx, categoryBtwRates, btwVerlegd);
      m.omzetIncl += tx.amount;
      m.omzetExcl += tx.amount - btw;
      (m.boekingen.omzetExcl ||= []).push(tx);
      (m.boekingen.omzetIncl ||= []).push(tx);
    } else {
      m[k] += tx.amount;
      (m.boekingen[k] ||= []).push(tx);
    }
  }
  // Is deze maand gedekt door de geladen bestanden? (hele maand niet in de periode = "niet geladen")
  const gedekt = (p, m) => {
    if (!p) return false;
    const begin = new Date(jaar, m, 1), eind = new Date(jaar, m + 1, 0);
    return p.van <= eind && p.tot >= begin;
  };
  for (const m of maanden) {
    for (const k of ["omzetExcl", "omzetIncl", "loon", "toeslagen", "alimentatie", "uitgaven"]) m[k] = r2(m[k]);
    m.zakGeladen = gedekt(periodeZak, m.maand);
    m.priGeladen = gedekt(periodePri, m.maand);
    m.prive = r2(m.loon + m.toeslagen + m.alimentatie);
    // Huishoudinkomen: bij een eenmanszaak omzet (excl. BTW) + privé; bij een BV is de omzet van de BV, niet van het huishouden.
    m.totaal = r2((isBV ? 0 : m.omzetExcl) + m.prive);
    m.verschil = r2(m.totaal - m.uitgaven);
  }
  // Volledig = elke rekeningsoort die in DIT jaar voorkomt, is in deze maand geladen. Een soort die het hele jaar
  // ontbreekt (bijv. alleen zakelijk geladen) maakt niet alle maanden onvolledig; dat wordt apart gemeld.
  const zakInJaar = maanden.some((m) => m.zakGeladen), priInJaar = maanden.some((m) => m.priGeladen);
  for (const m of maanden) m.volledig = (m.zakGeladen || m.priGeladen) && (!zakInJaar || m.zakGeladen) && (!priInJaar || m.priGeladen);
  // Privé-inkomenskolommen alleen als er in dit jaar ook echt iets in staat.
  const kolommen = INKOMEN_KOLOMMEN.filter((c) => c.soort === "zakelijk" ? !!periodeZak || maanden.some((m) => m[c.key] !== 0) : maanden.some((m) => m[c.key] !== 0));
  const som = (k, lijst = maanden) => r2(lijst.reduce((a, m) => a + m[k], 0));
  const volledig = maanden.filter((m) => m.volledig);
  const extra = ["prive", "totaal", "uitgaven", "verschil"];
  const totalen = Object.fromEntries([...kolommen.map((c) => c.key), ...extra].map((k) => [k, som(k)]));
  const gemiddeld = Object.fromEntries([...kolommen.map((c) => c.key), ...extra].map((k) => [k, volledig.length ? r2(som(k, volledig) / volledig.length) : null]));
  const heeftPriveInkomen = kolommen.some((c) => c.soort === "prive");
  return { maanden, kolommen, totalen, gemiddeld, aantalVolledig: volledig.length, isBV, zakInJaar, priInJaar, heeftPriveInkomen };
}
