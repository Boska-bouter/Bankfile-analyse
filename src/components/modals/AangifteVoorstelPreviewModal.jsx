import { Printer } from "lucide-react";
import DownloadKnop from "../shared/DownloadKnop.jsx";

import { KNOP_SECUNDAIR } from "../../components/ui/stijl.js";
// Voorbeeldvenster van het gegenereerde aangiftevoorstel (iframe) met Downloaden/Printen/Sluiten.
export default function AangifteVoorstelPreviewModal({ html, years, onDownload, onPrint, onClose, titel, uitleg, setUitleg, extraKnop = null }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[92dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <p className="text-sm font-semibold">{titel || `Indicatieve aangifteberekening ${years.join(", ")}`}</p>
        <div className="flex gap-2 shrink-0 items-center">
          {setUitleg && (
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 mr-1" title="Voegt de algemene uitleg (Bijlage: Toelichtingen) toe aan het document, ook bij downloaden en printen.">
              <input type="checkbox" checked={!!uitleg} onChange={(e) => setUitleg(e.target.checked)} /> Uitleg meenemen
            </label>
          )}
          {extraKnop && (
            <button onClick={extraKnop.onClick} title={extraKnop.title} className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600 bg-white px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50">
              {extraKnop.label}
            </button>
          )}
          {/* beide-V4R1 — keuze PDF, Excel of HTML; onDownload(soort) */}
          <DownloadKnop onKies={onDownload} />
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
            title="Opent het printvenster; werkt niet vanuit de app-op-beginscherm-modus — gebruik dan Downloaden (PDF)."
          >
            <Printer className="h-4 w-4" /> Printen
          </button>
          <button onClick={() => onClose()} className={KNOP_SECUNDAIR}>
            Sluiten
          </button>
        </div>
      </div>
      <iframe srcDoc={html} title="Voorbeeld aangiftevoorstel" className="w-full bg-white flex-1" style={{ border: "none" }} />
    </div>
    </div>
  );
}
