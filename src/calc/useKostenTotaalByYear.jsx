// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { combineAutoKosten, computeAutoActivaKostenVoorJaar } from "../tax/autoActiva.js";
import { computeActivaAfschrijvingForYear } from "../tax/activa.js";
import { computeFinancialLeaseRate, computeOnbetaaldGedeelteKoop } from "../tax/financialLease.js";
import { computeIbBoxMapping } from "../tax/boxMapping.js";
import { computeKmVergoedingVoorJaar } from "../tax/kmVergoeding.js";
import { computeLeaseAutoKostenVoorJaar } from "../tax/autoBijtelling.js";
import { computeLeaseRenteForYear, computeLoanRenteForYear } from "../tax/loanAmortization.js";
import { fiscalTreatmentOf } from "../classification/categories.js";

export function useKostenTotaalByYear(p) {
  const {
    activaDetails, activaSummary, autoActivaDetails, autoStatus, autoWizardStatus,
    btwVerlegd, categoryZakelijkPercentageEff, classified, effectiveCategoryBtwRates, kmVergoedingDetails,
    leaseDetails, leaseSummary, loanDetails, loanSummary, rechtsvorm,
    years,
  } = p;

  return useMemo(() => {
    const map = {};
    for (const y of years) {
      const zakItemsVoorJaar = classified.filter((tx) => !tx.isMirror && tx.year === y && fiscalTreatmentOf(tx.category) !== "geen");
      const loanRente = computeLoanRenteForYear(loanSummary, loanDetails, y);
      const leaseRente = computeLeaseRenteForYear(leaseSummary, leaseDetails, y, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
      const renteAftrekbaar = (loanRente?.totaalRente || 0) + (leaseRente?.totaalRente || 0);
      const activaAfschrijvingVoorJaar = computeActivaAfschrijvingForYear(activaSummary, activaDetails, y);
      const leaseAutoKosten = rechtsvorm !== "bv"
        ? combineAutoKosten(
            computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, y, classified, effectiveCategoryBtwRates, btwVerlegd),
            computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, y, classified, effectiveCategoryBtwRates, btwVerlegd),
            autoStatus, y
          )
        : null;
      const kmVergoeding = rechtsvorm !== "bv" ? computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, y) : null;
      const ib = computeIbBoxMapping(zakItemsVoorJaar, loanRente, leaseRente, activaAfschrijvingVoorJaar, effectiveCategoryBtwRates, btwVerlegd, leaseAutoKosten, y, categoryZakelijkPercentageEff, autoStatus, kmVergoeding);
      map[y] =
        (ib.inkoopkosten.totaal || 0) +
        (ib.afschrijvingen.berekendeApparatuurAfschrijving ?? ib.afschrijvingen.apparatuurInvestering ?? 0) +
        (ib.afschrijvingen.berekendeLeaseAfschrijving || 0) +
        (ib.autokostenOverig.totaal || 0) +
        ib.overigeBedrijfskosten.reduce((a, r) => a + (r.totaal || 0), 0) +
        ib.nogNietIngedeeld.reduce((a, r) => a + (r.totaal || 0), 0) +
        renteAftrekbaar -
        (ib.leaseAutoKosten?.onttrekking || 0);
    }
    return map;
  }, [years, classified, effectiveCategoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, activaSummary, activaDetails, rechtsvorm, categoryZakelijkPercentageEff, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails]);
}
