import { CATEGORY_ORDER } from "../classification/categories.js";

// Welke categorieën in welk vak van de BTW-aangifte terechtkomen — puur informatief, gebaseerd
// op de eigen BTW-instellingen (percentages, uitgesloten van voorbelasting).
export function computeBtwBoxMapping(effectiveCategoryBtwRates, voorbelastingExcluded) {
  const omzetRate = effectiveCategoryBtwRates["Zakelijke inkomsten"];
  const voorbelastingCategorieen = CATEGORY_ORDER.filter(
    (c) => c !== "Zakelijke inkomsten" && !voorbelastingExcluded.includes(c) && (effectiveCategoryBtwRates[c] || 0) > 0
  );
  const uitgeslotenMetBtw = voorbelastingExcluded.filter((c) => (effectiveCategoryBtwRates[c] || 0) > 0);
  return { omzetRate, voorbelastingCategorieen, uitgeslotenMetBtw };
}

// Koppeling naar de aangifte inkomstenbelasting (winst uit onderneming, eenmanszaak/zzp) — welke
// categorieën horen bij welk onderdeel van het "Winst uit onderneming"-formulier. Geen vaste
// vaknummering zoals bij de BTW — de IB-winstaangifte werkt met uitklapbare rubrieken.
export function computeIbBoxMapping(zakItems) {
  const sumCat = (cats) => Math.abs(zakItems.filter((tx) => cats.includes(tx.category)).reduce((a, tx) => a + tx.amount, 0));
  const rubrieken = [
    { naam: "Omzet / opbrengsten", categorieen: ["Zakelijke inkomsten"], toelichting: "De omzet zoals aangegeven bij BTW vak 1a/1b/1e (excl. BTW)." },
    {
      naam: "Autokosten", categorieen: ["Autokosten", "Brandstof", "Parkeren", "Verzekering: Auto", "Lease (operationeel)"],
      toelichting: 'Bij een auto van de zaak: check privégebruik-bijtelling. "Lease (financieel)" van een auto staat apart hieronder (afschrijving + rente, niet de hele termijn).',
    },
    { naam: "Huisvestingskosten", categorieen: ["Huur", "Energie-water", "Gemeentelijke kosten"] },
    { naam: "Kantoor- en apparatuurkosten", categorieen: ["Zakelijk mobiel/internet", "Zakelijk overige abonnementen", "Onderhoud apparatuur/machines"] },
    { naam: "Verkoopkosten", categorieen: ["Marketing-website"] },
    { naam: "Personeelskosten", categorieen: ["Inhuur personeel", "Loonadministratie", "Uitbetalen loon"] },
    { naam: "Verzekeringen (overig)", categorieen: ["Verzekering: Overig", "Verzekering: Wonen", "Verzekering: Zakelijk", "Verzekering: Ziektekosten"] },
    { naam: "Rente en bankkosten", categorieen: ["Bankkosten"] },
    { naam: "Boekhouding en advies", categorieen: ["Boekhouder & advies"] },
    { naam: "Overige bedrijfskosten", categorieen: ["Zakelijke uitgaven", "Betaalautomaat kosten", "Reiskosten (OV)", "Webshops & online aankopen", "Winkels divers"] },
  ]
    .map((r) => ({ ...r, totaal: sumCat(r.categorieen) }))
    .filter((r) => r.totaal > 0);

  return {
    rubrieken,
    apparatuurInvestering: sumCat(["Zakelijk - apparatuur/machines"]),
    leaseFinancieelTotal: sumCat(["Lease (financieel)"]),
    leningenTotal: sumCat(["Leningen"]),
    naheffingOBTotal: sumCat(["Belastingen: Naheffingen OB voorgaande jaren"]),
    naheffingLHTotal: sumCat(["Belastingen: Naheffingen LH voorgaande jaren"]),
    naheffingIBTotal: sumCat(["Belastingen: Naheffingen IB voorgaande jaren"]),
  };
}
