import { Check } from "lucide-react";

// D1 — de route door de app: Import → Controleren → Bedrijfsmiddelen → Aannames → Advies.
// Elke stap toont of er nog iets openstaat; een klik brengt je naar de eerste open plek in die stap.
export default function RouteBalk({ stappen, onKies }) {
  const eerstOpen = stappen.findIndex((s) => s.open > 0 || s.geenData);
  return (
    <nav aria-label="Route door het dossier" className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <ol className="flex flex-wrap items-stretch gap-y-2">
        {stappen.map((s, i) => {
          const klaar = !s.geenData && s.open === 0;
          const nu = i === eerstOpen;
          return (
            <li key={s.key} className="flex items-center">
              <button type="button" onClick={() => onKies(s)} data-route={s.key} disabled={s.geenData && i > 0}
                title={s.geenData ? (i === 0 ? "Start een nieuw dossier of laad een bankbestand" : "Eerst bankbestanden importeren") : undefined}
                className={`disabled:cursor-default disabled:hover:bg-transparent flex items-center gap-2 rounded-xl px-3 py-1.5 text-left hover:bg-slate-50 ${nu ? "bg-teal-50 ring-1 ring-teal-600" : ""}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${klaar ? "bg-emerald-600 text-white" : nu ? "bg-teal-700 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {klaar ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className={`text-[13px] ${nu ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>{s.label}</span>
                  <span className={`text-[11px] ${klaar ? "text-emerald-700" : "text-slate-500"}`}>{s.sub}</span>
                </span>
              </button>
              {i < stappen.length - 1 && <span aria-hidden="true" className="mx-1 text-slate-300">→</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
