import { useState } from "react";
import { X } from "lucide-react";
import { APP_RELEASE } from "../../version.js";

export const FEEDBACK_ENDPOINT = "/api/feedback";
// Alleen als versturen niet lukt, bieden we een noodroute via de eigen mailapp aan.
const NOODMAIL = "paul@paulgerits.eu";

// Hulpvraag of feedback: de app stuurt de tekst naar een Cloudflare-Worker (zie /worker/feedback) die het naar de
// maker mailt. Er gaan geen dossiergegevens mee: alleen wat de gebruiker zelf typt, het releasenummer, en (door
// Cloudflare toegevoegd) het e-mailadres waarmee is ingelogd, zodat er geantwoord kan worden.
export default function FeedbackModal({ onClose }) {
  const [soort, setSoort] = useState("Hulpvraag");
  const [naam, setNaam] = useState("");
  const [onderwerp, setOnderwerp] = useState("");
  const [bericht, setBericht] = useState("");
  const [status, setStatus] = useState("invullen"); // invullen | bezig | verstuurd | mislukt
  const [gekopieerd, setGekopieerd] = useState(false);

  const subject = `[Bankoverzicht] ${soort}${onderwerp.trim() ? `: ${onderwerp.trim()}` : ""}`;
  const body = `${bericht.trim()}\n\n—\n${naam.trim() ? `Van: ${naam.trim()}\n` : ""}App: ${APP_RELEASE}`;
  const kanVersturen = bericht.trim().length > 0 && status !== "bezig";

  const versturen = async () => {
    setStatus("bezig");
    try {
      const r = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ soort, naam: naam.trim(), onderwerp: onderwerp.trim(), bericht: bericht.trim(), release: APP_RELEASE }),
      });
      const d = await r.json().catch(() => ({}));
      setStatus(r.ok && d.ok ? "verstuurd" : "mislukt");
    } catch {
      setStatus("mislukt");
    }
  };
  const viaMailapp = () => {
    window.location.href = `mailto:${NOODMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const kopieren = async () => {
    const tekst = `Onderwerp: ${subject}\n\n${body}`;
    try { await navigator.clipboard.writeText(tekst); setGekopieerd(true); } catch {
      const ta = document.createElement("textarea"); ta.value = tekst; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); setGekopieerd(true); } catch { /* ignore */ }
      ta.remove();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-800">Hulpvraag of feedback</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Sluiten"><X className="h-4 w-4" /></button>
        </div>
        {status === "verstuurd" ? (
          <div className="p-5 space-y-3 text-sm">
            <p className="font-semibold text-emerald-700">Bedankt, je bericht is verstuurd.</p>
            <p className="text-slate-600">Je krijgt antwoord op het e-mailadres waarmee je bent ingelogd.</p>
            <button onClick={onClose} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Sluiten</button>
          </div>
        ) : (
          <div className="p-5 space-y-3 text-sm">
            <div className="flex gap-4">
              {["Hulpvraag", "Feedback"].map((x) => (
                <label key={x} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="soort" checked={soort === x} onChange={() => setSoort(x)} />
                  <span className={soort === x ? "font-medium text-slate-800" : "text-slate-600"}>{x}</span>
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
              Zet geen klantgegevens (namen, rekeningnummers, bedragen) in je bericht. Er worden geen dossiergegevens meegestuurd,
              alleen je bericht, je naam, het releasenummer en het e-mailadres waarmee je bent ingelogd, zodat er geantwoord kan worden.
            </p>
            {status === "mislukt" && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 space-y-2">
                <p>Versturen is niet gelukt. Probeer het later opnieuw, of stuur het bericht via je eigen mailapp.</p>
                <div className="flex gap-2">
                  <button onClick={viaMailapp} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium hover:bg-red-100">Via mailapp</button>
                  <button onClick={kopieren} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium hover:bg-red-100">{gekopieerd ? "Gekopieerd" : "Tekst kopiëren"}</button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={versturen} disabled={!kanVersturen} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed">{status === "bezig" ? "Bezig met versturen…" : "Versturen"}</button>
              <button onClick={onClose} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600">Annuleren</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
