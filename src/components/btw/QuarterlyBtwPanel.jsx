import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { eur } from "../../utils/amounts.js";

export default function QuarterlyBtwPanel({ quarters, kwartaalStatus, setKwartaalStatusField, activeYear }) {
  const [open, setOpen] = useState(true);
  const openCount = quarters.filter((q) => {
    const s = kwartaalStatus[`${q.year}-Q${q.kwartaal}`] || {};
    return !s.aangegeven || !s.betaald;
  }).length;

  if (quarters.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold">
        <span>BTW-aangifte per kwartaal (OB) {activeYear}</span>
        {openCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {openCount}
          </span>
        )}
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5 overflow-x-auto">
          <p className="text-xs text-slate-500 mb-3">
            De omzet- en kostenbedragen staan hier <strong>netto</strong> (excl. BTW), met het bruto bankbedrag er klein
            tussen haakjes onder.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="text-left font-medium py-2 pr-4">Kwartaal</th>
                <th className="text-right font-medium py-2 px-3">Omzet 21%</th>
                <th className="text-right font-medium py-2 px-3">BTW 21% (1a)</th>
                <th className="text-right font-medium py-2 px-3">Omzet 9%</th>
                <th className="text-right font-medium py-2 px-3">BTW 9% (1b)</th>
                <th className="text-right font-medium py-2 px-3">Omzet verlegd (1e)</th>
                <th className="text-right font-medium py-2 px-3">Uitgaven (netto)</th>
                <th className="text-right font-medium py-2 px-3">Voorbelasting (5b)</th>
                <th className="text-right font-medium py-2 pl-3">Saldo</th>
                <th className="text-left font-medium py-2 pl-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {quarters.map((q) => {
                const saldo = q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting;
                const statusKey = `${q.year}-Q${q.kwartaal}`;
                const status = kwartaalStatus[statusKey] || {};
                return (
                  <tr key={statusKey}>
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">{q.year} — Q{q.kwartaal}</td>
                    <td className="py-2 px-3 text-right font-mono">
                      {eur(q.omzetBruto21 - q.verschuldigdBtw21)}
                      <div className="text-[10px] text-slate-400 font-normal">({eur(q.omzetBruto21)} bruto)</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{eur(q.verschuldigdBtw21)}</td>
                    <td className="py-2 px-3 text-right font-mono">
                      {eur(q.omzetBruto9 - q.verschuldigdBtw9)}
                      <div className="text-[10px] text-slate-400 font-normal">({eur(q.omzetBruto9)} bruto)</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{eur(q.verschuldigdBtw9)}</td>
                    <td className="py-2 px-3 text-right font-mono text-amber-700">{eur(q.omzetBrutoVerlegd)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">
                      {eur(q.kostenBruto - q.voorbelasting)}
                      <div className="text-[10px] text-slate-400 font-normal">({eur(q.kostenBruto)} bruto)</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">{eur(q.voorbelasting)}</td>
                    <td className={`py-2 pl-3 text-right font-mono font-semibold ${saldo >= 0 ? "text-slate-900" : "text-emerald-700"}`}>
                      {eur(Math.abs(saldo))} {saldo >= 0 ? "te betalen" : "terug"}
                    </td>
                    <td className="py-2 pl-4 whitespace-nowrap">
                      <label className="inline-flex items-center gap-1 text-xs text-slate-500 mr-3">
                        <input type="checkbox" checked={!!status.aangegeven} onChange={(e) => setKwartaalStatusField(statusKey, "aangegeven", e.target.checked)} />
                        Aangegeven
                      </label>
                      <label className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <input type="checkbox" checked={!!status.betaald} onChange={(e) => setKwartaalStatusField(statusKey, "betaald", e.target.checked)} />
                        Betaald
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
