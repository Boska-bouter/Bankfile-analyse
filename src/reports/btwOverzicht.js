import { eur } from "../utils/amounts.js";
import { jarenBereik } from "../dossier/dossierProfiel.js";
import { downloadRapport } from "./download.js";

// Los document: BTW-aangifte per kwartaal (OB) voor één of meer jaren. Dezelfde cijfers als in het venster
// "BTW-aangifte per kwartaal" (tax/btw.js, inclusief de btw-correctie privégebruik auto in Q4); alleen de
// opmaak is anders. De omzet- en kostenbedragen staan netto (excl. BTW), het bruto bankbedrag eronder.
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const saldoVan = (q) => q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0);
const saldoTekst = (s) => `${eur(Math.abs(s))} ${s >= 0 ? "te betalen" : "terug"}`;

function jaarBlok({ year, quarters }, kwartaalStatus) {
  if (!quarters || quarters.length === 0) return `<h2 class="jaar">${esc(year)}</h2><p>Geen BTW-gegevens voor dit jaar.</p>`;
  const heeftPriveAuto = quarters.some((q) => (q.btwPrivegebruikAuto || 0) > 0.004);
  const heeftVerlegd = quarters.some((q) => Math.abs(q.omzetBrutoVerlegd || 0) > 0.004);
  const heeftNul = quarters.some((q) => Math.abs(q.omzetBruto0 || 0) > 0.004);
  const bruto = (b) => `<div class="klein">(${eur(b)} bruto)</div>`;
  const rijen = quarters.map((q) => {
    const st = kwartaalStatus?.[`${q.year}-Q${q.kwartaal}`] || {};
    const status = [st.aangegeven ? "aangegeven" : "niet aangegeven", st.betaald ? "betaald" : "niet betaald"].join(", ");
    return `<tr><td>Q${q.kwartaal}</td>
<td class="num">${eur(q.omzetBruto21 - q.verschuldigdBtw21)}${bruto(q.omzetBruto21)}</td><td class="num">${eur(q.verschuldigdBtw21)}</td>
<td class="num">${eur(q.omzetBruto9 - q.verschuldigdBtw9)}${bruto(q.omzetBruto9)}</td><td class="num">${eur(q.verschuldigdBtw9)}</td>
${heeftVerlegd ? `<td class="num">${eur(q.omzetBrutoVerlegd)}</td>` : ""}${heeftNul ? `<td class="num">${eur(q.omzetBruto0)}</td>` : ""}
<td class="num">${eur(q.kostenBruto - q.voorbelasting)}${bruto(q.kostenBruto)}</td><td class="num">${eur(q.voorbelasting)}</td>
${heeftPriveAuto ? `<td class="num">${q.btwPrivegebruikAuto > 0.004 ? `+ ${eur(q.btwPrivegebruikAuto)}` : ""}</td>` : ""}
<td class="num sterk">${saldoTekst(saldoVan(q))}</td><td class="st">${status}</td></tr>`;
  }).join("");
  const som = (f) => quarters.reduce((a, q) => a + f(q), 0);
  const totaal = som(saldoVan);
  const totaalRij = `<tr class="tot"><td>Jaar ${esc(year)}</td>
<td class="num">${eur(som((q) => q.omzetBruto21 - q.verschuldigdBtw21))}</td><td class="num">${eur(som((q) => q.verschuldigdBtw21))}</td>
<td class="num">${eur(som((q) => q.omzetBruto9 - q.verschuldigdBtw9))}</td><td class="num">${eur(som((q) => q.verschuldigdBtw9))}</td>
${heeftVerlegd ? `<td class="num">${eur(som((q) => q.omzetBrutoVerlegd || 0))}</td>` : ""}${heeftNul ? `<td class="num">${eur(som((q) => q.omzetBruto0 || 0))}</td>` : ""}
<td class="num">${eur(som((q) => q.kostenBruto - q.voorbelasting))}</td><td class="num">${eur(som((q) => q.voorbelasting))}</td>
${heeftPriveAuto ? `<td class="num">${eur(som((q) => q.btwPrivegebruikAuto || 0))}</td>` : ""}
<td class="num">${saldoTekst(totaal)}</td><td></td></tr>`;
  const detail = quarters.map((q) => q.btwPrivegebruikAutoDetail).find(Boolean);
  const detailHtml = detail
    ? `<div class="auto"><strong>${detail.bedrag > 0.004 ? `Btw privégebruik auto: ${eur(detail.bedrag)} in het saldo van ${esc(year)} — Q4 (rubriek 1d)` : `Btw privégebruik auto ${esc(year)}: nog niet berekend — gegevens ontbreken`}</strong>${detail.items.map((i) =>
        `<br>${esc(i.naam)}: ${i.methode === "forfait"
          ? `forfait ${String(i.pct).replace(".", ",")}%${i.fractie < 1 ? ` × ${Math.round(i.fractie * 12)}/12` : ""} van catalogusprijs ${eur(i.catalogus)}${i.afgetopt ? `, afgetopt op het maximum van ${eur(i.maximum)}` : ""}`
          : `werkelijk privégebruik ${i.pct}%`} = ${eur(i.bedrag)}${i.meldingen?.length ? ` — ${esc(i.meldingen.join(" "))}` : ""}`).join("")}</div>`
    : "";
  return `<h2 class="jaar">${esc(year)}</h2>
<table><thead><tr><th>Kwartaal</th><th class="num">Omzet 21%</th><th class="num">BTW 21% (1a)</th><th class="num">Omzet 9%</th><th class="num">BTW 9% (1b)</th>${heeftVerlegd ? '<th class="num">Omzet verlegd (1e)</th>' : ""}${heeftNul ? '<th class="num">Omzet 0%/vrijgesteld</th>' : ""}<th class="num">Uitgaven (netto)</th><th class="num">Voorbelasting (5b)</th>${heeftPriveAuto ? '<th class="num">Privégebruik auto (1d)</th>' : ""}<th class="num">Saldo</th><th>Status</th></tr></thead>
<tbody>${rijen}${totaalRij}</tbody></table>${detailHtml}`;
}

// jaren: [{ year, quarters }] — quarters zoals computeQuarterlyBtwForYear ze levert.
export function buildBtwOverzichtHtml({ klantNaam, jaren, kwartaalStatus, vandaag = new Date() }) {
  const titel = jarenBereik(jaren.map((j) => j.year));
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>BTW-aangifte per kwartaal ${esc(titel)}${klantNaam ? ` — ${esc(klantNaam)}` : ""}</title>
<style>
@page{size:A4 landscape;margin:12mm}
*{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:0;padding:28px 36px;font-size:11px;line-height:1.35}
h1{font-size:20px;margin:0 0 2px} .sub{color:#64748b;margin-bottom:10px} h2.jaar{font-size:16px;border-bottom:2px solid #0f172a;padding-bottom:3px;margin:24px 0 8px;break-after:avoid}
table{width:100%;border-collapse:collapse;margin-bottom:8px} th{background:#f1f5f9;text-align:left;padding:4px 6px;font-size:10px;vertical-align:bottom}
td{padding:4px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top} .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.klein{color:#94a3b8;font-size:9px} .sterk{font-weight:bold} .st{font-size:10px;color:#64748b} tr.tot td{font-weight:bold;border-top:2px solid #94a3b8;border-bottom:none}
.auto{background:#fffbeb;border:1px solid #fcd34d;color:#78350f;border-radius:6px;padding:6px 8px;font-size:10px;margin:6px 0} .noot{color:#64748b;font-size:10px;margin:8px 0} tr{break-inside:avoid} @media print{body{padding:0}}
</style></head><body>
<h1>BTW-aangifte per kwartaal ${esc(titel)}</h1>
<div class="sub">${klantNaam ? `${esc(klantNaam)} · ` : ""}opgesteld ${vandaag.toLocaleDateString("nl-NL")}</div>
<p class="noot">Indicatief overzicht op basis van de banktransacties. Omzet en uitgaven staan netto (excl. BTW), het bruto bankbedrag eronder. Vergelijk het saldo per kwartaal met wat er daadwerkelijk is aangegeven en betaald; een verschil betekent niet automatisch een fout. "Aangegeven"/"betaald" is alleen een statusherinnering en verandert de bedragen niet.</p>
${jaren.map((j) => jaarBlok(j, kwartaalStatus)).join("")}
</body></html>`;
}

// V8R5 — soort: "pdf" | "excel" | "html" (zie download.js).
export function downloadBtwOverzicht(html, jaren, soort = "html") {
  return downloadRapport({ soort, html, naam: `BTW_per_kwartaal_${jarenBereik(jaren)}` });
}
