import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

// Fase 1, dashboard-restyling: vervangt de zwevende StickyYearNav.jsx-balk op het Overzicht-
// tabblad (die nu over de dashboardkaarten heen hing na de verschuiving voor de nieuwe zijbalk) door
// een compact dropdown-knopje, zoals in het goedgekeurde mockup-canvas (Stijl F: "2025 ⌄" rechtsboven
// in de statuskaart). Zelfde onSelectYear-callback als StickyYearNav — geen wijziging in state/logica,
// alleen waar en hoe het jaar gekozen wordt. StickyYearNav.jsx blijft (voorlopig) actief op de andere
// tabbladen, die nog geen eigen DashboardHeader hebben.
const STATUS_EMOJI = { groen: "🟢", oranje: "🟠", rood: "🔴" };

const coverageNote = (c) => (c.zakelijk && c.prive ? null : c.zakelijk ? "dit jaar: alleen zakelijk geladen" : c.prive ? "dit jaar: alleen privé geladen" : null);

export default function YearDropdown({ years, activeYear, onSelectYear, yearlyProgress, zakelijkYears, priveYears, showBreakdown, yearCoverage }) {
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
      {/* v299 — op verzoek: naast het jaartal ook in één oogopslag zien hoeveel jaren het dossier
          totaal beslaat, en — alleen als er ook echt een privérekening is ingeladen (showBreakdown) —
          de uitsplitsing zakelijk/privé daaronder. Zonder privérekening is die uitsplitsing gelijk aan
          het totaal en dus overbodig. */}
      <div className="text-[11px] text-slate-400 text-left mb-0.5 whitespace-nowrap">
        {years.length} {years.length === 1 ? "jaar" : "jaren"} in dossier
        {showBreakdown ? ` · ${zakelijkYears ?? 0} zakelijk, ${priveYears ?? 0} privé` : ""}
      </div>
      {/* V73 — per jaar zichtbaar welke rekeningen data hebben: een jaar zonder privé- (of zakelijk) bestand
          toont daar € 0,00, wat anders op een fout lijkt. */}
      {showBreakdown && yearCoverage && activeYear && yearCoverage[activeYear] && coverageNote(yearCoverage[activeYear]) && (
        <div className="text-[11px] text-amber-600 text-left mb-0.5 whitespace-nowrap">{coverageNote(yearCoverage[activeYear])}</div>
      )}
      {/* v270 — groter/beter zichtbaar gemaakt op verzoek: was te klein om goed te zien. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-bold text-slate-800 shadow-sm hover:border-slate-400"
      >
        {activeYear ?? "Jaar"} <ChevronDown className="h-5 w-5 text-slate-500" />
      </button>
      {open && (
        <div className="absolute left-0 mt-1.5 z-30 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {years.map((year) => {
            const status = yearlyProgress?.[year]?.status;
            return (
              <button
                key={year}
                onClick={() => {
                  onSelectYear(year);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50"
              >
                {status && <span>{STATUS_EMOJI[status] || "⚪"}</span>}
                <span className="flex-1 font-medium text-slate-700">{year}</span>
                {showBreakdown && yearCoverage?.[year] && coverageNote(yearCoverage[year]) && (
                  <span className="text-[10px] text-amber-600" title={coverageNote(yearCoverage[year])}>{yearCoverage[year].zakelijk ? "alleen Z" : "alleen P"}</span>
                )}
                {year === activeYear && <Check className="h-4 w-4 text-teal-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
