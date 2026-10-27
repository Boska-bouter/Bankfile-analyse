import { X } from "lucide-react";
import { eur } from "../../utils/amounts.js";

// beide-V8R7 — overzicht "Mogelijke eigen rekeningen" (wens Boska 27-10): rekeningen die de app na het laden herkent als
// mogelijk eigen (zie classification/mogelijkeEigenRekeningen.js). Eén klik zet de rekening bij de eigen rekeningen; alle
// boekingen ermee schuiven vanzelf mee. "Nee" komt niet meer terug.
const KNOP = "rounded-lg border px-2.5 py-1 text-xs font-semibold";
const KEUZES = {
  zakelijk: [
    ["Eigen zakelijke rekening", { accountType: "Zakelijk" }],
    ["Zakelijke spaarrekening", { accountType: "Zakelijk", soort: "spaar" }],
    ["Eigen privérekening", { accountType: "Prive" }],
    ["Privé spaarrekening", { accountType: "Prive", soort: "spaar" }],
  ],
  prive: [
    ["Eigen betaalrekening", { accountType: "Prive", soort: "betaal" }],
    ["Eigen spaarrekening", { accountType: "Prive", soort: "spaar" }],
    ["Eigen beleggingsrekening", { accountType: "Prive", soort: "beleggen" }],
  ],
};

export default function MogelijkeEigenRekeningen({ kandidaten = [], soort = "zakelijk", onKies, onNee, onClose }) {
  const keuzes = KEUZES[soort] || KEUZES.zakelijk;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" style={{ maxHeight: "calc(100dvh - 2rem)" }}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-bold">Mogelijke eigen rekeningen</h2>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /> Later</button>
        </div>
        <div className="overflow-y-auto px-5 py-3">
          <p className="mb-3 text-sm text-slate-600">Deze rekeningen lijken op eigen rekeningen die niet zijn opgegeven. Is dat zo, kies dan de soort: overboekingen ermee tellen dan als geld tussen eigen rekeningen, niet als inkomsten of uitgaven.</p>
          {kandidaten.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Geen mogelijke eigen rekeningen (meer) gevonden.</p>}
          {kandidaten.map((k) => (
            <div key={k.iban} className="border-b border-slate-100 py-3 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-900">{k.naam || "(zonder naam)"} <span className="ml-1 font-mono text-xs font-normal text-slate-500">{k.iban}</span></span>
                <span className="text-xs text-slate-500">{k.af}× af ({eur(-k.totaalAf)}) · {k.bij}× bij ({eur(k.totaalBij)})</span>
              </div>
              <ul className="my-1.5 list-disc pl-5 text-xs text-slate-600">{k.redenen.map((r) => <li key={r}>{r}</li>)}</ul>
              <div className="flex flex-wrap items-center gap-1.5">
                {keuzes.map(([t, patch]) => (
                  <button key={t} type="button" style={{ minHeight: 0 }} onClick={() => onKies(k.iban, patch)}
                    className={`${KNOP} ${(patch.soort === "spaar") === !!k.spaar && patch.accountType === k.rekening ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>{t}</button>
                ))}
                <button type="button" style={{ minHeight: 0 }} onClick={() => onNee(k.iban)} className="ml-auto text-xs text-slate-500 underline hover:text-slate-800">Nee, is iemand anders</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
