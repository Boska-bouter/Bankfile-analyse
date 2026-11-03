// beide-V14R0 — "Maak er een zakelijk dossier van" (wens Boska 3-11), de omgekeerde weg van PriveMakenModal: duidelijk
// dat het een NIEUW dossier wordt, welke bestanden meegaan (als privérekening), en eerst opslaan zolang het huidige
// dossier wijzigingen heeft die nog niet in een dossierbestand staan.
import { useState } from "react";
import { X, Check } from "lucide-react";

export default function ZakelijkMakenModal({ bestanden = [], huidigBestand = null, mag, magUitgebreid, opgeslagen, metWachtwoord, onOpslaan, onMaak, onClose }) {
  const [bezig, setBezig] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3" data-soort="zakelijk">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border-t-[6px] border-teal-600 bg-white p-5 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /> Sluiten</button>
        <h2 className="pr-16 text-lg font-bold text-teal-800">Nieuw dossier: Zakelijk</h2>
        <div className="mt-2 flex-1 space-y-3 overflow-y-auto text-sm text-slate-600">
          <p>Hiermee maak je een <b>nieuw, apart zakelijk dossier</b> op basis van dit privédossier, bijvoorbeeld als je een bedrijf bent gestart. Het privédossier blijft bestaan zoals het is.</p>
          <div>
            <p className="mb-1 font-semibold text-slate-800">Bankbestanden in het nieuwe dossier</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {bestanden.map((b) => <li key={b.naam} className="flex items-center gap-2 px-3 py-1.5 text-xs"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span className="break-all">{b.naam}</span><span className="ml-auto shrink-0 text-slate-400">als privérekening</span></li>)}
            </ul>
          </div>
          <p>Ook mee: de namen, de boekingen, keuzes per tegenpartij en notities. De eigen woning en box 3 tellen in een zakelijk dossier niet mee.</p>
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Let op: het bankbestand van de <b>zakelijke rekening</b> zit nog niet in het nieuwe dossier. Voeg dat daarna toe. De twee dossiers blijven los van elkaar: een wijziging in het ene komt niet vanzelf in het andere.</p>
          <p><b>Wat er gebeurt:</b> het nieuwe dossier wordt als nieuw bestand opgeslagen (BankafschriftenTool_zakelijk_…){metWachtwoord ? ", met hetzelfde wachtwoord," : ""} en meteen geopend{magUitgebreid ? " in Uitgebreid" : " in Eenvoudig"}. {huidigBestand ? <>Het privédossier staat in <b className="break-all">{huidigBestand}</b>; dat open je later weer via Dossier laden.</> : <>Het privédossier open je later weer via Dossier laden.</>}</p>
        </div>
        {!mag ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Er is (nog) geen abonnement voor Zakelijk. <a href="/aanmelden?soort=zakelijk" className="font-semibold underline">Abonnement aanvragen</a>
          </div>
        ) : !opgeslagen ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs text-amber-800">Het privédossier heeft wijzigingen die nog niet in het dossierbestand staan. Sla het eerst op; daarna kun je het zakelijke dossier maken.</p>
            <button type="button" onClick={onOpslaan} className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Eerst privédossier opslaan</button>
          </div>
        ) : (
          <button type="button" disabled={bezig} onClick={async () => { setBezig(true); const ok = await onMaak(); setBezig(false); if (ok) onClose(); }}
            className="mt-4 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
            Nieuw zakelijk dossier maken en openen
          </button>
        )}
      </div>
    </div>
  );
}
