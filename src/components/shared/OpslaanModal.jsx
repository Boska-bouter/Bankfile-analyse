import { useState } from "react";
import { Download, X } from "lucide-react";

// Dossier opslaan: met of zonder wachtwoord. Verschijnt alleen als er nog geen keuze is gemaakt.
export default function OpslaanModal({ onOpslaan, onAnnuleer }) {
  const [met, setMet] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [fout, setFout] = useState(null);
  const verstuur = (e) => {
    e?.preventDefault();
    if (!met) { onOpslaan(null); return; }
    if (pw.length > 100) { setFout("Kies een wachtwoord van maximaal 100 tekens."); return; }
    if (pw.length < 6) { setFout("Kies een wachtwoord van minimaal 6 tekens."); return; }
    if (pw !== pw2) { setFout("De twee wachtwoorden zijn niet gelijk."); return; }
    onOpslaan(pw);
  };
  const veld = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const optie = (actief) => `flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer ${actief ? "border-teal-600 bg-teal-50" : "border-slate-200"}`;
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-center justify-center p-3" onClick={onAnnuleer}>
      <form onSubmit={verstuur} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-slate-900"><Download className="h-4 w-4 text-teal-700" />Dossier opslaan</h3>
          <button type="button" onClick={onAnnuleer} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <label className={optie(!met)}>
          <input type="radio" name="pw" checked={!met} onChange={() => setMet(false)} className="mt-1" />
          <span className="text-sm"><strong>Zonder wachtwoord</strong><br /><span className="text-xs text-slate-500">Iedereen met het bestand kan het openen.</span></span>
        </label>
        <label className={optie(met)}>
          <input type="radio" name="pw" checked={met} onChange={() => setMet(true)} className="mt-1" />
          <span className="text-sm"><strong>Met wachtwoord</strong><br /><span className="text-xs text-slate-500">Het bestand wordt versleuteld. Je krijgt een herstelcode; zonder wachtwoord én code is het bestand niet te openen.</span></span>
        </label>
        {met && (
          <div className="space-y-2">
            <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Wachtwoord" className={veld} />
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Wachtwoord nogmaals" className={veld} />
          </div>
        )}
        {fout && <p className="text-xs text-rose-600">{fout}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onAnnuleer} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Annuleren</button>
          <button type="submit" className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800">Opslaan</button>
        </div>
      </form>
    </div>
  );
}
