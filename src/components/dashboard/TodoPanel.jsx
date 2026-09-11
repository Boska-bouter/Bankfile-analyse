// Bundelt de losse signalen (dubbele transacties, review-stappen, openstaande BTW-kwartalen)
// tot één overzicht bovenaan, mét jaarknoppen (elk met een voortgangspercentage) — dit is ook de
// plek waar je van jaar wisselt, zichtbaar zodra er data is, niet pas verderop in de pagina.
export default function TodoPanel({ items, years, activeYear, onSelectYear, yearlyProgress }) {
  if (items.length === 0 && years.length === 0) return null;
  return (
    <section className="rounded-lg border-2 border-slate-900 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-slate-900 text-stone-50">
        <p className="text-sm font-semibold">Werk te doen ({items.length})</p>
        {years.length > 0 && (
          <>
            <p className="text-[10px] text-slate-400 mt-2 mb-1">
              {years.length > 1 ? "Voortgang per jaar (los van elkaar, niet gemiddeld) — laagste % heeft het meeste werk nodig:" : "Voortgang dit jaar:"}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {years.map((y) => {
                const yp = yearlyProgress[y];
                return (
                  <button
                    key={y}
                    onClick={() => onSelectYear(y)}
                    className={`rounded px-2.5 py-1.5 text-xs font-medium text-left ${y === activeYear ? "bg-white text-slate-900" : "bg-slate-700 text-slate-200 hover:bg-slate-600"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{y}</span>
                      {yp && <span className="tabular-nums">{yp.pct}%</span>}
                    </span>
                    {yp && (
                      <span className={`block w-20 h-1 rounded-full overflow-hidden mt-1 ${y === activeYear ? "bg-slate-200" : "bg-slate-600"}`}>
                        <span className={`block h-full ${yp.pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${yp.pct}%` }} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      {items.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.key}>
              <button
                onClick={() => item.ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-slate-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item.text}
                </span>
                <span className="text-xs text-slate-400 shrink-0">Ga erheen →</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-slate-400">Niets open{activeYear ? ` voor ${activeYear}` : ""}.</p>
      )}
    </section>
  );
}
