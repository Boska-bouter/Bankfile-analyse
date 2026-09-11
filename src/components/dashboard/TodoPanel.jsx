// Bundelt de losse signalen (dubbele transacties, review-stappen, openstaande BTW-kwartalen)
// tot één overzicht bovenaan — elk met een knop die er direct naartoe scrolt. De onderliggende
// meldingen/panelen blijven gewoon bestaan; dit is een extra, centraal overzicht.
export default function TodoPanel({ items }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-lg border-2 border-slate-900 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-slate-900 text-stone-50">
        <p className="text-sm font-semibold">Werk te doen ({items.length})</p>
      </div>
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
    </section>
  );
}
