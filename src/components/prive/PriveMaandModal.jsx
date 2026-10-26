// beide-V1R8 (fase 5) — maandoverzicht van een privédossier: per maand inkomsten, uitgaven, vaste lasten,
// sparen en wat er overblijft. Geen omzet, geen BTW. Met printen en downloaden (PDF, Excel of HTML).
import ModalShell from "../modals/ModalShell.jsx";
import { eur } from "../../utils/amounts.js";
import { Printer } from "lucide-react";
import { MAANDEN, maandRegels, maandHtml, maandExcel } from "../../reports/prive/maandoverzicht.js";
import DownloadKnop from "../shared/DownloadKnop.jsx";
import { downloadRapport } from "../../reports/download.js";
import { printHtmlDocument } from "../../reports/printReport.js";

export default function PriveMaandModal({ jaar, jaren = [], budget, onSelectYear, onClose }) {
  const rijen = maandRegels(budget);
  // beide-V4R1 — Downloaden met keuze PDF, Excel of HTML (was CSV), plus Printen.
  const download = (soort) => downloadRapport({ soort, html: () => maandHtml(jaar, budget), naam: `Maandoverzicht_${jaar}`, excel: () => maandExcel(jaar, budget) });
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
        <DownloadKnop onKies={download} rechts={false} />
        <button type="button" onClick={() => printHtmlDocument(maandHtml(jaar, budget))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"><Printer className="h-4 w-4" /> Printen</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Overboekingen tussen eigen rekeningen tellen niet mee. {MAANDEN.length} maanden; maanden zonder gegevens staan op nul.</p>
    </ModalShell>
  );
}
