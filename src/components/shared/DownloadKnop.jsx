// beide-V4R1 / V8R5 — één knop Downloaden met keuze PDF, Excel of HTML (wens Boska 24-10), voor alle rapporten.
// onKies(soort) doet het werk (zie reports/download.js); zolang dat loopt staat de knop op "Bezig…".
import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown, Loader2 } from "lucide-react";
import { DOWNLOAD_SOORTEN } from "../../reports/download.js";

const STIJL = {
  primair: "inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60",
  rand: "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-60",
};

export default function DownloadKnop({ onKies, soorten = ["pdf", "excel", "html"], label = "Downloaden", variant = "primair", className = "", rechts = true, knopClassName = null }) {
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const weg = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", weg);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", weg); document.removeEventListener("keydown", esc); };
  }, [open]);
  const kies = async (s) => {
    setOpen(false); setBezig(true);
    try { await onKies(s); } finally { setBezig(false); }
  };
  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button type="button" disabled={bezig} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className={knopClassName || STIJL[variant] || STIJL.primair}>
        {bezig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {bezig ? "Bezig…" : label}
        {!bezig && <ChevronDown className="h-3.5 w-3.5 opacity-80" />}
      </button>
      {open && (
        <span role="menu" className={`absolute top-full z-[80] mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg ${rechts ? "right-0" : "left-0"}`}>
          {soorten.map((s) => (
            <button key={s} type="button" role="menuitem" onClick={() => kies(s)} className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-teal-50">
              <span className="text-sm font-semibold text-slate-800">{DOWNLOAD_SOORTEN[s].label}</span>
              <span className="text-xs text-slate-500">{DOWNLOAD_SOORTEN[s].uitleg}</span>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
