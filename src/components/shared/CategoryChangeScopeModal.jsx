import { useState } from "react";
import { X } from "lucide-react";

export default function CategoryChangeScopeModal({ pending, onApplyRow, onApplyAllYears, onApplyYears, onClose }) {
  const { tx, patch, matchCount, matchYears } = pending;
  const [selectedYears, setSelectedYears] = useState(matchYears);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <p className="text-sm font-semibold text-slate-800">Wijziging toepassen op meerdere transacties?</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 text-sm text-slate-600 space-y-3">
          <p>
            Er zijn nog {matchCount - 1} andere transacties van <strong>"{tx.counterparty || tx.description}"</strong> met
            hetzelfde teken, naar <strong>{patch.category}</strong> ({patch.type}). Alleen deze ene transactie aanpassen,
            of ook de andere?
          </p>
          <div className="space-y-2">
            <button
              onClick={onApplyRow}
              className="w-full text-left rounded-md border border-slate-300 px-3 py-2 text-sm hover:border-slate-400 hover:bg-slate-50"
            >
              Alleen deze ene transactie
            </button>
            <button
              onClick={onApplyAllYears}
              className="w-full text-left rounded-md border border-slate-300 px-3 py-2 text-sm hover:border-slate-400 hover:bg-slate-50"
            >
              Deze tegenpartij — alle jaren ({matchYears.join(", ")})
            </button>
          </div>
          {matchYears.length > 1 && (
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-2">Of kies zelf voor welke jaren:</p>
              <div className="flex flex-wrap gap-3 mb-3">
                {matchYears.map((year) => (
                  <label key={year} className="inline-flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year)}
                      onChange={(e) => setSelectedYears((prev) => (e.target.checked ? [...prev, year].sort() : prev.filter((y) => y !== year)))}
                    />
                    {year}
                  </label>
                ))}
              </div>
              <button
                onClick={() => onApplyYears(selectedYears)}
                disabled={selectedYears.length === 0}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
              >
                Toepassen op gekozen jaren
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
