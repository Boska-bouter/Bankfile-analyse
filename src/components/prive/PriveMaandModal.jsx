// beide-V1R8 (fase 5) — maandoverzicht van een privédossier: per maand inkomsten, uitgaven, vaste lasten,
// sparen en wat er overblijft. Geen omzet, geen BTW. Met printen en downloaden (CSV voor Excel).
import ModalShell from "../modals/ModalShell.jsx";
import { eur } from "../../utils/amounts.js";
import { MAANDEN, maandRegels, maandCsv } from "../../reports/prive/maandoverzicht.js";

export default function PriveMaandModal({ jaar, jaren = [], budget, onSelectYear, onClose }) {
  const rijen = maandRegels(budget);
  const download = () => {
    const blob = new Blob(["﻿" + maandCsv(jaar, budget)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Maandoverzicht_${jaar}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <ModalShell title={`Per maand ${jaar}`} onClose={onClose} swipe={jaren.length > 1 ? { years: jaren, year: jaar, onSelectYear } : undefined}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-1.5 pr-2">Maand</th><th className="py-1.5 px-2 text-right">Inkomsten</th><th className="py-1.5 px-2 text-right">Uitgaven</th>
              <th className="py-1.5 px-2 text-right">waarvan vast</th><th className="py-1.5 px-2 text-right">Sparen</th><th className="py-1.5 pl-2 text-right">Over</th>
            </tr>
          </thead>
          <tbody>
            {rijen.map((r) => (
              <tr key={r.maand} className={`border-b border-slate-100 ${r.totaal ? "font-semibold" : ""}`}>
                <td className="py-1.5 pr-2">{r.maand}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{eur(r.inkomsten)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{eur(r.uitgaven)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-slate-500">{eur(r.vasteLasten)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{eur(r.sparen)}</td>
                <td className={`py-1.5 pl-2 text-right tabular-nums ${r.over < 0 ? "text-rose-700" : "text-emerald-700"}`}>{eur(r.over)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={download} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Downloaden (Excel/CSV)</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Overboekingen tussen je eigen rekeningen tellen niet mee. {MAANDEN.length} maanden; maanden zonder gegevens staan op nul.</p>
    </ModalShell>
  );
}
