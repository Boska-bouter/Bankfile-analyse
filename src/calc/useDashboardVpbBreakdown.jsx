// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";


export function useDashboardVpbBreakdown(p) {
  const {
    activeYear, quarterlyBtwData, rechtsvorm, yearlySummary,
  } = p;

  return useMemo(() => {
    if (!activeYear || !yearlySummary) return null;
    const omzetExclBtw = yearlySummary.zakelijkeInkomstenNetto || 0;
    const btwOverOmzetTotaal = quarterlyBtwData.reduce((a, q) => a + (q.verschuldigdBtw21 || 0) + (q.verschuldigdBtw9 || 0), 0);
    const omzetInclBtw = omzetExclBtw + btwOverOmzetTotaal;
    const zakelijkeKosten = omzetExclBtw - yearlySummary.winst;
    const gebruikt21 = quarterlyBtwData.some((q) => (q.verschuldigdBtw21 || 0) > 0);
    const gebruikt9 = quarterlyBtwData.some((q) => (q.verschuldigdBtw9 || 0) > 0);
    const btwTariefLabel = gebruikt21 && gebruikt9 ? "21% en 9%" : gebruikt9 ? "9%" : "21%";
    return { omzetInclBtw, omzetExclBtw, zakelijkeKosten, btwTariefLabel, toonOmzetInclBtw: btwOverOmzetTotaal > 0 };
  }, [rechtsvorm, activeYear, yearlySummary, quarterlyBtwData]);
}
