// beide-V1R8 (fase 7) — gedeelde opmaak voor de privédocumenten (aangiftevoorstel, budgetrapport, samenvatting).
import { eur } from "../../utils/amounts.js";

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const bedrag = (n) => eur(Number(n) || 0);
export const rij = (label, waarden, cls = "") => `<tr${cls ? ` class="${cls}"` : ""}><td>${esc(label)}</td>${waarden.map((v) => `<td class="num">${v}</td>`).join("")}</tr>`;
// beide-V5R1 — bedrag met een duidelijk teken (wens Boska 25-10). `uit`: een positief bedrag gaat eraf (uitgaven,
// sparen) en krijgt "−"; is het per saldo binnengekomen, dan "+". Zonder `uit` andersom (inkomsten, over).
export const metTeken = (n, uit = false) => {
  const v = Number(n) || 0;
  if (Math.abs(v) < 0.005) return bedrag(0);
  return `${(v > 0) === uit ? "−" : "+"} ${bedrag(Math.abs(v))}`;
};
export const kopRij = (jaren) => `<tr><th></th>${jaren.map((j) => `<th class="num">${esc(j)}</th>`).join("")}</tr>`;

export function document({ titel, sub, inhoud }) {
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>${esc(titel)}</title>
<style>
 *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:0;padding:28px 36px;font-size:12px;line-height:1.4}
 h1{font-size:20px;margin:0 0 2px} .sub{color:#64748b;margin-bottom:18px}
 h2{font-size:14px;border-bottom:2px solid #0f172a;padding-bottom:3px;margin:22px 0 8px}
 h3{font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.03em;margin:14px 0 4px}
 table{width:100%;border-collapse:collapse;margin-bottom:6px} td{padding:4px 6px;border-bottom:1px solid #f1f5f9}
 th{font-size:9px;text-transform:uppercase;color:#64748b;text-align:left;border-bottom:1px solid #cbd5e1;padding:4px 6px}
 .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
 tr.sterkLicht td{font-weight:600} tr.sterk td{font-weight:bold;border-top:2px solid #0f172a;border-bottom:none} tr.sub td{color:#64748b;font-size:11px;padding-left:16px}
 .uitkomst{font-size:15px;font-weight:bold;margin:6px 0} .terug{color:#047857} .bij{color:#b91c1c}
 .aannames{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-top:8px} .aannames ul{margin:4px 0 0;padding-left:16px}
 .disc{margin-top:22px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;color:#475569;font-size:10.5px}
 .jaar{break-before:page} .jaar:first-of-type{break-before:auto} @media print{body{padding:0}}
</style></head><body>
<h1>${esc(titel)}</h1>
<div class="sub">${sub}</div>
${inhoud}
<div class="disc"><strong>Let op:</strong> dit is een indicatie op basis van de bankgegevens en de antwoorden in dit dossier. Het is geen aangifte en geen fiscaal advies. De aangifte inkomstenbelasting zelf gaat via de Belastingdienst; de uitkomst daar kan afwijken. Toeslagen worden niet berekend.</div>
</body></html>`;
}
