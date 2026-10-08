import { useState } from "react";
import { Lock, X } from "lucide-react";

// Wachtwoord vragen (laden van een beveiligd dossier) of instellen/wijzigen/verwijderen (opslaan).
export default function WachtwoordModal({ modus, fout, heeftWachtwoord, onOK, onAnnuleer, onVerwijder }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [lokaalFout, setLokaalFout] = useState(null);
  const instellen = modus === "instellen";
  const verstuur = (e) => {
    e?.preventDefault();
    if (instellen) {
      if (pw.length < 6) { setLokaalFout("Kies een wachtwoord van minimaal 6 tekens."); return; }
      if (pw !== pw2) { setLokaalFout("De twee wachtwoorden zijn niet gelijk."); return; }
    } else if (!pw) { return; }
    onOK(pw);
  };
  const veld = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-center justify-center p-3" onClick={onAnnuleer}>
      <form onSubmit={verstuur} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-slate-900"><Lock className="h-4 w-4 text-teal-700" />{instellen ? "Wachtwoord op dossierbestand" : "Dossier is beveiligd"}</h3>
          <button type="button" onClick={onAnnuleer} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        {instellen ? (
          <p className="text-xs text-slate-600">Het dossierbestand wordt versleuteld opgeslagen. Zonder wachtwoord is het niet te openen. <strong>Een vergeten wachtwoord kan niet worden hersteld</strong> — ook niet door ons.</p>
        ) : (
          <p className="text-xs text-slate-600">Voer het wachtwoord in om dit dossierbestand te openen.</p>
        )}
        <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Wachtwoord" className={veld} />
        {instellen && <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Wachtwoord nogmaals" className={veld} />}
        {(fout || lokaalFout) && <p className="text-xs text-rose-600">{lokaalFout || fout}</p>}
        <div className="flex flex-wrap gap-2 justify-end">
          {instellen && heeftWachtwoord && <button type="button" onClick={onVerwijder} className="mr-auto text-xs text-rose-600 underline decoration-dotted">Wachtwoord verwijderen</button>}
          <button type="button" onClick={onAnnuleer} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Annuleren</button>
          <button type="submit" className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800">{instellen ? "Instellen" : "Openen"}</button>
        </div>
      </form>
    </div>
  );
}
