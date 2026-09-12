import { useState } from "react";
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { MAIN_CATEGORY_ORDER, mainCategoryOf } from "../../classification/categories.js";
import { eur } from "../../utils/amounts.js";

// Generieke beheerder voor een lijst losse tekst-items (tegenpartijnamen) — gebruikt voor zowel
// "Zakelijke tegenpartijen (inkomsten)" als "Zakelijke uitgaven (leveranciers)". `entries`
// (optioneel) toont daaronder een uitklapbaar overzicht van wat er nu al op basis hiervan is
// herkend — met een dropdown per tegenpartij om de categorie alsnog aan te passen, en de bank-
// omschrijving (klik om de volledige tekst te tonen/verbergen).
export default function KeywordManager({
  keywords, onAdd, onRemove, placeholder, chipClass, addButtonClass, entries, entriesLabel, onReclassify,
  isExpanded, onToggleExpand,
}) {
  const [value, setValue] = useState("");
  const [showEntries, setShowEntries] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(null); // item.key van het opengeklapte item
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
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setShowEntries((v) => !v)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
              {showEntries ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {entriesLabel || "Nu herkend"} ({entries.length})
            </button>
            {showEntries && onToggleExpand && (
              <button onClick={onToggleExpand} className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5 shrink-0" title={isExpanded ? "Venster verkleinen" : "Venster over de volle breedte tonen"}>
                {isExpanded ? "Verkleinen" : "Uitvergroten"}
                {isExpanded ? <ChevronRight className="h-3 w-3 rotate-180" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
          </div>
          {showEntries && (
            <div className={`${isExpanded ? "max-h-[32rem]" : "max-h-64"} overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md`}>
              {entries.map((item) => (
                <div key={item.key} className="flex items-center gap-2 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.count}x · totaal {eur(item.total)}</p>
                    {item.description && (
                      <p
                        className={`text-[10px] text-slate-400 cursor-pointer ${expandedDesc === item.key ? "whitespace-normal break-words" : "truncate"}`}
                        onClick={() => setExpandedDesc((cur) => (cur === item.key ? null : item.key))}
                        title="Klik om de volledige omschrijving te tonen/verbergen"
                      >
                        Omschrijving bank: {item.description}
                      </p>
                    )}
                  </div>
                  {onReclassify && (
                    <select
                      value={mainCategoryOf(item.category)}
                      onChange={(e) => onReclassify(item, e.target.value)}
                      className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs"
                      title="Naar een andere categorie verplaatsen"
                    >
                      {MAIN_CATEGORY_ORDER.map((c) => (
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
