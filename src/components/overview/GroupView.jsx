import { useMemo } from "react";
import { CATEGORY_ORDER, CATEGORY_COLOR } from "../../classification/categories.js";
import { computeBtw } from "../../tax/btw.js";
import { eur } from "../../utils/amounts.js";

// Categorietotalen voor één groep (bijv. "Zakelijk 2026").
function CategorySummary({ items, categoryBtwRates, btwVerlegd }) {
  const totals = useMemo(() => {
    const t = {};
    for (const tx of items) t[tx.category] = (t[tx.category] || 0) + tx.amount;
    return t;
  }, [items]);
  const btwByCategory = useMemo(() => {
    const t = {};
    for (const tx of items) t[tx.category] = (t[tx.category] || 0) + computeBtw(tx, categoryBtwRates, btwVerlegd);
    return t;
  }, [items, categoryBtwRates, btwVerlegd]);
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  const grandBtw = Object.values(btwByCategory).reduce((a, b) => a + b, 0);

  return (
    <table className="w-full text-sm">
      <tbody>
        {CATEGORY_ORDER.filter((c) => c in totals).map((c) => (
          <tr key={c} className="border-b border-slate-50">
            <td className="py-1">
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium truncate max-w-[9rem] ${CATEGORY_COLOR[c] || "bg-slate-200 text-slate-700"}`}>{c}</span>
            </td>
            <td className="py-1 px-2 text-right font-mono text-xs whitespace-nowrap">{eur(totals[c])}</td>
            <td className="py-1 text-right font-mono text-xs whitespace-nowrap text-slate-400">{eur(btwByCategory[c] || 0)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-slate-200 font-semibold">
          <td className="pt-2">Totaal</td>
          <td className="pt-2 px-2 text-right font-mono">{eur(grandTotal)}</td>
          <td className="pt-2 text-right font-mono">{eur(grandBtw)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

// Detailtabel: elke transactie apart, met Categorie en Type direct als dropdown aanpasbaar.
// Een wijziging wordt tegenpartij-breed opgeslagen (geldt dan voor alle transacties van
// diezelfde tegenpartij, in alle jaren) — tenzij er geen bruikbare tegenpartijnaam is, dan
// alleen voor deze ene transactie.
export default function GroupView({ group, onCounterpartyOverride, onRowOverride, categoryBtwRates, btwVerlegd }) {
  const applyChange = (tx, patch) => {
    const key = (tx.counterparty || tx.description || "").trim();
    if (key) onCounterpartyOverride(key, tx.amount, patch);
    else onRowOverride(tx.id, patch);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Categorieën</h3>
        <CategorySummary items={group.items} categoryBtwRates={categoryBtwRates} btwVerlegd={btwVerlegd} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detail ({group.items.length} transacties)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Categorie en type direct aanpasbaar — geldt meteen voor alle transacties van dezelfde tegenpartij, in alle jaren.
          </p>
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left font-medium px-4 py-2">Datum</th>
                <th className="text-right font-medium px-4 py-2">Bedrag</th>
                <th className="text-left font-medium px-4 py-2">Categorie</th>
                <th className="text-left font-medium px-4 py-2">Type</th>
                <th className="text-left font-medium px-4 py-2">Tegenpartij</th>
                <th className="text-left font-medium px-4 py-2">Omschrijving</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {group.items
                .slice()
                .sort((a, b) => b.date - a.date)
                .map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500 font-mono text-xs">{t.date.toLocaleDateString("nl-NL")}</td>
                    <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${t.amount >= 0 ? "text-emerald-700" : "text-slate-700"}`}>{eur(t.amount)}</td>
                    <td className="px-4 py-2">
                      <select
                        value={t.category}
                        onChange={(e) => applyChange(t, { category: e.target.value, type: t.type })}
                        className={`rounded px-1.5 py-0.5 text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${CATEGORY_COLOR[t.category] || "bg-slate-200 text-slate-700"}`}
                      >
                        {CATEGORY_ORDER.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={t.type}
                        onChange={(e) => applyChange(t, { category: t.category, type: e.target.value })}
                        className={`rounded px-1.5 py-0.5 text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${t.type === "Zakelijk" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                      >
                        <option value="Prive">Prive</option>
                        <option value="Zakelijk">Zakelijk</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 max-w-[10rem] truncate" title={t.counterparty}>{t.counterparty}</td>
                    <td className="px-4 py-2 text-slate-500 max-w-[14rem] truncate" title={t.fullDescription || t.description}>{t.description}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
