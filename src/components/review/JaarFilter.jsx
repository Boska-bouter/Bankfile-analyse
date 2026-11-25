// nieuw-V9R6 — Boska 20-11: vanuit "Classificatiezekerheid {jaar}" openen de knoppen "Nog niet ingedeeld" en
// "Personen" de lijst van alle jaren, terwijl de telling over het gekozen jaar ging. Nu kan de lijst per jaar.
// Een tegenpartij staat erin als ze in dat jaar boekingen heeft; een keuze geldt (zoals altijd) voor alle jaren.
// Alleen boekingen die meetellen (geen klein bedrag), net als de telling in Classificatiezekerheid.
export const inJaar = (jaar) => (item) => {
  if (jaar == null) return true;
  if (item.txs) return item.txs.some((t) => Number(t.year) === Number(jaar) && !t.kleinBedrag);
  return [...(item.years || [])].some((y) => Number(y) === Number(jaar));
};
// Heeft de lijst niets in het gekozen jaar (ook niet afgehandeld), dan gewoon alle jaren tonen.
export const jaarMetOpen = (jaar, items) => (jaar != null && items.some(inJaar(jaar)) ? jaar : null);

export default function JaarFilter({ jaar, onJaar, items, open }) {
  const jaren = [...new Set(items.flatMap((it) => [...(it.years || [])].map(Number)))].filter((j) => j && items.some(inJaar(j))).sort((a, b) => a - b);
  if ((jaren.length < 2 && jaar == null) || !onJaar) return null;
  const knop = (actief) =>
    `min-h-[44px] rounded-full border px-4 py-2 text-sm font-semibold ${actief ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`;
  const tel = (j) => open.filter(inJaar(j)).length;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2">
      <span className="text-xs text-slate-500">Tegenpartijen uit:</span>
      {jaren.map((j) => (
        <button key={j} type="button" onClick={() => onJaar(j)} className={knop(Number(jaar) === j)}>
          {Number(jaar) === j ? "✓ " : ""}{j} ({tel(j)})
        </button>
      ))}
      <button type="button" onClick={() => onJaar(null)} className={knop(jaar == null)}>
        {jaar == null ? "✓ " : ""}Alle jaren ({open.length})
      </button>
      {jaar != null && <span className="text-xs text-slate-500">Een categoriekeuze geldt voor alle jaren van die tegenpartij.</span>}
    </div>
  );
}
