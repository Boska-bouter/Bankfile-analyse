import { useState } from "react";
import { X } from "lucide-react";
import { BEGRIPPEN } from "../../content/begrippen.js";

// D3 — alle vakbegrippen op een rij, doorzoekbaar.
export default function BegrippenModal({ onClose }) {
  const [q, setQ] = useState("");
  const lijst = BEGRIPPEN.filter((b) => !q.trim() || `${b.term} ${b.uitleg}`.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.term.localeCompare(b.term, "nl"));
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl max-h-[85dvh] flex flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="font-bold text-slate-900">Begrippen</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <p className="px-5 text-xs text-slate-500">Korte uitleg bij vakbegrippen. In de app zijn ze onderstreept met een stippellijntje: houd de muis erboven of klik erop. Indicatief, geen fiscaal advies.</p>
        <div className="px-5 pt-3"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek een begrip…" className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" /></div>
        <dl className="overflow-y-auto px-5 py-3 space-y-3">
          {lijst.map((b) => (<div key={b.id}><dt className="text-sm font-bold text-slate-900">{b.term}</dt><dd className="text-[13px] text-slate-600 leading-snug">{b.uitleg}</dd></div>))}
          {lijst.length === 0 && <p className="text-sm text-slate-500">Geen begrip gevonden.</p>}
        </dl>
      </div>
    </div>
  );
}
