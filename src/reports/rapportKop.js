// beide-V7R0 — vaste kop bovenaan elk rapport (zakelijk, BV, privé, btw, onderbouwing, maandoverzichten): naam en soort
// dossier, periode met de dekking per rekening, datum en versie, open punten en de vaste regel "indicatief".
// App.jsx zet de dossiergegevens bij elke render (registreerRapportKop), net als registerTariefInstellingen; de rapporten
// roepen alleen metRapportKop(html, jaren) aan, zonder extra argumenten door te geven.

import { APP_RELEASE } from "../version.js";
import { tariefStatusVoorJaar } from "../tax/incomeTax.js";
import { priveTariefStatus } from "../tax/prive/tarieven.js";

let _bron = null;
export function registreerRapportKop(bron) { _bron = bron || null; }

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const datum = (d) => (d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "?");
export const INDICATIEF = "Indicatieve berekening op basis van bankgegevens. Geen aangifte en geen fiscaal advies; controleer de cijfers vóór gebruik.";

// jaren: de jaren van dit rapport (getallen of strings); leeg = alle jaren van het dossier.
export function rapportKopHtml(jaren = null, { vandaag = new Date(), bron = _bron } = {}) {
  if (!bron) return "";
  const js = (jaren && jaren.length ? jaren : bron.jaren || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const begin = js.length ? new Date(js[0], 0, 1) : null;
  const eind = js.length ? new Date(js[js.length - 1], 11, 31, 23, 59, 59) : null;
  const binnen = (van, tot) => !begin || (van && tot && new Date(van) <= eind && new Date(tot) >= begin);

  const periode = js.length ? (js.length === 1 ? String(js[0]) : `${js[0]} t/m ${js[js.length - 1]}`) : "";
  const dekking = (bron.dekking || []).filter((d) => binnen(d.van, d.tot)).sort((a, b) => new Date(a.van) - new Date(b.van));
  const gaten = (bron.gaten || []).filter((g) => binnen(g.van, g.tot));
  const open = (bron.openPunten || []).filter((p) => p.count > 0);
  const aantalOpen = open.reduce((a, p) => a + p.count, 0);

  const tarieven = js.map((j) => {
    const st = bron.soort === "Privé" ? [tariefStatusVoorJaar(j).status, priveTariefStatus(j).status] : [tariefStatusVoorJaar(j).status];
    return st.includes("benadering") ? `${j} benaderd` : st.includes("voorlopig") ? `${j} voorlopig` : null;
  }).filter(Boolean);

  const regel = (label, inhoud) => `<div style="margin:1px 0"><span style="color:#64748b">${label}:</span> ${inhoud}</div>`;
  const dekkingTekst = dekking.length
    ? dekking.map((d) => `${esc(d.label)}${d.type ? ` (${esc(d.type)})` : ""} ${datum(d.van)} t/m ${datum(d.tot)}`).join(" · ")
    : "geen bankgegevens in deze periode";
  return `<div class="rapportkop" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.45;color:#334155;border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin:0 0 16px;background:#f8fafc">
${regel("Dossier", `<strong>${esc(bron.naam || "zonder naam")}</strong> · ${esc(bron.soort || "")}${periode ? ` · periode ${periode}` : ""}`)}
${regel("Bankgegevens", dekkingTekst)}
${gaten.length ? `<div style="margin:1px 0;color:#b45309">⚠ ${gaten.length === 1 ? "Mogelijk ontbreekt een periode" : `Mogelijk ontbreken ${gaten.length} periodes`}: ${gaten.map((g) => `${datum(g.van)} – ${datum(g.tot)}`).join(", ")}</div>` : ""}
${regel("Opgesteld", `${datum(vandaag)} · Bankoverzicht ${esc(APP_RELEASE)}${tarieven.length ? ` · tarieven ${tarieven.join(", ")}` : ""}`)}
${regel("Open punten", aantalOpen ? `<span style="color:#b45309">${aantalOpen}</span> (${open.slice(0, 4).map((p) => `${esc(p.label)}: ${p.count}`).join(", ")}${open.length > 4 ? ", …" : ""})` : "geen")}
<div style="margin-top:4px;font-weight:bold;color:#0f172a">${INDICATIEF}</div>
</div>`;
}

// Zet de kop direct na <body> (of vooraan als er geen body is). Een rapport krijgt hem maar één keer.
export function metRapportKop(html, jaren = null) {
  if (!html || html.includes('class="rapportkop"')) return html;
  const kop = rapportKopHtml(jaren);
  if (!kop) return html;
  const m = /<body[^>]*>/i.exec(html);
  return m ? html.slice(0, m.index + m[0].length) + kop + html.slice(m.index + m[0].length) : kop + html;
}
