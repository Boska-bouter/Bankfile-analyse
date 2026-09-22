import { useMemo, useState } from "react";
import { X } from "lucide-react";

// `suggestions` (optioneel): volledige lijst kandidaat-teksten (bijv. alle tegenpartijnamen en
// categorieën in de huidige groep) — vanaf 3 tekens verschijnt een uitklaplijst met de
// overeenkomende suggesties, zodat je niet per se de precieze schrijfwijze hoeft te kennen.
export default function SearchInput({ value, onChange, placeholder, className = "", suggestions }) {
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    if (!suggestions || value.trim().length < 3) return [];
    const q = value.trim().toLowerCase();
    const seen = new Set();
    const result = [];
    for (const s of suggestions) {
      if (!s) continue;
      const sl = s.toLowerCase();
      if (sl === q) continue; // exact match: al ingevuld, geen suggestie nodig
      if (sl.includes(q) && !seen.has(sl)) {
        seen.add(sl);
        result.push(s);
        if (result.length >= 8) break;
      }
    }
    return result;
  }, [suggestions, value]);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center rounded-md border border-slate-300 bg-white">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          className="w-full min-w-0 rounded-md border-0 px-3 py-1.5 text-sm focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 pr-2.5 pl-1 text-slate-400 hover:text-slate-700"
            aria-label="Zoekveld leegmaken"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {focused && matches.length > 0 && (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-md border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="block w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 truncate"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
