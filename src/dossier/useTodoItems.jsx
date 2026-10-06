// "Werk te doen" — bundelt de belangrijkste openstaande signalen (uit App.jsx gehaald, stap 4 van de opsplitsing).
import { useMemo } from "react";
import { isCompleteFinancialLeaseDetails } from "../tax/financialLease.js";

export function useTodoItems({
    pendingDuplicateCount, dismissedDuplicateNotice, duplicatesSectionRef, pendingPersonReview, personReviewSectionRef,
    pendingOverigReview, overigReviewSectionRef, loanSummary, loanDetails, loansSectionRef, leaseSummary, leaseDetails,
    confirmedLeaseTypeKeys, leasesSectionRef, verwachteLease, setVerwachteLease, verwachteLeaseOverig, setVerwachteLeaseOverig,
    verwachteLening, setVerwachteLening, verwachteAOV, setVerwachteAOV, transactions, korRegeling, btwSettingsSectionRef,
    btwVerlegd, incomeBtwTarieven, meerdereTarievenBevestigd, incomeRatesSectionRef, confidenceSummary, confidenceSectionRef,
    activeYear, quarterlyBtwData, kwartaalStatus,
}) {
  return useMemo(() => {
    const items = [];
    if (pendingDuplicateCount > 0 && !dismissedDuplicateNotice) {
      items.push({ key: "duplicates", text: `${pendingDuplicateCount} mogelijk dubbele transactie(s)`, ref: duplicatesSectionRef });
    }
    if (pendingPersonReview.length > 0) {
      items.push({ key: "personReview", text: `${pendingPersonReview.length} overboeking(en) aan personen nog te bepalen`, ref: personReviewSectionRef });
    }
    if (pendingOverigReview.length > 0) {
      items.push({ key: "overigReview", text: `${pendingOverigReview.length} tegenpartij(en) nog te bepalen in "Overig"`, ref: overigReviewSectionRef });
    }
    // BTW-kwartalen nog niet aangegeven/betaald staat niet meer hier — dat is jaar-specifiek en
    // staat al in "Aangifte {jaar}" (aangifteOpenPunten), geen dubbele melding meer nodig.
    const incompleteLoans = loanSummary.filter((l) => !(loanDetails[l.key]?.leningbedrag && loanDetails[l.key]?.startdatum) && !loanDetails[l.key]?.onbekend);
    if (incompleteLoans.length > 0) {
      items.push({ key: "loans", text: `${incompleteLoans.length} lening(en) nog zonder volledige gegevens`, ref: loansSectionRef });
    }
    const incompleteLeases = leaseSummary.filter((l) => {
      if (!confirmedLeaseTypeKeys.includes(l.key)) return true;
      if (leaseDetails[l.key]?.onbekend) return false;
      return l.category === "Lease (financieel)" && !isCompleteFinancialLeaseDetails(leaseDetails[l.key]);
    });
    if (incompleteLeases.length > 0) {
      items.push({ key: "leases", text: `${incompleteLeases.length} lease(s) nog niet (volledig) bepaald`, ref: leasesSectionRef });
    }
    // Deze drie ("verwachte" lease/lening/AOV, uit de wizard) blijven een open punt totdat de
    // naam wordt teruggevonden in de transacties — maar bij een tikfout in de naam tijdens de
    // wizard (of als het toch niet relevant blijkt) gebeurt dat natuurlijk nooit. De wizard vraagt
    // dit maar één keer (zie SetupWizardModal: pas opnieuw als de state weer op null staat), dus
    // zonder een eigen manier om de naam hier te corrigeren of het punt te verwijderen bleef zo'n
    // open punt voor altijd hangen, met een "Ga erheen"-knop die nergens heen kan gaan als er
    // (door de verkeerde naam) sowieso geen lease/lening in de transacties herkend is.
    (verwachteLease || []).forEach((item, idx) => {
      if (!item.gevonden) {
        items.push({
          key: `verwachte-lease-${idx}`,
          text: `Je gaf aan dat er een leaseauto is${item.naam ? ` bij "${item.naam}"` : ""} — nog niet gevonden/bevestigd in de transacties`,
          ref: leasesSectionRef,
          naam: item.naam,
          onRename: (nieuweNaam) => setVerwachteLease((prev) => (prev || []).map((it, i) => (i === idx ? { ...it, naam: nieuweNaam } : it))),
          onRemove: () => setVerwachteLease((prev) => (prev || []).filter((_, i) => i !== idx)),
        });
      }
    });
    (verwachteLeaseOverig || []).forEach((item, idx) => {
      if (!item.gevonden) {
        items.push({
          key: `verwachte-lease-overig-${idx}`,
          text: `Je gaf aan dat er een ander leaseobject is${item.naam ? ` bij "${item.naam}"` : ""} — nog niet gevonden/bevestigd in de transacties`,
          ref: leasesSectionRef,
          naam: item.naam,
          onRename: (nieuweNaam) => setVerwachteLeaseOverig((prev) => (prev || []).map((it, i) => (i === idx ? { ...it, naam: nieuweNaam } : it))),
          onRemove: () => setVerwachteLeaseOverig((prev) => (prev || []).filter((_, i) => i !== idx)),
        });
      }
    });
    (verwachteLening || []).forEach((item, idx) => {
      if (!item.gevonden) {
        items.push({
          key: `verwachte-lening-${idx}`,
          text: `Je gaf aan dat er een zakelijke lening is${item.naam ? ` bij "${item.naam}"` : ""} — nog niet gevonden/bevestigd in de transacties`,
          ref: loansSectionRef,
          naam: item.naam,
          onRename: (nieuweNaam) => setVerwachteLening((prev) => (prev || []).map((it, i) => (i === idx ? { ...it, naam: nieuweNaam } : it))),
          onRemove: () => setVerwachteLening((prev) => (prev || []).filter((_, i) => i !== idx)),
        });
      }
    });
    if (verwachteAOV?.status === "ja" && !verwachteAOV.gevonden) {
      items.push({
        key: "verwachte-aov",
        text: `Je gaf aan dat er een AOV is${verwachteAOV.naam ? ` bij "${verwachteAOV.naam}"` : ""} — nog niet gevonden/bevestigd in de transacties`,
        naam: verwachteAOV.naam,
        onRename: (nieuweNaam) => setVerwachteAOV((prev) => ({ ...prev, naam: nieuweNaam })),
        onRemove: () => setVerwachteAOV(null),
      });
    }
    if (transactions.length > 0 && korRegeling === null) {
      items.push({ key: "kor", text: "KOR-vraag nog niet beantwoord", ref: btwSettingsSectionRef });
    }
    if (transactions.length > 0 && korRegeling === false && btwVerlegd === null) {
      items.push({ key: "btwVerlegd", text: "BTW-verlegd-vraag nog niet beantwoord", ref: btwSettingsSectionRef });
    }
    if ((incomeBtwTarieven?.length || 0) > 1 && !meerdereTarievenBevestigd) {
      items.push({
        key: "meerdereTarieven",
        text: `Je gaf aan dat je omzet onder ${incomeBtwTarieven.length} verschillende BTW-tarieven valt — controleer welke klanten bij welk tarief horen`,
        ref: incomeRatesSectionRef,
      });
    }
    if (confidenceSummary.needsReview > 0) {
      items.push({
        key: "confidence",
        text: `${confidenceSummary.needsReview} groep(en) (${confidenceSummary.needsReviewTx} transacties) met onzekere classificatie — controleren`,
        ref: confidenceSectionRef,
      });
    }
    // IB/IH- en Zvw-status "nog niet gedaan" staat niet meer hier — dat is jaar-specifiek en staat
    // al in "Aangifte {jaar}" (aangifteOpenPunten), geen dubbele melding meer nodig.
    return items;
  }, [
    pendingDuplicateCount, dismissedDuplicateNotice, pendingPersonReview, pendingOverigReview,
    activeYear, korRegeling, quarterlyBtwData, kwartaalStatus, transactions, btwVerlegd,
    loanSummary, loanDetails, leaseSummary, leaseDetails, confirmedLeaseTypeKeys,
    confidenceSummary, verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV,
    incomeBtwTarieven, meerdereTarievenBevestigd,
  ]);
}
