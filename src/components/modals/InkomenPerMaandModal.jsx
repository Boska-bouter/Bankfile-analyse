import { useMemo, useState } from "react";
import { X, Printer, Download } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { berekenInkomenPerMaand } from "../../calc/inkomenPerMaand.js";

// release31V5 — "Inkomen per maand": zakelijke omzet en privé-inkomen per maand van één jaar, met jaartotaal,
// gemiddelde per maand (alleen over maanden met volledige gegevens), een staafgrafiek en doorklikken naar de boekingen.
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function bouwHtml({ data, jaar, klantNaam }) {
  const kol = data.kolommen;
  const cel = (v) => `<td style="text-align:right;padding:4px 8px">${v == null ? "—" : eur(v)}</td>`;
  const rij = (m) => `<tr><td style="padding:4px 8px">${MAANDEN[m.maand]}${m.volledig ? "" : " *"}</td>${kol.map((c) => cel(m[c.key])).join("")}${cel(m.prive)}${cel(m.totaal)}</tr>`;
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Inkomen per maand ${jaar}</title>
<style>body{font-family:system-ui,sans-serif;font-size:12px;color:#0f172a;margin:24px}table{border-collapse:collapse;width:100%}th{text-align:right;padding:4px 8px;border-bottom:1px solid #cbd5e1;font-weight:600}th:first-child{text-align:left}tr:nth-child(even) td{background:#f8fafc}tfoot td{font-weight:700;border-top:1px solid #cbd5e1}p{color:#475569}</style></head><body>
<h2>Inkomen per maand ${jaar}${klantNaam ? ` — ${klantNaam}` : ""}</h2>
<table><thead><tr><th>Maand</th>${kol.map((c) => `<th>${c.label}</th>`).join("")}<th>Privé totaal</th><th>${data.isBV ? "Huishouden (privé)" : "Totaal (omzet excl. + privé)"}</th></tr></thead>
<tbody>${data.maanden.map(rij).join("")}</tbody>
<tfoot><tr><td style="padding:4px 8px">Jaartotaal</td>${kol.map((c) => cel(data.totalen[c.key])).join("")}${cel(data.totalen.prive)}${cel(data.totalen.totaal)}</tr>
<tr><td style="padding:4px 8px">Gemiddeld per maand</td>${kol.map((c) => cel(data.gemiddeld[c.key])).join("")}${cel(data.gemiddeld.prive)}${cel(data.gemiddeld.totaal)}</tr></tfoot></table>
<p>* Maand zonder volledige gegevens (niet alle rekeningen geladen); telt niet mee in het gemiddelde (${data.aantalVolledig} van 12 maanden volledig).${data.isBV ? " BV: de omzet is van de BV en telt niet mee in het huishoudinkomen." : ""}</p>
</body></html>`;
}

export default function InkomenPerMaandModal({ classified, years, beginJaar, categoryBtwRates, btwVerlegd, periodeZak, periodePri, isBV, klantNaam, onPrint, onClose }) {
  const [jaar, setJaar] = useState(beginJaar || years[years.length - 1]);
  const [open, setOpen] = useState(null); // { maand, key }
  const data = useMemo(
    () => berekenInkomenPerMaand({ classified, jaar, categoryBtwRates, btwVerlegd, periodeZak, periodePri, isBV }),
    [classified, jaar, categoryBtwRates, btwVerlegd, periodeZak, periodePri, isBV]
  );
  const kol = data.kolommen;
  const max = Math.max(1, ...data.maanden.map((m) => (isBV ? 0 : Math.max(0, m.omzetExcl)) + Math.max(0, m.prive)));
  const openBoekingen = open ? (data.maanden[open.maand].boekingen[open.key] || []).slice().sort((a, b) => a.date - b.date) : [];
  const openLabel = open ? (kol.find((c) => c.key === open.key)?.label || "") : "";

  const naarExcel = async () => {
    const XLSX = await import("xlsx");
    const kop = ["Maand", ...kol.map((c) => c.label), "Privé totaal", isBV ? "Huishouden (privé)" : "Totaal (omzet excl. + privé)", "Volledige gegevens"];
    const rijen = data.maanden.map((m) => [MAANDEN[m.maand], ...kol.map((c) => m[c.key]), m.prive, m.totaal, m.volledig ? "ja" : "nee"]);
    rijen.push(["Jaartotaal", ...kol.map((c) => data.totalen[c.key]), data.totalen.prive, data.totalen.totaal, ""]);
    rijen.push(["Gemiddeld per maand", ...kol.map((c) => data.gemiddeld[c.key]), data.gemiddeld.prive, data.gemiddeld.totaal, `${data.aantalVolledig} van 12`]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([kop, ...rijen]), `Inkomen ${jaar}`);
    XLSX.writeFile(wb, `Inkomen per maand ${jaar}${klantNaam ? ` ${klantNaam}` : ""}.xlsx`);
  };

  const Cel = ({ m, k }) => {
    const v = m[k];
    const geladen = k.startsWith("omzet") ? m.zakGeladen : m.priGeladen;
    if (!geladen && v === 0) return <td className="px-2 py-1.5 text-right text-[11px] text-slate-300" title="Rekening niet geladen voor deze maand">niet geladen</td>;
    const n = (m.boekingen[k] || []).length;
    return (
      <td className="px-2 py-1.5 text-right font-mono">
        {n > 0 ? (
          <button type="button" onClick={() => setOpen(open && open.maand === m.maand && open.key === k ? null : { maand: m.maand, key: k })} className={`underline decoration-dotted hover:text-teal-800 ${open && open.maand === m.maand && open.key === k ? "text-teal-800 font-semibold" : ""}`} title={`${n} boeking${n === 1 ? "" : "en"} tonen`}>
            {eur(v)}
          </button>
        ) : <span className="text-slate-300">{eur(0)}</span>}
      </td>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[92dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Inkomen per maand</p>
            {years.length > 1 && (
              <select value={jaar} onChange={(e) => { setJaar(+e.target.value); setOpen(null); }} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
                {years.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            )}
            {years.length <= 1 && <span className="text-sm text-slate-600">{jaar}</span>}
          </div>
          <div className="flex gap-2 items-center">
            <button type="button" onClick={naarExcel} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"><Download className="h-4 w-4" /> Excel</button>
            {onPrint && <button type="button" onClick={() => onPrint(bouwHtml({ data, jaar, klantNaam }))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"><Printer className="h-4 w-4" /> Printen</button>}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200" title="Sluiten"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {/* Staafgrafiek: omzet excl. BTW (zakelijk) en privé-inkomen per maand */}
          <div>
            <div className="flex items-end gap-1.5 h-36 border-b border-slate-200">
              {data.maanden.map((m) => {
                const z = isBV ? 0 : Math.max(0, m.omzetExcl), p = Math.max(0, m.prive);
                return (
                  <div key={m.maand} className="flex-1 flex flex-col justify-end h-full" title={`${MAANDEN[m.maand]}: ${eur(m.totaal)}${m.volledig ? "" : " (onvolledig)"}`}>
                    <div className={`w-full rounded-t-sm bg-sky-400 ${m.volledig ? "" : "opacity-40"}`} style={{ height: `${(100 * p) / max}%` }} />
                    <div className={`w-full bg-teal-600 ${p > 0 ? "" : "rounded-t-sm"} ${m.volledig ? "" : "opacity-40"}`} style={{ height: `${(100 * z) / max}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1.5 mt-1">{KORT.map((k) => <span key={k} className="flex-1 text-center text-[10px] text-slate-500">{k}</span>)}</div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-slate-600">
              {!isBV && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-teal-600" /> Omzet excl. BTW</span>}
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Privé-inkomen</span>
              <span className="text-slate-400">Lichter = maand zonder volledige gegevens</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-1.5 text-left font-medium">Maand</th>
                  {kol.map((c) => <th key={c.key} className={`px-2 py-1.5 text-right font-medium ${c.alleenInfo ? "text-slate-400" : ""}`}>{c.label}</th>)}
                  <th className="px-2 py-1.5 text-right font-medium">Privé totaal</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-slate-700">{isBV ? "Huishouden (privé)" : "Totaal"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.maanden.map((m) => (
                  <tr key={m.maand} className={m.volledig ? "" : "bg-slate-50/70"}>
                    <td className="px-2 py-1.5">{MAANDEN[m.maand]}{!m.volledig && <span className="ml-1 text-amber-600" title="Niet alle rekeningen geladen voor deze maand">*</span>}</td>
                    {kol.map((c) => <Cel key={c.key} m={m} k={c.key} />)}
                    <td className="px-2 py-1.5 text-right font-mono">{eur(m.prive)}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold">{eur(m.totaal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold">
                <tr>
                  <td className="px-2 py-1.5">Jaartotaal</td>
                  {kol.map((c) => <td key={c.key} className="px-2 py-1.5 text-right font-mono">{eur(data.totalen[c.key])}</td>)}
                  <td className="px-2 py-1.5 text-right font-mono">{eur(data.totalen.prive)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{eur(data.totalen.totaal)}</td>
                </tr>
                <tr className="text-teal-900">
                  <td className="px-2 py-1.5">Gemiddeld per maand</td>
                  {kol.map((c) => <td key={c.key} className="px-2 py-1.5 text-right font-mono">{data.gemiddeld[c.key] == null ? "—" : eur(data.gemiddeld[c.key])}</td>)}
                  <td className="px-2 py-1.5 text-right font-mono">{data.gemiddeld.prive == null ? "—" : eur(data.gemiddeld.prive)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{data.gemiddeld.totaal == null ? "—" : eur(data.gemiddeld.totaal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-1 text-[11px] text-slate-500">
            <p>Gemiddelde over {data.aantalVolledig} van 12 maanden met volledige gegevens{data.aantalVolledig < 12 ? " (maanden met * tellen niet mee)" : ""}.</p>
            {!data.priInJaar && <p>Dit jaar is geen privérekening geladen: privé-inkomen (loon, uitkering, toeslagen) ontbreekt.</p>}
            {!data.zakInJaar && !isBV && <p>Dit jaar is geen zakelijke rekening geladen: omzet ontbreekt.</p>}
            {isBV && <p>BV: de omzet is van de BV en telt niet mee in het huishoudinkomen; daarvoor telt het DGA-salaris op de privérekening.</p>}
            <p>Loon, uitkering en overig = alle boekingen in de categorie "Inkomsten" op de privérekening. Overboekingen van de eigen zakelijke rekening (privé opnames) zijn geen inkomen en staan er niet in. Klik op een bedrag om de boekingen te zien.</p>
          </div>

          {open && (
            <div className="rounded-lg border border-teal-200 bg-teal-50/40">
              <div className="flex items-center justify-between px-3 py-2 border-b border-teal-100">
                <p className="text-xs font-semibold text-slate-800">{openLabel} — {MAANDEN[open.maand]} {jaar} ({openBoekingen.length})</p>
                <button type="button" onClick={() => setOpen(null)} className="text-xs text-slate-500 underline">Sluiten</button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white">
                {openBoekingen.map((t) => (
                  <div key={t.id} className="px-3 py-1.5 text-xs flex gap-2">
                    <span className="w-20 shrink-0 text-slate-500 font-mono">{t.date.toLocaleDateString("nl-NL")}</span>
                    <span className="flex-1 min-w-0 truncate">{t.counterparty || t.description}</span>
                    <span className="shrink-0 text-slate-400">{t.category}</span>
                    <span className="w-24 shrink-0 text-right font-mono">{eur(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
