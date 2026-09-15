import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { computeLoanAmortization } from "../../tax/loanAmortization.js";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate } from "../../tax/financialLease.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

// Financiële lease is compleet zodra er genoeg is ingevuld om het rentepercentage te kunnen
// berekenen (koopprijs, looptijd, maandbedrag) én een startdatum — zie FinancialLeaseDetailsModal.
function isCompleteFinancialLeaseDetails(details) {
  if (!details) return false;
  return !!(details.koopprijs && details.looptijd && details.maandbedrag && details.startdatum);
}

function computeFinancialLeaseAmortization(lease, details) {
  if (!isCompleteFinancialLeaseDetails(details)) return null;
  const onbetaaldGedeelteKoop = computeOnbetaaldGedeelteKoop(details);
  const renteJaarlijks = computeFinancialLeaseRate(details);
  if (renteJaarlijks == null) return null;
  return computeLoanAmortization(lease.transactions, { leasebedrag: onbetaaldGedeelteKoop, startdatum: details.startdatum, rente: renteJaarlijks });
}

export default function LeaseInterestPanel({
  leaseSummary, leaseDetails, confirmedLeaseTypeKeys, onConfirmType, onOpenModal, onMarkUnknown, onUnmarkUnknown, onMergeInto, onOpenHelp,
}) {
  const [open, setOpen] = useState(false);
  if (leaseSummary.length === 0) return null;

  const incompleteCount = leaseSummary.filter((l) => {
    if (!confirmedLeaseTypeKeys.includes(l.key)) return true;
    if (leaseDetails[l.key]?.onbekend) return false;
    return l.category === "Lease (financieel)" && !isCompleteFinancialLeaseDetails(leaseDetails[l.key]);
  }).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>Lease (operationeel/financieel)</span>
        <span className="text-xs font-normal text-slate-400">({leaseSummary.length})</span>
        {incompleteCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {incompleteCount}
          </span>
        )}
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-500 mb-3">
            Bij <strong>operationele</strong> lease is de hele termijn aftrekbaar, geen verdere actie nodig. Bij{" "}
            <strong>financiële</strong> lease is alleen de rente in de termijn aftrekbaar — net als bij een lening.{" "}
            {onOpenHelp && <HelpHint chapter="lease-financieel" onOpen={onOpenHelp} />}
          </p>
          <div className="space-y-3">
            {leaseSummary.map((lease) => {
              const typeConfirmed = confirmedLeaseTypeKeys.includes(lease.key);
              const isFinancieel = lease.category === "Lease (financieel)";
              const details = leaseDetails[lease.key];
              const isOnbekend = isFinancieel && !!details?.onbekend;
              const amortization = isFinancieel ? computeFinancialLeaseAmortization(lease, details) : null;
              return (
                <div key={lease.key} className="rounded-md border border-slate-100 p-3">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="flex-1 min-w-[8rem] truncate font-medium">{lease.name}</span>
                    {details?.contractBeeindigd && (
                      <span className="inline-flex items-center rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-medium">beëindigd</span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">{lease.count}x, totaal {eur(lease.total)}</span>
                    {!typeConfirmed ? (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => onConfirmType(lease, "operationeel")} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Operationeel
                        </button>
                        <button onClick={() => onConfirmType(lease, "financieel")} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Financieel
                        </button>
                      </div>
                    ) : isFinancieel ? (
                      isOnbekend ? (
                        <button onClick={() => onUnmarkUnknown(lease.key)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Toch invullen
                        </button>
                      ) : (
                        <>
                          <button onClick={() => onOpenModal(lease.key)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                            {isCompleteFinancialLeaseDetails(details) ? "Gegevens bewerken" : "Gegevens invullen"}
                          </button>
                          {!isCompleteFinancialLeaseDetails(details) && (
                            <button onClick={() => onMarkUnknown(lease.key)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50">
                              Gegevens onbekend
                            </button>
                          )}
                        </>
                      )
                    ) : (
                      <span className="text-xs text-emerald-700">✓ Operationeel — geen verdere actie nodig</span>
                    )}
                  </div>
                  {onMergeInto && leaseSummary.length > 1 && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-slate-400">Is dit eigenlijk hetzelfde contract als een andere lease hierboven?</label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) onMergeInto(lease.key, e.target.value);
                          e.target.value = "";
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="">Samenvoegen met…</option>
                        {leaseSummary.filter((l) => l.key !== lease.key).map((l) => (
                          <option key={l.key} value={l.key}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {typeConfirmed && isFinancieel && (
                    isOnbekend ? (
                      <p className="mt-2 text-xs text-slate-400">Gegevens onbekend — deze lease wordt niet gesplitst.</p>
                    ) : amortization ? (
                      <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
                        Gesplitst: rente <strong>{eur(amortization.totaalRente)}</strong> (aftrekbaar) · aflossing <strong>{eur(amortization.totaalAflossing)}</strong> (niet aftrekbaar) · nog openstaand <strong>{eur(amortization.saldoNu)}</strong>
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">Nog niet gesplitst — vul de aankoop- en leasestructuur in.</p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
