// huishoudboekje-V1R3 — "Maak er een Huishoudboekje van" (wens Boska 2-11): uitleg, eerst opslaan als het huidige dossier
// nog niet in een bestand staat, en zonder abonnement een link om het Huishoudboekje aan te vragen.
// huishoudboekje-V1R4 — duidelijk dat het een NIEUW dossier wordt, met per bankbestand of het meegaat (melding Boska 2-11).
// Opslaan is verplicht zolang het huidige dossier wijzigingen heeft die nog niet in een dossierbestand staan.
import { useState } from "react";
import { X, Check, Minus } from "lucide-react";

export default function HuishoudboekjeMakenModal({ soortDossier, bestanden = [], huidigBestand = null, mag, opgeslagen, metWachtwoord, onOpslaan, onMaak, onClose }) {
  const [bezig, setBezig] = useState(false);
  const mee = bestanden.filter((b) => !b.zakelijk);
  const niet = bestanden.filter((b) => b.zakelijk);
  const huidig = soortDossier === "prive" ? "privédossier" : "zakelijke dossier";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /> Sluiten</button>
        <h2 className="pr-16 text-lg font-bold">Nieuw dossier: Huishoudboekje</h2>
        <div className="mt-2 flex-1 space-y-3 overflow-y-auto text-sm text-slate-600">
          <p>Hiermee maak je een <b>nieuw, apart dossier</b> van de soort Huishoudboekje. Daarin zie je per week en per maand waar je geld blijft, zonder belasting. Je {huidig} blijft bestaan zoals het is.</p>
          <div>
            <p className="mb-1 font-semibold text-slate-800">Bankbestanden in het nieuwe dossier</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {mee.map((b) => <li key={b.naam} className="flex items-center gap-2 px-3 py-1.5 text-xs"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span className="break-all">{b.naam}</span><span className="ml-auto shrink-0 text-slate-400">privé · gaat mee</span></li>)}
              {niet.map((b) => <li key={b.naam} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400"><Minus className="h-3.5 w-3.5 shrink-0" /><span className="break-all">{b.naam}</span><span className="ml-auto shrink-0">zakelijk · gaat niet mee</span></li>)}
            </ul>
            {niet.length > 0 && <p className="mt-1 text-xs">Een zakelijke rekening staat in het Huishoudboekje als <b>rekening van je eigen bedrijf</b>: wat je daarvandaan ontvangt, telt als inkomen.</p>}
          </div>
          <p>Ook mee: je keuzes per tegenpartij, notities en je antwoorden over het huishouden. Belastingzaken (BTW, aangifte, lease, aftrekposten) gaan niet mee.</p>
          <p><b>Wat er gebeurt:</b> het nieuwe dossier wordt als nieuw bestand opgeslagen (BankafschriftenTool_huishoudboekje_…){metWachtwoord ? ", met hetzelfde wachtwoord," : ""} en meteen geopend. {huidigBestand ? <>Je {huidig} staat in <b className="break-all">{huidigBestand}</b>; dat open je later weer via Dossier laden.</> : <>Je {huidig} open je later weer via Dossier laden.</>}</p>
        </div>
        {!mag ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Je hebt (nog) geen abonnement voor het Huishoudboekje. <a href="/aanmelden?soort=huishoudboekje" className="font-semibold underline">Abonnement aanvragen</a>
          </div>
        ) : mee.length === 0 ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Dit dossier heeft geen privérekening. Voeg eerst een privé bankbestand toe, of begin een nieuw dossier.</p>
        ) : !opgeslagen ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs text-amber-800">Je {huidig} heeft wijzigingen die nog niet in het dossierbestand staan. Sla het eerst op; daarna kun je het Huishoudboekje maken.</p>
            <button type="button" onClick={onOpslaan} className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Eerst huidig dossier opslaan</button>
          </div>
        ) : (
          <button type="button" disabled={bezig} onClick={async () => { setBezig(true); const ok = await onMaak(); setBezig(false); if (ok) onClose(); }}
            className="mt-4 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
            Nieuw Huishoudboekje maken en openen
          </button>
        )}
      </div>
    </div>
  );
}
