import { extractDescriptionDate } from "../utils/normalization.js";

// Bouwt de aangifte-checklist-data voor één jaar — hergebruikt voor zowel het actieve jaar in de
// hoofdweergave als voor het meerjarige Aangiftevoorstel.
export function computeChecklistLikeDataForYear(zakItems, priItems, quartersForYear, kwartaalStatus) {
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

  const priveTransferOrphans = priItems.filter(
    (tx) => !tx.isMirror && (tx.category === "Uitbetaling aan prive" || tx.category === "Prive opnames" || tx.category === "Terugboeking van prive")
  );
  const priveMirrorIds = new Set(priItems.filter((tx) => tx.isMirror).map((tx) => tx.id));
  const priveTransferMissingMirrors = zakItems.filter(
    (tx) =>
      (tx.category === "Uitbetaling aan prive" || tx.category === "Prive opnames" || tx.category === "Terugboeking van prive") &&
      !priveMirrorIds.has(`${tx.id}-prive-spiegel`)
  );

  return {
    overigCount, totalCount, categorizedPct, quartersForYear, quartersOpen, quartersNietAangegeven, quartersAangegevenNietBetaald, apparatuurInvestering, leaseFinancieelTotal,
    monthsMissingLH, loonheffingBoetes, totaalNettoLoon, totaalLH, loonheffingPct, loonheffingInVerwachteBereik,
    inkomstenAndereKwartaal, priveTransferOrphans, priveTransferMissingMirrors,
  };
}

