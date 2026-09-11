import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, X, Plus } from "lucide-react";
import { registerCategory } from "../../classification/categories.js";
import SearchInput from "../shared/SearchInput.jsx";

export default function CategoryRulesPanel({ categoryRules, setCategoryRules }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedCards, setExpandedCards] = useState({});
  const [newKeywordByCategory, setNewKeywordByCategory] = useState({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryError, setNewCategoryError] = useState("");

  const filteredRules = useMemo(() => {
    const sorted = [...categoryRules].sort((a, b) => a.name.localeCompare(b.name));
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((r) => r.name.toLowerCase().includes(q) || r.keywords.some((kw) => kw.toLowerCase().includes(q)));
  }, [categoryRules, search]);

  const toggleCard = (name) => setExpandedCards((prev) => ({ ...prev, [name]: !prev[name] }));

  const addKeyword = (categoryName) => {
    const kw = (newKeywordByCategory[categoryName] || "").trim().toLowerCase();
    if (!kw) return;
    setCategoryRules((prev) => prev.map((r) => (r.name === categoryName && !r.keywords.includes(kw) ? { ...r, keywords: [...r.keywords, kw] } : r)));
    setNewKeywordByCategory((prev) => ({ ...prev, [categoryName]: "" }));
  };
  const removeKeyword = (categoryName, kw) => {
    setCategoryRules((prev) => prev.map((r) => (r.name === categoryName ? { ...r, keywords: r.keywords.filter((k) => k !== kw) } : r)));
  };
  const addCustomCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      setNewCategoryError("Vul een naam in.");
      return;
    }
    if (categoryRules.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setNewCategoryError("Deze categorie bestaat al.");
      return;
    }
    registerCategory(name);
    setCategoryRules((prev) => [...prev, { name, color: "bg-slate-200 text-slate-700", keywords: [] }]);
    setNewCategoryName("");
    setNewCategoryError("");
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-5 text-sm font-semibold">
        <span>Categorieregels — zoekwoorden per categorie</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Zoeken op categorie of zoekwoord…" className="w-72 mb-3" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRules.length === 0 && <p className="col-span-full text-sm text-slate-400 py-4 text-center">Geen categorieën gevonden voor "{search}".</p>}
            {filteredRules.map((r) => {
              const isOpenCard = !!expandedCards[r.name] || search.trim() !== "";
              return (
                <div key={r.name} className="rounded-md border border-slate-100">
                  <button onClick={() => toggleCard(r.name)} className="w-full flex items-center justify-between gap-2 p-3 text-left">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium truncate ${r.color}`}>{r.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{r.keywords.length} zoekwoord{r.keywords.length === 1 ? "" : "en"}</span>
                    </span>
                    {isOpenCard ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                  </button>
                  {isOpenCard && (
                    <div className="px-3 pb-3">
                      {r.description && <p className="text-xs text-slate-500 mb-2 italic">{r.description}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {r.keywords.map((kw) => (
                          <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">
                            {kw}
                            <button onClick={() => removeKeyword(r.name, kw)} className="hover:text-rose-600">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                        {r.keywords.length === 0 && <span className="text-xs text-slate-400">Nog geen zoekwoorden</span>}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <input
                          value={newKeywordByCategory[r.name] || ""}
                          onChange={(e) => setNewKeywordByCategory((prev) => ({ ...prev, [r.name]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addKeyword(r.name)}
                          placeholder="bijv. albert heijn, shell, kpn…"
                          className="flex-1 min-w-0 rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button onClick={() => addKeyword(r.name)} className="shrink-0 rounded-md bg-slate-900 text-white px-2 py-1 text-xs hover:bg-slate-700">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="rounded-md border-2 border-dashed border-slate-200 p-3 sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium text-slate-600 mb-2">Nieuwe categorie toevoegen</p>
              <div className="flex gap-1.5">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
                  placeholder="Naam van de nieuwe categorie…"
                  className="flex-1 min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button onClick={addCustomCategory} className="shrink-0 inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700">
                  <Plus className="h-3.5 w-3.5" /> Toevoegen
                </button>
              </div>
              {newCategoryError && <p className="mt-1.5 text-xs text-rose-600">{newCategoryError}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
