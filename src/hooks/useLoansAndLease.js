import { useMemo } from "react";
import { computeLoanSummary, computeLeaseSummary } from "../tax/loanAmortization.js";

// Twee leaseovereenkomsten kunnen in de bank onder verschillende tegenpartijnamen verschijnen
// (bijv. de eerste afschrijving anders benoemd dan de maandelijkse termijnen) — automatisch
// samenvoegen op basis van gelijkenis is te riskant (kan onterecht twee verschillende leases
// samenvoegen), dus dit blijft een bewuste, handmatige keuze (zie mergeLeaseInto in App.jsx).
// "bron" verdwijnt uit de lijst; zijn transacties en totaal gaan over naar "doel".
// Werkt op een KOPIE van elk item (nooit de meegegeven leaseSummary zelf muteren) — anders zou een
// hergebruikte/gecachte "ruwe" (nog niet samengevoegde) lijst per ongeluk mee-muteren, met een
// dubbeltelling tot gevolg zodra dezelfde ruwe lijst een volgende keer weer als basis dient (zie
// rawLeaseSummary hieronder, die nodig is om een samenvoeging weer ongedaan te kunnen maken).
function applyLeaseMerges(leaseSummary, leaseMergedInto) {
  if (!leaseMergedInto || Object.keys(leaseMergedInto).length === 0) return leaseSummary;
  const byKey = Object.fromEntries(leaseSummary.map((l) => [l.key, { ...l, transactions: [...l.transactions] }]));
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
  return leaseSummary.filter((l) => !merged.has(l.key)).map((l) => byKey[l.key]);
}

// Bundelt de leningen/lease-logica (samenvattingen + correctie-handlers) die verder los staat
// van de rest van de app — de ruwe state (loanDetails/leaseDetails/...) en de persistence
// daarvan blijven bewust in App.jsx, dit hook-bestand voegt alleen de handelingen erop toe.
export function useLoansAndLease({
  classified, setLoanDetails, setLeaseDetails, setConfirmedLeaseTypeKeys, setLeaseDetailsModalKey,
  snapshotBeforeAction, setCounterpartyOverride, leaseMergedInto = {}, setLeaseMergedInto,
}) {
  const loanSummary = useMemo(() => computeLoanSummary(classified), [classified]);
  // Leningen die eerder expliciet als privé zijn aangemerkt ("Leningen (privé)") — apart
  // bijgehouden zodat LoanInterestPanel.jsx ook voor déze leningen nog een "toch zakelijk"-knop kan
  // tonen. Zonder dit zou zo'n lening, eenmaal op "Leningen (privé)" gezet, volledig uit het
  // leningenoverzicht verdwijnen en alleen nog via de algemene categorie-editor terug te zetten
  // zijn — dat kan nog steeds, maar dit maakt het ook rechtstreeks vanuit dit paneel mogelijk.
  const privateLoanSummary = useMemo(() => computeLoanSummary(classified, "Leningen (privé)"), [classified]);
  // Ongesamenvoegde (ruwe) lijst apart bewaard — nodig om bij "Loskoppelen" nog te weten hoe een
  // eerder samengevoegde bron-lease heette (die is in leaseSummary hieronder niet meer zichtbaar,
  // want die lijst toont juist het resultaat NA samenvoeging).
  const rawLeaseSummary = useMemo(() => computeLeaseSummary(classified), [classified]);
  const leaseSummary = useMemo(
    () => applyLeaseMerges(rawLeaseSummary, leaseMergedInto),
    [rawLeaseSummary, leaseMergedInto]
  );
  // Overzicht van actieve samenvoegingen, met de namen erbij (voor de "Loskoppelen"-knop in de
  // UI) — filtert automatisch samenvoegingen weg waarvan bron of doel niet meer bestaat (bijv. na
  // het wijzigen van classificatieregels, waardoor een lease-groep is opgesplitst of verdwenen).
  const leaseMerges = useMemo(() => {
    const rawByKey = Object.fromEntries(rawLeaseSummary.map((l) => [l.key, l]));
    return Object.entries(leaseMergedInto || {})
      .filter(([sourceKey, targetKey]) => rawByKey[sourceKey] && rawByKey[targetKey])
      .map(([sourceKey, targetKey]) => ({
        sourceKey, targetKey,
        sourceName: rawByKey[sourceKey].name,
        targetName: rawByKey[targetKey].name,
      }));
  }, [rawLeaseSummary, leaseMergedInto]);

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
    loanSummary, privateLoanSummary, leaseSummary, leaseMerges,
    setLoanDetailField, markLoanUnknown, unmarkLoanUnknown,
    setLeaseDetailField, markLeaseUnknown, unmarkLeaseUnknown, confirmLeaseType, mergeLeaseInto, undoMergeLease,
  };
}
