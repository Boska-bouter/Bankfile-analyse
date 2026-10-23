import { useState } from "react";
import { Download, X } from "lucide-react";

import { KNOP_PRIMAIR_VET } from "../ui/stijl.js";
// Dossier opslaan: met of zonder wachtwoord. Verschijnt alleen als er nog geen keuze is gemaakt.
// V7R4 / beide-V2R4 — heeft het dossier al een wachtwoord (`heeftWachtwoord`), dan is de keuze "met het huidige
// wachtwoord" of "zonder wachtwoord"; zonder wachtwoord vraagt eerst "weet je het zeker?". onOpslaan krijgt
// null (zonder), een nieuw wachtwoord, of BEHOUD (het huidige wachtwoord houden).
export const BEHOUD = Object.freeze({ behoud: true });
export default function OpslaanModal({ onOpslaan, onAnnuleer, heeftWachtwoord = false }) {
  const [met, setMet] = useState(heeftWachtwoord);
  const [zeker, setZeker] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [fout, setFout] = useState(null);
  const verstuur = (e) => {
    e?.preventDefault();
    if (!met) {
      if (heeftWachtwoord && !zeker) { setZeker(true); return; }
      onOpslaan(null);
      return;
    }
    if (heeftWachtwoord) { onOpslaan(BEHOUD); return; }
    if (pw.length > 100) { setFout("Kies een wachtwoord van maximaal 100 tekens."); return; }
    if (pw.length < 6) { setFout("Kies een wachtwoord van minimaal 6 tekens."); return; }
    if (pw !== pw2) { setFout("De twee wachtwoorden zijn niet gelijk."); return; }
    onOpslaan(pw);
  };
  const veld = "w-full rounded-lg border border-slate-300 px-3 py-2 text-base bg-white text-slate-900";
  const optie = (actief) => `flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer ${actief ? "border-teal-600 bg-teal-50" : "border-slate-200"}`;
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-center justify-center p-3" onClick={onAnnuleer}>
      <form onSubmit={verstuur} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-slate-900"><Download className="h-4 w-4 text-teal-700" />Dossier opslaan</h3>
          <button type="button" onClick={onAnnuleer} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        {zeker ? (
          <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            <p><strong>Weet je het zeker?</strong></p>
            <p className="text-xs">Het wachtwoord gaat van het dossier af. Het bestand dat je nu opslaat, is daarna door iedereen te openen die het in handen krijgt. Eerder opgeslagen bestanden houden hun wachtwoord.</p>
          </div>
        ) : heeftWachtwoord ? (<>
        <p className="text-xs text-slate-600">Dit dossier heeft een wachtwoord. Wil je het zo houden?</p>
        <label className={optie(met)}>
          <input type="radio" name="pw" checked={met} onChange={() => setMet(true)} className="mt-1" />
          <span className="text-sm"><strong>Met wachtwoord</strong><br /><span className="text-xs text-slate-500">Hetzelfde wachtwoord en dezelfde herstelcode als nu.</span></span>
        </label>
        <label className={optie(!met)}>
          <input type="radio" name="pw" checked={!met} onChange={() => setMet(false)} className="mt-1" />
          <span className="text-sm"><strong>Zonder wachtwoord</strong><br /><span className="text-xs text-slate-500">Het wachtwoord gaat eraf. Iedereen met het bestand kan het openen.</span></span>
        </label>
        </>) : (<>
        <label className={optie(!met)}>
          <input type="radio" name="pw" checked={!met} onChange={() => setMet(false)} className="mt-1" />
          <span className="text-sm"><strong>Zonder wachtwoord</strong><br /><span className="text-xs text-slate-500">Iedereen met het bestand kan het openen.</span></span>
        </label>
        <label className={optie(met)}>
          <input type="radio" name="pw" checked={met} onChange={() => setMet(true)} className="mt-1" />
          <span className="text-sm"><strong>Met wachtwoord</strong><br /><span className="text-xs text-slate-500">Het bestand wordt versleuteld. Je krijgt een herstelcode; zonder wachtwoord én code is het bestand niet te openen.</span></span>
        </label>
        </>)}
        {met && !heeftWachtwoord && (
          <div className="space-y-2">
            <input type="text" name="dossier-wachtwoord" autoComplete="off" data-lpignore="true" data-1p-ignore="true" style={{ WebkitTextSecurity: "disc", textSecurity: "disc" }} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Wachtwoord" className={veld} />
            <input type="text" name="dossier-wachtwoord-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true" style={{ WebkitTextSecurity: "disc", textSecurity: "disc" }} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Wachtwoord nogmaals" className={veld} />
          </div>
        )}
        {fout && <p className="text-xs text-rose-600">{fout}</p>}
        <div className="flex gap-2 justify-end">
          {zeker ? (<>
            <button type="button" onClick={() => setZeker(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Terug</button>
            <button type="submit" className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white">Ja, zonder wachtwoord opslaan</button>
          </>) : (<>
            <button type="button" onClick={onAnnuleer} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Annuleren</button>
            <button type="submit" className={KNOP_PRIMAIR_VET}>Opslaan</button>
          </>)}
        </div>
      </form>
    </div>
  );
}
