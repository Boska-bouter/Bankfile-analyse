// huishoudboekje-V1R3 — "Maak er een Huishoudboekje van" (wens Boska 2-11): uitleg, eerst opslaan als het huidige dossier
// nog niet in een bestand staat, en zonder abonnement een link om het Huishoudboekje aan te vragen.
import { useState } from "react";
import { X } from "lucide-react";

export default function HuishoudboekjeMakenModal({ soortDossier, aantal, mag, opgeslagen, metWachtwoord, onOpslaan, onMaak, onClose }) {
  const [bezig, setBezig] = useState(false);
  const zakelijk = soortDossier !== "prive";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /> Sluiten</button>
        <h2 className="pr-16 text-lg font-bold">Maak er een Huishoudboekje van</h2>
        <div className="mt-2 space-y-2 text-sm text-slate-600">
          <p>Je krijgt een nieuw dossier met alleen je privérekeningen ({aantal.prive} {aantal.prive === 1 ? "bestand" : "bestanden"}), je keuzes per tegenpartij en je antwoorden over het huishouden. Daarin zie je per week en per maand waar je geld blijft, zonder belasting.</p>
          {zakelijk && aantal.zakelijk > 0 && <p>De zakelijke rekeningen ({aantal.zakelijk}) gaan niet mee. Ze staan in het Huishoudboekje als <b>rekening van je eigen bedrijf</b>: wat je daarvandaan ontvangt, telt als inkomen.</p>}
          <p>Je huidige dossier blijft zoals het is, in je dossierbestand. Het Huishoudboekje wordt als nieuw bestand gedownload en meteen geopend.{metWachtwoord ? " Het krijgt hetzelfde wachtwoord." : ""}</p>
        </div>
        {!mag ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Je hebt (nog) geen abonnement voor het Huishoudboekje. <a href="/aanmelden?soort=huishoudboekje" className="font-semibold underline">Abonnement aanvragen</a>
          </div>
        ) : aantal.prive === 0 ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Dit dossier heeft geen privérekening. Voeg eerst een privé bankbestand toe, of begin een nieuw dossier.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {!opgeslagen && (
              <>
                <p className="text-xs text-amber-800">Je huidige dossier heeft wijzigingen die nog niet in een dossierbestand staan. Sla het eerst op, anders zijn die straks weg.</p>
                <button type="button" onClick={onOpslaan} className="rounded-lg border border-teal-700 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50">Eerst huidig dossier opslaan</button>
              </>
            )}
            <button type="button" disabled={bezig} onClick={async () => { setBezig(true); const ok = await onMaak(); setBezig(false); if (ok) onClose(); }}
              className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
              {opgeslagen ? "Huishoudboekje maken en openen" : "Toch doorgaan zonder opslaan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
