import { useState } from "react";
import { leesBedrag } from "../review/BalansCheck.jsx";
// nieuw-V10R0 — Boska 23-11: voorlopige aanslag per jaar invullen bij het maken van de indicatieve berekening.
// waarde: { [jaar]: { ib, zvw, betaald, betaaldZvw } } (positief = te betalen, negatief = terug). bank: { [jaar]: bedrag betaald aan IB/Zvw }.
const eur = (n) => Math.round(Math.abs(n)).toLocaleString("nl-NL");
const knop = (aan) => `min-h-[44px] rounded-full border px-3 text-base font-semibold ${aan ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-700"}`;

function Regel({ label, waarde, betaald, onBedrag, onBetaald }) {
  const [soort, setSoort] = useState(waarde < 0 ? "terug" : waarde > 0 ? "betalen" : null);
  const [tekst, setTekst] = useState(waarde ? Math.abs(waarde).toLocaleString("nl-NL", { maximumFractionDigits: 2 }) : "");
  const zet = (s, t) => { const b = leesBedrag(t); onBedrag(b == null || !s ? 0 : (s === "terug" ? -Math.abs(b) : Math.abs(b))); };
  return (
    <div className="space-y-1.5 border-t border-slate-200 pt-2 first:border-0 first:pt-0">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={knop(soort === "betalen")} onClick={() => { setSoort("betalen"); zet("betalen", tekst); }}>Te betalen</button>
        <button type="button" className={knop(soort === "terug")} onClick={() => { setSoort("terug"); zet("terug", tekst); }}>Terug te krijgen</button>
        <span className="text-base text-slate-500">€</span>
        <input inputMode="decimal" value={tekst} placeholder="jaarbedrag" onChange={(e) => { setTekst(e.target.value); zet(soort, e.target.value); }}
          className="min-h-[44px] w-32 rounded-lg border border-slate-300 px-2 text-base" />
      </div>
      {tekst && !soort && <p className="text-xs text-amber-800">Kies eerst: te betalen of terug te krijgen.</p>}
      {soort && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-700">{soort === "terug" ? "Al ontvangen?" : "Al betaald?"}</span>
          {[["Ja", true], ["Nog niet", false]].map(([t, b]) => (
            <button key={t} type="button" onClick={() => onBetaald(b)} className={knop(betaald === b)}>{t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VoorlopigeAanslagInvoer({ jaren = [], waarde = {}, onChange, bank = {} }) {
  const [open, setOpen] = useState(() => Object.fromEntries(jaren.filter((j) => waarde?.[j]).map((j) => [j, true])));
  if (!onChange || !jaren.length) return null;
  const zet = (j, veld, v) => onChange((oud) => {
    const n = { ...(oud || {}) };
    const r = { ...(n[j] || {}), [veld]: v };
    if (!r.ib && !r.zvw && r.betaald == null && r.betaaldZvw == null) delete n[j]; else n[j] = r;
    return n;
  });
  return (
    <fieldset className="rounded-lg border border-slate-200 p-2.5 space-y-2" data-voorlopig>
      <legend className="px-1 text-xs font-medium text-slate-600">Voorlopige aanslag (als die er is)</legend>
      {[...jaren].sort().map((j) => {
        const v = waarde?.[j] || {};
        if (!open[j]) return (
          <button key={j} type="button" onClick={() => setOpen((o) => ({ ...o, [j]: true }))} className="block min-h-[44px] text-sm text-teal-800 underline">
            + Voorlopige aanslag {j} invullen
          </button>
        );
        const ingevuld = Math.abs(v.ib || 0) + Math.abs(v.zvw || 0);
        const b = bank?.[j] || 0;
        return (
          <div key={j} className="space-y-2 rounded-md bg-slate-50 p-2">
            <p className="text-sm font-semibold text-slate-800">Voorlopige aanslag {j}</p>
            <p className="text-xs text-slate-500">Vul het jaarbedrag in (staat bovenaan de brief), niet het bedrag per maand. Wordt bewaard in het dossier.</p>
            <Regel label="Inkomstenbelasting/premie volksverzekeringen" waarde={v.ib || 0} betaald={v.betaald} onBedrag={(x) => zet(j, "ib", x)} onBetaald={(x) => zet(j, "betaald", x)} />
            <Regel label="Bijdrage Zvw (vaak een aparte brief; geen brief, dan leeg laten)" waarde={v.zvw || 0} betaald={v.betaaldZvw} onBedrag={(x) => zet(j, "zvw", x)} onBetaald={(x) => zet(j, "betaaldZvw", x)} />
            {b >= 1 && <p className={`text-xs ${ingevuld > 0 && ingevuld < b * 0.5 ? "text-amber-800" : "text-slate-500"}`}>Op de bank in {j}: € {eur(b)} betaald aan inkomstenbelasting of Zvw (ook eventuele aanslagen van eerdere jaren).{ingevuld > 0 && ingevuld < b * 0.5 ? " Dat is veel meer dan ingevuld: klopt het jaarbedrag?" : ""}</p>}
          </div>
        );
      })}
    </fieldset>
  );
}
