import { X } from "lucide-react";

// beide-V1R2 — eerste vraag bij een nieuw dossier, vóór Eenvoudig/Uitgebreid: is dit dossier zakelijk of privé?
// Alleen soorten waarvoor het account een abonnement heeft, zijn te kiezen; de andere wijst naar de abonnementenpagina.
// De keuze ligt daarna vast voor dit dossier.
const KAARTEN = {
  zakelijk: { titel: "Zakelijk", tekst: "Voor een eenmanszaak, zzp of BV.", punten: ["Omzet, kosten en btw", "Indicatie inkomstenbelasting of vennootschapsbelasting"] },
  prive: { titel: "Privé", tekst: "Voor particulieren en hun huishouden, zonder onderneming.", punten: ["Inkomsten en uitgaven per maand", "Vaste lasten en sparen", "Indicatie inkomstenbelasting"] },
};

export default function SoortKeuze({ beschikbaar, onKies, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /> Sluiten</button>
        <h2 className="text-xl font-bold">Nieuw dossier</h2>
        <p className="mb-4 text-sm text-slate-600">Is dit dossier zakelijk of privé? Dit is later niet meer te wijzigen. Voor allebei: maak een tweede dossier.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {Object.entries(KAARTEN).map(([soort, k]) => {
            const mag = beschikbaar.includes(soort);
            return mag ? (
              <button key={soort} type="button" onClick={() => onKies(soort)} className="flex-1 rounded-2xl border-2 border-slate-300 bg-white p-5 text-left hover:border-teal-600 hover:bg-teal-50">
                <span className="block text-lg font-bold text-slate-900">{k.titel}</span>
                <span className="mt-1 block text-sm text-slate-600">{k.tekst}</span>
                <ul className="mt-3 space-y-1 text-xs text-slate-500">{k.punten.map((p) => <li key={p}>• {p}</li>)}</ul>
              </button>
            ) : (
              <div key={soort} className="flex-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-left">
                <span className="block text-lg font-bold text-slate-400">{k.titel}</span>
                <span className="mt-1 block text-sm text-slate-500">Je hebt (nog) geen abonnement voor {k.titel.toLowerCase()}.</span>
                <a href={`/aanmelden?soort=${soort}`} className="mt-3 inline-block text-sm font-medium text-teal-700 underline">Abonnement aanvragen</a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
