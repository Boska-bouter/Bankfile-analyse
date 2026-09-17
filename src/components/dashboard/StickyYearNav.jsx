// Blijft vast op het scherm staan tijdens scrollen — zodat je altijd snel van jaar kunt wisselen,
// ook diep in een lange pagina. Verticaal aan de linkerkant (in plaats van een horizontale balk
// bovenin) omdat een horizontale balk op tablets al snel moet scrollen of te veel ruimte inneemt;
// verticaal blijft compact en werkt van kleine tablets (vanaf ~8") tot laptopschermen.
const STATUS_EMOJI = { groen: "🟢", oranje: "🟠", rood: "🔴" };
const STATUS_LABEL = {
  groen: "Klaar voor aangiftecontrole — geen belangrijke openstaande punten",
  oranje: "Controlepunten aanwezig — nog punten om te beoordelen",
  rood: "Mogelijk ontbreekt een periode — het saldo tussen twee bestanden van deze rekening sluit dit jaar niet aan, met een verschil groter dan een gewoon afrondingsverschil",
};

export default function StickyYearNav({ years, activeYear, onSelectYear, yearlyProgress }) {
  if (years.length <= 1) return null;
  return (
    <nav className="fixed left-1.5 sm:left-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1 max-h-[75vh] overflow-y-auto">
      {years.map((year) => {
        const yp = yearlyProgress[year];
        return (
          <button
            key={year}
            onClick={() => onSelectYear(year)}
            className={`shrink-0 flex flex-col items-center rounded-md px-1.5 sm:px-2 py-1.5 text-[11px] sm:text-xs font-medium leading-tight ${
              year === activeYear ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            title={`Jaar ${year}${yp ? ` — ${yp.pct}% klaar. ${STATUS_LABEL[yp.status]}` : ""}`}
          >
            <span>{yp?.status && <span className="mr-0.5">{STATUS_EMOJI[yp.status]}</span>}{year}</span>
            {yp && <span className="tabular-nums opacity-80 text-[9px] sm:text-[10px]">{yp.pct}%</span>}
          </button>
        );
      })}
    </nav>
  );
}
