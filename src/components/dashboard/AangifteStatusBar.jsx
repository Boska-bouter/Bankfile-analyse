import { Check } from "lucide-react";

// Compacte statusbalk boven het actieve jaar — bundelt twee dingen die er als losse controles al
// waren tot één oogopslag: (1) de jaarstatus + aantal controlepunten (dezelfde bron als
// AangifteChecklistPanel/yearlyProgress), en (2) een simpele 5-stappen workflow-indicator
// (Bankbestanden → Transacties → BTW → Jaarcontrole → Aangiftevoorstel), afgeleid uit dezelfde
// bestaande state — geen nieuwe reliability-engine, geen nieuwe kleurarchitectuur.
const STATUS_EMOJI = { groen: "🟢", oranje: "🟠", rood: "🔴" };
const STATUS_TEKST = { groen: "Klaar voor aangiftecontrole", oranje: "Controle nodig", rood: "Mogelijk ontbreekt informatie/periode" };

// Eén workflow-stap: "done" (✓), "groen"/"oranje"/"rood" (hergebruikt dezelfde jaarstatus-kleuren
// voor de Jaarcontrole-stap), "todo" (nog niet begonnen) of "cta" (actie, geen eigen status).
function StepIcon({ state }) {
  if (state === "done") return <Check className="h-3.5 w-3.5 text-emerald-600" />;
  if (state === "groen") return <span>🟢</span>;
  if (state === "oranje") return <span>🟠</span>;
  if (state === "rood") return <span>🔴</span>;
  return <span className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300" />;
}

export default function AangifteStatusBar({ activeYear, yearStatus, openPuntenCount, workflowSteps, onOpenAangiftevoorstel }) {
  if (!activeYear) return null;
  return (
    <section className="rounded-lg border-2 border-slate-900 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-slate-900 text-stone-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Aangifte {activeYear}</p>
          <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
            <span>{STATUS_EMOJI[yearStatus]}</span>
            <span>{STATUS_TEKST[yearStatus]}</span>
            {openPuntenCount > 0 && <span>— {openPuntenCount} controlepunt{openPuntenCount === 1 ? "" : "en"} vraagt/vragen nog aandacht</span>}
          </p>
        </div>
        <button
          onClick={onOpenAangiftevoorstel}
          className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-100"
        >
          Aangiftevoorstel bekijken
        </button>
      </div>
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs text-slate-600">
        {workflowSteps.map((step, i) => (
          <span key={step.label} className="flex items-center gap-1">
            <span className="flex items-center gap-1">
              <StepIcon state={step.state} />
              {step.label}
            </span>
            {i < workflowSteps.length - 1 && <span className="text-slate-300 mx-1.5">→</span>}
          </span>
        ))}
      </div>
    </section>
  );
}
