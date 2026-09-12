import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CATEGORY_COLOR } from "../../classification/categories.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

const LEVEL_ICON = { override: "🟢", keyword: "🟢", heuristic: "🟡", fallback: "🔴" };

// Maakt zichtbaar hoe zeker de automatische classificatie is — niet als vervanging van
// resolveClassification (die blijft de bron van waarheid), maar als hulp om te zien welke
// transacties de moeite waard zijn om te controleren, in plaats van alles na te lopen.
export default function ClassificationConfidencePanel({ classified, onOpenHelp, onConfirmCorrect, onOpenLevel }) {
  const [open, setOpen] = useState(false);
  const nonMirror = classified.filter((tx) => !tx.isMirror);
  if (nonMirror.length === 0) return null;

  const approved = nonMirror.filter((tx) => tx.confidence.level === "override" || tx.confidence.level === "keyword");
  const review = nonMirror.filter((tx) => tx.confidence.level === "heuristic");
  const unclear = nonMirror.filter((tx) => tx.confidence.level === "fallback");
  const needsReview = [...unclear, ...review]; // onduidelijk eerst — dat verdient de meeste aandacht
  const total = nonMirror.length;
  const pct = (n) => Math.round((n / total) * 100);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-4 text-left">
        <span className="text-sm font-semibold flex items-center gap-2">
          Classificatiezekerheid
          {onOpenHelp && <HelpHint chapter="classificatiezekerheid" onOpen={onOpenHelp} />}
        </span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-emerald-50 border border-emerald-200 py-2">
            <p className="text-lg font-semibold text-emerald-800">{approved.length}</p>
            <p className="text-[10px] text-emerald-700">🟢 automatisch goedgekeurd ({pct(approved.length)}%)</p>
          </div>
          <div className="rounded-md bg-amber-50 border border-amber-200 py-2">
            <p className="text-lg font-semibold text-amber-800">{review.length}</p>
            {onOpenLevel && review.length > 0 ? (
              <button onClick={() => onOpenLevel("heuristic")} className="text-[10px] text-amber-700 underline hover:no-underline">
                🟡 controleren ({pct(review.length)}%)
              </button>
            ) : (
              <p className="text-[10px] text-amber-700">🟡 controleren ({pct(review.length)}%)</p>
            )}
          </div>
          <div className="rounded-md bg-rose-50 border border-rose-200 py-2">
            <p className="text-lg font-semibold text-rose-800">{unclear.length}</p>
            {onOpenLevel && unclear.length > 0 ? (
              <button onClick={() => onOpenLevel("fallback")} className="text-[10px] text-rose-700 underline hover:no-underline">
                🔴 onduidelijk ({pct(unclear.length)}%)
              </button>
            ) : (
              <p className="text-[10px] text-rose-700">🔴 onduidelijk ({pct(unclear.length)}%)</p>
            )}
          </div>
        </div>
        {open && needsReview.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-400 mb-2">
              De 🟢-transacties matchen een specifieke regel of zijn al eens door jou bevestigd. Onderstaande hebben dat
              (nog) niet — geen foutmelding, alleen een seintje dat een blik erop de moeite waard is.
            </p>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
              {needsReview.slice(0, 200).map((tx) => (
                <div key={tx.id} className="flex items-center gap-2 p-2 text-xs">
                  <span className="shrink-0">{LEVEL_ICON[tx.confidence.level]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{tx.counterparty || tx.description || "(geen omschrijving)"}</p>
                    <p className="text-[10px] text-slate-400">{tx.confidence.label}</p>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLOR[tx.category] || "bg-slate-200 text-slate-700"}`}>{tx.category}</span>
                  <span className="shrink-0 font-mono text-slate-500 w-20 text-right">{eur(tx.amount)}</span>
                  {onConfirmCorrect && (
                    <button
                      onClick={() => onConfirmCorrect(tx)}
                      className="shrink-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded px-1 py-0.5"
                      title="Klopt zo — markeer deze indeling als bevestigd (wordt voortaan 🟢)"
                    >
                      ✓ Klopt zo
                    </button>
                  )}
                </div>
              ))}
            </div>
            {needsReview.length > 200 && <p className="mt-1.5 text-[10px] text-slate-400">Eerste 200 getoond van {needsReview.length}.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
