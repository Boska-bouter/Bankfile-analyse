import { useState } from "react";
import { Plus, X } from "lucide-react";

// Generieke beheerder voor een lijst losse tekst-items (tegenpartijnamen) — gebruikt voor zowel
// "Zakelijke tegenpartijen (inkomsten)" als "Zakelijke uitgaven (leveranciers)".
export default function KeywordManager({ keywords, onAdd, onRemove, placeholder, chipClass, addButtonClass }) {
  const [value, setValue] = useState("");
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
    </div>
  );
}
