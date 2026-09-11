import { CATEGORY_ORDER } from "../classification/categories.js";
import { computeBtw, computeQuarterlyBtwForYear } from "../tax/btw.js";
import { computeYearlySummary } from "../tax/yearlySummary.js";
import { estimateIncomeTax } from "../tax/incomeTax.js";
import { eur } from "../utils/amounts.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildYearSection(year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides) {
  const zakItems = classified.filter((tx) => tx.type === "Zakelijk" && !tx.isMirror && tx.year === year);
  const summary = computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd);
  const ibEstimate = estimateIncomeTax(summary.winst, year);

  const zakTotals = {};
  const zakBtwByCat = {};
  for (const tx of zakItems) {
    zakTotals[tx.category] = (zakTotals[tx.category] || 0) + tx.amount;
    zakBtwByCat[tx.category] = (zakBtwByCat[tx.category] || 0) + computeBtw(tx, categoryBtwRates, btwVerlegd);
  }
  const zakGrandTotal = Object.values(zakTotals).reduce((a, b) => a + b, 0);
  const zakGrandBtw = Object.values(zakBtwByCat).reduce((a, b) => a + b, 0);

  const catRows = CATEGORY_ORDER.filter((c) => c in zakTotals)
    .map((c) => {
      const bruto = zakTotals[c];
      const btw = zakBtwByCat[c] || 0;
      return `<tr><td>${esc(c)}</td><td class="num">${eur(bruto)}</td><td class="num">${eur(bruto - btw)}</td><td class="num">${eur(btw)}</td></tr>`;
    })
    .join("");

  const kwartalen = korRegeling ? [] : computeQuarterlyBtwForYear(classified, year, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides);
  const kwartaalRows = kwartalen
    .map((q) => {
      const saldo = q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting;
      return `<tr>
        <td>Q${q.kwartaal}</td>
        <td class="num">${eur(q.omzetBruto21)}</td><td class="num">${eur(q.verschuldigdBtw21)}</td>
        <td class="num">${eur(q.omzetBruto9)}</td><td class="num">${eur(q.verschuldigdBtw9)}</td>
        <td class="num">${eur(q.omzetBrutoVerlegd)}</td>
        <td class="num">${eur(q.kostenBruto)}</td><td class="num">${eur(q.voorbelasting)}</td>
        <td class="num">${eur(Math.abs(saldo))} ${saldo >= 0 ? "te betalen" : "terug te vragen"}</td>
      </tr>`;
    })
    .join("");

  return `
  <h1>Zakelijke aangifte voorstel — ${year}</h1>
  <p class="subtitle">${korRegeling ? "Valt onder de KOR" : btwVerlegd ? "BTW-verlegd van toepassing" : "Gewone BTW-plicht"}</p>

  <div class="winst">Winst uit onderneming (bruto): ${eur(summary.winst)}</div>

  <h2>Categorieoverzicht — Zakelijk</h2>
  <table>
    <thead><tr><th>Categorie</th><th class="num">Bruto</th><th class="num">Netto</th><th class="num">BTW</th></tr></thead>
    <tbody>${catRows}</tbody>
    <tfoot><tr class="total"><td>Totaal</td><td class="num">${eur(zakGrandTotal)}</td><td class="num">${eur(zakGrandTotal - zakGrandBtw)}</td><td class="num">${eur(zakGrandBtw)}</td></tr></tfoot>
  </table>

  ${!korRegeling && kwartalen.length > 0 ? `
  <h2>BTW per kwartaal</h2>
  <table>
    <thead><tr>
      <th>Kwartaal</th><th class="num">Omzet 21%</th><th class="num">BTW 21% (1a)</th>
      <th class="num">Omzet 9%</th><th class="num">BTW 9% (1b)</th><th class="num">Omzet verlegd (1e)</th>
      <th class="num">Uitgaven</th><th class="num">Voorbelasting (5b)</th><th class="num">Saldo</th>
    </tr></thead>
    <tbody>${kwartaalRows}</tbody>
  </table>` : ""}

  <h2>Indicatieve inkomstenbelasting</h2>
  <p>Geschat: <strong>${eur(ibEstimate.belasting)}</strong>${ibEstimate.geëxtrapoleerd ? " (belastingschijven van dit jaar nog niet bekend, benaderd met de dichtstbijzijnde bekende schijven)" : ""} — zonder heffingskortingen, startersaftrek of overig inkomen. Geen belastingadvies.</p>`;
}

export function buildAangiftevoorstelHtml(yearsToInclude, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides) {
  const sections = yearsToInclude
    .map((year) => buildYearSection(year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides))
    .join('\n  <div style="page-break-before: always;"></div>\n');

  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"><title>Zakelijke aangifte voorstel ${yearsToInclude.join(", ")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; padding: 24px 32px; font-size: 11px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  h2 { font-size: 14px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin: 24px 0 10px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; text-align: left; }
  th { font-size: 9px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; }
  tr.total td { font-weight: bold; border-top: 1px solid #0f172a; border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .winst { font-size: 13px; font-weight: bold; margin: 8px 0 20px; padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; }
  .disclaimer { margin-top: 28px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #64748b; font-size: 9.5px; }
  @page { size: A4 portrait; margin: 16mm; }
</style></head>
<body>
  <p class="subtitle">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</p>
  ${sections}
  <div class="disclaimer">
    Dit is een <strong>voorstel</strong>, samengesteld uit je eigen bankgegevens en categorie-indeling in deze tool —
    geen officiële aangifte en geen belastingadvies. Controleer de cijfers altijd zelf of met je boekhouder voordat
    je aangifte doet.
  </div>
</body></html>`;
}

export function downloadAangiftevoorstel(html, years) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Aangiftevoorstel_${years.join("-")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
