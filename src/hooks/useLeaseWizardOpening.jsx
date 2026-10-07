// Lease-wizard (financial lease): state, openen en het automatisch openen/bevestigen. Uit App.jsx gehaald.
//
// Openingsregels: (1) automatisch bij "Ga naar deze stap" of het openen van de kaart Bedrijfsmiddelen,
// maar alleen als er nog niets is ingevuld (en de lease niet op "onbekend" staat); (2) nooit automatisch
// bij bestaande gegevens; (3) altijd handmatig te starten, ook voor een nieuw contract.
import { useRef, useState } from "react";
import FinancialLeaseWizard from "../components/loans/FinancialLeaseWizard.jsx";
import { getLeaseSegments } from "../tax/financialLease.js";
import { extractKeywordCandidate } from "../utils/normalization.js";

// Bepaalt welke lease de wizard automatisch moet openen / als type bevestigd moet krijgen.
// Geeft { key, bevestig?, lease? } of null.
export function bepaalLeaseWizardKandidaat({ leaseSummary, confirmedLeaseTypeKeys, leaseDetails, autoWizardStatus, verwachteLease, verwachteLeaseOverig }) {
  // Antwoorden uit de nieuw-dossier-wizard gelden als bevestiging van het lease-type:
  //  1) namen bij "leaseauto (financieel)" en "ander financieel leaseobject" = financial: een nog niet
  //     bevestigde lease waarvan de tegenpartij(en) die naam bevatten, wordt financieel bevestigd;
  //  2) zonder namen: autoWizardStatus.soort (financial/operational) alleen als er precies één nog
  //     onbevestigde lease is én er geen andere genoemde leaseobjecten zijn (anders is niet te weten welke de auto is).
  const onbevestigd = leaseSummary.filter((x) => !confirmedLeaseTypeKeys.includes(x.key));
  const genoemd = [...(verwachteLease || []), ...(verwachteLeaseOverig || [])].map((i) => i?.naam).filter(Boolean);
  const sleutelsVan = (naam) => {
    const t = String(naam).trim().toLowerCase();
    const kw = extractKeywordCandidate(naam) || (t.length >= 3 ? t : "");
    return kw;
  };
  const naamMatch = (lease) => genoemd.some((naam) => {
    const kw = sleutelsVan(naam);
    if (!kw) return false;
    const kort = kw.length < 4 ? new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`) : null;
    return lease.transactions.some((t) => {
      const txt = `${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase();
      return kort ? kort.test(txt) : txt.includes(kw);
    });
  });
  const genoemdeLease = onbevestigd.find(naamMatch);
  if (genoemdeLease) return { key: genoemdeLease.key, bevestig: "financieel", lease: genoemdeLease };
  const soortAuto = autoWizardStatus?.soort;
  if ((soortAuto === "financial" || soortAuto === "operational") && onbevestigd.length === 1 && genoemd.length === 0) {
    return { key: onbevestigd[0].key, bevestig: soortAuto === "financial" ? "financieel" : "operationeel", lease: onbevestigd[0] };
  }
  const l = leaseSummary.find((x) => {
    if (x.category !== "Lease (financieel)" || !confirmedLeaseTypeKeys.includes(x.key)) return false;
    const d = leaseDetails[x.key];
    if (d?.onbekend) return false;
    return !getLeaseSegments(d).some((s) => s && (s.koopprijs || s.looptijd || s.maandbedrag || s.startdatum));
  });
  return l ? { key: l.key } : null;
}

export function useLeaseWizardOpening() {
  const [leaseWizard, setLeaseWizard] = useState(null); // { key, nieuw, contract, stap } of null
  const openLeaseWizard = (key, opts) => setLeaseWizard((prev) => (
    prev && prev.key === key && !opts?.nieuw && opts?.contract == null && !opts?.stap && !opts?.soort
      ? prev
      : { key, nieuw: !!opts?.nieuw, contract: opts?.contract ?? null, stap: opts?.stap ?? null, soort: opts?.soort ?? null }
  ));
  // Verversd bij elke render van App (zie `registreer`): de kandidaat-bepaling leest zo altijd actuele data.
  const contextRef = useRef(null);
  const registreer = (ctx) => { contextRef.current = ctx; };
  const autoOpenLeaseWizard = () => {
    const ctx = contextRef.current;
    if (!ctx) return;
    const k = bepaalLeaseWizardKandidaat(ctx);
    if (!k) return;
    if (k.bevestig) { setTimeout(() => contextRef.current?.confirmLeaseType?.(k.lease, k.bevestig), 250); return; } // financieel opent de wizard zelf
    setTimeout(() => openLeaseWizard(k.key), 150);
  };
  const renderLeaseWizard = ({ leaseSummary, leaseDetails, confirmedLeaseTypeKeys, confirmLeaseType, setLeaseDetailField, setLeaseDetailsModalKey }) => {
    if (!leaseWizard) return null;
    const lease = leaseSummary.find((l) => l.key === leaseWizard.key);
    if (!lease) return null;
    return (
      <FinancialLeaseWizard
        key={leaseWizard.key + (leaseWizard.nieuw ? "-nieuw" : "") + (leaseWizard.contract != null ? `-c${leaseWizard.contract}` : "") + (leaseWizard.stap ? `-${leaseWizard.stap}` : "") + (leaseWizard.soort ? `-${leaseWizard.soort}` : "")}
        lease={lease}
        details={leaseDetails[leaseWizard.key]}
        typeConfirmed={confirmedLeaseTypeKeys.includes(leaseWizard.key)}
        onConfirmType={confirmLeaseType}
        onSave={setLeaseDetailField}
        onClose={() => setLeaseWizard(null)}
        onOpenAdvanced={setLeaseDetailsModalKey}
        nieuwContract={leaseWizard.nieuw}
        startContract={leaseWizard.contract}
        startStap={leaseWizard.stap}
        nieuwSoort={leaseWizard.soort}
      />
    );
  };
  return { openLeaseWizard, autoOpenLeaseWizard, registreer, renderLeaseWizard };
}
