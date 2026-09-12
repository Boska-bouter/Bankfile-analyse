import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import SearchInput from "../shared/SearchInput.jsx";

export default function IncomeReviewStep({ items, totalCount, doneCount, search, onSearch, onMark }) {
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-900 text-stone-50 px-5 py-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-400" /> Wie zijn je zakelijke klanten?
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl">
          Voor elke binnenkomende betaling: is dit een{" "}
          <span className="text-emerald-400 font-medium">zakelijke klant/opdrachtgever</span>? Bij "Nee" komt het bij
          "Overig" te staan — daar kun je het daarna alsnog aan een specifieke categorie toewijzen.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${(doneCount / Math.max(1, totalCount)) * 100}%` }} />
          </div>
          <span className="text-xs text-slate-300 whitespace-nowrap font-mono">{doneCount} / {totalCount} bepaald</span>
        </div>
      </div>

      <div className="p-5">
        <SearchInput value={search} onChange={onSearch} placeholder="Zoeken op naam…" className="w-64 mb-3" />

        <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
          {filtered.map((item) => (
            <div key={item.key} className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-slate-400">{item.count}x · totaal {eur(item.total)}</p>
                {item.description && (
                  <p className="text-xs text-slate-400 truncate mt-0.5" title={item.description}>
                    Omschrijving bank: {item.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => onMark(item, "zakelijk")}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-100"
              >
                <Building2 className="h-3.5 w-3.5" /> Ja, zakelijk
              </button>
              <button
                onClick={() => onMark(item, "nee")}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-600 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
              >
                Nee
              </button>
            </div>
          ))}
          {filtered.length === 0 && <p className="p-4 text-sm text-slate-400 text-center">Geen inkomstenbronnen gevonden voor "{search}"</p>}
        </div>
      </div>
    </section>
  );
}
