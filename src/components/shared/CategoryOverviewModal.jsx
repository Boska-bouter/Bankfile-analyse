import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { MAIN_CATEGORY_ORDER, MAIN_CATEGORY_COLOR, CATEGORY_COLOR, subtypesForMainCategory } from "../../classification/categories.js";

// Puur een opzoekvenster: "waar hoort dit onder" — geen bewerkmogelijkheden hier (dat blijft
// Categorieregels), alleen een snel, doorzoekbaar overzicht van de volledige structuur.
export default function CategoryOverviewModal({ onClose }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MAIN_CATEGORY_ORDER.map((main) => {
      const subtypes = subtypesForMainCategory(main);
      const mainMatches = !q || main.toLowerCase().includes(q);
      const visibleSubtypes = mainMatches ? subtypes : subtypes.filter((s) => s.toLowerCase().includes(q));
      return { main, subtypes: visibleSubtypes };
    }).filter((g) => g.subtypes.length > 0);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-slate-800">Categorieën &amp; subtypes — waar hoort dit onder?</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-3 shrink-0">
          <div className="flex items-center rounded-md border border-slate-300 bg-white">
            <Search className="h-3.5 w-3.5 text-slate-400 ml-2.5 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoeken op categorie of subtype…"
              className="w-full min-w-0 rounded-md border-0 px-2 py-1.5 text-sm focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="shrink-0 pr-2.5 pl-1 text-slate-400 hover:text-slate-700">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {groups.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Niets gevonden voor "{query}".</p>}
          {groups.map(({ main, subtypes }) => (
            <div key={main}>
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${MAIN_CATEGORY_COLOR[main] || "bg-slate-200 text-slate-700"}`}>
                {main}
              </span>
              {subtypes.length > 1 || subtypes[0] !== main ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {subtypes.map((s) => (
                    <span key={s} className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLOR[s] || "bg-slate-100 text-slate-600"}`}>
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="px-5 py-2.5 border-t border-slate-200 shrink-0">
          <p className="text-[11px] text-slate-400">
            Alleen ter oriëntatie — trefwoorden en indeling zelf aanpassen kan bij "Categorieregels".
          </p>
        </div>
      </div>
    </div>
  );
}
