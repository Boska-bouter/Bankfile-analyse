import { eur } from "../utils/amounts.js";

// E2 — één pagina voor de klant: wat is het resultaat, wat is de indicatieve belasting, waar is
// vanuit gegaan en wat staat nog open. Dezelfde cijfers als op het Overzicht (geen nieuwe berekening).
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildKlantSamenvattingHtml({ klantNaam, jaar, periode, rechtsvorm, omzetNetto, winst, belasting, profiel, openPunten, vandaag = new Date() }) {
  const isBV = rechtsvorm === "bv";
  const regel = (l, v, sterk) => `<tr${sterk ? ' class="sterk"' : ""}><td>${esc(l)}</td><td class="num">${v}</td></tr>`;
  const bedrag = (n) => (n < 0 ? `${eur(Math.abs(n))} terug` : eur(n));
  const delen = belasting?.delen || [];
  const totaal = belasting?.totaal ?? null;
  const profielHtml = (profiel || []).filter((b) => b.regels?.length).map((b) =>
    `<div class="blok"><h3>${esc(b.titel)}</h3><ul>${b.regels.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>`).join("");
  const openHtml = openPunten?.length
    ? `<ul>${openPunten.map((o) => `<li>${esc(o.label)}${o.count != null ? ` (${o.count})` : ""}</li>`).join("")}</ul><p class="noot">Zolang deze punten openstaan kunnen de bedragen hierboven nog veranderen.</p>`
    : `<p>Er staan geen open punten meer.</p>`;
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Samenvatting ${esc(jaar)}${klantNaam ? ` — ${esc(klantNaam)}` : ""}</title>
<style>
 *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:0;padding:28px 36px;font-size:12px;line-height:1.4}
 h1{font-size:20px;margin:0 0 2px} .sub{color:#64748b;margin-bottom:18px}
 h2{font-size:13px;border-bottom:2px solid #0f172a;padding-bottom:3px;margin:20px 0 8px}
 h3{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.03em;margin:0 0 3px}
 table{width:100%;border-collapse:collapse} td{padding:5px 6px;border-bottom:1px solid #f1f5f9}
 .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums} tr.sterk td{font-weight:bold;border-top:2px solid #0f172a;border-bottom:none;font-size:13px;padding-top:8px}
 .blokken{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px} .blok ul,ul{margin:0;padding-left:16px} .blok li,li{margin:1px 0}
 .noot{color:#64748b;font-size:10.5px;font-style:italic} .disc{margin-top:22px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;color:#475569;font-size:10.5px}
 .blok{break-inside:avoid;page-break-inside:avoid} @media print{body{padding:0}}
</style></head><body>
<h1>Samenvatting ${esc(jaar)}</h1>
<div class="sub">${klantNaam ? `${esc(klantNaam)} · ` : ""}${esc(periode || "")}${periode ? " · " : ""}${isBV ? "BV" : "Eenmanszaak / zzp"} · opgesteld ${vandaag.toLocaleDateString("nl-NL")}</div>

<h2>Resultaat</h2>
<table>${omzetNetto != null ? regel("Omzet (excl. BTW)", eur(omzetNetto)) : ""}${omzetNetto != null && winst != null ? regel("Zakelijke kosten", eur(omzetNetto - winst)) : ""}${winst != null ? regel(isBV ? "Resultaat vóór Vpb" : "Winst uit onderneming", eur(winst), true) : ""}</table>

<h2>Indicatieve belasting en premies</h2>
${delen.length ? `<table>${delen.map((d) => regel(d.label, bedrag(d.bedrag))).join("")}${totaal != null ? regel(totaal < 0 ? "Totaal terug te krijgen" : "Totaal te betalen", bedrag(totaal), true) : ""}</table>` : `<p>Nog niet te berekenen.</p>`}

<h2>Waarvan is uitgegaan</h2>
<div class="blokken">${profielHtml || "<p>Geen gegevens.</p>"}</div>

<h2>Nog open</h2>
${openHtml}

<div class="disc"><strong>Let op:</strong> dit is een indicatieve reconstructie op basis van de aangeleverde bankgegevens en de antwoorden in dit dossier. Het is geen aangifte en geen fiscaal advies. De daadwerkelijke aangiften (IB, Zvw, BTW) worden buiten deze app gedaan en kunnen afwijken.</div>
</body></html>`;
}

export function downloadKlantSamenvatting(html, jaar) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url; a.download = `Samenvatting_${jaar}.html`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
