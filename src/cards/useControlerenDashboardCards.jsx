// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { AlertTriangle, Copy, FileSpreadsheet, HelpCircle, Users } from "lucide-react";

export function useControlerenDashboardCards(p) {
  const {
    confidenceSectionRef, confidenceSummary, controlerenImportProblemCount, duplicatePendingBreakdown, duplicatesSectionRef,
    importControleSectionRef, incomeReviewSectionRef, jumpToSection, overigReviewSectionRef, pendingDuplicateCount,
    pendingIncomeReview, pendingOverigReview, pendingPersonReview, personReviewSectionRef, setDismissedDuplicateNotice,
    setOpenConfidenceLevel, setShowOverigReview, setShowPersonReview, transactions,
  } = p;

  return useMemo(() => {
    if (transactions.length === 0) return [];
    return [
      {
        key: "importControle",
        title: "Import controle",
        icon: <FileSpreadsheet className="h-3.5 w-3.5" />,
        value: controlerenImportProblemCount,
        openCount: controlerenImportProblemCount,
        subtitle: controlerenImportProblemCount > 0 ? "bestand(en) met saldo-afwijking" : "Alle saldi kloppen",
        tone: controlerenImportProblemCount > 0 ? "attention" : "ok",
        hint: "Naar de importcontrole",
        onClick: () => jumpToSection(importControleSectionRef),
      },
      {
        key: "confidence",
        title: "Classificatie zekerheid",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        value: confidenceSummary.needsReview,
        openCount: confidenceSummary.needsReview,
        subtitle:
          confidenceSummary.needsReview > 0
            ? `${confidenceSummary.unclear} onduidelijk, ${confidenceSummary.review} controleren (${confidenceSummary.needsReviewTx} transacties)`
            : "Alles automatisch met vertrouwen ingedeeld",
        tone: confidenceSummary.needsReview > 0 ? "attention" : "ok",
        hint: "Transacties met onzekere classificatie bekijken",
        onClick: () => {
          if (confidenceSummary.needsReview > 0) setOpenConfidenceLevel(confidenceSummary.unclearExBulk > 0 || confidenceSummary.review === 0 ? "fallback" : "heuristic");
          jumpToSection(confidenceSectionRef);
        },
      },
      {
        // Fase 2 — deze stap (IncomeReviewStep, "van wie komt dit inkomen") had nog geen eigen
        // kaart/badge, terwijl het net als de andere controlestappen hier een open punt is dat
        // afgehandeld moet worden — hoort inhoudelijk (net als personReview) bij "Herkomst van
        // geld" uit het bouwvoorstel.
        key: "incomeReview",
        title: "Herkomst van inkomsten",
        icon: <Users className="h-3.5 w-3.5" />,
        value: pendingIncomeReview.length,
        openCount: pendingIncomeReview.length,
        subtitle: pendingIncomeReview.length > 0 ? "nog te bepalen (zakelijk/privé)" : "Niets openstaand",
        tone: pendingIncomeReview.length > 0 ? "attention" : "ok",
        hint: "Openstaande herkomst-van-inkomsten bekijken",
        onClick: () => jumpToSection(incomeReviewSectionRef),
      },
      {
        key: "personReview",
        title: "Overboekingen aan personen",
        icon: <Users className="h-3.5 w-3.5" />,
        value: pendingPersonReview.length,
        openCount: pendingPersonReview.length,
        subtitle: pendingPersonReview.length > 0 ? "nog te bepalen" : "Niets openstaand",
        tone: pendingPersonReview.length > 0 ? "attention" : "ok",
        hint: "Openstaande overboekingen aan personen bekijken",
        onClick: () => {
          if (pendingIncomeReview.length > 0) { jumpToSection(incomeReviewSectionRef); return; }
          setShowPersonReview(true);
          jumpToSection(personReviewSectionRef);
        },
      },
      {
        key: "overigReview",
        title: '"Overig" opruimen',
        icon: <HelpCircle className="h-3.5 w-3.5" />,
        value: pendingOverigReview.length,
        openCount: pendingOverigReview.length,
        subtitle: pendingOverigReview.length > 0 ? "tegenpartij(en) nog te bepalen" : "Niets openstaand",
        tone: pendingOverigReview.length > 0 ? "attention" : "ok",
        hint: 'Openstaande "Overig"-tegenpartijen bekijken',
        onClick: () => {
          setShowOverigReview(true);
          jumpToSection(overigReviewSectionRef);
        },
      },
      {
        key: "duplicates",
        title: "Duplicaten",
        icon: <Copy className="h-3.5 w-3.5" />,
        value: pendingDuplicateCount,
        // Open punt = wat je zelf nog moet beoordelen (de toon van de kaart volgt dezelfde regel);
        // "alle bevestigd — nog te verwijderen" is een opruimactie, geen open controlepunt.
        openCount: duplicatePendingBreakdown.onzeker,
        subtitle:
          duplicatePendingBreakdown.onzeker > 0
            ? `${duplicatePendingBreakdown.onzeker} zelf te beoordelen`
            : pendingDuplicateCount > 0
            ? "alle bevestigd — nog te verwijderen"
            : "Geen gevonden",
        tone: duplicatePendingBreakdown.onzeker > 0 ? "attention" : "ok",
        hint: "Mogelijk dubbele transacties bekijken",
        onClick: () => {
          if (pendingDuplicateCount > 0) setDismissedDuplicateNotice(false);
          jumpToSection(duplicatesSectionRef);
        },
      },
    ];
  }, [
    transactions.length,
    controlerenImportProblemCount,
    confidenceSummary,
    pendingIncomeReview.length,
    pendingPersonReview.length,
    pendingOverigReview.length,
    pendingDuplicateCount,
    duplicatePendingBreakdown,
  ]);
}
