import { CATEGORY_ORDER } from "../classification/categories.js";
import { eur } from "../utils/amounts.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildReportBodyContent(groups) {
  const sections = groups
    .map((g) => {
      const totals = {};
      for (const t of g.items) totals[t.category] = (totals[t.category] || 0) + t.amount;
      const grand = Object.values(totals).reduce((a, b) => a + b, 0);
      const months = [...new Set(g.items.map((t) => t.month))].sort();
      const catRows = CATEGORY_ORDER.filter((c) => c in totals).map((c) => `<tr><td>${esc(c)}</td><td class="num">${eur(totals[c])}</td></tr>`).join("");
      const monthRows = months
        .map((m) => {
          const total = g.items.filter((t) => t.month === m).reduce((a, t) => a + t.amount, 0);
          return `<tr><td>${esc(m)}</td><td class="num">${eur(total)}</td></tr>`;
        })
        .join("");
      return `
      <section class="group">
        <h2>${esc(g.label)}</h2>
        <div class="cols">
          <div><h3>Categorieën</h3><table class="summary"><tbody>${catRows}<tr class="total"><td>Totaal</td><td class="num">${eur(grand)}</td></tr></tbody></table></div>
          <div><h3>Per maand</h3><table class="summary"><tbody>${monthRows}</tbody></table></div>
        </div>
      </section>`;
    })
    .join("");
  return `<h1>Bankoverzicht — Zakelijk &amp; Privé</h1><p class="subtitle">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</p>${sections}`;
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; padding: 24px 32px; font-size: 11px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 24px; }
  .group { page-break-inside: avoid; margin-bottom: 32px; }
  h2 { font-size: 15px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; }
  h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: #64748b; margin: 16px 0 6px; }
  .cols { display: flex; gap: 24px; }
  .cols > div { flex: 1; }
  table { width: 100%; border-collapse: collapse; }
  table.summary td { padding: 3px 6px; border-bottom: 1px solid #f1f5f9; }
  table.summary tr.total td { font-weight: bold; border-top: 1px solid #0f172a; border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  @page { size: A4 portrait; margin: 16mm; }
`;

function buildReportHtml(groups) {
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Bankoverzicht Zakelijk & Prive</title>
<style>${PRINT_STYLES}</style></head><body onload="window.print()">${buildReportBodyContent(groups)}</body></html>`;
}

// Print binnen dezelfde pagina (geen iframe, geen nieuw venster) — de meest betrouwbare manier
// op iOS/iPad, nodig als het openen van een nieuw venster niet werkt.
function printInPage(groups) {
  let area = document.getElementById("bank-print-area");
  if (!area) {
    area = document.createElement("div");
    area.id = "bank-print-area";
    area.style.display = "none";
    document.body.appendChild(area);
  }
  if (!document.getElementById("bank-print-styles")) {
    const style = document.createElement("style");
    style.id = "bank-print-styles";
    style.textContent = `@media print { body > *:not(#bank-print-area) { display: none !important; } #bank-print-area { display: block !important; position: static !important; } ${PRINT_STYLES.replace(/(^|\})\s*([a-zA-Z0-9.# ,>*]+)\s*\{/g, (m, brace, sel) => `${brace} #bank-print-area ${sel.trim()} {`)} }`;
    document.head.appendChild(style);
  }
  area.innerHTML = buildReportBodyContent(groups);
  const cleanup = () => { area.innerHTML = ""; };
  if (typeof window.onafterprint !== "undefined") {
    const handler = () => { cleanup(); window.removeEventListener("afterprint", handler); };
    window.addEventListener("afterprint", handler);
    setTimeout(cleanup, 60000);
  }
  setTimeout(() => window.print(), 50);
}

export function printReport(groups) {
  if (groups.length === 0) {
    window.alert("Er is nog geen data om te printen — upload eerst een bankbestand.");
    return;
  }
  // Printen vanuit een als-app-op-beginscherm-geïnstalleerde pagina is een bekende, langdurige
  // beperking van iOS zelf — het printvenster blijft dan leeg/bevroren. Geef dat duidelijk aan.
  const isStandaloneApp =
    (typeof window.navigator.standalone !== "undefined" && window.navigator.standalone) ||
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);
  if (isStandaloneApp) {
    window.alert(
      "Printen lukt helaas niet vanuit de app-versie op je beginscherm — dit is een bekende beperking van iOS zelf, niet van deze tool.\n\n" +
        "Open dezelfde link rechtstreeks in Safari (niet via het app-icoon) en print daarvandaan, of gebruik de Excel-knop."
    );
    return;
  }
  const html = buildReportHtml(groups);
  let win = null;
  try {
    win = window.open("", "_blank");
  } catch (e) {
    win = null;
  }
  if (win) {
    try {
      win.document.open();
      win.document.write(html);
      win.document.close();
      return;
    } catch (e) {
      try { win.close(); } catch (e2) { /* ignore */ }
    }
  }
  printInPage(groups);
}

// Print van een reeds opgebouwd HTML-rapport (bijv. het aangiftevoorstel) in een nieuw tabblad.
export function printHtmlDocument(html) {
  const isStandaloneApp =
    (typeof window.navigator.standalone !== "undefined" && window.navigator.standalone) ||
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);
  if (isStandaloneApp) {
    window.alert(
      "Printen lukt helaas niet vanuit de app-versie op je beginscherm — dit is een bekende beperking van iOS zelf.\n\n" +
        'Gebruik in plaats daarvan "Downloaden": open het gedownloade bestand daarna in Safari, en gebruik van daaruit het deel-menu om te printen of als PDF op te slaan.'
    );
    return;
  }
  let win = null;
  try {
    win = window.open("", "_blank");
  } catch (e) {
    win = null;
  }
  if (win) {
    try {
      win.document.open();
      win.document.write(html.replace("<body>", `<body onload="window.print()">`));
      win.document.close();
      return;
    } catch (e) {
      try { win.close(); } catch (e2) { /* ignore */ }
    }
  }
  window.alert('Kon geen nieuw venster openen om te printen — gebruik in plaats daarvan "Downloaden".');
}
