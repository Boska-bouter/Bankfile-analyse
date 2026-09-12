import { useMemo } from "react";
import { computeLoanSummary, computeLeaseSummary } from "../tax/loanAmortization.js";

// Bundelt de leningen/lease-logica (samenvattingen + correctie-handlers) die verder los staat
// van de rest van de app — de ruwe state (loanDetails/leaseDetails/...) en de persistence
// daarvan blijven bewust in App.jsx, dit hook-bestand voegt alleen de handelingen erop toe.
export function useLoansAndLease({
  classified, setLoanDetails, setLeaseDetails, setConfirmedLeaseTypeKeys, setLeaseDetailsModalKey,
  snapshotBeforeAction, setCounterpartyOverride,
}) {
  const loanSummary = useMemo(() => computeLoanSummary(classified), [classified]);
  const leaseSummary = useMemo(() => computeLeaseSummary(classified), [classified]);

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
    setCounterpartyOverride(lease.name, lease.transactions[0].amount, {
      category: type === "financieel" ? "Lease (financieel)" : "Lease (operationeel)",
      type: "Zakelijk",
    });
    setConfirmedLeaseTypeKeys((prev) => (prev.includes(lease.key) ? prev : [...prev, lease.key]));
    if (type === "financieel") setLeaseDetailsModalKey(lease.key);
  };

  return {
    loanSummary, leaseSummary,
    setLoanDetailField, markLoanUnknown, unmarkLoanUnknown,
    setLeaseDetailField, markLeaseUnknown, unmarkLeaseUnknown, confirmLeaseType,
  };
}
