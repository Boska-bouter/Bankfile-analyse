import { extractDescriptionDate } from "../utils/normalization.js";
import { fiscalTreatmentOf, mainCategoryOf } from "../classification/categories.js";

// Categorieën die een bewuste geldbeweging tussen de zakelijke en de privésfeer zijn (drawings/
// stortingen) — die horen qua hoofdcategorie bij "Privé", maar zijn geen "verkeerde rekening": het
// IS precies de bedoeling dat deze op de zakelijke rekening staan met type "Zakelijk" (en op de
// privérekening met type "Prive"). Die moeten hier dus worden uitgesloten van het rekening-signaal.
const PRIVE_TRANSFER_CATEGORIES = [
  "Privé opnames", "Terugboeking van privé", // zakelijke kant
  "Ontvangen van zakelijk", "Terugboeking naar zakelijk", // privé kant (v213)
];
// Dezelfde overboeking heet sinds v213 aan elke kant anders (zie classify.js) — deze twee subsets
// zijn nodig omdat priveTransferOrphans/-MissingMirrors hieronder bewust per kant een andere naam
// verwachten (een privérekening kan zelf nooit "Privé opnames"/"Terugboeking van privé" krijgen).
const PRIVE_TRANSFER_CATEGORIES_ZAKELIJK = ["Privé opnames", "Terugboeking van privé"];
const PRIVE_TRANSFER_CATEGORIES_PRIVE = ["Ontvangen van zakelijk", "Terugboeking naar zakelijk"];

// Bouwt de aangifte-checklist-data voor één jaar — hergebruikt voor zowel het actieve jaar in de
// hoofdweergave als voor het meerjarige Aangiftevoorstel.
// `priveRekeningGeladen` (optioneel, standaard false voor bestaande aanroepen): is er daadwerkelijk
// een privérekening-BESTAND geladen in dit dossier (ongeacht het jaar)? Zolang dat niet zo is,
// genereert de app voor elke "Privé opnames"/"Uitbetaling aan prive"/"Terugboeking van privé"-
// boeking op de zakelijke rekening een spiegelboeking met het vaste id-achtervoegsel
// "-prive-spiegel" (zie App.jsx) — priveTransferOrphans/priveTransferMissingMirrors hieronder
// controleren of die spiegel er inderdaad is. Zodra de privérekening ZELF ook geladen is, wordt
// die spiegel bewust NIET meer aangemaakt (de echte transactie aan de privékant is dan al zijn eigen
// tegenboeking) — zonder deze vlag zou dat elke keer ten onrechte als "ontbrekende spiegel"/"wees"
// worden gerapporteerd, voor exact de transacties die al correct aan elkaar gekoppeld zijn. De
// aggregaat-controle "Uitbetaling aan prive"/"Privé opnames" (zie App.jsx) blijft in dat geval de
// vangnet-check voor een echte mismatch.
export function computeChecklistLikeDataForYear(zakItems, priItems, quartersForYear, kwartaalStatus, priveRekeningGeladen = false) {
  const allYearItems = [...zakItems, ...priItems];
  const overigCount = allYearItems.filter((tx) => tx.category === "Overig").length;
  const totalCount = allYearItems.length;
  const categorizedPct = totalCount === 0 ? 100 : Math.round(((totalCount - overigCount) / totalCount) * 100);

  const quartersOpen = quartersForYear.filter((q) => {
    const s = kwartaalStatus[`${q.year}-Q${q.kwartaal}`] || {};
    return !s.aangegeven || !s.betaald;
  });
  const quartersNietAangegeven = quartersOpen.filter((q) => {
    const s = kwartaalStatus[`${q.year}-Q${q.kwartaal}`] || {};
    return !s.aangegeven;
  });
  const quartersAangegevenNietBetaald = quartersOpen.filter((q) => {
    const s = kwartaalStatus[`${q.year}-Q${q.kwartaal}`] || {};
    return s.aangegeven && !s.betaald;
  });

  const apparatuurInvestering = Math.abs(
    zakItems.filter((tx) => tx.category === "Zakelijk - apparatuur/machines").reduce((a, tx) => a + tx.amount, 0)
  );
  const leaseFinancieelTotal = Math.abs(
    zakItems.filter((tx) => tx.category === "Lease (financieel)").reduce((a, tx) => a + tx.amount, 0)
  );

  const loonMonths = [...new Set(zakItems.filter((tx) => tx.category === "Uitbetalen loon").map((tx) => tx.month))].sort();
  const lhMonths = new Set(zakItems.filter((tx) => tx.category === "Belastingen: LH").map((tx) => tx.month));
  const monthsMissingLH = loonMonths.filter((m) => {
    const [y, mo] = m.split("-").map(Number);
    const nextMonth = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
    return !lhMonths.has(m) && !lhMonths.has(nextMonth);
  });

  const loonheffingBoetes = zakItems.filter(
    (tx) =>
      (tx.category === "Belastingen: LH" || tx.category === "Belastingen: Naheffingen LH voorgaande jaren") &&
      `${tx.counterparty} ${tx.description} ${tx.fullDescription}`.toLowerCase().includes("boete")
  );

  const inkomstenAndereKwartaal = zakItems
    .filter((tx) => tx.category === "Zakelijke inkomsten")
    .map((tx) => {
      const descDate = extractDescriptionDate(tx);
      if (!descDate || descDate.getFullYear() !== tx.date.getFullYear()) return null;
      const txQuarter = Math.floor(tx.date.getMonth() / 3) + 1;
      const descQuarter = Math.floor(descDate.getMonth() / 3) + 1;
      if (descQuarter === txQuarter) return null;
      return { tx, descDate, txQuarter, descQuarter };
    })
    .filter(Boolean);

  const totaalNettoLoon = Math.abs(
    zakItems.filter((tx) => tx.category === "Uitbetalen loon").reduce((a, tx) => a + tx.amount, 0)
  );
  const totaalLH = Math.abs(
    zakItems.filter((tx) => tx.category === "Belastingen: LH").reduce((a, tx) => a + tx.amount, 0)
  );
  const loonheffingPct = totaalNettoLoon > 0 ? (totaalLH / (totaalNettoLoon + totaalLH)) * 100 : null;
  const LOONHEFFING_REFERENTIE_PCT = 30;
  const LOONHEFFING_MARGE_PCT = 10;
  const loonheffingInVerwachteBereik =
    loonheffingPct === null ? null : Math.abs(loonheffingPct - LOONHEFFING_REFERENTIE_PCT) <= LOONHEFFING_MARGE_PCT;

  // Zodra de privérekening zelf ook geladen is, wordt er bewust geen spiegel meer aangemaakt (zie
  // de toelichting bij `priveRekeningGeladen` hierboven) — dan hebben deze twee lijsten geen
  // betekenis meer (élke echte transactie zou anders ten onrechte als "wees"/"ontbrekend" gelden).
  const priveTransferOrphans = priveRekeningGeladen ? [] : priItems.filter(
    (tx) => !tx.isMirror && PRIVE_TRANSFER_CATEGORIES_PRIVE.includes(tx.category)
  );
  const priveMirrorIds = new Set(priItems.filter((tx) => tx.isMirror).map((tx) => tx.id));
  const priveTransferMissingMirrors = priveRekeningGeladen ? [] : zakItems.filter(
    (tx) =>
      PRIVE_TRANSFER_CATEGORIES_ZAKELIJK.includes(tx.category) &&
      !priveMirrorIds.has(`${tx.id}-prive-spiegel`)
  );

  // Een bijschrijving op de zakelijke rekening zonder enige omschrijving of tegenpartijnaam (leeg
  // MT940 ":86:"-veld, of een CSV-rij zonder naam/mededeling) wordt door de classificatie sowieso
  // als "Zakelijke inkomsten" aangenomen (elke bijschrijving op een zakelijke rekening telt als
  // omzet, tenzij er een reden is om dat niet te doen — zie autoClassify). Bij een lege omschrijving
  // is er alleen niets om die aanname aan te toetsen, dus is het de moeite waard om expliciet te
  // laten bevestigen in plaats van dat stilzwijgend te laten staan.
  const inkomstenZonderOmschrijving = zakItems.filter(
    (tx) =>
      !tx.isMirror &&
      tx.amount > 0 &&
      tx.category.startsWith("Zakelijke inkomsten") &&
      !(tx.counterparty || "").trim() &&
      !(tx.description || "").trim() &&
      !(tx.fullDescription || "").trim()
  );

  // "Verkeerde rekening gebruikt" — puur signalerend/educatief richting de cliënt (fiscaal is dit
  // al correct verwerkt, zie Route B / fiscalTreatmentOf in categories.js: de winst/BTW-berekening
  // rekent op basis van de categorie, niet van tx.type). `type` volgt sinds de fix altijd het
  // geregistreerde rekeningtype (zie classify.js) — dus een mismatch tussen `type` en de fiscale
  // aard van de categorie betekent nu betrouwbaar: hier is van de verkeerde rekening betaald/
  // ontvangen. Twee kanten:
  //  - een overduidelijk privé-categorie (hoofdcategorie "Privé"/"Persoonlijk & vertrouwelijk",
  //    behalve de drawings/stortingen-categorieën hierboven) die tóch op de ZAKELIJKE rekening
  //    terechtkwam;
  //  - een categorie met een echte fiscale zakelijke aard (omzet/kosten/financiering) die tóch op
  //    de PRIVÉrekening terechtkwam.
  // "Overig" (nog te beoordelen) en de neutrale/transfer-categorieën (belastingafdrachten, interne
  // overboeking zakelijk sparen, verkoop activa, "Overig") tellen bewust niet mee in beide kanten —
  // die zijn niet duidelijk genoeg zakelijk óf privé om als "verkeerde rekening" te bestempelen.
  const priveCategorieOpZakelijkeRekening = zakItems.filter(
    (tx) =>
      !tx.isMirror &&
      !PRIVE_TRANSFER_CATEGORIES.includes(tx.category) &&
      ["Privé", "Persoonlijk & vertrouwelijk"].includes(mainCategoryOf(tx.category))
  );
  const zakelijkeCategorieOpPriveRekening = priItems.filter(
    (tx) => !tx.isMirror && ["omzet", "kosten", "financiering"].includes(fiscalTreatmentOf(tx.category))
  );

  return {
    overigCount, totalCount, categorizedPct, quartersForYear, quartersOpen, quartersNietAangegeven, quartersAangegevenNietBetaald, apparatuurInvestering, leaseFinancieelTotal,
    monthsMissingLH, loonheffingBoetes, totaalNettoLoon, totaalLH, loonheffingPct, loonheffingInVerwachteBereik,
    inkomstenAndereKwartaal, priveTransferOrphans, priveTransferMissingMirrors, inkomstenZonderOmschrijving,
    priveCategorieOpZakelijkeRekening, zakelijkeCategorieOpPriveRekening,
  };
}

