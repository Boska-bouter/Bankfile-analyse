import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { extractRecurringName } from "../../utils/normalization.js";
import { MAAND_NAMEN } from "../../utils/dates.js";
import { CATEGORY_COLOR } from "../../classification/categories.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

const PAGE_SIZE = 15;

export default function RecurringPaymentsPanel({ classified, activeYear, onOpenHelp }) {
  const [open, setOpen] = useState(false);
  const [minCount, setMinCount] = useState(4);
  const [page, setPage] = useState(0);

  const recurringPayments = useMemo(() => {
    const map = {};
    for (const tx of classified) {
      if (tx.isMirror || tx.year !== activeYear) continue;
      const displayName = (tx.counterparty || tx.description || "").trim();
      if (!displayName) continue;
      const key = extractRecurringName(tx);
      if (!key) continue;
      if (!map[key]) map[key] = { name: displayName, type: tx.type, category: tx.category, betaald: [], ontvangen: [], months: new Set() };
      if (tx.amount >= 0) map[key].ontvangen.push(tx.amount);
      else map[key].betaald.push(tx.amount);
      map[key].months.add(tx.month);
    }
    const results = [];
    for (const g of Object.values(map)) {
      const count = g.betaald.length + g.ontvangen.length;
      if (count < minCount) continue;
      const monthNums = [...g.months].map((m) => Number(m.split("-")[1]));
      const showGaps = g.months.size >= 6;
      const missing = showGaps ? Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => !monthNums.includes(m)) : [];
      const totaalBetaald = g.betaald.reduce((a, b) => a + b, 0);
      const totaalOntvangen = g.ontvangen.reduce((a, b) => a + b, 0);
      results.push({
        name: g.name, type: g.type, category: g.category, count, monthCount: g.months.size, missing, showGaps,
        totaalBetaald, totaalOntvangen,
        gemBetaald: g.betaald.length ? totaalBetaald / g.betaald.length : null,
        gemOntvangen: g.ontvangen.length ? totaalOntvangen / g.ontvangen.length : null,
        betaaldCount: g.betaald.length, ontvangenCount: g.ontvangen.length,
      });
    }
    return results.sort((a, b) => b.count - a.count || Math.abs(b.totaalBetaald + b.totaalOntvangen) - Math.abs(a.totaalBetaald + a.totaalOntvangen));
  }, [classified, activeYear, minCount]);

  const pageItems = useMemo(() => recurringPayments.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [recurringPayments, page]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-4 text-sm font-semibold">
        <span className="flex items-center gap-2">
          Terugkerende betalingen {activeYear}
          {onOpenHelp && <HelpHint chapter="terugkerende-betalingen" onOpen={onOpenHelp} />}
        </span>
        <span className="text-xs font-normal text-slate-400">({recurringPayments.length})</span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-slate-500">Zichtbaar vanaf</label>
            <input
              type="number" min="2" value={minCount}
              onChange={(e) => setMinCount(Math.max(2, parseInt(e.target.value, 10) || 2))}
              className="w-16 rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            <span className="text-xs text-slate-500">keer voorkomen</span>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            Tegenpartijen die minstens {minCount} keer voorkomen dit jaar — het bedrag hoeft niet vast te zijn.
          </p>
          {recurringPayments.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Geen tegenpartijen gevonden die minstens {minCount} keer voorkomen.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                    <th className="text-left font-medium py-2 pr-4">Tegenpartij</th>
                    <th className="py-2 px-3"></th>
                    <th className="text-left font-medium py-2 px-3">Categorie</th>
                    <th className="text-right font-medium py-2 px-3">Betaald / ontvangen (gem.)</th>
                    <th className="text-right font-medium py-2 px-3">Aantal</th>
                    <th className="text-left font-medium py-2 pl-3">Ontbreekt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pageItems.map((r, i) => (
                    <tr key={`${r.name}-${r.type}-${i}`}>
                      <td className="py-1.5 pr-4 max-w-[12rem] truncate" title={r.name}>{r.name}</td>
                      <td className="py-1.5 px-3">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${r.type === "Zakelijk" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{r.type}</span>
                      </td>
                      <td className="py-1.5 px-3">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLOR[r.category] || "bg-slate-200 text-slate-700"}`}>{r.category}</span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono whitespace-nowrap">
                        {r.betaaldCount > 0 && <div>Betaald: {eur(Math.abs(r.totaalBetaald))} <span className="text-slate-400">(gem. {eur(Math.abs(r.gemBetaald))})</span></div>}
                        {r.ontvangenCount > 0 && <div className={r.betaaldCount > 0 ? "text-emerald-700" : ""}>Ontvangen: {eur(r.totaalOntvangen)} <span className="text-slate-400">(gem. {eur(r.gemOntvangen)})</span></div>}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-500 whitespace-nowrap">{r.count}x <span className="text-slate-300">({r.monthCount} mnd)</span></td>
                      <td className="py-1.5 pl-3">
                        {r.showGaps && r.missing.length > 0 ? (
                          <span className="text-amber-700">{r.missing.map((m) => MAAND_NAMEN[m - 1]).join(", ")}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recurringPayments.length > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40">← Vorige 15</button>
                  <span className="text-xs text-slate-400 font-mono whitespace-nowrap">{page * PAGE_SIZE + 1}–{page * PAGE_SIZE + pageItems.length} van {recurringPayments.length}</span>
                  <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= recurringPayments.length} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40">Volgende 15 →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
