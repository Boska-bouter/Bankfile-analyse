import { X } from "lucide-react";
import { eur } from "../../utils/amounts.js";

export default function ZakelijkTotaalModal({ year, winst, priveUitgegeven, manualCorrectie, totaal, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <p className="text-sm font-semibold text-slate-800">Zakelijk totaal (netto) — {year}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Winst uit onderneming</span>
            <span className="font-mono text-slate-700">{eur(winst)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Totaal privé uitgegeven</span>
            <span className="font-mono text-slate-700">-{eur(priveUitgegeven)}</span>
          </div>
          {manualCorrectie !== 0 && (
            <p className="text-xs text-slate-400">Inclusief een handmatige correctie van {eur(manualCorrectie)} die je zelf hebt ingevuld.</p>
          )}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 font-semibold">
            <span className="text-slate-800">Zakelijk totaal (netto)</span>
            <span className="font-mono text-slate-800">{eur(totaal)}</span>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Voor de volledige uitsplitsing van de winst zelf (opbrengsten, kosten, afschrijvingen, etc.) — zie het
            Aangiftevoorstel voor dit jaar.
          </p>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
