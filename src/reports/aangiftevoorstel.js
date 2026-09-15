import { CATEGORY_ORDER } from "../classification/categories.js";
import { computeBtw, computeQuarterlyBtwForYear } from "../tax/btw.js";
import { computeYearlySummary } from "../tax/yearlySummary.js";
import { estimateIncomeTax } from "../tax/incomeTax.js";
import { computeIbBoxMapping } from "../tax/boxMapping.js";
import { computeLoanRenteForYear, computeLeaseRenteForYear } from "../tax/loanAmortization.js";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate } from "../tax/financialLease.js";
import { eur } from "../utils/amounts.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Eén rij in de winst-en-verliesrekening-stijl weergave — optioneel met toelichting eronder.
function rubriekBlok(nr, naam, totaal, toelichting) {
  if (!totaal) return "";
  return `
  <div class="rubriek"><span>${nr ? `${nr}. ` : ""}${esc(naam)}</span><span class="num">${eur(totaal)}</span></div>
  ${toelichting ? `<p class="toelichting">${toelichting}</p>` : ""}`;
}

function buildYearSection(year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails) {
  const zakItems = classified.filter((tx) => tx.type === "Zakelijk" && !tx.isMirror && tx.year === year);
  const summary = computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd);
  const ibEstimate = estimateIncomeTax(summary.winst, year);
  const loanRenteForYear = computeLoanRenteForYear(loanSummary || [], loanDetails || {}, year);
  const leaseRenteForYear = computeLeaseRenteForYear(leaseSummary || [], leaseDetails || {}, year, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
  const ib = computeIbBoxMapping(zakItems, loanRenteForYear, leaseRenteForYear);

  // Categorieoverzicht (alle categorieën, alfabetisch) blijft als detailbijlage staan — de
  // winst-en-verliesrekening hierboven is wat met de aangifte meeleest, dit blijft handig als
  // volledig, doorzoekbaar overzicht van elke bank-categorie apart.
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

  const overigeBedrijfskostenHtml =
    ib.overigeBedrijfskosten.length > 0
      ? `
  <div class="rubriek"><span>4. Overige bedrijfskosten</span><span></span></div>
  ${ib.overigeBedrijfskosten.map((r) => `<div class="subrubriek"><span>${esc(r.naam)}</span><span class="num">${eur(r.totaal)}</span></div>`).join("")}`
      : "";

  const financieelTotaalRente = ib.financieleBatenLasten.renteLeningen + ib.financieleBatenLasten.renteLease;
  const financieelTotaalAflossing = ib.financieleBatenLasten.aflossingLeningen + ib.financieleBatenLasten.aflossingLease;
  const financieelHtml =
    financieelTotaalRente > 0 || ib.leningenTotal > 0 || ib.leaseFinancieelTotal > 0
      ? `
  <div class="rubriek"><span>5. Financiële baten en lasten</span><span class="num">${eur(financieelTotaalRente)}</span></div>
  <p class="toelichting">${ib.financieleBatenLasten.toelichting} Aflossing (niet aftrekbaar): ${eur(financieelTotaalAflossing)}.${
          ib.financieleBatenLasten.onvolledig > 0 ? ` ⚠ ${ib.financieleBatenLasten.onvolledig} lening(en)/leasecontract(en) nog niet volledig ingevuld in de tool.` : ""
        }</p>`
      : "";

  const priveHtml =
    ib.priveOnttrekkingen.totaal > 0 || ib.priveStortingen.totaal > 0
      ? `
  <div class="rubriek"><span>6. Privéonttrekkingen en -stortingen</span><span></span></div>
  ${ib.priveOnttrekkingen.totaal > 0 ? `<div class="subrubriek"><span>Privéonttrekkingen</span><span class="num">${eur(ib.priveOnttrekkingen.totaal)}</span></div>` : ""}
  ${ib.priveStortingen.totaal > 0 ? `<div class="subrubriek"><span>Privéstortingen</span><span class="num">${eur(ib.priveStortingen.totaal)}</span></div>` : ""}`
      : "";

  const belastingenHtml = rubriekBlok(null, ib.belastingenGeenKostenpost.naam, ib.belastingenGeenKostenpost.totaal, ib.belastingenGeenKostenpost.toelichting);
  const verkoopActivaHtml = rubriekBlok(
    null, "Verkoop activa", ib.verkoopActivaTotal,
    "Kan een boekwinst of -verlies opleveren — deze tool kent de boekwaarde niet en berekent dat niet automatisch."
  );
  const nogNietIngedeeldHtml =
    ib.nogNietIngedeeld.length > 0
      ? `
  <div class="rubriek"><span>Nog niet ingedeeld in deze structuur</span><span></span></div>
  ${ib.nogNietIngedeeld.map((r) => `<div class="subrubriek"><span>${esc(r.categorie)}</span><span class="num">${eur(r.totaal)}</span></div>`).join("")}`
      : "";

  return `
  <h1>Zakelijke aangifte voorstel — ${year}</h1>
  <p class="subtitle">${korRegeling ? "Valt onder de KOR" : btwVerlegd ? "BTW-verlegd van toepassing" : "Gewone BTW-plicht"}</p>

  <h2>Winst-en-verliesrekening — in de volgorde van de IB-aangifte</h2>
  <div class="wvr">
    ${rubriekBlok(1, ib.opbrengsten.naam, ib.opbrengsten.totaal)}
    ${rubriekBlok(2, ib.inkoopkosten.naam, ib.inkoopkosten.totaal, ib.inkoopkosten.toelichting)}
    ${rubriekBlok(3, ib.afschrijvingen.naam, ib.afschrijvingen.apparatuurInvestering + ib.afschrijvingen.leaseFinancieelTotal, ib.afschrijvingen.toelichting)}
    ${overigeBedrijfskostenHtml}
    ${financieelHtml}
    <div class="rubriek total"><span>Resultaat uit onderneming (winst, bruto)</span><span class="num">${eur(summary.winst)}</span></div>
    ${priveHtml}
    ${belastingenHtml}
    ${verkoopActivaHtml}
    ${nogNietIngedeeldHtml}
  </div>

  <h2>Categorieoverzicht — Zakelijk (detail, alle categorieën)</h2>
  <table>
    <thead><tr><th>Categorie</th><th class="num">Bruto</th><th class="num">Netto</th><th class="num">BTW</th></tr></thead>
    <tbody>${catRows}</tbody>
    <tfoot><tr class="total"><td>Totaal</td><td class="num">${eur(zakGrandTotal)}</td><td class="num">${eur(zakGrandTotal - zakGrandBtw)}</td><td class="num">${eur(zakGrandBtw)}</td></tr></tfoot>
  </table>

  ${!korRegeling && kwartalen.length > 0 ? `
  <h2>BTW per kwartaal</h2>
  <p class="vergelijk-hint">Vergelijk het saldo per kwartaal hieronder met wat er daadwerkelijk is aangegeven en betaald.</p>
  <table>
    <thead><tr>
      <th>Kwartaal</th><th class="num">Omzet 21%</th><th class="num">BTW 21% (1a)</th>
      <th class="num">Omzet 9%</th><th class="num">BTW 9% (1b)</th><th class="num">Omzet verlegd (1e)</th>
      <th class="num">Uitgaven</th><th class="num">Voorbelasting (5b)</th><th class="num">Saldo</th>
    </tr></thead>
    <tbody>${kwartaalRows}</tbody>
  </table>` : ""}

  <h2>Indicatieve inkomstenbelasting</h2>
  <p>Geschat: <strong>${eur(ibEstimate.belasting)}</strong>${ibEstimate.geëxtrapoleerd ? " (belastingschijven van dit jaar nog niet bekend, benaderd met de dichtstbijzijnde bekende schijven)" : ""} — zonder heffingskortingen, startersaftrek of overig inkomen. Geen belastingadvies.</p>
  <p class="vergelijk-hint">Vergelijk dit geschatte bedrag met wat er daadwerkelijk is aangegeven en betaald aan inkomstenbelasting over dit jaar.</p>`;
}

export function buildAangiftevoorstelHtml(yearsToInclude, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails) {
  const sections = yearsToInclude
    .map((year) => buildYearSection(year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails))
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
  .wvr { margin-bottom: 8px; }
  .wvr .rubriek { display: flex; justify-content: space-between; padding: 5px 6px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
  .wvr .subrubriek { display: flex; justify-content: space-between; padding: 3px 6px 3px 18px; border-bottom: 1px solid #f8fafc; color: #475569; font-weight: 400; }
  .wvr .rubriek.total { border-top: 2px solid #0f172a; border-bottom: none; margin-top: 4px; padding-top: 8px; background: #f0fdf4; }
  .wvr .toelichting { color: #64748b; font-size: 9.5px; font-style: italic; margin: 0 0 6px 6px; }
  .controledoel { margin: 0 0 20px; padding: 10px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; color: #1e3a5f; font-size: 10.5px; line-height: 1.5; }
  .vergelijk-hint { color: #2563eb; font-size: 9.5px; font-style: italic; margin: -4px 0 8px; }
  .disclaimer { margin-top: 28px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #64748b; font-size: 9.5px; }
  @page { size: A4 portrait; margin: 16mm; }
</style></head>
<body>
  <p class="subtitle">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</p>
  <div class="controledoel">
    <strong>Waar is dit voor?</strong> Dit overzicht is een <strong>controle-instrument</strong>: het laat zien wat er
    volgens de bankgegevens aangegeven en betaald had moeten worden — niet noodzakelijk wat er daadwerkelijk bij de
    Belastingdienst is aangegeven en betaald. Vergelijk de bedragen hieronder met de eerder ingediende aangifte(s).
    Komt dat niet overeen, dan is dát precies waar dit overzicht je bij wil helpen — dan is er mogelijk iets misgegaan
    in een eerdere aangifte. De winst-en-verliesrekening hieronder staat bewust in dezelfde volgorde als de IB-aangifte
    zelf.
  </div>
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
