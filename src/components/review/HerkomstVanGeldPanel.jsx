import { Check, ChevronDown, ChevronRight } from "lucide-react";
import IncomeReviewStep from "./IncomeReviewStep.jsx";
import ReviewStep from "./ReviewStep.jsx";

// Fase 3 — was twee los-inline stukken in App.jsx (de IncomeReviewStep-stap en de "Overboekingen
// aan personen"-accordeon), nu een zelfstandig onderdeel zodat het geheel (dezelfde bouwvoorstel-
// kaart "Herkomst van geld") ook binnen de SectionCard kan worden uitgeklapt. De twee stukken zijn
// altijd al elkaars alternatief (zolang er nog onbeantwoorde inkomsten zijn, toont dit alleen
// IncomeReviewStep; pas daarna komt de personen-accordeon in beeld) — dat gedrag blijft hier
// ongewijzigd. incomeReviewRef/personReviewRef zijn dezelfde refs die elders (rollup-kaarten,
// "Werk te doen") al gebruikt worden om hier naartoe te springen.
export default function HerkomstVanGeldPanel({
  incomeReviewRef,
  pendingIncomeReview,
  incomeSummary,
  incomeSearch,
  onIncomeSearch,
  onMarkIncomeSource,
  personReviewRef,
  personSummary,
  pendingPersonReview,
  showPersonReview,
  onToggleShowPersonReview,
  personSearch,
  onPersonSearch,
  onMarkPersonSource,
  onConfirmPersonAsIs,
  personBulkAction,
}) {
  if (pendingIncomeReview.length > 0) {
    return (
      <div ref={incomeReviewRef}>
        <IncomeReviewStep
          items={pendingIncomeReview}
          totalCount={incomeSummary.length}
          doneCount={incomeSummary.length - pendingIncomeReview.length}
          search={incomeSearch}
          onSearch={onIncomeSearch}
          onMark={onMarkIncomeSource}
        />
      </div>
    );
  }

  if (personSummary.length === 0) return null;

  const open = showPersonReview === null ? pendingPersonReview.length > 0 : showPersonReview;
  return (
    <section ref={personReviewRef} className="rounded-xl border-2 border-fuchsia-200 bg-white overflow-hidden shadow-sm">
      <button onClick={() => onToggleShowPersonReview(!open)} className="w-full px-4 py-3 bg-fuchsia-50 text-fuchsia-900 flex items-center gap-2 text-left">
        {pendingPersonReview.length === 0 && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
        <span className="text-sm font-semibold">Overboekingen aan personen controleren</span>
        {pendingPersonReview.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {pendingPersonReview.length}
          </span>
        ) : (
          <span className="text-xs text-emerald-700">Niets openstaand</span>
        )}
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4 text-fuchsia-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-fuchsia-400 shrink-0" />}
      </button>
      {open && (
        <ReviewStep
          items={pendingPersonReview}
          allItems={personSummary}
          allDone={pendingPersonReview.length === 0}
          search={personSearch}
          onSearch={onPersonSearch}
          onMark={onMarkPersonSource}
          onConfirm={onConfirmPersonAsIs}
          defaultCategory="Overboekingen aan personen"
          bulkAction={personBulkAction}
          confirmButtonClass="border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100"
          explanation='Kies per tegenpartij de juiste categorie én of het zakelijk of privé is. De keuze geldt meteen voor alle transacties van diezelfde tegenpartij, in alle jaren.'
        />
      )}
    </section>
  );
}
