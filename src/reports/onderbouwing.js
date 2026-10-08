import { fiscalTreatmentOf } from "../classification/categories.js";
import { rubriekVanCategorie } from "../tax/boxMapping.js";
import { eur } from "../utils/amounts.js";
import { jarenBereik } from "../dossier/dossierProfiel.js";

// A2 — onderbouwingsoverzicht: per jaar, per rubriek en categorie de transacties (zoals op het afschrift)
// waaruit de bedragen in het voorstel zijn opgebouwd. Los document, optioneel.
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtDatum = (d) => (d ? new Date(d).toLocaleDateString("nl-NL") : "onbekend");

export function buildOnderbouwingHtml({ klantNaam, jaren, classified, vandaag = new Date() }) {
  const titel = jarenBereik(jaren);
  const jaarHtml = jaren.map((y) => {
    const items = classified.filter((t) => !t.isMirror && t.year === y && fiscalTreatmentOf(t.category) !== "geen");
    const perRubriek = {};
    for (const t of items) {
      const r = rubriekVanCategorie(t.category);
      if (!r) continue;
      ((perRubriek[r] ||= {})[t.category] ||= []).push(t);
    }
    const rubrieken = Object.keys(perRubriek).sort();
    if (rubrieken.length === 0) return `<h2 class="jaar">${y}</h2><p>Geen transacties.</p>`;
    return `<h2 class="jaar">${y}</h2>` + rubrieken.map((r) => {
      const cats = Object.entries(perRubriek[r]).sort((a, b) => a[0].localeCompare(b[0], "nl"));
      return `<h3>${esc(r)}</h3>` + cats.map(([cat, rijen]) => {
        rijen.sort((a, b) => a.date - b.date);
        const tot = rijen.reduce((a, t) => a + (t.amount || 0), 0);
        return `<table><thead><tr><th colspan="3">${esc(cat)}</th><th class="num">${rijen.length} transactie${rijen.length === 1 ? "" : "s"}</th></tr></thead><tbody>
${rijen.map((t) => `<tr><td class="d">${fmtDatum(t.date)}</td><td>${esc(t.counterparty)}</td><td>${esc(String(t.description || "").replace(/^Naam:.*?Omschrijving:\s*/, "").slice(0, 80))}</td><td class="num">${eur(t.amount)}</td></tr>`).join("")}
<tr class="tot"><td colspan="3">Totaal ${esc(cat)}</td><td class="num">${eur(tot)}</td></tr></tbody></table>`;
      }).join("");
    }).join("");
  }).join("");
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Onderbouwing ${esc(titel)}${klantNaam ? ` — ${esc(klantNaam)}` : ""}</title>
<style>
*{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:0;padding:28px 36px;font-size:11px;line-height:1.35}
h1{font-size:20px;margin:0 0 2px} .sub{color:#64748b;margin-bottom:14px} h2.jaar{font-size:16px;border-bottom:2px solid #0f172a;padding-bottom:3px;margin:26px 0 6px;break-before:page} h2.jaar:first-of-type{break-before:auto}
h3{font-size:12px;margin:16px 0 4px;color:#0f172a} table{width:100%;border-collapse:collapse;margin-bottom:10px;break-inside:auto}
th{background:#f1f5f9;text-align:left;padding:4px 6px;font-size:11px} td{padding:3px 6px;border-bottom:1px solid #f1f5f9} td.d{white-space:nowrap}
.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums} tr.tot td{font-weight:bold;border-top:1px solid #94a3b8;border-bottom:none}
.noot{color:#64748b;font-size:10px;margin-top:14px} tr{break-inside:avoid} @media print{body{padding:0}}
</style></head><body>
<h1>Onderbouwing ${esc(titel)}</h1>
<div class="sub">${klantNaam ? `${esc(klantNaam)} · ` : ""}opgesteld ${vandaag.toLocaleDateString("nl-NL")}</div>
<p class="noot">Per rubriek en categorie de transacties waaruit de bedragen in de indicatieve aangifteberekening zijn opgebouwd. Bedragen zoals op het afschrift (incl. BTW); in de berekening staan ze netto (excl. BTW) en, waar van toepassing, na het zakelijke percentage.</p>
${jaarHtml}
</body></html>`;
}

export function downloadOnderbouwing(html, jaren) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url; a.download = `Onderbouwing_${jarenBereik(jaren)}.html`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
