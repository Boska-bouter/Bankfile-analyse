// Blijft vastgeplakt aan de bovenkant van het scherm tijdens scrollen — zodat je altijd snel
// van jaar kunt wisselen, ook diep in een lange pagina. Toont dezelfde voortgangspercentages
// als het "Werk te doen"-paneel.
export default function StickyYearNav({ years, activeYear, onSelectYear, yearlyProgress }) {
  if (years.length <= 1) return null;
  return (
    <nav className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-slate-400 shrink-0">Jaar:</span>
        {years.map((year) => {
          const yp = yearlyProgress[year];
          return (
            <button
              key={year}
              onClick={() => onSelectYear(year)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                year === activeYear ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {year}
              {yp && <span className="tabular-nums opacity-80">{yp.pct}%</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
