import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

// Fase 1, dashboard-restyling: vervangt de zwevende StickyYearNav.jsx-balk op het Overzicht-
// tabblad (die nu over de dashboardkaarten heen hing na de verschuiving voor de nieuwe zijbalk) door
// een compact dropdown-knopje, zoals in het goedgekeurde mockup-canvas (Stijl F: "2025 ⌄" rechtsboven
// in de statuskaart). Zelfde onSelectYear-callback als StickyYearNav — geen wijziging in state/logica,
// alleen waar en hoe het jaar gekozen wordt. StickyYearNav.jsx blijft (voorlopig) actief op de andere
// tabbladen, die nog geen eigen DashboardHeader hebben.
const STATUS_EMOJI = { groen: "🟢", oranje: "🟠", rood: "🔴" };

export default function YearDropdown({ years, activeYear, onSelectYear, yearlyProgress }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (!years || years.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
      >
        {activeYear ?? "Jaar"} <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 z-30 w-40 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {years.map((year) => {
            const status = yearlyProgress?.[year]?.status;
            return (
              <button
                key={year}
                onClick={() => {
                  onSelectYear(year);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50"
              >
                {status && <span>{STATUS_EMOJI[status] || "⚪"}</span>}
                <span className="flex-1 font-medium text-slate-700">{year}</span>
                {year === activeYear && <Check className="h-3.5 w-3.5 text-teal-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
