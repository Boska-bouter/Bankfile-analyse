import { Fragment, useMemo, useState } from "react";
import { X, Printer, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { berekenInkomenPerMaand } from "../../calc/inkomenPerMaand.js";
import KlantJaarKeuzeModal from "./KlantJaarKeuzeModal.jsx";
import DownloadKnop from "../shared/DownloadKnop.jsx";
import { downloadRapport } from "../../reports/download.js";

// release31V5 / 32V3 — "Inkomen per maand": omzet en privé-inkomen, privé-uitgaven via de privérekening én via de
// zakelijke rekening, en het verschil. Maanden waarin niet alles geladen is, worden niet berekend (geen aannames);
// totalen en gemiddelden gaan alleen over de volledige maanden. Daaronder: indicatieve IB/Zvw en BTW per kwartaal.
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const ROOD = "#e11d48", LICHTROOD = "#fda4af", ZAKGRIJS = "#94a3b8";

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

const berekenVerschilNa = (data, fis) => (fis && data.gemiddeld.verschil != null
  ? Math.round((data.gemiddeld.verschil - (fis.perMaand || 0) - (fis.btwPerMaand || 0)) * 100) / 100
  : null);

// V6R5 — jaren als tekst voor titel en bestandsnaam: "2025", "2023–2025" (aaneengesloten) of "2022, 2024".
const jarenTekst = (jaren, streep = "–") => {
  const j = [...jaren].sort((a, b) => a - b);
  const aaneen = j.every((x, i) => i === 0 || x === j[i - 1] + 1);
  return j.length > 1 && aaneen ? `${j[0]}${streep}${j[j.length - 1]}` : j.join(", ");
};
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// release32V8 — het gedownloade/geprinte document is gelijk aan het scherm: grafiek, tabel, belasting en BTW, verschil
// na belasting. A4 liggend. De details van privé-uitgaven via zakelijk staan er niet in (eigen download op die pagina).
// V6R5 — één sectie per jaar; bouwHtml zet de gekozen jaren in één document, elk jaar op een nieuwe pagina.
function bouwSectie({ data, jaar, klantNaam, fis, verschilNa }) {
  const isBV = data.isBV;
  const zk = !isBV && data.zakelijkInDossier; // release33V0 — kolom zakelijke kosten
  const af = zk && data.heeftAflossing; // release33V6 — kolom aflossing lease/leningen
  const kol = data.kolommen.filter((c) => !c.alleenInfo);
  const pv = data.heeftPriveInkomen;
  const td = (v, cls = "") => `<td class="r ${cls}">${v == null ? "—" : eur(v)}</td>`;

  // Grafiek (SVG), dezelfde opbouw als op het scherm.
  const W = 1000, H = 150, stap = W / 12, bw = stap * 0.4;
  const max = Math.max(1, ...data.maanden.map((m) => Math.max((isBV ? 0 : Math.max(0, m.omzetExcl)) + Math.max(0, m.prive), m.volledig ? Math.max(0, m.uitgaven) + Math.max(0, m.zakelijk) : 0)));
  const y = (v) => (H * Math.max(0, v)) / max;
  let svg = "";
  for (const m of data.maanden) {
    const x = m.maand * stap + stap * 0.08;
    const z = isBV ? 0 : Math.max(0, m.omzetExcl), p = Math.max(0, m.prive);
    const op = m.volledig ? 1 : 0.4;
    svg += `<rect x="${x}" y="${H - y(z)}" width="${bw}" height="${y(z)}" fill="#0d9488" opacity="${op}"/>`;
    if (p) svg += `<rect x="${x}" y="${H - y(z) - y(p)}" width="${bw}" height="${y(p)}" fill="#38bdf8" opacity="${op}"/>`;
    const x2 = x + bw + stap * 0.04;
    if (m.volledig) {
      svg += `<rect x="${x2}" y="${H - y(m.viaPrive)}" width="${bw}" height="${y(m.viaPrive)}" fill="${ROOD}"/>`;
      svg += `<rect x="${x2}" y="${H - y(m.viaPrive) - y(m.viaZak)}" width="${bw}" height="${y(m.viaZak)}" fill="${LICHTROOD}"/>`;
      if (zk) svg += `<rect x="${x2}" y="${H - y(m.viaPrive) - y(m.viaZak) - y(m.zakelijk)}" width="${bw}" height="${y(m.zakelijk)}" fill="${ZAKGRIJS}"/>`;
    } else {
      svg += `<text transform="translate(${x2 + bw / 2 + 3},${H - 3}) rotate(-90)" font-size="9" fill="#94a3b8">onbekend</text>`;
    }
    svg += `<text x="${m.maand * stap + stap / 2}" y="${H + 13}" font-size="10" fill="#64748b" text-anchor="middle">${KORT[m.maand]}</text>`;
  }
  svg = `<svg viewBox="0 0 ${W} ${H + 16}" width="100%" style="max-height:52mm"><line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#cbd5e1"/>${svg}</svg>`;
  const leg = (kleur, t) => `<span class="leg"><i style="background:${kleur}"></i>${t}</span>`;
  const legenda = `${isBV ? "" : leg("#0d9488", "Omzet excl. BTW")}${pv ? leg("#38bdf8", "Privé-inkomen") : ""}${leg(ROOD, "Privé-uitgaven via privérekening")}${leg(LICHTROOD, "Privé-uitgaven via zakelijke rekening")}${zk ? leg(ZAKGRIJS, af ? "Zakelijke kosten en aflossingen" : "Zakelijke kosten") : ""}<span class="leg grijs">Lichter = maand zonder volledige gegevens</span>`;

  const rij = (m) => m.volledig
    ? `<tr><td>${MAANDEN[m.maand]}</td>${kol.map((c) => td(m[c.key])).join("")}${pv ? td(m.prive) : ""}${td(m.totaal, "b")}${zk ? td(-m.zakKosten) : ""}${af ? td(-m.aflossing) : ""}${td(-m.viaPrive, "rood")}${td(-m.viaZak, "rood")}${td(-m.uitgaven, "rood b")}${td(m.verschil, `b ${m.verschil < 0 ? "rood" : "groen"}`)}</tr>`
    : `<tr class="onv"><td>${MAANDEN[m.maand]} <span class="ster">*</span></td>${kol.map((c) => td(m[c.key], "grijs")).join("")}${pv ? td(m.prive, "grijs") : ""}${td(m.totaal, "grijs")}<td colspan="${4 + (zk ? 1 : 0) + (af ? 1 : 0)}" class="c nb">kan niet worden bepaald: ${!m.priGeladen ? "privérekening" : "zakelijke rekening"} niet (volledig) geladen</td></tr>`;
  const voet = (label, o, cls) => `<tr class="${cls}"><td>${label}</td>${kol.map((c) => td(o[c.key])).join("")}${pv ? td(o.prive) : ""}${td(o.totaal)}${zk ? td(o.zakKosten == null ? null : -o.zakKosten) : ""}${af ? td(o.aflossing == null ? null : -o.aflossing) : ""}${td(o.viaPrive == null ? null : -o.viaPrive, "rood")}${td(o.viaZak == null ? null : -o.viaZak, "rood")}${td(o.uitgaven == null ? null : -o.uitgaven, "rood")}${td(o.verschil)}</tr>`;
  const nVol = data.aantalVolledig;
  const onvolledig = data.maanden.filter((m) => !m.volledig).map((m) => m.maand);

  const btwTxt = (v) => `<span class="${v < 0 ? "groen" : "rood"}">${eur(Math.abs(v))} ${v < 0 ? "terug" : "te betalen"}</span>`;
  const f = fis;
  const ibBlok = !f ? "" : f.isBV ? `<p class="grijs">BV: de BV betaalt vennootschapsbelasting; die staat niet in dit overzicht.</p>`
    : f.ibZvw == null ? `<p class="grijs">Geen indicatie beschikbaar voor dit jaar.</p>`
    : `<table class="klein"><tr><td>IB ná heffingskorting</td>${td(f.ib)}</tr><tr><td>Zvw-bijdrage</td>${td(f.zvw)}</tr><tr class="grijs"><td>Al betaald in ${jaar} via de bank (IB/Zvw)</td>${td(f.betaald)}</tr><tr class="streep b"><td>Nog te betalen</td>${td(f.nog, "rood")}</tr><tr><td>Per maand opzij te zetten</td>${td(f.perMaand)}</tr></table>`;
  const btwBlok = !f ? "" : (f.kor || !f.btw) ? `<p class="grijs">${f.kor ? "KOR: er wordt geen BTW afgedragen." : "Geen BTW-gegevens voor dit jaar."}</p>`
    : `<table class="klein">${f.btw.map((v, i) => `<tr><td>Q${i + 1}</td><td class="r">${btwTxt(v)}</td></tr>`).join("")}<tr class="streep b"><td>Jaar</td><td class="r">${btwTxt(f.btwJaar)}</td></tr><tr><td>Gemiddeld per maand</td><td class="r">${eur(Math.abs(f.btwPerMaand))} ${f.btwPerMaand < 0 ? "terug" : "te betalen"}</td></tr></table>`;
  const naRegel = verschilNa == null ? "" : `<div class="kader na"><b>Gemiddeld verschil per maand, na belasting en BTW (indicatief):</b> ${eur(data.gemiddeld.verschil)}${f.perMaand ? ` − ${eur(f.perMaand)} IB/Zvw` : ""}${f.btwPerMaand ? (f.btwPerMaand < 0 ? ` + ${eur(-f.btwPerMaand)} BTW terug` : ` − ${eur(f.btwPerMaand)} BTW`) : ""} = <b class="${verschilNa < 0 ? "rood" : "groen"}">${eur(verschilNa)}</b></div>`;

  return `<section class="jaar">
<h1>Inkomen per maand ${jaar}</h1>
<div class="sub">${klantNaam ? `${esc(klantNaam)} · ` : ""}indicatief overzicht · gemaakt op ${new Date().toLocaleDateString("nl-NL")}</div>
${svg}
<div style="margin:4px 0 12px">${legenda}</div>
<table><thead><tr><th>Maand</th>${kol.map((c) => `<th>${c.label}</th>`).join("")}${pv ? "<th>Privé totaal</th>" : ""}<th>${isBV ? "Inkomen huishouden" : "Totaal inkomen"}</th>${zk ? "<th>Zakelijke kosten<br>excl. BTW</th>" : ""}${af ? "<th>Aflossing<br>lease/leningen</th>" : ""}<th class="rood">Uitgaven via<br>privérekening</th><th class="rood">Uitgaven via<br>zakelijke rekening</th><th class="rood">Totaal<br>privé-uitgaven</th><th>Verschil</th></tr></thead>
<tbody>${data.maanden.map(rij).join("")}</tbody>
<tfoot>${voet(`Totaal ${nVol} volledige maand${nVol === 1 ? "" : "en"}${nVol > 0 && nVol < 12 ? ` (${bereik(data.volledigeMaanden)})` : ""}`, data.totalen, "tot")}${voet("Gemiddeld per maand", data.gemiddeld, "gem")}</tfoot></table>
${onvolledig.length ? `<p class="info">Ter informatie: omzet excl. BTW over het hele jaar (ook ${bereik(onvolledig)}) ${eur(data.omzetJaar.excl)}. Die wordt niet met de uitgaven vergeleken, omdat de uitgaven van die maanden niet bekend zijn.</p>` : ""}
${data.zakVanPrive ? `<p class="info">${zk ? "Waarvan" : "Zakelijke kosten"} betaald vanaf de privérekening (bijv. autokosten bij een lease- of zaakauto, het zakelijke deel van huur): ${eur(data.zakVanPrive)} in de volledige maanden. ${zk ? "Die staan bij de zakelijke kosten, niet bij de privé-uitgaven" : "Die tellen niet als privé-uitgave"}, net als in de aangifte.</p>` : ""}
${f ? `<div class="blokken"><div class="kader"><h3>Inkomstenbelasting en Zvw ${jaar} <span>(indicatief)</span></h3>${ibBlok}</div><div class="kader"><h3>BTW per kwartaal ${jaar}</h3>${btwBlok}</div></div>` : ""}
${naRegel}
<p class="noot">${zk ? `<b>Zakelijke kosten</b> = kosten excl. BTW, voor het zakelijke deel zoals in de aangifte (ook als ze vanaf privé zijn betaald), investeringen tellen mee in de maand van betaling.${af ? ' <b>Aflossing lease/leningen</b> = termijnen financiële lease en aflossingen op zakelijke leningen: geen kosten, wel geld dat niet voor het huishouden beschikbaar is.' : ""} <b>Verschil</b> = totaal inkomen − zakelijke kosten${af ? ' − aflossingen' : ''} − privé-uitgaven. ` : ""}<b>Uitgaven via privérekening</b> = alle afschrijvingen op de privérekening(en), zonder overboekingen tussen eigen rekeningen en sparen. <b>Uitgaven via zakelijke rekening</b> = privé-categorieën en privé opnames (pin, geldautomaat, direct betaald) vanaf de zakelijke rekening, plus het privédeel van gemengde kosten volgens de percentages zakelijk/privé en soort ruimte, plus autokosten bij een privéauto (zoals in de aangifte). Overboekingen naar de eigen privérekening tellen niet mee: die staan al aan de privékant. * = niet alle rekeningen de hele maand geladen: uitgaven en verschil worden niet berekend (geen aanname) en de hele maand, ook het inkomen, telt niet mee in totaal en gemiddelde. Belasting en BTW zijn een indicatie.</p>
</section>`;
}

function bouwHtml(secties, jaren, klantNaam) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inkomen per maand ${jarenTekst(jaren)}${klantNaam ? ` — ${esc(klantNaam)}` : ""}</title>
<style>
@page{size:A4 landscape;margin:10mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:-apple-system,"Segoe UI",Arial,Helvetica,sans-serif;color:#1e293b;margin:0 auto;padding:24px 28px;font-size:11px;line-height:1.35;max-width:1100px;background:#fff}
h1{font-size:19px;margin:0 0 2px}.sub{color:#64748b;margin-bottom:12px}
.leg{display:inline-flex;align-items:center;gap:4px;margin-right:14px;font-size:10px;color:#475569}.leg i{display:inline-block;width:9px;height:9px;border-radius:2px}
table{border-collapse:collapse;width:100%}th{font-weight:600;color:#64748b;font-size:10px;text-align:right;padding:5px 6px;border-bottom:1px solid #e2e8f0;vertical-align:bottom}th:first-child{text-align:left}
td{padding:3px 6px;border-bottom:1px solid #f1f5f9;font-variant-numeric:tabular-nums}.r{text-align:right;white-space:nowrap}.c{text-align:center}
.b{font-weight:700}.rood{color:#be123c}.groen{color:#047857}.grijs{color:#94a3b8}.nb{font-style:italic;color:#64748b;font-size:10px}.ster{color:#d97706}
tr.onv td{background:#f8fafc}th.rood{color:#be123c}
tr.tot td{border-top:2px solid #cbd5e1;font-weight:700}tr.gem td{font-weight:700;color:#134e4a;border-bottom:0}
.info{color:#64748b;font-size:10px;margin:6px 0 12px}
.blokken{display:flex;gap:12px;margin-top:6px}.kader{border:1px solid #e2e8f0;border-radius:8px;padding:9px 11px;flex:1;break-inside:avoid}.kader h3{font-size:12px;margin:0 0 6px}.kader h3 span{font-weight:400;color:#64748b}
table.klein td{border:0;padding:2px 0}table.klein tr.streep td{border-top:1px solid #e2e8f0;padding-top:4px}
.na{margin-top:10px;background:#f8fafc}
.noot{color:#64748b;font-size:9.5px;margin-top:12px}
section.jaar+section.jaar{break-before:page;page-break-before:always;margin-top:32px}
@media print{body{padding:0;max-width:none}section.jaar+section.jaar{margin-top:0}}
</style></head><body>
${secties.join("\n")}
</body></html>`;
}

function DetailPagina({ data, jaar, klantNaam, onTerug, onPrint }) {
  const [open, setOpen] = useState(null);
  const nV = data.aantalVolledig;
  const periodeTekst = nV === 12 ? `heel ${jaar}` : `${nV} volledige maand${nV === 1 ? "" : "en"}${nV ? ` (${bereik(data.volledigeMaanden)} ${jaar})` : ""}`;
  const naarExcel = async () => {
    const XLSX = await import("xlsx");
    const rijen = [["Soort", "Datum", "Tegenpartij", "Categorie", "Bedrag", "Privédeel"]];
    for (const s of data.soorten) for (const b of s.boekingen) rijen.push([s.soort, b.tx.date.toLocaleDateString("nl-NL"), b.tx.counterparty || b.tx.description, b.tx.category, b.tx.amount, -b.bedrag]);
    rijen.push(["Totaal", "", "", "", "", -data.soortenTotaal]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rijen), `Privé via zakelijk ${jaar}`);
    XLSX.writeFile(wb, `Privé-uitgaven via zakelijk ${jaar}${klantNaam ? ` ${klantNaam}` : ""}.xlsx`);
  };
  const html = () => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Privé-uitgaven via zakelijke rekening ${jaar}</title><style>body{font-family:system-ui,sans-serif;font-size:12px;margin:24px}td{padding:4px 8px}</style></head><body><h2>Privé-uitgaven via zakelijke rekening ${jaar}${klantNaam ? ` — ${klantNaam}` : ""}</h2><p>Over ${periodeTekst}, dezelfde maanden als in Inkomen per maand.</p><table>${data.soorten.map((s) => `<tr><td>${s.soort}</td><td style="text-align:right">${eur(-s.bedrag)}</td></tr>`).join("")}<tr><td><b>Totaal</b></td><td style="text-align:right"><b>${eur(-data.soortenTotaal)}</b></td></tr></table></body></html>`;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <button type="button" onClick={onTerug} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 hover:text-teal-800">
          <ArrowLeft className="h-4 w-4" /> Inkomen per maand · Privé-uitgaven via zakelijke rekening {jaar}
        </button>
        <div className="flex gap-2">
          {/* V8R5 — één knop: PDF, Excel (eigen export met de boekingen) of HTML */}
          <DownloadKnop onKies={(soort) => downloadRapport({ soort, html, naam: `Privé-uitgaven via zakelijk ${jaar}${klantNaam ? ` ${klantNaam}` : ""}`, excel: naarExcel })} />
          {onPrint && <button type="button" onClick={() => onPrint(html())} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"><Printer className="h-4 w-4" /> Printen</button>}
        </div>
      </div>
      <div className="overflow-y-auto p-4">
        <p className="text-xs text-slate-500 mb-3">Percentages zoals in de aangifte (soort ruimte, % zakelijk/privé, privéauto). Overboekingen naar de eigen privérekening staan hier niet: die tellen aan de privékant. Over {periodeTekst}, dezelfde maanden als in de tabel{data.soortenBuiten ? <> (de maanden zonder volledige gegevens, samen {eur(-data.soortenBuiten)}, tellen niet mee)</> : ""}. Klik op een regel om de boekingen te zien.</p>
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
              <span>Totaal via zakelijke rekening, {periodeTekst}</span><span className="font-mono text-rose-800">{eur(-data.soortenTotaal)}</span>
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
  const [uitgeklapt, setUitgeklapt] = useState(() => new Set());
  const [alleOpen, setAlleOpen] = useState(false);
  // V6R5 — jaarkeuze voor Downloaden en Printen: { soort: "pdf" | "html" | "excel" | "print" }; standaard het getoonde jaar.
  const [exportKeuze, setExportKeuze] = useState(null);
  const [exportJaren, setExportJaren] = useState([]);
  const wisselMaand = (mnd) => setUitgeklapt((v) => { const n = new Set(v); if (n.has(mnd)) n.delete(mnd); else n.add(mnd); return n; });
  const ibansKey = eigenPriveIbans.join("|");
  const data = useMemo(
    () => berekenInkomenPerMaand({ classified, jaar, categoryBtwRates, btwVerlegd, periodeZak, periodePri, isBV, percentages, autoStatus, heeftLeaseAuto, eigenPriveIbans }),
    [classified, jaar, categoryBtwRates, btwVerlegd, periodeZak, periodePri, isBV, percentages, autoStatus, heeftLeaseAuto, ibansKey] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const fis = useMemo(() => fiscaalBlok(fiscaalVoorJaar ? fiscaalVoorJaar(jaar) : null), [fiscaalVoorJaar, jaar]); // eslint-disable-line react-hooks/exhaustive-deps
  // V6R5 — gegevens per jaar voor de export van meerdere jaren (het getoonde jaar is al berekend).
  const overzicht = (j) => {
    if (j === jaar) return { data, jaar: j, fis, verschilNa: berekenVerschilNa(data, fis) };
    const d = berekenInkomenPerMaand({ classified, jaar: j, categoryBtwRates, btwVerlegd, periodeZak, periodePri, isBV, percentages, autoStatus, heeftLeaseAuto, eigenPriveIbans });
    const f = fiscaalBlok(fiscaalVoorJaar ? fiscaalVoorJaar(j) : null);
    return { data: d, jaar: j, fis: f, verschilNa: berekenVerschilNa(d, f) };
  };
  const kol = data.kolommen.filter((c) => !c.alleenInfo); // omzet incl. BTW alleen in de Excel-export
  const zk = !isBV && data.zakelijkInDossier; // release33V0 — kolom zakelijke kosten
  const pv = data.heeftPriveInkomen;
  const max = Math.max(1, ...data.maanden.map((m) => Math.max((isBV ? 0 : Math.max(0, m.omzetExcl)) + Math.max(0, m.prive), m.volledig ? Math.max(0, m.uitgaven) + Math.max(0, m.zakelijk) : 0)));
  const openBoekingen = open ? (data.maanden[open.maand].boekingen[open.key] || []).slice().sort((a, b) => a.date - b.date) : [];
  const LABELS = { totaal: "Inkomen", zakelijk: "Zakelijk (kosten + aflossing)", aflossing: "Aflossing lease / leningen", zakKosten: "Zakelijke kosten excl. BTW", viaPrive: "Uitgaven via privérekening", viaZak: "Uitgaven via zakelijke rekening", uitgaven: "Totaal privé-uitgaven" };
  const openLabel = open ? (LABELS[open.key] || kol.find((c) => c.key === open.key)?.label || "") : "";
  const nVol = data.aantalVolledig;
  const onvolledig = data.maanden.filter((m) => !m.volledig).map((m) => m.maand);
  const verschilNa = berekenVerschilNa(data, fis);

  const naarExcel = async (jaren) => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    for (const { data, jaar, fis, verschilNa } of jaren.map(overzicht)) {
      const zk = !isBV && data.zakelijkInDossier;
      const pv = data.heeftPriveInkomen;
      const nVol = data.aantalVolledig;
      const alle = data.kolommen; // in Excel ook omzet incl. BTW
      const kop = ["Maand", ...alle.map((c) => c.label), ...(pv ? ["Privé totaal"] : []), isBV ? "Inkomen huishouden" : "Totaal inkomen", ...(zk ? ["Zakelijke kosten excl. BTW"] : []), ...(zk && data.heeftAflossing ? ["Aflossing lease/leningen"] : []), "Uitgaven via privérekening", "Uitgaven via zakelijke rekening", "Totaal privé-uitgaven", "Verschil", "Volledige gegevens"];
      const regel = (label, o, vol, nb) => [label, ...alle.map((c) => o[c.key]), ...(pv ? [o.prive] : []), o.totaal, ...(nb ? ["niet te bepalen", "", "", "", ...(zk ? [""] : []), ...(zk && data.heeftAflossing ? [""] : [])] : [...(zk ? [-o.zakKosten] : []), ...(zk && data.heeftAflossing ? [-o.aflossing] : []), -o.viaPrive, -o.viaZak, -o.uitgaven, o.verschil]), vol];
      const rijen = data.maanden.map((m) => regel(MAANDEN[m.maand], m, m.volledig ? "ja" : "nee", !m.volledig));
      rijen.push(regel(`Totaal ${nVol} volledige maanden`, data.totalen, ""));
      if (nVol) rijen.push(regel("Gemiddeld per maand", data.gemiddeld, ""));
      rijen.push(["Omzet excl. BTW hele jaar (ter informatie)", data.omzetJaar.excl]);
      // release32V5 — ook de belasting- en BTW-indicatie en het verschil na belasting in de download.
      if (fis) {
        rijen.push([], [`Inkomstenbelasting en Zvw ${jaar} (indicatief)`]);
        if (fis.isBV) rijen.push(["BV: de BV betaalt vennootschapsbelasting; die staat niet in dit overzicht."]);
        else if (fis.ibZvw == null) rijen.push(["Geen indicatie beschikbaar voor dit jaar."]);
        else rijen.push(["IB ná heffingskorting", fis.ib], ["Zvw-bijdrage", fis.zvw], [`Al betaald in ${jaar} via de bank (IB/Zvw)`, fis.betaald], ["Nog te betalen", fis.nog], ["Per maand opzij te zetten", fis.perMaand]);
        rijen.push([], [`BTW per kwartaal ${jaar} (positief = te betalen, negatief = terug)`]);
        if (fis.kor || !fis.btw) rijen.push([fis.kor ? "KOR: er wordt geen BTW afgedragen." : "Geen BTW-gegevens voor dit jaar."]);
        else rijen.push(...fis.btw.map((v, i) => [`Q${i + 1}`, v]), ["Jaar", fis.btwJaar], ["Gemiddeld per maand", fis.btwPerMaand]);
        if (verschilNa != null) rijen.push([], ["Gemiddeld verschil per maand, na belasting en BTW (indicatief)", verschilNa]);
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([kop, ...rijen]), `Inkomen ${jaar}`);
      if (data.soorten.length) {
        const det = [[`Privé-uitgaven via zakelijke rekening (${data.aantalVolledig} volledige maanden)`, "Aantal", "Bedrag"], ...data.soorten.map((x) => [x.soort, x.boekingen.length, -x.bedrag]), ["Totaal", "", -data.soortenTotaal]];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(det), jaren.length > 1 ? `Privé via zakelijk ${jaar}` : "Privé via zakelijk");
      }
    }
    XLSX.writeFile(wb, `Inkomen per maand ${jarenTekst(jaren, "-")}${klantNaam ? ` ${klantNaam}` : ""}.xlsx`);
  };

  const html = (jaren) => bouwHtml(jaren.map((j) => bouwSectie({ ...overzicht(j), klantNaam })), jaren, klantNaam);
  const voerUit = (soort, jaren) => {
    const j = [...jaren].sort((x, y) => x - y);
    const naam = `Inkomen per maand ${jarenTekst(j, "-")}${klantNaam ? ` ${klantNaam}` : ""}`;
    if (soort === "pdf" || soort === "html") return downloadRapport({ soort, html: html(j), naam });
    if (soort === "excel") return naarExcel(j);
    if (soort === "print" && onPrint) onPrint(html(j));
  };
  // Eén jaar in het dossier: meteen uitvoeren. Meer jaren: eerst kiezen (het getoonde jaar staat aan).
  const exporteer = (soort) => {
    if (years.length <= 1) return voerUit(soort, [jaar]);
    setExportJaren([jaar]);
    setExportKeuze({ soort });
  };
  const EXPORT_TEKST = { pdf: ["als PDF downloaden", "PDF maken"], html: ["als HTML downloaden", "HTML maken"], excel: ["naar Excel exporteren", "Excel maken"], print: ["printen", "Printen"] };

  const Regel = ({ label, m, k, neg = false }) => {
    const v = m[k] || 0;
    const n = (m.boekingen[k] || []).length;
    const actief = open && open.maand === m.maand && open.key === k;
    return (
      <p className="flex justify-between gap-3 py-0.5">
        <span className="text-slate-600">{label}</span>
        {n > 0 ? (
          <button type="button" onClick={() => setOpen(actief ? null : { maand: m.maand, key: k })} className={`font-mono underline decoration-dotted hover:text-teal-800 ${actief ? "font-semibold text-teal-800" : ""}`}>{eur(neg ? -v : v)}</button>
        ) : <span className="font-mono text-slate-300">{eur(0)}</span>}
      </p>
    );
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
        {exportKeuze && (
          <KlantJaarKeuzeModal
            years={years}
            selected={exportJaren}
            setSelected={setExportJaren}
            vraag={`Welke jaren wil je ${EXPORT_TEKST[exportKeuze.soort][0]}? ${exportKeuze.soort === "excel" ? "Elk jaar krijgt een eigen tabblad." : "Elk jaar begint op een nieuwe pagina."}`}
            knop={EXPORT_TEKST[exportKeuze.soort][1]}
            onOpen={(jaren) => { const soort = exportKeuze.soort; setExportKeuze(null); voerUit(soort, jaren); }}
            onClose={() => setExportKeuze(null)}
          />
        )}
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
            {/* V8R5 — één knop: PDF, Excel of HTML; bij meer jaren eerst de jaarkeuze */}
            <DownloadKnop onKies={exporteer} />
            {onPrint && <button type="button" onClick={() => exporteer("print")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"><Printer className="h-4 w-4" /> Printen</button>}
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
                        {zk && <div className="w-full rounded-t-sm" style={{ background: ZAKGRIJS, height: `${(100 * Math.max(0, m.zakelijk)) / max}%` }} />}
                        <div className={`w-full ${zk ? "" : "rounded-t-sm"}`} style={{ background: LICHTROOD, height: `${(100 * Math.max(0, m.viaZak)) / max}%` }} />
                        <div className="w-full" style={{ background: ROOD, height: `${(100 * Math.max(0, m.viaPrive)) / max}%` }} />
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
              {zk && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ZAKGRIJS }} /> Zakelijke kosten{data.heeftAflossing ? " en aflossingen" : ""}</span>}
              <span className="text-slate-400">Lichter = maand zonder volledige gegevens</span>
            </div>
          </div>

          {!data.priveInDossier && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">Er is geen privérekening geladen: privé-uitgaven en het verschil kunnen voor geen enkele maand worden bepaald.</p>
          )}

          <div className="overflow-x-auto">
            {/* release33V6 — compacte tabel (5 kolommen); tik op een maand voor de uitsplitsing. */}
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-1.5 text-left font-medium">Maand</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-slate-700">{isBV ? "Inkomen huishouden" : "Inkomen"}</th>
                  {zk && <th className="px-2 py-1.5 text-right font-medium text-slate-600">Zakelijk<br /><span className="font-normal">{data.heeftAflossing ? "(kosten + aflossing)" : "(kosten excl. BTW)"}</span></th>}
                  <th className="px-2 py-1.5 text-right font-semibold text-rose-700">Privé-uitgaven</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-slate-700">Verschil</th>
                </tr>
              </thead>
              <tbody>
                {data.maanden.map((m) => {
                  const isOpen = alleOpen || uitgeklapt.has(m.maand);
                  return (
                    <Fragment key={m.maand}>
                      <tr className={`border-b border-slate-50 ${isOpen ? "bg-teal-50/60" : m.volledig ? "" : "bg-slate-50/70"}`}>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => wisselMaand(m.maand)} className="inline-flex items-center gap-1 text-left hover:text-teal-800">
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                            <span className={isOpen ? "font-semibold" : ""}>{MAANDEN[m.maand]}</span>{!m.volledig && <span className="text-amber-600">*</span>}
                          </button>
                        </td>
                        <Bedrag m={m} k="totaal" cls={m.volledig ? "font-semibold" : "text-slate-400"} />
                        {m.volledig ? (
                          <>
                            {zk && <Bedrag m={m} k="zakelijk" neg cls="text-slate-600" />}
                            <Bedrag m={m} k="uitgaven" neg cls="text-rose-700" />
                            <td className={`px-2 py-1.5 text-right font-mono font-semibold ${m.verschil < 0 ? "text-rose-700" : "text-emerald-700"}`}>{eur(m.verschil)}</td>
                          </>
                        ) : (
                          <td colSpan={zk ? 3 : 2} className="px-2 py-1.5 text-center text-[11px] italic text-slate-500">kan niet worden bepaald: {!m.priGeladen ? "privérekening" : "zakelijke rekening"} niet (volledig) geladen</td>
                        )}
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <td colSpan={zk ? 5 : 4} className="px-3 py-2">
                            <div className={`grid gap-4 text-xs ${zk ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                              <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">Inkomen</p>
                                {kol.map((c) => <Regel key={c.key} label={c.label} m={m} k={c.key} />)}
                                {kol.length === 0 && <p className="text-slate-400">Geen inkomen</p>}
                              </div>
                              {zk && (
                                <div>
                                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">Zakelijk</p>
                                  {m.volledig ? <>
                                    <Regel label="Kosten excl. BTW" m={m} k="zakKosten" neg />
                                    {data.heeftAflossing && <Regel label="Aflossing lease / leningen" m={m} k="aflossing" neg />}
                                  </> : <p className="italic text-slate-400">niet te bepalen</p>}
                                </div>
                              )}
                              <div>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">Privé-uitgaven</p>
                                {m.volledig ? <>
                                  <Regel label="Via privérekening" m={m} k="viaPrive" neg />
                                  <Regel label="Via zakelijke rekening" m={m} k="viaZak" neg />
                                </> : <p className="italic text-slate-400">niet te bepalen</p>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold">
                {[["tot", `Totaal ${nVol} volledige maand${nVol === 1 ? "" : "en"}${nVol > 0 && nVol < 12 ? ` (${bereik(data.volledigeMaanden)})` : ""}`, data.totalen], ["gem", "Gemiddeld per maand", data.gemiddeld]].map(([sleutel, label, o]) => (
                  <tr key={sleutel} className={sleutel === "gem" ? "text-teal-900" : ""}>
                    <td className="px-2 py-1.5">{label}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{o.totaal == null ? "—" : eur(o.totaal)}</td>
                    {zk && <td className="px-2 py-1.5 text-right font-mono text-slate-600">{o.zakelijk == null ? "—" : eur(-o.zakelijk)}</td>}
                    <td className="px-2 py-1.5 text-right font-mono text-rose-700">{o.uitgaven == null ? "—" : eur(-o.uitgaven)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{o.verschil == null ? "—" : eur(o.verschil)}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={alleOpen} onChange={(e) => setAlleOpen(e.target.checked)} /> Alle maanden uitgesplitst tonen
            </label>
            {onvolledig.length > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-500">Ter informatie: omzet excl. BTW over het hele jaar (ook {bereik(onvolledig)}) {eur(data.omzetJaar.excl)}. Die wordt niet met de uitgaven vergeleken, omdat de uitgaven van die maanden niet bekend zijn.</p>
            )}
          </div>

          {data.zakVanPrive !== 0 && (
            <p className="-mt-2 text-[11px] text-slate-500">{zk ? "Waarvan" : "Zakelijke kosten"} betaald vanaf de privérekening (bijv. autokosten bij een lease- of zaakauto, het zakelijke deel van huur): {eur(data.zakVanPrive)} in de {nVol} volledige maand{nVol === 1 ? "" : "en"}. {zk ? "Die staan bij de zakelijke kosten, niet bij de privé-uitgaven" : "Die tellen niet als privé-uitgave"}, net als in de aangifte.</p>
          )}

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
            {zk && <><b>Zakelijke kosten</b> = kosten excl. BTW, voor het zakelijke deel zoals in de aangifte (ook als ze vanaf privé zijn betaald), investeringen tellen mee in de maand van betaling.{data.heeftAflossing && <> <b>Aflossing lease/leningen</b> = termijnen financiële lease en aflossingen op zakelijke leningen: geen kosten, wel geld dat niet voor het huishouden beschikbaar is.</>} <b>Verschil</b> = inkomen − zakelijk − privé-uitgaven. Tik op een maand voor de uitsplitsing. </>}
            <b>Uitgaven via privérekening</b> = alle afschrijvingen op de privérekening(en), zonder overboekingen tussen eigen rekeningen en sparen. <b>Uitgaven via zakelijke rekening</b> = privé-categorieën en privé opnames (pin, geldautomaat, direct betaald) vanaf de zakelijke rekening, plus het privédeel van gemengde kosten volgens de percentages zakelijk/privé en soort ruimte, plus autokosten bij een privéauto (zoals in de aangifte). Overboekingen naar de eigen privérekening tellen niet mee: die staan al aan de privékant. * = niet alle rekeningen de hele maand geladen: uitgaven en verschil worden niet berekend (geen aanname) en de hele maand, ook het inkomen, telt niet mee in totaal en gemiddelde.{pv ? ' Loon, uitkering en overig = boekingen in de categorie "Inkomsten" op de privérekening.' : ""} Klik op een bedrag om de boekingen te zien.
          </p>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
