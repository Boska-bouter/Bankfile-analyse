import { useState } from "react";
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { CATEGORY_ORDER } from "../../classification/categories.js";
import { eur } from "../../utils/amounts.js";

// Generieke beheerder voor een lijst losse tekst-items (tegenpartijnamen) — gebruikt voor zowel
// "Zakelijke tegenpartijen (inkomsten)" als "Zakelijke uitgaven (leveranciers)". `entries`
// (optioneel) toont daaronder een uitklapbaar overzicht van wat er nu al op basis hiervan is
// herkend — met een dropdown per tegenpartij om de categorie alsnog aan te passen.
export default function KeywordManager({ keywords, onAdd, onRemove, placeholder, chipClass, addButtonClass, entries, entriesLabel, onReclassify }) {
  const [value, setValue] = useState("");
  const [showEntries, setShowEntries] = useState(false);
  const submit = () => {
    const kw = value.trim();
    if (kw) onAdd(kw);
    setValue("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {keywords.map((kw) => (
          <span key={kw} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${chipClass}`}>
            {kw}
            <button onClick={() => onRemove(kw)} className="hover:text-rose-600">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {keywords.length === 0 && <span className="text-xs text-slate-400">Nog niets toegevoegd</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button onClick={submit} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-white ${addButtonClass}`}>
          <Plus className="h-4 w-4" /> Toevoegen
        </button>
      </div>
      {entries && entries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button onClick={() => setShowEntries((v) => !v)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
            {showEntries ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {entriesLabel || "Nu herkend"} ({entries.length})
          </button>
          {showEntries && (
            <div className="mt-2 max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
              {entries.map((item) => (
                <div key={item.key} className="flex items-center gap-2 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.count}x · totaal {eur(item.total)}</p>
                  </div>
                  {onReclassify && (
                    <select
                      value={item.category}
                      onChange={(e) => onReclassify(item, e.target.value)}
                      className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs"
                      title="Naar een andere categorie verplaatsen"
                    >
                      {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
