import { useMemo, useState } from "react";
import { CATEGORY_ORDER, CATEGORY_COLOR } from "../../classification/categories.js";
import { computeBtw } from "../../tax/btw.js";
import { eur } from "../../utils/amounts.js";
import SearchInput from "../shared/SearchInput.jsx";

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
  const [query, setQuery] = useState("");
  const [showAmountFilter, setShowAmountFilter] = useState(false);
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [amountSign, setAmountSign] = useState("beide"); // "beide" | "neg" | "pos"
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const applyChange = (tx, patch) => {
    const key = (tx.counterparty || tx.description || "").trim();
    if (key) onCounterpartyOverride(key, tx.amount, patch);
    else onRowOverride(tx.id, patch);
  };

  const filteredItems = useMemo(() => {
    let rows = group.items;
    const q = query.trim().toLowerCase();
    if (q) {
      const isExactCategoryName = CATEGORY_ORDER.some((c) => c.toLowerCase() === q);
      rows = rows.filter((t) =>
        isExactCategoryName ? t.category.toLowerCase() === q : `${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase().includes(q)
      );
    }
    const min = amountMin.trim() === "" ? null : Math.abs(parseFloat(amountMin));
    const max = amountMax.trim() === "" ? null : Math.abs(parseFloat(amountMax));
    if (min !== null || max !== null || amountSign !== "beide") {
      rows = rows.filter((t) => {
        if (amountSign === "neg" && t.amount >= 0) return false;
        if (amountSign === "pos" && t.amount < 0) return false;
        const abs = Math.abs(t.amount);
        if (min !== null && !Number.isNaN(min) && abs < min) return false;
        if (max !== null && !Number.isNaN(max) && abs > max) return false;
        return true;
      });
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(...dateFrom.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))) : null;
      const to = dateTo ? new Date(...dateTo.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))) : null;
      if (to) to.setHours(23, 59, 59, 999);
      rows = rows.filter((t) => {
        if (from && t.date < from) return false;
        if (to && t.date > to) return false;
        return true;
      });
    }
    return rows;
  }, [group.items, query, amountMin, amountMax, amountSign, dateFrom, dateTo]);

  const hasActiveFilter = query.trim() !== "" || amountMin.trim() !== "" || amountMax.trim() !== "" || amountSign !== "beide" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Categorieën — {group.label}</h3>
        <CategorySummary items={group.items} categoryBtwRates={categoryBtwRates} btwVerlegd={btwVerlegd} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detail ({filteredItems.length} van {group.items.length})</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <SearchInput value={query} onChange={setQuery} placeholder="Zoeken op naam, omschrijving of categorie…" className="w-56" />
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowAmountFilter((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                    amountMin || amountMax || amountSign !== "beide" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  Bedrag{(amountMin || amountMax || amountSign !== "beide") ? " ✓" : ""}
                </button>
                {showAmountFilter && (
                  <div className="absolute right-0 z-10 mt-1 w-60 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="text-xs text-slate-500 mb-2">Filter op bedrag</p>
                    <div className="flex gap-1 mb-2">
                      <button onClick={() => setAmountSign("beide")} className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${amountSign === "beide" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Beide</button>
                      <button onClick={() => setAmountSign("neg")} className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${amountSign === "neg" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Betaald (–)</button>
                      <button onClick={() => setAmountSign("pos")} className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${amountSign === "pos" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Ontvangen (+)</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" inputMode="decimal" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="Min" className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                      <span className="text-slate-400 text-xs">t/m</span>
                      <input type="number" inputMode="decimal" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="Max" className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                    </div>
                    {(amountMin || amountMax || amountSign !== "beide") && (
                      <button onClick={() => { setAmountMin(""); setAmountMax(""); setAmountSign("beide"); }} className="mt-2 text-xs text-slate-400 hover:text-rose-600">
                        Filter wissen
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowDateFilter((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                    dateFrom || dateTo ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  Datum{(dateFrom || dateTo) ? " ✓" : ""}
                </button>
                {showDateFilter && (
                  <div className="absolute right-0 z-10 mt-1 w-64 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="text-xs text-slate-500 mb-2">Filter op periode</p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Van</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Tot en met</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                    {(dateFrom || dateTo) && (
                      <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="mt-2 text-xs text-slate-400 hover:text-rose-600">
                        Filter wissen
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {hasActiveFilter && (
            <p className="text-xs font-mono text-slate-500 mb-1">Totaal getoond: {eur(filteredItems.reduce((a, t) => a + t.amount, 0))}</p>
          )}
          <p className="text-xs text-slate-400">
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
              {filteredItems
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
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">Geen transacties gevonden voor "{query}".</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
