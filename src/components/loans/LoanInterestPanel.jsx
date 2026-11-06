import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { computeLoanAmortization } from "../../tax/loanAmortization.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";
import CategorieSelect from "../shared/CategorieSelect.jsx";
import { useOpenOnJump } from "../shared/useOpenOnJump.js";

import { KNOP_SECUNDAIR_XS } from "../ui/stijl.js";

// beide-V17R8 — de boekingen zelf tonen (wens Boska 6-11: "de beschrijving van de banktransactie is niet te zien, dus dan is het een gok?").
// Zo zie je waarop de herkenning "lening" is gebaseerd, meestal het woord lening in de omschrijving.
export function kortOmschrijving(t) {
  return String(t.description || t.fullDescription || "")
    .replace(/^Naam:.*?(?=Omschrijving:|IBAN:|Kenmerk:|$)/, "")
    .replace(/Omschrijving:\s*/, "")
    .replace(/IBAN:\s*\S+\s*/, "")
    .replace(/(Datum\/Tijd|Valutadatum):.*$/, "")
    .replace(/Kenmerk:\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}
const datum = (d) => (d instanceof Date ? d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");
function LeningBoekingen({ loan, transactions = [], nietLening = 0, onOpschonen }) {
  const [alle, setAlle] = useState(false);
  if (!transactions.length) return null;
  const lijst = [...transactions].sort((a, b) => (a.date?.getTime?.() || 0) - (b.date?.getTime?.() || 0));
  const toon = alle ? lijst : lijst.slice(0, 3);
  return (
    <div className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
      {nietLening > 0 && onOpschonen && (
        <div className="mb-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-amber-900">
          {nietLening} van de {transactions.length} boekingen {nietLening === 1 ? "lijkt" : "lijken"} geen lening (geen lening in de omschrijving), maar {nietLening === 1 ? "staat" : "staan"} hier door een keuze op de hele tegenpartij.{" "}
          <button type="button" onClick={() => onOpschonen(loan)} className="font-semibold underline">Alleen de leningboekingen houden</button>
        </div>
      )}
      {toon.map((t, i) => (
        <div key={t.id ?? i} className="flex gap-2 py-0.5">
          <span className="font-mono text-slate-400 shrink-0">{datum(t.date)}</span>
          <span className="font-mono shrink-0 w-24 text-right">{eur(t.amount)}</span>
          <span className="min-w-0 break-words">{kortOmschrijving(t) || <em className="text-slate-400">geen omschrijving</em>}</span>
        </div>
      ))}
      {lijst.length > 3 && (
        <button type="button" onClick={() => setAlle((v) => !v)} className="mt-0.5 text-teal-700 underline">
          {alle ? "Minder tonen" : `Toon alle ${lijst.length} boekingen`}
        </button>
      )}
    </div>
  );
}
export default function LoanInterestPanel({ defaultOpen = false, loanSummary, privateLoanSummary = [], loanDetails, onOpenModal, onMarkUnknown, onUnmarkUnknown, onMarkNotALoan, onMarkAsPrive, onMarkAsZakelijk, onOpenHelp, onOpschonen, nietLeningAantal }) {
  const [open, setOpen] = useState(!!defaultOpen);
  // beide-V15R3 — "Dit is geen lening" opent een keuzelijst met categorieën, zodat de boekingen niet eerst via Overig hoeven (wens Boska 4-11).
  const [kiesVoor, setKiesVoor] = useState(null);
  const sectionRef = useOpenOnJump(setOpen);
  if (loanSummary.length === 0 && privateLoanSummary.length === 0) {
    return (
      <section ref={sectionRef} className="rounded-paneel border border-slate-200 bg-white shadow-sm">
        <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
          <span>Leningen</span>
          <span className="text-xs font-normal text-slate-400">(0)</span>
          <span className="flex-1" />
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {open && <p className="px-5 pb-5 text-xs text-slate-500">Geen leningen gevonden in de bankgegevens.</p>}
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="rounded-paneel border border-slate-200 bg-white shadow-sm">
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
            verzekeraar die toevallig op "lening" trefwoorden matcht, maar het hier feitelijk geen lening betreft)? Kies
            dan "Dit is geen lening" en kies de juiste categorie. Is de lening zelf feitelijk PRIVÉ (bijv. een
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
                <div key={loan.key} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="flex-1 min-w-[8rem] truncate font-medium">{loan.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{loan.count}x, totaal {eur(loan.total)}</span>
                    {isOnbekend ? (
                      <button onClick={() => onUnmarkUnknown(loan.key)} className={KNOP_SECUNDAIR_XS}>
                        Toch invullen
                      </button>
                    ) : (
                      <>
                        <button onClick={() => onOpenModal(loan.key)} className={KNOP_SECUNDAIR_XS}>
                          {details?.leningbedrag && details?.startdatum ? "Gegevens bewerken" : "Gegevens invullen"}
                        </button>
                        {!(details?.leningbedrag && details?.startdatum) && (
                          <button onClick={() => onMarkUnknown(loan.key)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50">
                            Gegevens onbekend
                          </button>
                        )}
                      </>
                    )}
                    {onMarkAsPrive && (
                      <button
                        onClick={() => onMarkAsPrive(loan)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50"
                        title="Zet deze transactie(s) op 'Leningen (privé)' — de rente telt dan niet meer mee als aftrekbare bedrijfskosten"
                      >
                        Dit is een privélening
                      </button>
                    )}
                    {onMarkNotALoan && (
                      <button
                        onClick={() => setKiesVoor((k) => (k === loan.key ? null : loan.key))}
                        aria-expanded={kiesVoor === loan.key}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50"
                        title="Kies zelf de categorie voor deze transactie(s)"
                      >
                        Dit is geen lening
                      </button>
                    )}
                  </div>
                  {onMarkNotALoan && kiesVoor === loan.key && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-slate-600">
                      <span>Welke categorie is het dan?</span>
                      <CategorieSelect
                        value={null}
                        placeholder="kies categorie…"
                        onChange={(c) => { setKiesVoor(null); onMarkNotALoan(loan, c); }}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs max-w-[16rem]"
                      />
                      <button onClick={() => setKiesVoor(null)} className="text-slate-400 underline">Annuleren</button>
                    </div>
                  )}
                  <LeningBoekingen loan={loan} transactions={loan.transactions} nietLening={nietLeningAantal ? nietLeningAantal(loan) : 0} onOpschonen={onOpschonen} />
                  {isOnbekend ? (
                    <p className="mt-2 text-xs text-slate-400">Gegevens onbekend — deze lening wordt niet gesplitst.</p>
                  ) : amortization ? (
                    <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
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
                  <div key={loan.key} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      <span className="flex-1 min-w-[8rem] truncate font-medium">{loan.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{loan.count}x, totaal {eur(loan.total)}</span>
                      {onMarkAsZakelijk && (
                        <button
                          onClick={() => onMarkAsZakelijk(loan)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50"
                          title="Zet deze transactie(s) terug op 'Leningen' — de rente telt dan weer mee als aftrekbare bedrijfskosten"
                        >
                          Toch zakelijk (Leningen)
                        </button>
                      )}
                    </div>
                    <LeningBoekingen loan={loan} transactions={loan.transactions} nietLening={nietLeningAantal ? nietLeningAantal(loan) : 0} onOpschonen={onOpschonen} />
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
