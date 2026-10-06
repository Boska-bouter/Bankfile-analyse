// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { computeBelastbareWinstUitsplitsing, estimateHeffingskortingenMetOndernemersaftrek, estimateIncomeTaxMetOndernemersaftrek, estimateZvwMetOndernemersaftrek } from "../tax/incomeTax.js";

export function useDashboardAangifteIndicatie(p) {
  const {
    activeYear, ondernemersaftrekPerJaar, rechtsvorm, startersaftrekStatus, yearlySummary,
  } = p;

  return useMemo(() => {
    if (rechtsvorm === "bv" || !activeYear || !yearlySummary) return null;
    const aftrek = ondernemersaftrekPerJaar[activeYear];
    const startersaftrekToegepastDitJaar = startersaftrekStatus?.[activeYear] === "ja";
    const ondernemersaftrekBedrag = aftrek ? aftrek.zelfstandigenaftrekBedrag + aftrek.startersaftrekBedrag : 0;
    const winstUitsplitsing = computeBelastbareWinstUitsplitsing(yearlySummary.winst, activeYear, ondernemersaftrekBedrag, startersaftrekToegepastDitJaar);
    return {
      ib: estimateIncomeTaxMetOndernemersaftrek(yearlySummary.winst, activeYear, ondernemersaftrekBedrag, startersaftrekToegepastDitJaar),
      zvw: estimateZvwMetOndernemersaftrek(yearlySummary.winst, activeYear, ondernemersaftrekBedrag, startersaftrekToegepastDitJaar),
      // Toegevoegd zodat de "Indicatieve aangifte"-kaart (DetailsPanel.jsx/IndicatieveAangifteCard.jsx)
      // onder "Totaal belasting en premies" ook laat zien wélke heffingskorting daar al in is verrekend
      // — zonder dit veld leek "Totaal" alleen IB + Zvw te zijn, zonder de aftrek die daar al in zit.
      heffingskortingen: estimateHeffingskortingenMetOndernemersaftrek(yearlySummary.winst, activeYear, ondernemersaftrekBedrag, startersaftrekToegepastDitJaar),
      zelfstandigenaftrekBedrag: aftrek?.zelfstandigenaftrekBedrag || 0,
      startersaftrekBedrag: aftrek?.startersaftrekBedrag || 0,
      mkbVrijstellingBedrag: winstUitsplitsing.mkbVrijstellingBedrag,
      // Toegevoegd voor de "Indicatieve aangifte"-kaart in DetailsPanel.jsx (Overzicht-tabblad,
      // sub-tab Jaaroverzicht) — dezelfde belastbare winst als in winstUitsplitsing, alleen nog niet
      // apart doorgegeven.
      belastbareWinst: winstUitsplitsing.belastbaar,
    };
  }, [rechtsvorm, activeYear, yearlySummary, ondernemersaftrekPerJaar, startersaftrekStatus]);
}
