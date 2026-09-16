import { useMemo } from "react";
import { computeLoanSummary, computeLeaseSummary } from "../tax/loanAmortization.js";

// Twee leaseovereenkomsten kunnen in de bank onder verschillende tegenpartijnamen verschijnen
// (bijv. de eerste afschrijving anders benoemd dan de maandelijkse termijnen) — automatisch
// samenvoegen op basis van gelijkenis is te riskant (kan onterecht twee verschillende leases
// samenvoegen), dus dit blijft een bewuste, handmatige keuze (zie mergeLeaseInto in App.jsx).
// "bron" verdwijnt uit de lijst; zijn transacties en totaal gaan over naar "doel".
function applyLeaseMerges(leaseSummary, leaseMergedInto) {
  if (!leaseMergedInto || Object.keys(leaseMergedInto).length === 0) return leaseSummary;
  const byKey = Object.fromEntries(leaseSummary.map((l) => [l.key, l]));
  const merged = new Set();
  for (const [sourceKey, targetKey] of Object.entries(leaseMergedInto)) {
    const source = byKey[sourceKey];
    const target = byKey[targetKey];
    if (!source || !target || merged.has(sourceKey)) continue;
    target.transactions = [...target.transactions, ...source.transactions].sort((a, b) => a.date - b.date);
    target.total += source.total;
    target.count += source.count;
    merged.add(sourceKey);
  }
  return leaseSummary.filter((l) => !merged.has(l.key));
}

// Bundelt de leningen/lease-logica (samenvattingen + correctie-handlers) die verder los staat
// van de rest van de app — de ruwe state (loanDetails/leaseDetails/...) en de persistence
// daarvan blijven bewust in App.jsx, dit hook-bestand voegt alleen de handelingen erop toe.
export function useLoansAndLease({
  classified, setLoanDetails, setLeaseDetails, setConfirmedLeaseTypeKeys, setLeaseDetailsModalKey,
  snapshotBeforeAction, setCounterpartyOverride, leaseMergedInto = {}, setLeaseMergedInto,
}) {
  const loanSummary = useMemo(() => computeLoanSummary(classified), [classified]);
  const leaseSummary = useMemo(
    () => applyLeaseMerges(computeLeaseSummary(classified), leaseMergedInto),
    [classified, leaseMergedInto]
  );

  const setLoanDetailField = (key, newDetails) => {
    snapshotBeforeAction("Leninggegevens aangepast");
    setLoanDetails((prev) => ({ ...prev, [key]: newDetails }));
  };
  const markLoanUnknown = (key) => {
    snapshotBeforeAction("Lening op onbekend gezet");
    setLoanDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: true } }));
  };
  const unmarkLoanUnknown = (key) => {
    snapshotBeforeAction("Lening op onbekend gezet");
    setLoanDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: false } }));
  };

  const setLeaseDetailField = (key, newDetails) => {
    snapshotBeforeAction("Leasegegevens aangepast");
    setLeaseDetails((prev) => ({ ...prev, [key]: newDetails }));
  };
  const markLeaseUnknown = (key) => {
    snapshotBeforeAction("Lease op onbekend gezet");
    setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: true } }));
  };
  const unmarkLeaseUnknown = (key) => {
    snapshotBeforeAction("Lease op onbekend gezet");
    setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: false } }));
  };
  const confirmLeaseType = (lease, type) => {
    snapshotBeforeAction("Lease-type bevestigd");
    const category = type === "financieel" ? "Lease (financieel)" : "Lease (operationeel)";
    // Per transactie overriden, niet op lease.name (dat is de opgemaakte weergavenaam mét
    // "— contract 432633"-achtige toevoeging — die tekst komt in geen enkele bankomschrijving
    // letterlijk voor, dus een override daarop zou nooit een echte transactie raken).
    for (const tx of lease.transactions) {
      setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category, type: "Zakelijk" }, tx.counterpartyIban);
    }
    setConfirmedLeaseTypeKeys((prev) => (prev.includes(lease.key) ? prev : [...prev, lease.key]));
    if (type === "financieel") setLeaseDetailsModalKey(lease.key);
  };
  // Voegt twee lease-groepen samen die eigenlijk hetzelfde contract blijken te zijn (bijv.
  // verschillende tegenpartijnaam voor de eerste afschrijving vs. de maandelijkse termijnen).
  // De bron-groep verdwijnt, zijn transacties tellen voortaan mee bij de doel-groep.
  const mergeLeaseInto = (sourceKey, targetKey) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    snapshotBeforeAction("Lease-contracten samengevoegd");
    setLeaseMergedInto((prev) => ({ ...prev, [sourceKey]: targetKey }));
  };
  const undoMergeLease = (sourceKey) => {
    snapshotBeforeAction("Lease-samenvoeging ongedaan gemaakt");
    setLeaseMergedInto((prev) => {
      const next = { ...prev };
      delete next[sourceKey];
      return next;
    });
  };

  return {
    loanSummary, leaseSummary,
    setLoanDetailField, markLoanUnknown, unmarkLoanUnknown,
    setLeaseDetailField, markLeaseUnknown, unmarkLeaseUnknown, confirmLeaseType, mergeLeaseInto, undoMergeLease,
  };
}
