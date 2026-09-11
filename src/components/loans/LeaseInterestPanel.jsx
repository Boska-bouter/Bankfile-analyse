import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { computeLoanAmortization } from "../../tax/loanAmortization.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

export default function LeaseInterestPanel({
  leaseSummary, leaseDetails, confirmedLeaseTypeKeys, onConfirmType, onOpenModal, onMarkUnknown, onUnmarkUnknown, onOpenHelp,
}) {
  const [open, setOpen] = useState(false);
  if (leaseSummary.length === 0) return null;

  const incompleteCount = leaseSummary.filter((l) => {
    if (!confirmedLeaseTypeKeys.includes(l.key)) return true;
    if (leaseDetails[l.key]?.onbekend) return false;
    return l.category === "Lease (financieel)" && !(leaseDetails[l.key]?.leasebedrag && leaseDetails[l.key]?.startdatum);
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
            <strong>financiële</strong> lease is alleen de rente in de termijn aftrekbaar — net als bij een lening.
          </p>
          <div className="space-y-3">
            {leaseSummary.map((lease) => {
              const typeConfirmed = confirmedLeaseTypeKeys.includes(lease.key);
              const isFinancieel = lease.category === "Lease (financieel)";
              const details = leaseDetails[lease.key];
              const isOnbekend = isFinancieel && !!details?.onbekend;
              const amortization = isFinancieel ? computeLoanAmortization(lease.transactions, details) : null;
              return (
                <div key={lease.key} className="rounded-md border border-slate-100 p-3">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="flex-1 min-w-[8rem] truncate font-medium">{lease.name}</span>
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
                            {details?.leasebedrag && details?.startdatum ? "Gegevens bewerken" : "Gegevens invullen"}
                          </button>
                          {!(details?.leasebedrag && details?.startdatum) && (
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
                  {typeConfirmed && isFinancieel && (
                    isOnbekend ? (
                      <p className="mt-2 text-xs text-slate-400">Gegevens onbekend — deze lease wordt niet gesplitst.</p>
                    ) : amortization ? (
                      <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
                        Gesplitst: rente <strong>{eur(amortization.totaalRente)}</strong> (aftrekbaar) · aflossing <strong>{eur(amortization.totaalAflossing)}</strong> (niet aftrekbaar) · nog openstaand <strong>{eur(amortization.saldoNu)}</strong>
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">Nog niet gesplitst — vul leasebedrag, startdatum en rente in.</p>
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
