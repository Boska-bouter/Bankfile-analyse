import { Download, Printer } from "lucide-react";

// Voorbeeldvenster van het gegenereerde aangiftevoorstel (iframe) met Downloaden/Printen/Sluiten.
export default function AangifteVoorstelPreviewModal({ html, years, onDownload, onPrint, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <p className="text-sm font-semibold">Indicatieve aangifteberekening {years.join(", ")}</p>
        <div className="flex gap-2 shrink-0">
          <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
            <Download className="h-4 w-4" /> Downloaden
          </button>
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
            title="Opent het printvenster; werkt niet vanuit de app-op-beginscherm-modus — gebruik dan Downloaden."
          >
            <Printer className="h-4 w-4" /> Printen
          </button>
          <button onClick={() => onClose()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Sluiten
          </button>
        </div>
      </div>
      <iframe srcDoc={html} title="Voorbeeld aangiftevoorstel" className="w-full bg-white flex-1" style={{ border: "none" }} />
    </div>
    </div>
  );
}
