import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import CategorieSelect from "../shared/CategorieSelect.jsx";

// V7R9 / beide-V3R3 — wens Boska 23-10: alle open vragen van Nakijken in één lijst, zodat je de laatste kleine posten
// in één keer kunt indelen (bijv. allemaal "Overige privé-uitgaven") in plaats van één voor één.
// `keuzesVoor(vraag)` geeft dezelfde knoppen als bij de losse vraag; `andersKeuze(categorie)` die van "Iets anders…".
export default function OpenPostenLijst({ vragen, jaar, keuzesVoor, andersKeuze, onToepassen, onClose }) {
  const inkomend = vragen.filter((v) => v.teken > 0), uitgaand = vragen.filter((v) => v.teken <= 0);
  const [gekozenKant, setKant] = useState(uitgaand.length ? "uit" : "in");
  // Is de gekozen kant helemaal ingedeeld, dan door naar de andere.
  const kant = (gekozenKant === "uit" ? uitgaand : inkomend).length ? gekozenKant : gekozenKant === "uit" ? "in" : "uit";
  const lijst = kant === "uit" ? uitgaand : inkomend;
  const [gekozen, setGekozen] = useState(() => new Set());
  const [anders, setAnders] = useState("");
  const geselecteerd = lijst.filter((v) => gekozen.has(v.key));
  const som = geselecteerd.reduce((a, v) => a + v.bedrag, 0);
  const keuzes = useMemo(() => (lijst[0] ? keuzesVoor(lijst[0]) : []), [lijst, keuzesVoor]);
  const wissel = (k) => setGekozen((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const alles = geselecteerd.length === lijst.length && lijst.length > 0;
  const zet = (keuze) => { if (!geselecteerd.length) return; onToepassen(geselecteerd, keuze); setGekozen(new Set()); setAnders(""); };
  const tab = (k, t, n) => n > 0 && (
    <button type="button" onClick={() => { setKant(k); setGekozen(new Set()); }} aria-pressed={kant === k} className={`rounded-full px-3 py-1 text-sm ${kant === k ? "bg-slate-900 font-semibold text-white" : "bg-slate-100 text-slate-700"}`}>{t} ({n})</button>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3">
      <div role="dialog" aria-modal="true" className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold">Alle open posten{jaar ? ` in ${jaar}` : ""}</h2>
            <p className="text-sm text-slate-600">Vink aan wat bij elkaar hoort en kies onderaan waar het heen gaat. Je antwoord geldt per naam, ook in andere jaren.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /> Sluiten</button>
        </div>
        {vragen.length === 0 ? <p className="p-5 text-sm text-slate-600">Er staan geen posten meer open.</p> : <>
          <div className="flex flex-wrap items-center gap-2 px-5 pt-3">
            {tab("uit", "Uitgaven", uitgaand.length)}{tab("in", "Inkomsten", inkomend.length)}
            <label className="ml-auto inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={alles} onChange={() => setGekozen(alles ? new Set() : new Set(lijst.map((v) => v.key)))} /> Alles selecteren</label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {lijst.map((v) => (
                <li key={v.key}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={gekozen.has(v.key)} onChange={() => wissel(v.key)} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{v.naam}</span><span className="block text-xs text-slate-500">{v.aantal} {v.aantal === 1 ? "boeking" : "boekingen"}{v.voorbeeld?.category ? ` · nu: ${v.voorbeeld.category}` : ""}</span></span>
                    <b className="shrink-0 font-mono">{eur(v.bedrag)}</b>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-slate-200 p-5">
            <p className="mb-2 text-sm text-slate-700">{geselecteerd.length ? <>Zet <b>{geselecteerd.length}</b> {geselecteerd.length === 1 ? "post" : "posten"} ({eur(som)}) op:</> : "Vink eerst één of meer posten aan."}</p>
            <div className="flex flex-wrap gap-2">
              {keuzes.map((c) => (
                <button key={c.k} type="button" disabled={!geselecteerd.length} onClick={() => zet(c.keuze || c.k)} className="rounded-lg border-2 border-slate-300 px-3 py-1.5 text-sm font-semibold hover:border-teal-600 disabled:opacity-40">{c.t}</button>
              ))}
              <span className="inline-flex items-center gap-2">
                <CategorieSelect value={anders || null} onChange={(v) => setAnders(v)} placeholder="iets anders…" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                {anders && <button type="button" disabled={!geselecteerd.length} onClick={() => zet(andersKeuze(anders))} className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40">Toepassen</button>}
              </span>
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
