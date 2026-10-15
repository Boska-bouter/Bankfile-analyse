import { useMemo, useState } from "react";
import { X, Printer, Download, ArrowLeft } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { berekenInkomenPerMaand } from "../../calc/inkomenPerMaand.js";

// release31V5 / 32V3 — "Inkomen per maand": omzet en privé-inkomen, privé-uitgaven via de privérekening én via de
// zakelijke rekening, en het verschil. Maanden waarin niet alles geladen is, worden niet berekend (geen aannames);
// totalen en gemiddelden gaan alleen over de volledige maanden. Daaronder: indicatieve IB/Zvw en BTW per kwartaal.
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const ROOD = "#e11d48", LICHTROOD = "#fda4af";

const bereik = (lijst) => {
  if (lijst.length === 0) return "";
  const aaneen = lijst.every((m, i) => i === 0 || m === lijst[i - 1] + 1);
  return aaneen && lijst.length > 1 ? `${KORT[lijst[0]]} t/m ${KORT[lijst[lijst.length - 1]]}` : lijst.map((m) => KORT[m]).join(", ");
};

function fiscaalBlok(f) {
  if (!f) return null;
  const ibZvw = f.ib != null ? Math.round((f.ib + f.zvw) * 100) / 100 : null;
  const nog = ibZvw != null ? Math.max(0, Math.round((ibZvw - f.betaald) * 100) / 100) : null;
  const btwJaar = f.btw ? Math.round(f.btw.reduce((a, b) => a + b, 0) * 100) / 100 : null;
  return { ...f, ibZvw, nog, perMaand: nog != null ? Math.round((nog / 12) * 100) / 100 : null, btwJaar, btwPerMaand: btwJaar != null ? Math.round((btwJaar / 12) * 100) / 100 : null };
}

function bouwHtml({ data, jaar, klantNaam, fis }) {
  const kol = data.kolommen.filter((c) => !c.alleenInfo);
  const pv = data.heeftPriveInkomen;
  const cel = (v) => `<td style="text-align:right;padding:4px 8px">${v == null ? "—" : eur(v)}</td>`;
  const n = 4 + kol.length + (pv ? 1 : 0);
  const rij = (m) => m.volledig
    ? `<tr><td style="padding:4px 8px">${MAANDEN[m.maand]}</td>${kol.map((c) => cel(m[c.key])).join("")}${pv ? cel(m.prive) : ""}${cel(m.totaal)}${cel(-m.viaPrive)}${cel(-m.viaZak)}${cel(-m.uitgaven)}${cel(m.verschil)}</tr>`
    : `<tr style="color:#94a3b8"><td style="padding:4px 8px">${MAANDEN[m.maand]} *</td>${kol.map((c) => cel(m[c.key])).join("")}${pv ? cel(m.prive) : ""}${cel(m.totaal)}<td colspan="4" style="text-align:center;font-style:italic">kan niet worden bepaald</td></tr>`;
  const voet = (label, o) => `<tr><td style="padding:4px 8px">${label}</td>${kol.map((c) => cel(o[c.key])).join("")}${pv ? cel(o.prive) : ""}${cel(o.totaal)}${cel(o.viaPrive == null ? null : -o.viaPrive)}${cel(o.viaZak == null ? null : -o.viaZak)}${cel(o.uitgaven == null ? null : -o.uitgaven)}${cel(o.verschil)}</tr>`;
  const bl = data.volledigeMaanden.length;
  const f = fis;
  const fisHtml = f ? `<h3>Belasting en BTW ${jaar} (indicatief)</h3><table style="width:auto">${f.ibZvw != null ? `<tr><td>IB ná heffingskorting</td>${cel(f.ib)}</tr><tr><td>Zvw-bijdrage</td>${cel(f.zvw)}</tr><tr><td>Al betaald in ${jaar} via de bank</td>${cel(f.betaald)}</tr><tr><td><b>Nog te betalen</b></td>${cel(f.nog)}</tr><tr><td>Per maand opzij te zetten</td>${cel(f.perMaand)}</tr>` : ""}${f.btw ? f.btw.map((v, i) => `<tr><td>BTW Q${i + 1}</td><td style="text-align:right;padding:4px 8px">${eur(Math.abs(v))} ${v < 0 ? "terug" : "te betalen"}</td></tr>`).join("") + `<tr><td><b>BTW jaar</b></td><td style="text-align:right;padding:4px 8px">${eur(Math.abs(f.btwJaar))} ${f.btwJaar < 0 ? "terug" : "te betalen"}</td></tr>` : ""}</table>` : "";
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Inkomen per maand ${jaar}</title>
<style>body{font-family:system-ui,sans-serif;font-size:12px;color:#0f172a;margin:24px}table{border-collapse:collapse;width:100%}th{text-align:right;padding:4px 8px;border-bottom:1px solid #cbd5e1;font-weight:600}th:first-child{text-align:left}tfoot td{font-weight:700;border-top:1px solid #cbd5e1}p{color:#475569}h3{margin-top:18px}</style></head><body>
<h2>Inkomen per maand ${jaar}${klantNaam ? ` — ${klantNaam}` : ""}</h2>
<table><thead><tr><th>Maand</th>${kol.map((c) => `<th>${c.label}</th>`).join("")}${pv ? "<th>Privé totaal</th>" : ""}<th>${data.isBV ? "Inkomen huishouden" : "Totaal inkomen"}</th><th>Uitgaven via privérekening</th><th>Uitgaven via zakelijke rekening</th><th>Totaal privé-uitgaven</th><th>Verschil</th></tr></thead>
<tbody>${data.maanden.map(rij).join("")}</tbody>
<tfoot>${voet(`Totaal ${bl} volledige maanden`, data.totalen)}${voet("Gemiddeld per maand", data.gemiddeld)}</tfoot></table>
<p>Ter informatie: omzet excl. BTW over het hele jaar (ook onvolledige maanden) ${eur(data.omzetJaar.excl)}. * = niet alle rekeningen de hele maand geladen: uitgaven en verschil niet berekend, telt niet mee in totaal en gemiddelde. Privé-uitgaven via zakelijke rekening = privé-categorieën en privé opnames (pin, geldautomaat, direct betaald) plus het privédeel van gemengde kosten volgens de percentages van de aangifte.</p>
${fisHtml}
<p style="display:none">${n}</p></body></html>`;
}

function DetailPagina({ data, jaar, klantNaam, onTerug, onPrint }) {
  const [open, setOpen] = useState(null);
  const naarExcel = async () => {
    const XLSX = await import("xlsx");
    const rijen = [["Soort", "Datum", "Tegenpartij", "Categorie", "Bedrag", "Privédeel"]];
    for (const s of data.soorten) for (const b of s.boekingen) rijen.push([s.soort, b.tx.date.toLocaleDateString("nl-NL"), b.tx.counterparty || b.tx.description, b.tx.category, b.tx.amount, -b.bedrag]);
    rijen.push(["Totaal", "", "", "", "", -data.soortenTotaal]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rijen), `Privé via zakelijk ${jaar}`);
    XLSX.writeFile(wb, `Privé-uitgaven via zakelijk ${jaar}${klantNaam ? ` ${klantNaam}` : ""}.xlsx`);
  };
  const html = () => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Privé-uitgaven via zakelijke rekening ${jaar}</title><style>body{font-family:system-ui,sans-serif;font-size:12px;margin:24px}td{padding:4px 8px}</style></head><body><h2>Privé-uitgaven via zakelijke rekening ${jaar}${klantNaam ? ` — ${klantNaam}` : ""}</h2><table>${data.soorten.map((s) => `<tr><td>${s.soort}</td><td style="text-align:right">${eur(-s.bedrag)}</td></tr>`).join("")}<tr><td><b>Totaal</b></td><td style="text-align:right"><b>${eur(-data.soortenTotaal)}</b></td></tr></table></body></html>`;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <button type="button" onClick={onTerug} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 hover:text-teal-800">
          <ArrowLeft className="h-4 w-4" /> Inkomen per maand · Privé-uitgaven via zakelijke rekening {jaar}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={naarExcel} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"><Download className="h-4 w-4" /> Excel</button>
          {onPrint && <button type="button" onClick={() => onPrint(html())} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"><Printer className="h-4 w-4" /> Printen</button>}
        </div>
      </div>
      <div className="overflow-y-auto p-4">
        <p className="text-xs text-slate-500 mb-3">Percentages zoals in de aangifte (soort ruimte, % zakelijk/privé, privéauto). Overboekingen naar de eigen privérekening staan hier niet: die tellen aan de privékant. Klik op een regel om de boekingen te zien.</p>
        {data.soorten.length === 0 && <p className="text-sm text-slate-500">Geen privé-uitgaven via de zakelijke rekening in {jaar}.</p>}
        <div className="divide-y divide-slate-100">
          {data.soorten.map((s) => (
            <div key={s.soort}>
              <button type="button" onClick={() => setOpen(open === s.soort ? null : s.soort)} className="w-full flex items-center justify-between gap-3 py-2 text-left text-sm hover:bg-slate-50">
                <span className="underline decoration-dotted">{s.soort} <span className="text-xs text-slate-400 no-underline">({s.boekingen.length})</span></span>
                <span className="font-mono text-rose-700">{eur(-s.bedrag)}</span>
              </button>
              {open === s.soort && (
                <div className="mb-2 max-h-64 overflow-y-auto rounded-lg border border-slate-100">
                  {s.boekingen.map(({ tx, bedrag }) => (
                    <div key={tx.id} className="px-3 py-1.5 text-xs flex gap-2 border-b border-slate-50">
                      <span className="w-20 shrink-0 font-mono text-slate-500">{tx.date.toLocaleDateString("nl-NL")}</span>
                      <span className="flex-1 min-w-0 truncate">{tx.counterparty || tx.description}</span>
                      <span className="shrink-0 text-slate-400">{tx.category}</span>
                      <span className="w-24 shrink-0 text-right font-mono">{eur(-bedrag)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {data.soorten.length > 0 && (
            <div className="flex items-center justify-between py-2 text-sm font-semibold">
              <span>Totaal via zakelijke rekening, heel {jaar} (ook maanden die in de tabel niet meetellen)</span><span className="font-mono text-rose-800">{eur(-data.soortenTotaal)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function InkomenPerMaandModal({
  classified, years, beginJaar, categoryBtwRates, btwVerlegd, periodeZak, periodePri, isBV, klantNaam, onPrint, onClose,
  percentages, autoStatus, heeftLeaseAuto, eigenPriveIbans = [], fiscaalVoorJaar,
}) {
  const [jaar, setJaar] = useState(beginJaar || years[years.length - 1]);
  const [open, setOpen] = useState(null); // { maand, key }
  const [details, setDetails] = useState(false);
  const ibansKey = eigenPriveIbans.join("|");
  const data = useMemo(
    () => berekenInkomenPerMaand({ classified, jaar, categoryBtwRates, btwVerlegd, periodeZak, periodePri, isBV, percentages, autoStatus, heeftLeaseAuto, eigenPriveIbans }),
    [classified, jaar, categoryBtwRates, btwVerlegd, periodeZak, periodePri, isBV, percentages, autoStatus, heeftLeaseAuto, ibansKey] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const fis = useMemo(() => fiscaalBlok(fiscaalVoorJaar ? fiscaalVoorJaar(jaar) : null), [fiscaalVoorJaar, jaar]); // eslint-disable-line react-hooks/exhaustive-deps
  const kol = data.kolommen.filter((c) => !c.alleenInfo); // omzet incl. BTW alleen in de Excel-export
  const pv = data.heeftPriveInkomen;
  const max = Math.max(1, ...data.maanden.map((m) => Math.max((isBV ? 0 : Math.max(0, m.omzetExcl)) + Math.max(0, m.prive), m.volledig ? m.uitgaven : 0)));
  const openBoekingen = open ? (data.maanden[open.maand].boekingen[open.key] || []).slice().sort((a, b) => a.date - b.date) : [];
  const LABELS = { viaPrive: "Uitgaven via privérekening", viaZak: "Uitgaven via zakelijke rekening", uitgaven: "Totaal privé-uitgaven" };
  const openLabel = open ? (LABELS[open.key] || kol.find((c) => c.key === open.key)?.label || "") : "";
  const nVol = data.aantalVolledig;
  const onvolledig = data.maanden.filter((m) => !m.volledig).map((m) => m.maand);
  const verschilNa = fis && data.gemiddeld.verschil != null
    ? Math.round((data.gemiddeld.verschil - (fis.perMaand || 0) - (fis.btwPerMaand || 0)) * 100) / 100
    : null;

  const naarExcel = async () => {
    const XLSX = await import("xlsx");
    const alle = data.kolommen; // in Excel ook omzet incl. BTW
    const kop = ["Maand", ...alle.map((c) => c.label), ...(pv ? ["Privé totaal"] : []), isBV ? "Inkomen huishouden" : "Totaal inkomen", "Uitgaven via privérekening", "Uitgaven via zakelijke rekening", "Totaal privé-uitgaven", "Verschil", "Volledige gegevens"];
    const regel = (label, o, vol, nb) => [label, ...alle.map((c) => o[c.key]), ...(pv ? [o.prive] : []), o.totaal, ...(nb ? ["niet te bepalen", "", "", ""] : [-o.viaPrive, -o.viaZak, -o.uitgaven, o.verschil]), vol];
    const rijen = data.maanden.map((m) => regel(MAANDEN[m.maand], m, m.volledig ? "ja" : "nee", !m.volledig));
    rijen.push(regel(`Totaal ${nVol} volledige maanden`, data.totalen, ""));
    if (nVol) rijen.push(regel("Gemiddeld per maand", data.gemiddeld, ""));
    rijen.push(["Omzet excl. BTW hele jaar (ter informatie)", data.omzetJaar.excl]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([kop, ...rijen]), `Inkomen ${jaar}`);
    XLSX.writeFile(wb, `Inkomen per maand ${jaar}${klantNaam ? ` ${klantNaam}` : ""}.xlsx`);
  };

  const Bedrag = ({ m, k, neg = false, cls = "" }) => {
    const v = m[k];
    const n = (m.boekingen[k] || []).length;
    const actief = open && open.maand === m.maand && open.key === k;
    return (
      <td className={`px-2 py-1.5 text-right font-mono ${cls}`}>
        {n > 0 ? (
          <button type="button" onClick={() => setOpen(actief ? null : { maand: m.maand, key: k })} className={`underline decoration-dotted hover:text-teal-800 ${actief ? "font-semibold text-teal-800" : ""}`} title={`${n} boeking${n === 1 ? "" : "en"} tonen`}>
            {eur(neg ? -v : v)}
          </button>
        ) : <span className="text-slate-300">{eur(0)}</span>}
      </td>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[92dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {details ? (
          <DetailPagina data={data} jaar={jaar} klantNaam={klantNaam} onPrint={onPrint} onTerug={() => setDetails(false)} />
        ) : (
        <>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Inkomen per maand</p>
            {years.length > 1 ? (
              <select value={jaar} onChange={(e) => { setJaar(+e.target.value); setOpen(null); }} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
                {years.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            ) : <span className="text-sm text-slate-600">{jaar}</span>}
          </div>
          <div className="flex gap-2 items-center">
            <button type="button" onClick={naarExcel} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"><Download className="h-4 w-4" /> Excel</button>
            {onPrint && <button type="button" onClick={() => onPrint(bouwHtml({ data, jaar, klantNaam, fis }))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"><Printer className="h-4 w-4" /> Printen</button>}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200" title="Sluiten"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {/* Grafiek: inkomen (groen, + privé-inkomen blauw) naast privé-uitgaven (donkerrood privérekening, lichtrood zakelijk) */}
          <div>
            <div className="flex items-end gap-1.5 h-36 border-b border-slate-200">
              {data.maanden.map((m) => {
                const z = isBV ? 0 : Math.max(0, m.omzetExcl), p = Math.max(0, m.prive);
                return (
                  <div key={m.maand} className="flex-1 flex items-end gap-0.5 h-full" title={`${MAANDEN[m.maand]}: inkomen ${eur(m.totaal)}${m.volledig ? ` · uitgaven ${eur(m.uitgaven)}` : " · uitgaven niet te bepalen"}`}>
                    <div className={`flex-1 flex flex-col justify-end h-full ${m.volledig ? "" : "opacity-40"}`}>
                      <div className="w-full rounded-t-sm bg-sky-400" style={{ height: `${(100 * p) / max}%` }} />
                      <div className={`w-full bg-teal-600 ${p > 0 ? "" : "rounded-t-sm"}`} style={{ height: `${(100 * z) / max}%` }} />
                    </div>
                    {m.volledig ? (
                      <div className="flex-1 flex flex-col justify-end h-full">
                        <div className="w-full rounded-t-sm" style={{ background: LICHTROOD, height: `${(100 * m.viaZak) / max}%` }} />
                        <div className="w-full" style={{ background: ROOD, height: `${(100 * m.viaPrive) / max}%` }} />
                      </div>
                    ) : (
                      <div className="flex-1 h-full flex items-end justify-center"><span className="text-[9px] text-slate-400" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>onbekend</span></div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1.5 mt-1">{KORT.map((k) => <span key={k} className="flex-1 text-center text-[10px] text-slate-500">{k}</span>)}</div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-slate-600">
              {!isBV && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-teal-600" /> Omzet excl. BTW</span>}
              {pv && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Privé-inkomen</span>}
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ROOD }} /> Privé-uitgaven via privérekening</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: LICHTROOD }} /> Privé-uitgaven via zakelijke rekening</span>
              <span className="text-slate-400">Lichter = maand zonder volledige gegevens</span>
            </div>
          </div>

          {!data.priveInDossier && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">Er is geen privérekening geladen: privé-uitgaven en het verschil kunnen voor geen enkele maand worden bepaald.</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-1.5 text-left font-medium">Maand</th>
                  {kol.map((c) => <th key={c.key} className="px-2 py-1.5 text-right font-medium">{c.label}</th>)}
                  {pv && <th className="px-2 py-1.5 text-right font-medium">Privé totaal</th>}
                  <th className="px-2 py-1.5 text-right font-semibold text-slate-700">{isBV ? "Inkomen huishouden" : "Totaal inkomen"}</th>
                  <th className="px-2 py-1.5 text-right font-medium text-rose-700">Uitgaven via<br />privérekening</th>
                  <th className="px-2 py-1.5 text-right font-medium text-rose-700">Uitgaven via<br />zakelijke rekening</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-rose-800">Totaal<br />privé-uitgaven</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-slate-700">Verschil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.maanden.map((m) => (
                  <tr key={m.maand} className={m.volledig ? "" : "bg-slate-50/70"}>
                    <td className="px-2 py-1.5">{MAANDEN[m.maand]}{!m.volledig && <span className="ml-1 text-amber-600">*</span>}</td>
                    {kol.map((c) => <Bedrag key={c.key} m={m} k={c.key} cls={m.volledig ? "" : "text-slate-400"} />)}
                    {pv && <td className={`px-2 py-1.5 text-right font-mono ${m.volledig ? "" : "text-slate-400"}`}>{eur(m.prive)}</td>}
                    <td className={`px-2 py-1.5 text-right font-mono ${m.volledig ? "font-semibold" : "text-slate-400"}`}>{eur(m.totaal)}</td>
                    {m.volledig ? (
                      <>
                        <Bedrag m={m} k="viaPrive" neg cls="text-rose-700" />
                        <Bedrag m={m} k="viaZak" neg cls="text-rose-700" />
                        <Bedrag m={m} k="uitgaven" neg cls="font-semibold text-rose-800" />
                        <td className={`px-2 py-1.5 text-right font-mono font-semibold ${m.verschil < 0 ? "text-rose-700" : "text-emerald-700"}`}>{eur(m.verschil)}</td>
                      </>
                    ) : (
                      <td colSpan={4} className="px-2 py-1.5 text-center text-[11px] italic text-slate-500">kan niet worden bepaald: {!m.priGeladen ? "privérekening" : "zakelijke rekening"} niet (volledig) geladen</td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold">
                <tr>
                  <td className="px-2 py-1.5">Totaal {nVol} volledige maand{nVol === 1 ? "" : "en"}{nVol > 0 && nVol < 12 ? ` (${bereik(data.volledigeMaanden)})` : ""}</td>
                  {kol.map((c) => <td key={c.key} className="px-2 py-1.5 text-right font-mono">{eur(data.totalen[c.key])}</td>)}
                  {pv && <td className="px-2 py-1.5 text-right font-mono">{eur(data.totalen.prive)}</td>}
                  <td className="px-2 py-1.5 text-right font-mono">{eur(data.totalen.totaal)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-rose-700">{eur(-data.totalen.viaPrive)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-rose-700">{eur(-data.totalen.viaZak)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-rose-800">{eur(-data.totalen.uitgaven)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{eur(data.totalen.verschil)}</td>
                </tr>
                <tr className="text-teal-900">
                  <td className="px-2 py-1.5">Gemiddeld per maand</td>
                  {kol.map((c) => <td key={c.key} className="px-2 py-1.5 text-right font-mono">{data.gemiddeld[c.key] == null ? "—" : eur(data.gemiddeld[c.key])}</td>)}
                  {pv && <td className="px-2 py-1.5 text-right font-mono">{data.gemiddeld.prive == null ? "—" : eur(data.gemiddeld.prive)}</td>}
                  <td className="px-2 py-1.5 text-right font-mono">{data.gemiddeld.totaal == null ? "—" : eur(data.gemiddeld.totaal)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-rose-700">{data.gemiddeld.viaPrive == null ? "—" : eur(-data.gemiddeld.viaPrive)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-rose-700">{data.gemiddeld.viaZak == null ? "—" : eur(-data.gemiddeld.viaZak)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-rose-800">{data.gemiddeld.uitgaven == null ? "—" : eur(-data.gemiddeld.uitgaven)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{data.gemiddeld.verschil == null ? "—" : eur(data.gemiddeld.verschil)}</td>
                </tr>
              </tfoot>
            </table>
            {onvolledig.length > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-500">Ter informatie: omzet excl. BTW over het hele jaar (ook {bereik(onvolledig)}) {eur(data.omzetJaar.excl)}. Die wordt niet met de uitgaven vergeleken, omdat de uitgaven van die maanden niet bekend zijn.</p>
            )}
          </div>

          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50">
            <input type="checkbox" checked={false} onChange={() => setDetails(true)} />
            <b>Toon details privé-uitgaven via zakelijke rekening</b> <span className="text-slate-500">(aparte pagina)</span>
          </label>

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

          {fis && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-800 mb-1.5">Inkomstenbelasting en Zvw {jaar} <span className="font-normal text-slate-500">(indicatief)</span></p>
                {fis.isBV ? (
                  <p className="text-xs text-slate-500">BV: de BV betaalt vennootschapsbelasting; die staat niet in dit overzicht.</p>
                ) : fis.ibZvw == null ? (
                  <p className="text-xs text-slate-500">Geen indicatie beschikbaar voor dit jaar.</p>
                ) : (
                  <table className="w-full text-xs">
                    <tbody>
                      <tr><td className="py-0.5">IB ná heffingskorting</td><td className="text-right font-mono">{eur(fis.ib)}</td></tr>
                      <tr><td className="py-0.5">Zvw-bijdrage</td><td className="text-right font-mono">{eur(fis.zvw)}</td></tr>
                      <tr className="text-slate-500"><td className="py-0.5">Al betaald in {jaar} via de bank (IB/Zvw)</td><td className="text-right font-mono">{eur(fis.betaald)}</td></tr>
                      <tr className="border-t border-slate-200 font-semibold"><td className="py-1">Nog te betalen</td><td className="text-right font-mono text-rose-700">{eur(fis.nog)}</td></tr>
                      <tr className="text-slate-600"><td className="py-0.5">Per maand opzij te zetten</td><td className="text-right font-mono">{eur(fis.perMaand)}</td></tr>
                    </tbody>
                  </table>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-800 mb-1.5">BTW per kwartaal {jaar}</p>
                {fis.kor || !fis.btw ? (
                  <p className="text-xs text-slate-500">{fis.kor ? "KOR: er wordt geen BTW afgedragen." : "Geen BTW-gegevens voor dit jaar."}</p>
                ) : (
                  <table className="w-full text-xs">
                    <tbody>
                      {fis.btw.map((v, i) => (
                        <tr key={i}><td className="py-0.5">Q{i + 1}</td><td className={`text-right font-mono ${v < 0 ? "text-emerald-700" : "text-rose-700"}`}>{eur(Math.abs(v))} {v < 0 ? "terug" : "te betalen"}</td></tr>
                      ))}
                      <tr className="border-t border-slate-200 font-semibold"><td className="py-1">Jaar</td><td className={`text-right font-mono ${fis.btwJaar < 0 ? "text-emerald-700" : "text-rose-700"}`}>{eur(Math.abs(fis.btwJaar))} {fis.btwJaar < 0 ? "terug" : "te betalen"}</td></tr>
                      <tr className="text-slate-600"><td className="py-0.5">Gemiddeld per maand</td><td className="text-right font-mono">{eur(Math.abs(fis.btwPerMaand))} {fis.btwPerMaand < 0 ? "terug" : "te betalen"}</td></tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {verschilNa != null && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs flex flex-wrap gap-x-4 gap-y-1">
              <span className="font-semibold text-slate-800">Gemiddeld verschil per maand, na belasting en BTW (indicatief):</span>
              <span className="font-mono">
                {eur(data.gemiddeld.verschil)}{fis.perMaand ? ` − ${eur(fis.perMaand)} IB/Zvw` : ""}{fis.btwPerMaand ? (fis.btwPerMaand < 0 ? ` + ${eur(-fis.btwPerMaand)} BTW terug` : ` − ${eur(fis.btwPerMaand)} BTW`) : ""} = <b className={verschilNa < 0 ? "text-rose-700" : "text-emerald-700"}>{eur(verschilNa)}</b>
              </span>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            <b>Uitgaven via privérekening</b> = alle afschrijvingen op de privérekening(en), zonder overboekingen tussen eigen rekeningen en sparen. <b>Uitgaven via zakelijke rekening</b> = privé-categorieën en privé opnames (pin, geldautomaat, direct betaald) vanaf de zakelijke rekening, plus het privédeel van gemengde kosten volgens de percentages zakelijk/privé en soort ruimte, plus autokosten bij een privéauto (zoals in de aangifte). Overboekingen naar de eigen privérekening tellen niet mee: die staan al aan de privékant. * = niet alle rekeningen de hele maand geladen: uitgaven en verschil worden niet berekend (geen aanname) en de hele maand, ook het inkomen, telt niet mee in totaal en gemiddelde.{pv ? ' Loon, uitkering en overig = boekingen in de categorie "Inkomsten" op de privérekening.' : ""} Klik op een bedrag om de boekingen te zien.
          </p>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
