import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { computeAfschrijvingPerJaar } from "../../tax/activa.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";
import { useOpenOnJump } from "../shared/useOpenOnJump.js";

function isCompleteActivaDetails(details) {
  return !!(details && details.aanschafwaarde && details.aanschafdatum && details.afschrijvingstermijnJaren);
}

export default function ActivaPanel({ defaultOpen = false, activaSummary, activaDetails, activeYear, onOpenModal, onMarkUnknown, onUnmarkUnknown, onOpenHelp, onAddManual, onRemove }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const sectionRef = useOpenOnJump(setOpen);
  if (activaSummary.length === 0 && !onAddManual) return null;

  const incompleteCount = activaSummary.filter((a) => {
    const details = activaDetails[a.key];
    if (details?.onbekend) return false;
    return !isCompleteActivaDetails(details);
  }).length;

  return (
    <section ref={sectionRef} className="rounded-xl border-2 border-slate-200 bg-white shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>Activa (bedrijfsmiddelen) — afschrijving</span>
        <span className="text-xs font-normal text-slate-400">({activaSummary.length})</span>
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
            Machines, gereedschap en inventaris die je hebt gekocht ("Apparatuur & inventaris") mogen niet in
            één keer als kosten worden afgetrokken — vul hier de afschrijvingstermijn en restwaarde in, dan berekent
            de app zelf hoeveel er per jaar mag worden afgeschreven.{" "}
            {onOpenHelp && <HelpHint chapter="activa-afschrijving" onOpen={onOpenHelp} />}
          </p>
          {activaSummary.length === 0 && <p className="text-xs text-slate-500 mb-3">Er zijn nog geen bedrijfsmiddelen. Aankopen uit de bank verschijnen hier vanzelf zodra je ze de categorie "Zakelijk - apparatuur/machines" geeft.</p>}
          <div className="space-y-3">
            {activaSummary.map((activum) => {
              const details = activaDetails[activum.key];
              const isOnbekend = !!details?.onbekend;
              const compleet = isCompleteActivaDetails(details);
              const afschrijvingDitJaar = compleet && activeYear ? computeAfschrijvingPerJaar(details, activeYear) : null;
              return (
                <div key={activum.key} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="flex-1 min-w-[8rem] truncate font-medium">{details?.naam || activum.naam}{activum.handmatig && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 align-middle">handmatig</span>}</span>
                    {!(activum.handmatig && !activum.tx.amount) && <span className="text-xs text-slate-400 font-mono">{eur(Math.abs(activum.tx.amount))}, {activum.tx.date.toLocaleDateString("nl-NL")}</span>}
                    {isOnbekend ? (
                      <button onClick={() => onUnmarkUnknown(activum.key)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        Toch invullen
                      </button>
                    ) : (
                      <>
                        <button onClick={() => onOpenModal(activum.key)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          {compleet ? "Gegevens bewerken" : "Gegevens invullen"}
                        </button>
                        {activum.handmatig && onRemove && (
                          <button onClick={() => { if (window.confirm(`Bedrijfsmiddel "${details?.naam || activum.naam}" verwijderen?`)) onRemove(activum.key); }} className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">
                            Verwijderen
                          </button>
                        )}
                        {!compleet && !activum.handmatig && (
                          <button onClick={() => onMarkUnknown(activum.key)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50">
                            Gegevens onbekend
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {isOnbekend ? (
                    <p className="mt-2 text-xs text-slate-400">Gegevens onbekend — deze afschrijving wordt niet berekend.</p>
                  ) : afschrijvingDitJaar ? (
                    <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                      Afschrijving in {activeYear}: <strong>{eur(afschrijvingDitJaar.afschrijving)}</strong> · boekwaarde eind {activeYear}: <strong>{eur(afschrijvingDitJaar.boekwaardeEindJaar)}</strong>
                      {afschrijvingDitJaar.volledigAfgeschreven && <span className="block text-emerald-600">Volledig afgeschreven.</span>}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">Nog niet (volledig) ingevuld — vul aanschafwaarde, datum en afschrijvingstermijn in.</p>
                  )}
                </div>
              );
            })}
          </div>
          {onAddManual && (
            <div className="mt-3">
              <button onClick={onAddManual} className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100">+ Bedrijfsmiddel toevoegen</button>
              <p className="mt-1.5 text-xs text-slate-400">Voor iets zonder bankbetaling in de geladen bestanden. Staat de betaling wél in de bank? Geef die dan de categorie "Zakelijk - apparatuur/machines", dan staat hij hier vanzelf (anders tel je hem dubbel).</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
