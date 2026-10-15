// release31V5 / 32V3 — inkomen per maand: zakelijke omzet en privé-inkomen, privé-uitgaven (via de privérekening én via
// de zakelijke rekening) en het verschil, per maand van één jaar. Pure berekening (geen React), los te testen.
//
// Uitgangspunt (32V3): een maand waarin niet alle rekeningen volledig geladen zijn, wordt NIET berekend — geen
// aannames. Totalen en gemiddelden gaan alleen over de volledige maanden, voor inkomen én uitgaven.
import { computeBtw } from "../tax/btw.js";
import { betaalSoort } from "../classification/classify.js";
import { mainCategoryOf } from "../classification/categories.js";
import { effectiveZakelijkPercentage, isSplitsbareCategorie } from "../tax/categorySplit.js";

export const INKOMEN_KOLOMMEN = [
  { key: "omzetExcl", label: "Omzet excl. BTW", soort: "zakelijk" },
  { key: "omzetIncl", label: "Omzet incl. BTW", soort: "zakelijk", alleenInfo: true },
  { key: "loon", label: "Loon, uitkering en overig", soort: "prive" },
  { key: "toeslagen", label: "Toeslagen", soort: "prive" },
  { key: "alimentatie", label: "Alimentatie (ontvangen)", soort: "prive" },
];

const ZAKELIJKE_OMZET = new Set(["Zakelijke inkomsten", "Zakelijke inkomsten 0%", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%"]);

// Welke inkomenskolom hoort bij deze boeking? null = geen inkomen.
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

// Geld tussen eigen rekeningen, sparen en de BV is geen uitgave.
const GEEN_UITGAVE = new Set([
  "Interne overboeking", "Interne overboeking: zakelijk sparen", "Interne overboeking: privé sparen",
  "Terugboeking naar zakelijk", "Ontvangen van zakelijk", "Terugboeking van privé", "Kapitaalstorting", "Rekening-courant DGA",
  "Inkomsten/betalingen niet dit jaar",
]);
// release32V9 — bijschrijvingen in een uitgavencategorie (terugboeking/storno van een incasso, retour, restitutie)
// verlagen de uitgaven, zoals in de categorieoverzichten. Niet: geld van personen, leningen, stortingen en
// boekingen die nog beoordeeld moeten worden.
const GEEN_TERUGBETALING = new Set([
  "Overboeking van bekenden", "Overboekingen aan personen", "Leningen", "Leningen (privé)", "Privé opnames",
  "Overig", "Nog te beoordelen", "Inkomsten", "Toeslagen", "Partneralimentatie", "Kinderalimentatie", "DGA-salaris",
  // release33V1 — ontvangen Tikkies/geld (Privé: overig) en teruggaven van de Belastingdienst zijn geen terugbetaling van een uitgave.
  "Privé: overig", "Belastingen: overig",
]);
const isTerugbetaling = (tx) => tx.amount > 0 && !GEEN_TERUGBETALING.has(tx.category) && !ZAKELIJKE_OMZET.has(tx.category) && !inkomenKolom(tx);

// Privé-uitgave vanaf de privérekening (een terugbetaling telt negatief mee).
export function isPriveUitgave(tx) {
  if (tx.isMirror || !tx.amount) return false;
  if ((tx.accountType || tx.type) === "Zakelijk") return false;
  if (GEEN_UITGAVE.has(tx.category)) return false;
  return tx.amount < 0 || isTerugbetaling(tx);
}

const IB_ZVW = new Set(["Belastingen: IB", "Belastingen: ZVW", "Belastingen: Naheffingen IB voorgaande jaren"]);
const PRIVEAUTO = new Set(["Autokosten", "Brandstof", "Parkeren", "Verzekering: Auto", "Belastingen: MRB"]);
const normIban = (x) => String(x || "").replace(/\s/g, "").toUpperCase();
export const naarEigenPrive = (tx, eigenPriveIbans) => {
  const t = normIban(tx.counterpartyIban);
  // MT940-bestanden noemen soms alleen het oude rekeningnummer: vergelijk dan op de laatste 9 tekens.
  return !!t && eigenPriveIbans.some((i) => { const e = normIban(i); return e && (t === e || (e.length >= 9 && t.endsWith(e.slice(-9))) || (t.length >= 9 && e.endsWith(t.slice(-9)))); });
};

// Welk deel van een afschrijving vanaf de ZAKELIJKE rekening is een privé-uitgave, en onder welke soort?
// Percentages exact zoals in de aangifte (soort ruimte, % zakelijk/privé, privéauto).
// release32V3 — uitsplitsing van "Privé opnames" (zakelijke kant): waar is het geld heen gegaan?
export function soortPriveOpname(tx, eigenPriveIbans = []) {
  if (naarEigenPrive(tx, eigenPriveIbans)) return "Naar eigen privérekening";
  const s = betaalSoort(tx);
  return s === "pin" ? "Pinbetalingen" : s === "contant" ? "Geldautomaat (contant)" : s === "opwaardering" ? "Opwaardering betaaldienst" : "Direct betaald / overgemaakt aan anderen";
}

export function priveDeelZakelijk(tx, { jaar, percentages, autoStatus, heeftLeaseAuto, eigenPriveIbans }) {
  if (tx.isMirror || !tx.amount || (tx.accountType || tx.type) !== "Zakelijk") return null;
  if (tx.amount > 0 && !isTerugbetaling(tx)) return null; // alleen terugbetalingen in een privé-categorie tellen mee
  const c = tx.category;
  if (c === "Privé opnames") {
    if (naarEigenPrive(tx, eigenPriveIbans)) return null; // staat al als uitgave aan de privékant
    const s = betaalSoort(tx);
    const soort = s === "pin" ? "Privé opnames: pin" : s === "contant" ? "Privé opnames: geldautomaat" : s === "opwaardering" ? "Privé opnames: opwaardering betaaldienst" : "Privé opnames: direct betaald (iDEAL, Tikkie, ...)";
    return { soort, deel: 1 };
  }
  if (GEEN_UITGAVE.has(c)) return null;
  if (IB_ZVW.has(c)) return { soort: "Inkomstenbelasting / Zvw", deel: 1 };
  if (PRIVEAUTO.has(c) && autoStatus?.[jaar] === "prive") return { soort: "Auto (privéauto): brandstof, parkeren, onderhoud", deel: 1 };
  if (mainCategoryOf(c) === "Privé") return { soort: "Privé-categorieën betaald vanaf zakelijk", deel: 1 };
  if (isSplitsbareCategorie(c)) {
    const p = effectiveZakelijkPercentage(c, jaar, percentages, autoStatus, heeftLeaseAuto, tx);
    if (p >= 100) return null;
    return { soort: `Privédeel ${c} (${100 - p}% privé)`, deel: (100 - p) / 100 };
  }
  return null;
}

// Zakelijk deel van een boeking op de ZAKELIJKE rekening, excl. BTW (positief = kosten). Zelfde percentages als de aangifte.
const ZAK_AFLOSSING = new Set(["Lease (financieel)", "Leningen"]);
export function zakelijkDeelKosten(tx, { jaar, percentages, autoStatus, heeftLeaseAuto }, categoryBtwRates = {}, btwVerlegd = false) {
  if (tx.isMirror || !tx.amount || (tx.accountType || tx.type) !== "Zakelijk") return 0;
  const c = tx.category;
  if (GEEN_UITGAVE.has(c) || c === "Privé opnames" || ZAKELIJKE_OMZET.has(c) || inkomenKolom(tx)) return 0;
  if (tx.amount > 0 && !isTerugbetaling(tx)) return 0;
  if (ZAK_AFLOSSING.has(c)) return tx.amount < 0 ? -tx.amount : 0; // uitbetaling van een lening is geen terugbetaling
  const p = effectiveZakelijkPercentage(c, jaar, percentages, autoStatus, heeftLeaseAuto, tx);
  if (!(p > 0)) return 0;
  return -(tx.amount - computeBtw(tx, categoryBtwRates, btwVerlegd)) * Math.min(100, p) / 100;
}

const DAG = 86400000;
// Een maand telt als gedekt als de bestanden de hele maand beslaan (met een week speling: de eerste/laatste
// boeking valt zelden precies op de 1e of de laatste dag).
const heleMaand = (p, jaar, m) => {
  if (!p) return false;
  const begin = new Date(jaar, m, 1), eind = new Date(jaar, m + 1, 0);
  return p.van.getTime() <= begin.getTime() + 7 * DAG && p.tot.getTime() >= eind.getTime() - 7 * DAG;
};

// periodeZak / periodePri: { van: Date, tot: Date } of null (niet geladen in het dossier).
export function berekenInkomenPerMaand({
  classified, jaar, categoryBtwRates = {}, btwVerlegd = false, periodeZak = null, periodePri = null, isBV = false,
  percentages = {}, autoStatus = {}, heeftLeaseAuto = false, eigenPriveIbans = [],
}) {
  const maanden = Array.from({ length: 12 }, (_, m) => ({
    maand: m, omzetExcl: 0, omzetIncl: 0, loon: 0, toeslagen: 0, alimentatie: 0, viaPrive: 0, viaZak: 0, zakVanPrive: 0, zakKosten: 0, boekingen: {},
  }));
  const soorten = {};
  const opt = { jaar, percentages, autoStatus, heeftLeaseAuto, eigenPriveIbans };
  for (const tx of classified) {
    if (tx.year !== jaar || tx.isMirror) continue;
    const m = maanden[tx.date.getMonth()];
    if (isPriveUitgave(tx)) {
      // release32V10 — zakelijke kosten die vanaf de privérekening zijn betaald (autokosten bij een lease-/zaakauto,
      // het zakelijke deel van huur bij een werkruimte, …) zijn geen privé-uitgave: zelfde percentage als de aangifte.
      const pZak = effectiveZakelijkPercentage(tx.category, jaar, percentages, autoStatus, heeftLeaseAuto, tx);
      const deel = Math.max(0, Math.min(1, 1 - (pZak || 0) / 100));
      if (deel > 0) {
        m.viaPrive += -tx.amount * deel;
        (m.boekingen.viaPrive ||= []).push(tx);
      }
      if (deel < 1) {
        const netto = -(tx.amount - computeBtw(tx, categoryBtwRates, btwVerlegd)) * (1 - deel);
        m.zakVanPrive += netto;
        if (!isBV) { m.zakKosten += netto; (m.boekingen.zakKosten ||= []).push(tx); }
      }
    } else {
      // release33V0 — zakelijke kosten (excl. BTW, zakelijk deel volgens de aangifte) en aflossingen lease/lening vanaf de
      // zakelijke rekening: geld dat niet beschikbaar is voor het huishouden. Bij een BV horen die bij de BV.
      const zk = isBV ? 0 : zakelijkDeelKosten(tx, opt, categoryBtwRates, btwVerlegd);
      if (zk) { m.zakKosten += zk; (m.boekingen.zakKosten ||= []).push(tx); }
      const d = priveDeelZakelijk(tx, opt);
      if (d && d.deel > 0) {
        const bedrag = -tx.amount * d.deel;
        m.viaZak += bedrag;
        (m.boekingen.viaZak ||= []).push(tx);
        const s = (soorten[d.soort] ||= { bedrag: 0, boekingen: [] });
        s.bedrag += bedrag;
        s.boekingen.push({ tx, bedrag });
      }
    }
    const k = inkomenKolom(tx);
    if (!k) continue;
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
  for (const m of maanden) {
    for (const k of ["omzetExcl", "omzetIncl", "loon", "toeslagen", "alimentatie", "viaPrive", "viaZak", "zakVanPrive", "zakKosten"]) m[k] = r2(m[k]);
    m.zakGeladen = heleMaand(periodeZak, jaar, m.maand);
    m.priGeladen = heleMaand(periodePri, jaar, m.maand);
    m.prive = r2(m.loon + m.toeslagen + m.alimentatie);
    // Huishoudinkomen: bij een eenmanszaak omzet (excl. BTW) + privé; bij een BV is de omzet van de BV.
    m.totaal = r2((isBV ? 0 : m.omzetExcl) + m.prive);
    m.uitgaven = r2(m.viaPrive + m.viaZak);
    m.verschil = r2(m.totaal - m.zakKosten - m.uitgaven);
    // Volledig: de privérekening is de hele maand geladen, en (als het dossier een zakelijke rekening heeft) die ook.
    m.volledig = m.priGeladen && (!periodeZak || m.zakGeladen);
    m.boekingen.uitgaven = [...(m.boekingen.viaPrive || []), ...(m.boekingen.viaZak || [])];
  }
  // Privé-inkomenskolommen alleen als er in dit jaar ook echt iets in staat.
  const kolommen = INKOMEN_KOLOMMEN.filter((c) => c.soort === "zakelijk" ? !!periodeZak || maanden.some((m) => m[c.key] !== 0) : maanden.some((m) => m[c.key] !== 0));
  const volledig = maanden.filter((m) => m.volledig);
  const som = (k, lijst) => r2(lijst.reduce((a, m) => a + m[k], 0));
  const sleutels = [...kolommen.map((c) => c.key), "prive", "totaal", "zakKosten", "viaPrive", "viaZak", "uitgaven", "verschil"];
  // Totalen en gemiddelden ALLEEN over de volledige maanden (inkomen én uitgaven), zodat ze vergelijkbaar zijn.
  const totalen = Object.fromEntries(sleutels.map((k) => [k, som(k, volledig)]));
  const gemiddeld = Object.fromEntries(sleutels.map((k) => [k, volledig.length ? r2(som(k, volledig) / volledig.length) : null]));
  const soortLijst = Object.entries(soorten)
    .map(([soort, s]) => ({ soort, bedrag: r2(s.bedrag), boekingen: s.boekingen.sort((a, b) => a.tx.date - b.tx.date) }))
    .sort((a, b) => b.bedrag - a.bedrag);
  return {
    maanden, kolommen, totalen, gemiddeld, aantalVolledig: volledig.length, isBV,
    volledigeMaanden: volledig.map((m) => m.maand),
    heeftPriveInkomen: kolommen.some((c) => c.soort === "prive"),
    omzetJaar: { excl: som("omzetExcl", maanden), incl: som("omzetIncl", maanden) },
    zakelijkInDossier: !!periodeZak, priveInDossier: !!periodePri,
    zakVanPrive: som("zakVanPrive", volledig),
    soorten: soortLijst, soortenTotaal: r2(soortLijst.reduce((a, s) => a + s.bedrag, 0)),
  };
}
