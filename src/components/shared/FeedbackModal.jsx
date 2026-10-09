import { useState } from "react";
import { X } from "lucide-react";
import { APP_RELEASE } from "../../version.js";

export const CONTACT_MAIL = "paul@paulgerits.eu";

// Hulpvraag of feedback: opent de mailapp van de gebruiker met een ingevuld bericht (de app zelf verstuurt
// niets en heeft geen server). Geen dossiergegevens in het bericht — alleen wat de gebruiker zelf typt,
// plus releasenummer en apparaat.
export default function FeedbackModal({ onClose }) {
  const [soort, setSoort] = useState("Hulpvraag");
  const [naam, setNaam] = useState("");
  const [onderwerp, setOnderwerp] = useState("");
  const [bericht, setBericht] = useState("");
  const [gekopieerd, setGekopieerd] = useState(false);

  const subject = `[Bankoverzicht] ${soort}${onderwerp.trim() ? `: ${onderwerp.trim()}` : ""}`;
  const body = `${bericht.trim()}\n\n—\n${naam.trim() ? `Van: ${naam.trim()}\n` : ""}App: ${APP_RELEASE}\nApparaat: ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`;
  const kanVersturen = bericht.trim().length > 0;

  const versturen = () => {
    window.location.href = `mailto:${CONTACT_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const kopieren = async () => {
    const tekst = `Aan: ${CONTACT_MAIL}\nOnderwerp: ${subject}\n\n${body}`;
    try { await navigator.clipboard.writeText(tekst); setGekopieerd(true); } catch {
      const ta = document.createElement("textarea"); ta.value = tekst; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); setGekopieerd(true); } catch { /* ignore */ }
      ta.remove();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-800">Hulpvraag of feedback</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Sluiten"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex gap-4">
            {["Hulpvraag", "Feedback"].map((s) => (
              <label key={s} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="soort" checked={soort === s} onChange={() => setSoort(s)} />
                <span className={soort === s ? "font-medium text-slate-800" : "text-slate-600"}>{s}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {soort === "Hulpvraag" ? "Loop je ergens op vast of snap je iets niet? Beschrijf wat je deed en wat je zag." : "Een idee, opmerking of fout gevonden? Laat het weten."}
          </p>
          <input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Je naam (niet verplicht)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} placeholder="Onderwerp" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <textarea value={bericht} onChange={(e) => setBericht(e.target.value)} rows={6} placeholder="Je bericht" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Zet geen klantgegevens (namen, rekeningnummers, bedragen) in je bericht. De app voegt zelf geen dossiergegevens toe,
            alleen het releasenummer en je apparaat.
          </p>
          <p className="text-xs text-slate-500">
            "Mail versturen" opent je eigen mailapp met dit bericht aan <strong>{CONTACT_MAIL}</strong>. Je drukt daar zelf op verzenden;
            de app stuurt niets. Lukt dat niet, kopieer dan de tekst.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={versturen} disabled={!kanVersturen} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed">Mail versturen</button>
            <button onClick={kopieren} disabled={!kanVersturen} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">{gekopieerd ? "Gekopieerd" : "Tekst kopiëren"}</button>
            <button onClick={onClose} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600">Annuleren</button>
          </div>
        </div>
      </div>
    </div>
  );
}
