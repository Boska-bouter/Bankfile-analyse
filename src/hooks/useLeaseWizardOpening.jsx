// Lease-wizard (financiële lease): state, openen en het automatisch openen/bevestigen. Uit App.jsx gehaald.
//
// Openingsregels: (1) automatisch bij "Ga naar deze stap" of het openen van de kaart Bedrijfsmiddelen,
// maar alleen als er nog niets is ingevuld (en de lease niet op "onbekend" staat); (2) nooit automatisch
// bij bestaande gegevens; (3) altijd handmatig te starten, ook voor een nieuw contract.
import { useRef, useState } from "react";
import { getLeaseSegments, isLeegSegment } from "../tax/financialLease.js";
import FinancialLeaseWizard from "../components/loans/FinancialLeaseWizard.jsx";
import { extractKeywordCandidate } from "../utils/normalization.js";

// Bepaalt welke lease de wizard automatisch moet openen / als type bevestigd moet krijgen.
// Geeft { key, bevestig?, lease? } of null.
function sleutelVan(naam) {
  const t = String(naam).trim().toLowerCase();
  return extractKeywordCandidate(naam) || (t.length >= 3 ? t : "");
}
export function leaseMatchtNaam(lease, naam) {
  const kw = sleutelVan(naam);
  if (!kw) return false;
  const kort = kw.length < 4 ? new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`) : null;
  return (lease.transactions || []).some((t) => {
    const txt = `${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase();
    return kort ? kort.test(txt) : txt.includes(kw);
  });
}
// Hoeveel contracten (per soort) zijn in de nieuw-dossier-wizard voor deze lease opgegeven? Dezelfde naam
// meerdere keren = meerdere contracten bij dezelfde maatschappij (bijv. bedrijfsbus + privéauto); verschillende
// namen die op dezelfde lease wijzen tellen als één.
function itemNamen(i) {
  return [i?.naam, ...(Array.isArray(i?.aliassen) ? i.aliassen : [])].filter(Boolean);
}
function verwachtAantal(lease, lijst) {
  // Elk item uit de wizard is één contract (met eventueel meerdere namen die bij dat contract horen).
  return (lijst || []).filter((i) => itemNamen(i).some((n) => leaseMatchtNaam(lease, n))).length;
}
// Welk contract moet er voor deze lease als eerstvolgende ingevuld worden? { soort, nieuw } of null als alles
// wat in de wizard is opgegeven al is ingevuld (of als er geen opgave is).
export function volgendContractVoor(lease, details, { verwachteLease, verwachteLeaseOverig }) {
  const segs = getLeaseSegments(details).filter(Boolean);
  const verwachtAuto = verwachtAantal(lease, verwachteLease);
  const verwachtMachine = verwachtAantal(lease, verwachteLeaseOverig);
  if (verwachtAuto + verwachtMachine === 0) return null;
  const heeftData = segs.some((sg) => sg.koopprijs || sg.looptijd || sg.maandbedrag || sg.startdatum);
  if (!heeftData) return { soort: verwachtAuto > 0 ? "auto" : "machine", nieuw: false };
  if (!segs.every((sg) => sg.koopprijs && sg.looptijd && sg.maandbedrag && sg.startdatum)) return null; // half ingevuld: niet automatisch doordrukken
  const klaarAuto = segs.filter((sg) => sg.soort !== "machine").length;
  const klaarMachine = segs.filter((sg) => sg.soort === "machine").length;
  if (klaarAuto < verwachtAuto) return { soort: "auto", nieuw: true };
  if (klaarMachine < verwachtMachine) return { soort: "machine", nieuw: true };
  return null;
}

export function bepaalLeaseWizardKandidaat({ leaseSummary, confirmedLeaseTypeKeys, leaseDetails, autoWizardStatus, verwachteLease, verwachteLeaseOverig }) {
  // Antwoorden uit de nieuw-dossier-wizard gelden als bevestiging van het lease-type:
  //  1) namen bij "leaseauto (financieel)" en "ander financieel leaseobject" = financial: een nog niet
  //     bevestigde lease waarvan de tegenpartij(en) die naam bevatten, wordt financieel bevestigd;
  //  2) zonder namen: autoWizardStatus.soort (financial/operational) alleen als er precies één nog
  //     onbevestigde lease is én er geen andere genoemde leaseobjecten zijn (anders is niet te weten welke de auto is).
  const onbevestigd = leaseSummary.filter((x) => !confirmedLeaseTypeKeys.includes(x.key));
  const genoemd = [...(verwachteLease || []), ...(verwachteLeaseOverig || [])].flatMap(itemNamen);
  // Leaseauto-namen (uit de vraag "leaseauto (financieel)") = financieel: direct bevestigen.
  const autoNamen = (verwachteLease || []).flatMap(itemNamen);
  const genoemdeLease = onbevestigd.find((lease) => autoNamen.some((naam) => leaseMatchtNaam(lease, naam)));
  if (genoemdeLease) return { key: genoemdeLease.key, bevestig: "financieel", lease: genoemdeLease };
  // Machines / andere middelen: in de nieuw-dossier-wizard is (net als bij de auto) gekozen voor financiële lease
  // voordat er namen gevraagd worden, dus ook die namen gelden als bevestiging "financieel".
  const overigNamen = (verwachteLeaseOverig || []).flatMap(itemNamen);
  const genoemdeOverig = onbevestigd.find((lease) => overigNamen.some((naam) => leaseMatchtNaam(lease, naam)));
  if (genoemdeOverig) return { key: genoemdeOverig.key, bevestig: "financieel", lease: genoemdeOverig };
  const soortAuto = autoWizardStatus?.soort;
  if ((soortAuto === "financial" || soortAuto === "operational") && onbevestigd.length === 1 && genoemd.length === 0) {
    return { key: onbevestigd[0].key, bevestig: soortAuto === "financial" ? "financieel" : "operationeel", lease: onbevestigd[0] };
  }
  const ctx = { verwachteLease, verwachteLeaseOverig };
  // Eerst: leases waarvoor in de wizard contracten zijn opgegeven die nog niet (allemaal) zijn ingevuld.
  for (const x of leaseSummary) {
    if (x.category !== "Lease (financieel)" || !confirmedLeaseTypeKeys.includes(x.key)) continue;
    const d = leaseDetails[x.key];
    if (d?.onbekend) continue;
    const v = volgendContractVoor(x, d, ctx);
    if (v) return { key: x.key, nieuw: v.nieuw, soort: v.soort };
  }
  // Daarna: een bevestigde financiële lease waar nog helemaal niets van is ingevuld.
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
  // Verversd bij elke render van App (zie `registreer`): de kandidaat-bepaling leest zo altijd actuele data.
  const contextRef = useRef(null);
  const openLeaseWizard = (key, opts) => {
    // Zonder expliciete soort: neem het soort over dat in de nieuw-dossier-wizard is opgegeven voor deze lease.
    let soort = opts?.soort ?? null;
    let nieuw = !!opts?.nieuw;
    const ctx = contextRef.current;
    if (!soort && ctx && opts?.contract == null && !opts?.stap) {
      const lease = ctx.leaseSummary.find((l) => l.key === key);
      const v = lease ? volgendContractVoor(lease, ctx.leaseDetails[key], ctx) : null;
      if (v && (v.nieuw === nieuw || !nieuw)) soort = v.soort;
    }
    setLeaseWizard((prev) => (
      prev && prev.key === key && !nieuw && opts?.contract == null && !opts?.stap && !soort
        ? prev
        : { key, nieuw, contract: opts?.contract ?? null, stap: opts?.stap ?? null, soort }
    ));
  };
  const registreer = (ctx) => { contextRef.current = ctx; };
  const autoOpenLeaseWizard = () => {
    const ctx = contextRef.current;
    if (!ctx) return;
    const k = bepaalLeaseWizardKandidaat(ctx);
    if (!k) return;
    if (k.bevestig) { setTimeout(() => contextRef.current?.confirmLeaseType?.(k.lease, k.bevestig), 250); return; } // financieel opent de wizard zelf
    setTimeout(() => openLeaseWizard(k.key, { nieuw: !!k.nieuw, soort: k.soort }), 150);
  };
  const renderLeaseWizard = ({ leaseSummary, leaseDetails, confirmedLeaseTypeKeys, confirmLeaseType, setLeaseDetailField, setLeaseDetailsModalKey, removeManualLease }) => {
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
        onAbort={() => {
          // Afgebroken zonder iets in te vullen bij een net toegevoegd apart contract: weer opruimen, anders blijft een leeg open punt achter.
          const leeg = !getLeaseSegments(leaseDetails[leaseWizard.key]).some((sg) => !isLeegSegment(sg));
          setLeaseWizard(null);
          if (lease.splitVan && leeg) removeManualLease?.(lease.key);
        }}
        onFinished={() => setTimeout(() => autoOpenLeaseWizard(), 500)}
        onOpenAdvanced={setLeaseDetailsModalKey}
        nieuwContract={leaseWizard.nieuw}
        startContract={leaseWizard.contract}
        startStap={leaseWizard.stap}
        nieuwSoort={leaseWizard.soort}
      />
    );
  };
  return { openLeaseWizard, autoOpenLeaseWizard, registreer, renderLeaseWizard, leaseWizardOpen: !!leaseWizard };
}
