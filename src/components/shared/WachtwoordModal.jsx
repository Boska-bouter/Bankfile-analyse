import { useState } from "react";
import { Lock, X } from "lucide-react";

// Wachtwoord vragen (laden van een beveiligd dossier) of instellen/wijzigen/verwijderen (opslaan).
export default function WachtwoordModal({ modus, fout, heeftWachtwoord, onOK, onAnnuleer, onVerwijder }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [lokaalFout, setLokaalFout] = useState(null);
  const [toonCode, setToonCode] = useState(/herstelcode/i.test(fout || ""));
  const [code, setCode] = useState("");
  const instellen = modus === "instellen";
  const verstuur = (e) => {
    e?.preventDefault();
    if (instellen) {
      if (pw.length > 100) { setLokaalFout("Kies een wachtwoord van maximaal 100 tekens."); return; }
      if (pw.length < 6) { setLokaalFout("Kies een wachtwoord van minimaal 6 tekens."); return; }
      if (pw !== pw2) { setLokaalFout("De twee wachtwoorden zijn niet gelijk."); return; }
    } else if (!pw) { return; }
    onOK(pw);
  };
  const veld = "w-full rounded-lg border border-slate-300 px-3 py-2 text-base bg-white text-slate-900";
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-center justify-center p-3" onClick={onAnnuleer}>
      <form onSubmit={verstuur} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-slate-900"><Lock className="h-4 w-4 text-teal-700" />{instellen ? "Wachtwoord op dossierbestand" : "Dossier is beveiligd"}</h3>
          <button type="button" onClick={onAnnuleer} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        {instellen ? (
          <p className="text-xs text-slate-600">Het dossierbestand wordt versleuteld opgeslagen. Zonder wachtwoord is het niet te openen. Na het instellen krijg je een herstelcode. Bewaar die goed: zonder wachtwoord én herstelcode is het bestand niet meer te openen.</p>
        ) : (
          <p className="text-xs text-slate-600">Voer het wachtwoord in om dit dossierbestand te openen.</p>
        )}
        <input type="text" name="dossier-wachtwoord" autoComplete="off" data-lpignore="true" data-1p-ignore="true" style={{ WebkitTextSecurity: "disc", textSecurity: "disc" }} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Wachtwoord" className={veld} />
        {instellen && <input type="text" name="dossier-wachtwoord-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true" style={{ WebkitTextSecurity: "disc", textSecurity: "disc" }} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Wachtwoord nogmaals" className={veld} />}
        {(fout || lokaalFout) && <p className="text-xs text-rose-600">{lokaalFout || fout}</p>}
        {!instellen && !toonCode && (
          <button type="button" onClick={() => setToonCode(true)} className="text-xs text-slate-500 underline decoration-dotted">Wachtwoord kwijt? Herstelcode gebruiken</button>
        )}
        {!instellen && toonCode && (
          <div className="space-y-1.5">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Herstelcode (bijv. HK7P-93QD-…)" className={veld + " font-mono"} />
            <button type="button" disabled={code.replace(/[^A-Za-z0-9]/g, "").length < 20} onClick={() => onOK({ herstelcode: code })} className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-800 disabled:opacity-40">Openen met herstelcode</button>
          </div>
        )}
        <div className="flex flex-wrap gap-2 justify-end">
          {instellen && heeftWachtwoord && <button type="button" onClick={onVerwijder} className="mr-auto text-xs text-rose-600 underline decoration-dotted">Wachtwoord verwijderen</button>}
          <button type="button" onClick={onAnnuleer} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Annuleren</button>
          <button type="submit" className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800">{instellen ? "Instellen" : "Openen"}</button>
        </div>
      </form>
    </div>
  );
}
