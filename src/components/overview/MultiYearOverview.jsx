import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { eurTight } from "../../utils/amounts.js";
import { estimateIncomeTax } from "../../tax/incomeTax.js";

// Zet jaren naast elkaar: winst, wat er naar privé is gegaan, nog te betalen OB, geschatte IB
// en het uiteindelijke Tekort/Over. yearlySummaries en yearlyOpenOB komen uit App.jsx
// (respectievelijk per jaar berekend met computeYearlySummary, en computeYearlyOpenOB — dat
// laatste is al een kaart met alle jaren tegelijk).
export default function MultiYearOverview({ years, yearlySummaries, yearlyOpenOB, korRegeling, onYearClick }) {
  const [open, setOpen] = useState(years.length > 1);
  if (years.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-sm font-semibold">
        <span>{years.length > 1 ? `Meerjarenoverzicht (${years.length} jaar)` : "Jaaroverzicht — is dit rendabel?"}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-100">
                <th className="text-left font-medium py-2 pr-3">Jaar</th>
                <th className="text-right font-medium py-2 px-3">Zak. Ink.</th>
                <th className="text-right font-medium py-2 px-3">WUO (bruto)</th>
                <th className="text-right font-medium py-2 px-3">Naar privé</th>
                {!korRegeling && <th className="text-right font-medium py-2 px-3">Te betalen OB</th>}
                <th className="text-right font-medium py-2 px-3">Geschat IB*</th>
                <th className="text-right font-medium py-2 pl-3">Tekort / Over</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {years.map((year) => {
                const summary = yearlySummaries[year];
                if (!summary) return null;
                const openOB = yearlyOpenOB[year] || 0;
                const ibEstimate = estimateIncomeTax(summary.winst, year);
                const verschil = summary.winst - summary.priUitgegeven - (korRegeling ? 0 : openOB) - ibEstimate.belasting;
                const isTekort = verschil < 0;
                return (
                  <tr key={year} className="hover:bg-slate-50 cursor-pointer" onClick={() => onYearClick(year)}>
                    <td className="py-2 pr-3 font-medium">{year}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">{eurTight(summary.zakelijkeInkomsten)}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{eurTight(summary.winst)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{eurTight(summary.uitkeringenAanPrive)}</td>
                    {!korRegeling && (
                      <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">
                        {openOB >= 0 ? "-" : "+"}{eurTight(Math.abs(openOB))}
                      </td>
                    )}
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">-{eurTight(ibEstimate.belasting)}{ibEstimate.geëxtrapoleerd ? "*" : ""}</td>
                    <td className={`py-2 pl-3 text-right font-mono font-medium whitespace-nowrap ${isTekort ? "text-rose-700" : "text-emerald-700"}`}>
                      {isTekort ? "Tekort: " : "Over: "}{eurTight(Math.abs(verschil))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">Klik op een jaar om ernaartoe te springen.</p>
        </div>
      )}
    </section>
  );
}
