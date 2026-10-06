// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { INCOME_TRANSFER_CATEGORIES } from "../classification/categories.js";
import { combineAutoKosten, computeAutoActivaKostenVoorJaar } from "../tax/autoActiva.js";
import { computeActivaAfschrijvingForYear } from "../tax/activa.js";
import { computeFinancialLeaseRate, computeOnbetaaldGedeelteKoop } from "../tax/financialLease.js";
import { computeGedeeldeEnergieVoorJaar, computeGedeeldeGemeentelijkeKostenVoorJaar, computeGedeeldeHuurVoorJaar } from "../tax/gedeeldeHuur.js";
import { computeKmVergoedingVoorJaar } from "../tax/kmVergoeding.js";
import { computeLeaseAutoKostenVoorJaar } from "../tax/autoBijtelling.js";
import { computeLeaseRenteForYear, computeLoanRenteForYear } from "../tax/loanAmortization.js";
import { computeYearlySummary } from "../tax/yearlySummary.js";

export function useYearlySummaries(p) {
  const {
    activaDetails, activaSummary, autoActivaDetails, autoStatus, autoWizardStatus,
    btwVerlegd, categoryZakelijkPercentageEff, classified, effectiveCategoryBtwRates, energieZakelijkPercentageStatus,
    fixedCategories, gemeentelijkeKostenZakelijkPercentageStatus, heeftLeaseAutoDossierBreed, huurZakelijkPercentageStatus, kmVergoedingDetails,
    leaseDetails, leaseSummary, loanDetails, loanSummary, rechtsvorm,
    voorbelastingExcluded, years,
  } = p;

  return useMemo(() => {
    const map = {};
    for (const y of years) {
      const loanRente = computeLoanRenteForYear(loanSummary, loanDetails, y);
      const leaseRente = computeLeaseRenteForYear(leaseSummary, leaseDetails, y, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
      const renteAftrekbaar = (loanRente?.totaalRente || 0) + (leaseRente?.totaalRente || 0);
      const leaseAutoKosten = rechtsvorm !== "bv"
        ? combineAutoKosten(
            computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, y, classified, effectiveCategoryBtwRates, btwVerlegd),
            computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, y, classified, effectiveCategoryBtwRates, btwVerlegd)
          )
        : null;
      const gedeeldeHuur = computeGedeeldeHuurVoorJaar(classified, y, huurZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      // v291 — zelfde correctie, nu ook voor "Energie-water (deels zakelijk)"/"Gemeentelijke kosten
      // (deels zakelijk)" (zie tax/gedeeldeHuur.js).
      const gedeeldeEnergie = computeGedeeldeEnergieVoorJaar(classified, y, energieZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      const gedeeldeGemeentelijkeKosten = computeGedeeldeGemeentelijkeKostenVoorJaar(classified, y, gemeentelijkeKostenZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      const kmVergoeding = rechtsvorm !== "bv" ? computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, y) : null;
      // "Zakelijk - apparatuur/machines" telt niet als volledige kosten mee in yearlySummary.js — de
      // daadwerkelijk berekende afschrijving moet daarom hier worden meegeteld, exact dezelfde
      // constructie als de financiële-lease-afschrijving.
      const activaAfschrijving = computeActivaAfschrijvingForYear(activaSummary, activaDetails, y);
      const winstCorrectie =
        (leaseAutoKosten?.winstCorrectie || 0) - (gedeeldeHuur?.nietAftrekbaarBedrag || 0) -
        (gedeeldeEnergie?.nietAftrekbaarBedrag || 0) - (gedeeldeGemeentelijkeKosten?.nietAftrekbaarBedrag || 0) +
        (kmVergoeding?.bedrag || 0) + (activaAfschrijving?.totaalAfschrijving || 0);
      map[y] = computeYearlySummary(classified, y, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, INCOME_TRANSFER_CATEGORIES, voorbelastingExcluded, renteAftrekbaar, winstCorrectie, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed);
    }
    return map;
  }, [years, classified, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, voorbelastingExcluded, loanSummary, loanDetails, leaseSummary, leaseDetails, rechtsvorm, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, activaSummary, activaDetails]);
}
