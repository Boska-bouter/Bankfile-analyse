import { X, Check } from "lucide-react";
import {
  MAIN_CATEGORY_ORDER, MAIN_CATEGORY_COLOR, MAIN_CATEGORY_DEFAULT_SUBTYPE, mainCategoryOf, subtypesForMainCategory,
} from "../../classification/categories.js";
import { eur } from "../../utils/amounts.js";

const LEVEL_INFO = {
  heuristic: { icon: "🟡", label: "Controleren" },
  fallback: { icon: "🔴", label: "Onduidelijk" },
};

export default function UncertainTransactionsModal({
  level, transactions, bulkCounts, onRequestChange, onConfirmCorrect, onJumpToOverig, onJumpToPersonen, onClose,
}) {
  const info = LEVEL_INFO[level];
  const bulkTotal = (bulkCounts.overig || 0) + (bulkCounts.personen || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <p className="text-sm font-semibold text-slate-800">
            {info.icon} {info.label} ({transactions.length + bulkTotal})
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {bulkTotal > 0 && (
          <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 shrink-0">
            <p>
              ⓘ {bulkTotal} van deze transacties staan al verzameld in{" "}
              {bulkCounts.overig > 0 && <>"Overig" ({bulkCounts.overig})</>}
              {bulkCounts.overig > 0 && bulkCounts.personen > 0 && " en "}
              {bulkCounts.personen > 0 && <>"Overboekingen aan personen" ({bulkCounts.personen})</>} — check die twee
              vensters eerst, dat is vaak sneller dan hier één voor één doorlopen.
            </p>
            <div className="mt-1.5 flex gap-3">
              {bulkCounts.overig > 0 && (
                <button onClick={onJumpToOverig} className="underline hover:no-underline font-medium">
                  "Overig" openen
                </button>
              )}
              {bulkCounts.personen > 0 && (
                <button onClick={onJumpToPersonen} className="underline hover:no-underline font-medium">
                  "Overboekingen aan personen" openen
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-4 overflow-y-auto flex-1">
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Verder niets — de rest staat in de twee vensters hierboven.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-md">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
                  <div className="flex-1 min-w-[9rem]">
                    <p className="font-medium truncate">{tx.counterparty || tx.description || "(geen omschrijving)"}</p>
                    <p className="text-[10px] text-slate-400">
                      {tx.date.toLocaleDateString("nl-NL")} · {tx.confidence.label}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-slate-500 w-20 text-right">{eur(tx.amount)}</span>
                  <select
                    value={mainCategoryOf(tx.category)}
                    onChange={(e) => onRequestChange(tx, { category: MAIN_CATEGORY_DEFAULT_SUBTYPE[e.target.value] || tx.category, type: tx.type })}
                    className={`shrink-0 rounded px-1.5 py-1 text-[11px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${MAIN_CATEGORY_COLOR[mainCategoryOf(tx.category)] || "bg-slate-200 text-slate-700"}`}
                  >
                    {MAIN_CATEGORY_ORDER.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={tx.category}
                    onChange={(e) => onRequestChange(tx, { category: e.target.value, type: tx.type })}
                    className="shrink-0 rounded border border-slate-300 px-1.5 py-1 text-[10px] max-w-[8rem]"
                    title="Subtype (bepaalt BTW-percentage en vast/variabel)"
                  >
                    {subtypesForMainCategory(mainCategoryOf(tx.category)).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={tx.type}
                    onChange={(e) => onRequestChange(tx, { category: tx.category, type: e.target.value })}
                    className={`shrink-0 rounded px-1.5 py-1 text-[11px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${tx.type === "Zakelijk" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                  >
                    <option value="Prive">Prive</option>
                    <option value="Zakelijk">Zakelijk</option>
                  </select>
                  <button
                    onClick={() => onConfirmCorrect(tx)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-1 text-[10px] font-medium hover:bg-emerald-100"
                    title="Klopt zo — markeer als bevestigd (wordt voortaan 🟢)"
                  >
                    <Check className="h-3 w-3" /> Klopt
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
