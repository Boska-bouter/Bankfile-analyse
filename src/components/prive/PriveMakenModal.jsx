// beide-V13R7 — "Maak er een privédossier van" (wens Boska 3-11), naar het voorbeeld van HuishoudboekjeMakenModal
// (huishoudboekje-V1R4): duidelijk dat het een NIEUW dossier wordt, per bankbestand of het meegaat, en eerst opslaan
// zolang het huidige dossier wijzigingen heeft die nog niet in een dossierbestand staan.
import { useState } from "react";
import { X, Check, Minus } from "lucide-react";

export default function PriveMakenModal({ bestanden = [], huidigBestand = null, mag, magUitgebreid, opgeslagen, metWachtwoord, onOpslaan, onMaak, onClose }) {
  const [bezig, setBezig] = useState(false);
  const mee = bestanden.filter((b) => !b.zakelijk);
  const niet = bestanden.filter((b) => b.zakelijk);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3" data-soort="prive">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border-t-[6px] border-teal-600 bg-white p-5 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /> Sluiten</button>
        <h2 className="pr-16 text-lg font-bold text-teal-800">Nieuw dossier: Privé</h2>
        <div className="mt-2 flex-1 space-y-3 overflow-y-auto text-sm text-slate-600">
          <p>Hiermee maak je een <b>nieuw, apart privédossier</b> met de privérekeningen uit dit dossier. Daarin kun je ook de eigen woning en box 3 (sparen en beleggen) invullen. Het zakelijke dossier blijft bestaan zoals het is.</p>
          <div>
            <p className="mb-1 font-semibold text-slate-800">Bankbestanden in het nieuwe dossier</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {mee.map((b) => <li key={b.naam} className="flex items-center gap-2 px-3 py-1.5 text-xs"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span className="break-all">{b.naam}</span><span className="ml-auto shrink-0 text-slate-400">privé · gaat mee</span></li>)}
              {niet.map((b) => <li key={b.naam} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400"><Minus className="h-3.5 w-3.5 shrink-0" /><span className="break-all">{b.naam}</span><span className="ml-auto shrink-0">zakelijk · gaat niet mee</span></li>)}
            </ul>
            {niet.length > 0 && <p className="mt-1 text-xs">De zakelijke rekening staat in het privédossier als eigen rekening: geld van en naar de zaak telt als overboeking, niet als inkomen of uitgave.</p>}
          </div>
          <p>Ook mee: de namen, keuzes per tegenpartij en notities. Belastingzaken van de onderneming (btw, aangifte, lease, aftrekposten) gaan niet mee.</p>
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Let op: de winst uit de onderneming staat niet in het privédossier. De belastingindicatie daar gaat over het privé-inkomen, de eigen woning en box 3. De twee dossiers blijven daarna los van elkaar: een wijziging in het ene komt niet vanzelf in het andere.</p>
          <p><b>Wat er gebeurt:</b> het nieuwe dossier wordt als nieuw bestand opgeslagen (BankafschriftenTool_prive_…){metWachtwoord ? ", met hetzelfde wachtwoord," : ""} en meteen geopend{magUitgebreid ? " in Uitgebreid" : " in Eenvoudig"}. {huidigBestand ? <>Het zakelijke dossier staat in <b className="break-all">{huidigBestand}</b>; dat open je later weer via Dossier laden.</> : <>Het zakelijke dossier open je later weer via Dossier laden.</>}</p>
          {mag && !magUitgebreid && <p className="text-xs">Eigen woning en box 3 zitten in Privé Uitgebreid. <a href="/aanmelden?soort=prive&plan=uitgebreid" className="font-semibold underline">Uitgebreid aanvragen</a></p>}
        </div>
        {!mag ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Er is (nog) geen abonnement voor Privé. <a href="/aanmelden?soort=prive" className="font-semibold underline">Abonnement aanvragen</a>
          </div>
        ) : mee.length === 0 ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Dit dossier heeft geen privérekening. Voeg eerst een privé bankbestand toe, of begin een nieuw privédossier.</p>
        ) : !opgeslagen ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs text-amber-800">Het zakelijke dossier heeft wijzigingen die nog niet in het dossierbestand staan. Sla het eerst op; daarna kun je het privédossier maken.</p>
            <button type="button" onClick={onOpslaan} className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Eerst zakelijk dossier opslaan</button>
          </div>
        ) : (
          <button type="button" disabled={bezig} onClick={async () => { setBezig(true); const ok = await onMaak(); setBezig(false); if (ok) onClose(); }}
            className="mt-4 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
            Nieuw privédossier maken en openen
          </button>
        )}
      </div>
    </div>
  );
}
