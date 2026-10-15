import { useMemo, useState } from "react";
import { X, Printer, Download } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { berekenInkomenPerMaand } from "../../calc/inkomenPerMaand.js";

// release31V5 — "Inkomen per maand": zakelijke omzet en privé-inkomen per maand van één jaar, met jaartotaal,
// gemiddelde per maand (alleen over maanden met volledige gegevens), een staafgrafiek en doorklikken naar de boekingen.
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function bouwHtml({ data, jaar, klantNaam }) {
  const kol = data.kolommen.filter((c) => !c.alleenInfo);
  const pv = data.heeftPriveInkomen;
  const cel = (v) => `<td style="text-align:right;padding:4px 8px">${v == null ? "—" : eur(v)}</td>`;
  const rij = (m) => `<tr><td style="padding:4px 8px">${MAANDEN[m.maand]}${m.volledig ? "" : " *"}</td>${kol.map((c) => cel(m[c.key])).join("")}${pv ? cel(m.prive) : ""}${cel(m.totaal)}${cel(-m.uitgaven)}${cel(m.verschil)}</tr>`;
  const voet = (label, o) => `<tr><td style="padding:4px 8px">${label}</td>${kol.map((c) => cel(o[c.key])).join("")}${pv ? cel(o.prive) : ""}${cel(o.totaal)}${cel(o.uitgaven == null ? null : -o.uitgaven)}${cel(o.verschil)}</tr>`;
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Inkomen per maand ${jaar}</title>
<style>body{font-family:system-ui,sans-serif;font-size:12px;color:#0f172a;margin:24px}table{border-collapse:collapse;width:100%}th{text-align:right;padding:4px 8px;border-bottom:1px solid #cbd5e1;font-weight:600}th:first-child{text-align:left}tr:nth-child(even) td{background:#f8fafc}tfoot td{font-weight:700;border-top:1px solid #cbd5e1}p{color:#475569}</style></head><body>
<h2>Inkomen per maand ${jaar}${klantNaam ? ` — ${klantNaam}` : ""}</h2>
<table><thead><tr><th>Maand</th>${kol.map((c) => `<th>${c.label}</th>`).join("")}${pv ? "<th>Privé totaal</th>" : ""}<th>${data.isBV ? "Inkomen huishouden" : "Totaal inkomen"}</th><th>Privé-uitgaven</th><th>Verschil</th></tr></thead>
<tbody>${data.maanden.map(rij).join("")}</tbody>
<tfoot>${voet("Jaartotaal", data.totalen)}${voet("Gemiddeld per maand", data.gemiddeld)}</tfoot></table>
<p>Privé-uitgaven = afschrijvingen op de privérekening(en) plus privé-uitgaven met de zakelijke pas; overboekingen tussen eigen rekeningen en sparen tellen niet mee. Verschil = totaal inkomen − privé-uitgaven.</p>
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
  const kol = data.kolommen.filter((c) => !c.alleenInfo); // omzet incl. BTW alleen in de Excel-export
  const pv = data.heeftPriveInkomen;
  const max = Math.max(1, ...data.maanden.map((m) => Math.max((isBV ? 0 : Math.max(0, m.omzetExcl)) + Math.max(0, m.prive), m.uitgaven)));
  const openBoekingen = open ? (data.maanden[open.maand].boekingen[open.key] || []).slice().sort((a, b) => a.date - b.date) : [];
  const openLabel = open ? (open.key === "uitgaven" ? "Privé-uitgaven" : kol.find((c) => c.key === open.key)?.label || "") : "";

  const naarExcel = async () => {
    const XLSX = await import("xlsx");
    const alle = data.kolommen; // in Excel ook omzet incl. BTW
    const kop = ["Maand", ...alle.map((c) => c.label), ...(pv ? ["Privé totaal"] : []), isBV ? "Inkomen huishouden" : "Totaal inkomen", "Privé-uitgaven", "Verschil", "Volledige gegevens"];
    const regel = (label, o, vol) => [label, ...alle.map((c) => o[c.key]), ...(pv ? [o.prive] : []), o.totaal, o.uitgaven == null ? null : -o.uitgaven, o.verschil, vol];
    const rijen = data.maanden.map((m) => regel(MAANDEN[m.maand], m, m.volledig ? "ja" : "nee"));
    rijen.push(regel("Jaartotaal", data.totalen, ""));
    rijen.push(regel("Gemiddeld per maand", data.gemiddeld, `${data.aantalVolledig} van 12`));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([kop, ...rijen]), `Inkomen ${jaar}`);
    XLSX.writeFile(wb, `Inkomen per maand ${jaar}${klantNaam ? ` ${klantNaam}` : ""}.xlsx`);
  };

  const Cel = ({ m, k }) => {
    const v = m[k];
    const geladen = k.startsWith("omzet") ? m.zakGeladen : m.priGeladen;
    if (!geladen && v === 0) return <td className="px-2 py-1.5 text-right text-[11px] text-slate-300" title="Rekening niet geladen voor deze maand">niet geladen</td>;
    const n = (m.boekingen[k] || []).length;
    const uit = k === "uitgaven";
    return (
      <td className={`px-2 py-1.5 text-right font-mono ${uit ? `bg-rose-50/40 ${geladen ? "text-rose-700" : "text-slate-400"}` : ""}`} title={uit && !geladen ? "Privérekening niet geladen: alleen privé-uitgaven met de zakelijke pas" : undefined}>
        {n > 0 ? (
          <button type="button" onClick={() => setOpen(open && open.maand === m.maand && open.key === k ? null : { maand: m.maand, key: k })} className={`underline decoration-dotted hover:text-teal-800 ${open && open.maand === m.maand && open.key === k ? "text-teal-800 font-semibold" : ""}`} title={`${n} boeking${n === 1 ? "" : "en"} tonen`}>
            {eur(uit ? -v : v)}
          </button>
        ) : <span className="text-slate-300">{eur(0)}</span>}
        {uit && !geladen && n > 0 && " *"}
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
                  <div key={m.maand} className={`flex-1 flex items-end gap-0.5 h-full ${m.volledig ? "" : "opacity-40"}`} title={`${MAANDEN[m.maand]}: inkomen ${eur(m.totaal)} · uitgaven ${eur(m.uitgaven)}${m.volledig ? "" : " (onvolledig)"}`}>
                    <div className="flex-1 flex flex-col justify-end h-full">
                      <div className="w-full rounded-t-sm bg-sky-400" style={{ height: `${(100 * p) / max}%` }} />
                      <div className={`w-full bg-teal-600 ${p > 0 ? "" : "rounded-t-sm"}`} style={{ height: `${(100 * z) / max}%` }} />
                    </div>
                    <div className="flex-1 rounded-t-sm" style={{ background: "#fb7185", height: `${(100 * m.uitgaven) / max}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1.5 mt-1">{KORT.map((k) => <span key={k} className="flex-1 text-center text-[10px] text-slate-500">{k}</span>)}</div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-slate-600">
              {!isBV && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-teal-600" /> Omzet excl. BTW</span>}
              {pv && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Privé-inkomen</span>}
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#fb7185" }} /> Privé-uitgaven</span>
              <span className="text-slate-400">Lichter = maand zonder volledige gegevens</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-1.5 text-left font-medium">Maand</th>
                  {kol.map((c) => <th key={c.key} className={`px-2 py-1.5 text-right font-medium ${c.alleenInfo ? "text-slate-400" : ""}`}>{c.label}</th>)}
                  {pv && <th className="px-2 py-1.5 text-right font-medium">Privé totaal</th>}
                  <th className="px-2 py-1.5 text-right font-semibold text-slate-700">{isBV ? "Inkomen huishouden" : "Totaal inkomen"}</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-rose-700">Privé-uitgaven</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-slate-700">Verschil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.maanden.map((m) => (
                  <tr key={m.maand} className={m.volledig ? "" : "bg-slate-50/70"}>
                    <td className="px-2 py-1.5">{MAANDEN[m.maand]}{!m.volledig && <span className="ml-1 text-amber-600" title="Niet alle rekeningen geladen voor deze maand">*</span>}</td>
                    {kol.map((c) => <Cel key={c.key} m={m} k={c.key} />)}
                    {pv && <td className="px-2 py-1.5 text-right font-mono">{eur(m.prive)}</td>}
                    <td className="px-2 py-1.5 text-right font-mono font-semibold">{eur(m.totaal)}</td>
                    <Cel m={m} k="uitgaven" />
                    <td className={`px-2 py-1.5 text-right font-mono font-semibold ${m.verschil < 0 ? "text-rose-700" : "text-emerald-700"}`}>{eur(m.verschil)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold">
                <tr>
                  <td className="px-2 py-1.5">Jaartotaal</td>
                  {kol.map((c) => <td key={c.key} className="px-2 py-1.5 text-right font-mono">{eur(data.totalen[c.key])}</td>)}
                  {pv && <td className="px-2 py-1.5 text-right font-mono">{eur(data.totalen.prive)}</td>}
                  <td className="px-2 py-1.5 text-right font-mono">{eur(data.totalen.totaal)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-rose-700">{eur(-data.totalen.uitgaven)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{eur(data.totalen.verschil)}</td>
                </tr>
                <tr className="text-teal-900">
                  <td className="px-2 py-1.5">Gemiddeld per maand</td>
                  {kol.map((c) => <td key={c.key} className="px-2 py-1.5 text-right font-mono">{data.gemiddeld[c.key] == null ? "—" : eur(data.gemiddeld[c.key])}</td>)}
                  {pv && <td className="px-2 py-1.5 text-right font-mono">{data.gemiddeld.prive == null ? "—" : eur(data.gemiddeld.prive)}</td>}
                  <td className="px-2 py-1.5 text-right font-mono">{data.gemiddeld.totaal == null ? "—" : eur(data.gemiddeld.totaal)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-rose-700">{data.gemiddeld.uitgaven == null ? "—" : eur(-data.gemiddeld.uitgaven)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{data.gemiddeld.verschil == null ? "—" : eur(data.gemiddeld.verschil)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-1 text-[11px] text-slate-500">
            <p>Gemiddelde over {data.aantalVolledig} van 12 maanden met volledige gegevens{data.aantalVolledig < 12 ? " (maanden met * tellen niet mee)" : ""}.</p>
            {!data.priInJaar && <p>Dit jaar is geen privérekening geladen: privé-inkomen (loon, uitkering, toeslagen) ontbreekt.</p>}
            {!data.zakInJaar && !isBV && <p>Dit jaar is geen zakelijke rekening geladen: omzet ontbreekt.</p>}
            {isBV && <p>BV: de omzet is van de BV en telt niet mee in het huishoudinkomen; daarvoor telt het DGA-salaris op de privérekening.</p>}
            {pv && <p>Loon, uitkering en overig = alle boekingen in de categorie "Inkomsten" op de privérekening.</p>}
            <p>Privé-uitgaven = afschrijvingen op de privérekening(en) plus privé-uitgaven met de zakelijke pas (pin en geldautomaat). Overboekingen tussen eigen rekeningen en naar sparen tellen niet mee, net als privé opnames per overboeking (dat is geen inkomen en geen uitgave). Verschil = totaal inkomen − privé-uitgaven. Klik op een bedrag om de boekingen te zien.</p>
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
