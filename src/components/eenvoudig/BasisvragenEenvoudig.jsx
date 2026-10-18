import { useEffect, useState } from "react";
import { X } from "lucide-react";

// nieuw-V1R04 — Basisvragen in de eenvoudige weergave: alle antwoorden in één venster, direct aan te passen.
// Dezelfde instellingen als in Uitgebreid (een wijziging is daar ook direct zichtbaar, met "Ongedaan maken").
const veld = "w-48 max-w-[55%] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm";

function Rij({ label, uitleg, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2">
      <span className="text-sm text-slate-700">{label}{uitleg && <span className="block text-xs text-slate-400">{uitleg}</span>}</span>
      {children}
    </div>
  );
}

export default function BasisvragenEenvoudig({
  jaar, eigenNamen, setEigenNamen, rechtsvorm, setRechtsvorm, korRegeling, setKorRegeling,
  jaarKeuzes, onOpenVragen, onUitgebreid, onClose,
}) {
  const [naam, setNaam] = useState(eigenNamen?.ondernemer || "");
  useEffect(() => setNaam(eigenNamen?.ondernemer || ""), [eigenNamen?.ondernemer]);
  const bewaarNaam = () => { const n = naam.trim(); if (n !== (eigenNamen?.ondernemer || "")) setEigenNamen({ ...(eigenNamen || {}), ondernemer: n }); };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="relative flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-xl" style={{ maxHeight: "calc(100dvh - 2rem)" }}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-bold">Basisvragen</h2>
          <button type="button" onClick={() => { bewaarNaam(); onClose(); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /> Klaar</button>
        </div>
        <div className="overflow-y-auto px-5 py-3">
          <p className="mb-2 text-xs text-slate-500">Een wijziging rekent direct mee in de uitkomst.</p>
          <h3 className="mt-1 text-sm font-bold text-slate-900">Over jou en je bedrijf</h3>
          <Rij label="Je naam">
            <input value={naam} onChange={(e) => setNaam(e.target.value)} onBlur={bewaarNaam} className={veld} placeholder="naam" />
          </Rij>
          <Rij label="Soort bedrijf">
            <select value={rechtsvorm || ""} onChange={(e) => setRechtsvorm(e.target.value || null)} className={veld}>
              <option value="">nog niet ingevuld</option>
              <option value="zzp">Eenmanszaak / zzp</option>
              <option value="bv">BV</option>
            </select>
          </Rij>
          {rechtsvorm !== "bv" && (
            <Rij label="Kleineondernemersregeling (KOR)" uitleg="Met KOR reken je geen BTW">
              <select value={korRegeling === true ? "ja" : korRegeling === false ? "nee" : ""} onChange={(e) => setKorRegeling(e.target.value === "ja" ? true : e.target.value === "nee" ? false : null)} className={veld}>
                <option value="">nog niet ingevuld</option>
                <option value="nee">Nee, ik reken BTW</option>
                <option value="ja">Ja, ik gebruik de KOR</option>
              </select>
            </Rij>
          )}
          {jaar && (
            <>
              <h3 className="mt-4 mb-1 text-sm font-bold text-slate-900">Keuzes voor {jaar}</h3>
              <div className="rounded-xl border border-slate-200 p-2">{jaarKeuzes}</div>
              <p className="mt-1 text-xs text-slate-400">Andere jaren kies je bovenaan in de jaarkeuze.</p>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => { bewaarNaam(); onOpenVragen(); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">Wizard: nog open vragen</button>
            <button type="button" onClick={() => { bewaarNaam(); onUitgebreid(); }} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 underline">Alles (rekeningen, lease, leningen) in Uitgebreid</button>
          </div>
        </div>
      </div>
    </div>
  );
}
