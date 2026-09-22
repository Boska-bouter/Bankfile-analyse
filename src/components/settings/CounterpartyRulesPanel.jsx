import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { MAIN_CATEGORY_COLOR, mainCategoryOf } from "../../classification/categories.js";
import SearchInput from "../shared/SearchInput.jsx";
import HelpHint from "../shared/HelpHint.jsx";

// Maakt de impliciete tegenpartij-correcties (die ontstaan door in de detailtabel een categorie
// aan te passen) expliciet en beheerbaar op één plek — in plaats van dat je ze alleen kunt zien
// door de betreffende transactie weer op te zoeken. Regels herkend op IBAN (stabieler dan de
// naam) zijn gemarkeerd.
export default function CounterpartyRulesPanel({ overridesByCounterparty, setOverridesByCounterparty, onOpenHelp }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const rules = useMemo(() => {
    return Object.entries(overridesByCounterparty)
      .map(([key, val]) => ({
        key,
        displayName: val.displayName || key,
        sign: val.sign === "neg" ? "Betaald (–)" : "Ontvangen (+)",
        category: val.category,
        type: val.type,
        viaIban: key.startsWith("IBAN::"),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [overridesByCounterparty]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rules;
    const q = search.toLowerCase();
    return rules.filter((r) => r.displayName.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q));
  }, [rules, search]);

  const removeRule = (key) => {
    setOverridesByCounterparty((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>Tegenpartijregels</span>
        <span className="text-xs font-normal text-slate-400">({rules.length})</span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-500 mb-3">
            Elke correctie die je in de detailtabel maakt, komt hier als regel te staan en geldt automatisch voor
            toekomstige transacties van dezelfde tegenpartij. Regels op <strong>IBAN</strong> zijn stabieler dan
            regels op naam — die blijven werken ook als de bank de naamsweergave een keer wijzigt.{" "}
            {onOpenHelp && <HelpHint chapter="tegenpartijregels" onOpen={onOpenHelp} />}
          </p>
          {rules.length > 0 && <SearchInput value={search} onChange={setSearch} placeholder="Zoeken op naam of categorie…" className="w-64 mb-3" />}
          {rules.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nog geen regels — die ontstaan vanzelf zodra je een categorie corrigeert.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Geen regels gevonden voor "{search}".</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
              {filtered.map((r) => (
                <div key={r.key} className="flex items-center gap-2 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate flex items-center gap-1.5">
                      {r.displayName}
                      {r.viaIban && (
                        <span className="shrink-0 rounded bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">IBAN</span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {r.sign} ·{" "}
                      <span className={`inline-block rounded px-1.5 py-0.5 font-medium ${MAIN_CATEGORY_COLOR[mainCategoryOf(r.category)] || "bg-slate-200 text-slate-700"}`}>
                        {mainCategoryOf(r.category)}
                      </span>{" "}
                      · {r.category} · {r.type}
                    </p>
                  </div>
                  <button onClick={() => removeRule(r.key)} className="shrink-0 text-slate-400 hover:text-rose-600" title="Regel verwijderen (transacties vallen terug op automatische classificatie)">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
