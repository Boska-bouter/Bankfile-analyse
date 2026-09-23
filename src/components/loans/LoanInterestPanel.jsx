import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { computeLoanAmortization } from "../../tax/loanAmortization.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

export default function LoanInterestPanel({ loanSummary, privateLoanSummary = [], loanDetails, onOpenModal, onMarkUnknown, onUnmarkUnknown, onMarkNotALoan, onMarkAsPrive, onMarkAsZakelijk, onOpenHelp }) {
  const [open, setOpen] = useState(false);
  if (loanSummary.length === 0 && privateLoanSummary.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>Rentepercentage per lening</span>
        <span className="text-xs font-normal text-slate-400">({loanSummary.length + privateLoanSummary.length})</span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-500 mb-3">
            Categorie "Leningen" is altijd 0% BTW; de rente is aftrekbaar, de aflossing niet. Vul de volledige gegevens
            in om de rente/aflossing-splitsing per betaling te laten berekenen. Klopt de indeling niet (bijv. een
            verzekeraar die toevallig op "lening" trefwoorden matcht, maar het hier feitelijk geen lening betreft)? Zet
             'm dan op "Overig" om zelf een andere categorie te kiezen. Is de lening zelf feitelijk PRIVÉ (bijv. een
            DUO-studieschuld of een privélening van familie), ongeacht van/naar welke rekening betaald wordt? Zet 'm
            dan op "Leningen (privé)" — de rente telt dan niet meer mee als aftrekbare bedrijfskosten.{" "}
            {onOpenHelp && <HelpHint chapter="rente-per-lening" onOpen={onOpenHelp} />}
          </p>
          <div className="space-y-3">
            {loanSummary.map((loan) => {
              const details = loanDetails[loan.key];
              const isOnbekend = !!details?.onbekend;
              const amortization = computeLoanAmortization(loan.transactions, details);
              return (
                <div key={loan.key} className="rounded-md border border-slate-100 p-3">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="flex-1 min-w-[8rem] truncate font-medium">{loan.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{loan.count}x, totaal {eur(loan.total)}</span>
                    {isOnbekend ? (
                      <button onClick={() => onUnmarkUnknown(loan.key)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        Toch invullen
                      </button>
                    ) : (
                      <>
                        <button onClick={() => onOpenModal(loan.key)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          {details?.leningbedrag && details?.startdatum ? "Gegevens bewerken" : "Gegevens invullen"}
                        </button>
                        {!(details?.leningbedrag && details?.startdatum) && (
                          <button onClick={() => onMarkUnknown(loan.key)} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50">
                            Gegevens onbekend
                          </button>
                        )}
                      </>
                    )}
                    {onMarkAsPrive && (
                      <button
                        onClick={() => onMarkAsPrive(loan)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50"
                        title="Zet deze transactie(s) op 'Leningen (privé)' — de rente telt dan niet meer mee als aftrekbare bedrijfskosten"
                      >
                        Dit is een privélening
                      </button>
                    )}
                    {onMarkNotALoan && (
                      <button
                        onClick={() => onMarkNotALoan(loan)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50"
                        title="Zet deze transactie(s) op 'Overig' om zelf een andere categorie te kiezen"
                      >
                        Dit is geen lening
                      </button>
                    )}
                  </div>
                  {isOnbekend ? (
                    <p className="mt-2 text-xs text-slate-400">Gegevens onbekend — deze lening wordt niet gesplitst.</p>
                  ) : amortization ? (
                    <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
                      Gesplitst: rente <strong>{eur(amortization.totaalRente)}</strong> (aftrekbaar) · aflossing <strong>{eur(amortization.totaalAflossing)}</strong> (niet aftrekbaar) · nog openstaand <strong>{eur(amortization.saldoNu)}</strong>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">Nog niet gesplitst — vul de gegevens in, of geef aan dat ze onbekend zijn.</p>
                  )}
                </div>
              );
            })}
          </div>
          {privateLoanSummary.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Eerder als privé aangemerkt ({privateLoanSummary.length}) — rente hierop telt niet mee als aftrekbare
                bedrijfskosten. Blijkt een lening toch zakelijk te zijn, dan kan dat hier worden teruggezet.
              </p>
              <div className="space-y-3">
                {privateLoanSummary.map((loan) => (
                  <div key={loan.key} className="rounded-md border border-slate-100 p-3">
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      <span className="flex-1 min-w-[8rem] truncate font-medium">{loan.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{loan.count}x, totaal {eur(loan.total)}</span>
                      {onMarkAsZakelijk && (
                        <button
                          onClick={() => onMarkAsZakelijk(loan)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50"
                          title="Zet deze transactie(s) terug op 'Leningen' — de rente telt dan weer mee als aftrekbare bedrijfskosten"
                        >
                          Toch zakelijk (Leningen)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
