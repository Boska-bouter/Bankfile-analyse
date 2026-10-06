import { Check, ChevronDown, ChevronRight } from "lucide-react";
import ReviewStep from "./ReviewStep.jsx";
import { eur } from "../../utils/amounts.js";

// Fase 3 — was drie los-inline accordeons in App.jsx ("Overig" opruimen, Duplicaten controleren,
// — de Factuurperiode-controle is vervallen), nu een zelfstandig onderdeel (bouwvoorstel-kaart
// "Opschonen") zodat het geheel ook binnen de SectionCard kan worden uitgeklapt. Elke accordeon
// houdt zijn eigen open/dicht-stand aan (showOverigReview/showDuplicateDetails,
// via props) — ongewijzigd gedrag, nu alleen in een eigen bestand.
export default function OpschonenPanel({
  overigReviewRef,
  overigSummary,
  pendingOverigReview,
  showOverigReview,
  onToggleShowOverigReview,
  overigSearch,
  onOverigSearch,
  onMarkOverigItem,
  onConfirmOverigAsIs,
  onBulkMarkOverigAsPriveOpname,
  onBulkMarkOverigAsWinkelsDivers,
  overigZakelijkCount = 0,
  overigPriveCount = 0,

  duplicatesRef,
  duplicateGroups,
  confirmedSeparateGroups,
  duplicatePendingBreakdown,
  showDuplicateDetails,
  onToggleShowDuplicateDetails,
  pendingDuplicateCount,
  onRemoveDuplicates,
  onDismissDuplicateNotice,
  isDuplicateGroupRemoved,
  onShowDuplicateDetailGroup,
  onRestoreDuplicateGroup,
  onRemoveDuplicateGroup,
  showConfirmedSeparateDuplicates,
  onToggleShowConfirmedSeparateDuplicates,

  onOpenHelp,
}) {
  const overigOpen = showOverigReview === null ? pendingOverigReview.length > 0 : showOverigReview;
  const needsJudgment = duplicatePendingBreakdown.onzeker > 0;
  const duplicatesOpen = showDuplicateDetails === null ? needsJudgment : showDuplicateDetails;

  return (
    <div className="space-y-3">
      {overigSummary.length > 0 && (
        <section ref={overigReviewRef} className="rounded-xl border-2 border-amber-200 bg-white overflow-hidden shadow-sm">
          <button onClick={() => onToggleShowOverigReview(!overigOpen)} className="w-full px-4 py-3 bg-amber-50 text-amber-900 flex items-center gap-2 text-left">
            {pendingOverigReview.length === 0 && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
            <span className="text-sm font-semibold">"Overig" opruimen</span>
            {pendingOverigReview.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {pendingOverigReview.length}
              </span>
            ) : (
              <span className="text-xs text-emerald-700">Niets openstaand</span>
            )}
            <span className="flex-1" />
            {overigOpen ? <ChevronDown className="h-4 w-4 text-amber-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />}
          </button>
          {overigOpen && (
            <ReviewStep
              items={pendingOverigReview}
              allItems={overigSummary}
              allDone={pendingOverigReview.length === 0}
              search={overigSearch}
              onSearch={onOverigSearch}
              onMark={onMarkOverigItem}
              onConfirm={onConfirmOverigAsIs}
              defaultCategory="Overig"
              confirmButtonClass="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              explanation='Kies per tegenpartij de juiste categorie én of het zakelijk of privé is, of klik "Klopt zo" als Overig hier bewust moet blijven staan.'
              bulkAction={[
                overigZakelijkCount > 0 && {
                  label: `Alle zakelijke (${overigZakelijkCount}) naar "Prive opnames"`,
                  confirmText: `${overigZakelijkCount} tegenpartij(en) in "Overig" die nu als Zakelijk staan, allemaal naar "Prive opnames" zetten?`,
                  onApply: onBulkMarkOverigAsPriveOpname,
                },
                overigPriveCount > 0 && {
                  label: `Alle privé (${overigPriveCount}) naar "Winkels divers"`,
                  confirmText: `${overigPriveCount} tegenpartij(en) in "Overig" die nu als Privé staan, allemaal naar "Winkels divers" zetten?`,
                  onApply: onBulkMarkOverigAsWinkelsDivers,
                },
              ].filter(Boolean)}
            />
          )}
        </section>
      )}

      {(duplicateGroups.length > 0 || confirmedSeparateGroups.length > 0) && (
        <section
          ref={duplicatesRef}
          className={`rounded-xl border-2 ${needsJudgment ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
        >
          <button onClick={() => onToggleShowDuplicateDetails(!duplicatesOpen)} className="w-full px-4 py-3 flex items-center gap-2 text-left">
            {!needsJudgment && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
            <span className={`text-sm font-semibold ${needsJudgment ? "text-amber-900" : "text-emerald-900"}`}>Duplicaten controleren</span>
            {needsJudgment ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {duplicatePendingBreakdown.onzeker} zelf te beoordelen
              </span>
            ) : pendingDuplicateCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-semibold">
                {pendingDuplicateCount} bevestigd — nog te verwijderen
              </span>
            ) : (
              <span className="text-xs text-emerald-700">Niets openstaand</span>
            )}
            <span className="flex-1" />
            {duplicatesOpen ? (
              <ChevronDown className={`h-4 w-4 shrink-0 ${needsJudgment ? "text-amber-400" : "text-emerald-400"}`} />
            ) : (
              <ChevronRight className={`h-4 w-4 shrink-0 ${needsJudgment ? "text-amber-400" : "text-emerald-400"}`} />
            )}
          </button>
          {duplicatesOpen && (
            <div className="px-4 pb-3 space-y-2">
              {pendingDuplicateCount > 0 && (
                <div className="flex gap-3 pb-1">
                  <button onClick={onRemoveDuplicates} className="text-xs font-medium text-amber-900 underline hover:no-underline">
                    Alle {pendingDuplicateCount} nog openstaande verwijderen (bewaar de eerste van elk stel)
                  </button>
                  <button onClick={onDismissDuplicateNotice} className="text-xs text-amber-700 hover:text-amber-900">
                    Negeren (niet meer noemen bij "Aangifte")
                  </button>
                </div>
              )}
              {duplicateGroups.map((group) => {
                const files = [...new Set(group.map((t) => t.source))];
                const crossFile = files.length > 1;
                const first = group[0];
                const zeker = first.certainty === "duplicaat";
                const removedGroup = isDuplicateGroupRemoved(group);
                return (
                  <div
                    key={group[0].fingerprint}
                    className={`rounded-lg border px-3 py-2 text-xs ${removedGroup ? "bg-emerald-50 border-emerald-200" : "bg-white border-amber-200"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-slate-700">
                        {first.date.toLocaleDateString("nl-NL")} · {eur(first.amount)} · {first.counterparty || first.description || "(geen omschrijving)"}
                        <span className="text-slate-400"> — {group.length}x</span>
                      </p>
                      <div className="shrink-0 flex items-center gap-2 whitespace-nowrap">
                        <button onClick={() => onShowDuplicateDetailGroup(group)} className="text-[11px] font-medium text-amber-900 underline hover:no-underline">
                          Bekijk originele regels
                        </button>
                        {removedGroup ? (
                          <button onClick={() => onRestoreDuplicateGroup(group)} className="text-[11px] font-medium text-emerald-700 underline hover:no-underline">
                            Ongedaan maken
                          </button>
                        ) : (
                          <button onClick={() => onRemoveDuplicateGroup(group)} className="text-[11px] font-medium text-rose-700 underline hover:no-underline">
                            Verwijderen
                          </button>
                        )}
                      </div>
                    </div>
                    {crossFile ? (
                      <p className="mt-0.5 text-amber-700">
                        ⚠ Komt voor in <strong>meerdere bestanden</strong>: {files.join(", ")} — waarschijnlijk overlappende exportperiodes.
                      </p>
                    ) : (
                      <p className="mt-0.5 text-slate-400">Komt {group.length}x voor binnen hetzelfde bestand ({files[0]}).</p>
                    )}
                    {removedGroup ? (
                      <p className="mt-0.5 font-medium text-emerald-700">✓ Verwijderd — de eerste regel van dit stel is bewaard.</p>
                    ) : zeker ? (
                      <p className="mt-0.5 font-medium text-red-700">
                        ✓ Bevestigd op basis van saldo: het lopende saldo na mutatie is bij alle {group.length} regels
                        gelijk ({eur(first.balance)}) — dat kan alleen als het écht dezelfde boeking is, dus dit is met
                        zekerheid een dubbeling.
                      </p>
                    ) : (
                      <p className="mt-0.5 text-slate-400">
                        Geen (volledige) saldogegevens beschikbaar om dit automatisch te bevestigen — vergelijk de
                        originele regels hierboven om zelf te beoordelen.
                      </p>
                    )}
                  </div>
                );
              })}
              {confirmedSeparateGroups.length > 0 && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200">
                  <button onClick={onToggleShowConfirmedSeparateDuplicates} className="w-full flex items-center gap-2 px-3 py-2 text-left">
                    <span className="text-xs text-emerald-900">
                      <strong>{confirmedSeparateGroups.length}x</strong> zelfde datum/bedrag/omschrijving gevonden, maar zijn{" "}
                      <strong>geen</strong> duplicaten (saldo bevestigt: losse, echte transacties) — alleen ter info
                    </span>
                    <span className="flex-1" />
                    {showConfirmedSeparateDuplicates ? (
                      <ChevronDown className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    )}
                  </button>
                  {showConfirmedSeparateDuplicates && (
                    <div className="px-3 pb-2 space-y-1.5">
                      {confirmedSeparateGroups.map((group) => (
                        <div key={group[0].fingerprint} className="flex items-center justify-between gap-2 text-[11px] text-emerald-800">
                          <span>
                            {group[0].date.toLocaleDateString("nl-NL")} · {eur(group[0].amount)} ·{" "}
                            {group[0].counterparty || group[0].description || "(geen omschrijving)"} — {group.length}x
                          </span>
                          <button onClick={() => onShowDuplicateDetailGroup(group)} className="shrink-0 underline hover:no-underline whitespace-nowrap">
                            Bekijk originele regels
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
