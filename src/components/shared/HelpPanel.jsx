import { useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";

export default function HelpPanel({ onClose }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-lg border-2 border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Help en uitleg</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 text-left"
        >
          <span>Welkom — zo werkt deze tool</span>
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        </button>
        {open && (
          <div className="px-5 pb-4 text-xs text-slate-500 max-w-3xl">
            <ol className="space-y-2.5 list-none">
              <li className="flex gap-2.5">
                <span className="text-slate-400 shrink-0">1.</span>
                Upload je bank-bestand(en) hieronder (CSV, Excel of MT940). De tool splitst transacties automatisch in Zakelijk en Prive, en deelt ze in categorieën in.
              </li>
              <li className="flex gap-2.5">
                <span className="text-slate-400 shrink-0">2.</span>
                Klopt een indeling niet? Pas 'm aan in de detailtabel — dat onthoudt de tool voortaan voor dezelfde tegenpartij, in alle jaren.
              </li>
              <li className="flex gap-2.5">
                <span className="text-slate-400 shrink-0">3.</span>
                Bovenaan verschijnt "Werk te doen" zodra er iets openstaat — klik erop om er direct naartoe te springen.
              </li>
              <li className="flex gap-2.5">
                <span className="text-slate-400 shrink-0">4.</span>
                Onder elk jaar vind je de aangifte-checklist, het BTW-kwartaaloverzicht, het aangiftevoorstel, en (bij meerdere jaren) een meerjarenoverzicht.
              </li>
              <li className="flex gap-2.5">
                <span className="text-slate-400 shrink-0">5.</span>
                Alles wordt automatisch bewaard in deze browser — gebruik "Project opslaan" om ook een back-upbestand te downloaden.
              </li>
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
