import { ArrowLeft, ArrowRight, Home } from "lucide-react";

// V84 — navigatiebalk bovenaan de drie hoofdtabbladen: "Terug" (naar het tabblad waar je vandaan kwam,
// of Overzicht als dat niet bekend is), een huisje (direct naar Overzicht) en "Volgende" (volgende
// stap in de vaste werkvolgorde Overzicht → Controleren → Instellingen → Overzicht).
const VOLGORDE = ["overzicht", "controleren", "instellingen"];
const LABEL = { overzicht: "Overzicht", controleren: "Controleren", instellingen: "Instellingen" };

export default function TabNavBar({ activeTab, previousTab, onGo }) {
  const idx = VOLGORDE.indexOf(activeTab);
  if (idx === -1) return null;
  const volgende = VOLGORDE[(idx + 1) % VOLGORDE.length];
  const terug = previousTab && previousTab !== activeTab && LABEL[previousTab] ? previousTab : "overzicht";
  const btn = "inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50";
  return (
    <nav className="flex items-center justify-between gap-2 -mt-2 mb-1" aria-label="Navigatie tussen tabbladen">
      <div className="flex items-center gap-2">
        {activeTab !== "overzicht" && (
          <>
            <button onClick={() => onGo(terug)} className={btn} title={`Terug naar ${LABEL[terug]}`}>
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Terug naar {LABEL[terug]}</span>
              <span className="sm:hidden">Terug</span>
            </button>
            {terug !== "overzicht" && (
              <button onClick={() => onGo("overzicht")} className={btn} title="Naar Overzicht" aria-label="Naar Overzicht">
                <Home className="h-4 w-4 shrink-0" />
              </button>
            )}
          </>
        )}
      </div>
      <button onClick={() => onGo(volgende)} className={btn} title={`Volgende: ${LABEL[volgende]}`}>
        <span className="hidden sm:inline">Volgende: {LABEL[volgende]}</span>
        <span className="sm:hidden">Volgende</span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </button>
    </nav>
  );
}
