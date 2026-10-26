// beide-V1R8 (fase 5/7) — maandoverzicht privé als regels en als CSV (Excel opent dit met puntkomma's).
// beide-V4R1 — ook als HTML-document (voor PDF, HTML en printen) en als echt Excel-bestand.
import { metRapportKop } from "../rapportKop.js";
import { esc, bedrag, rij, document } from "./opmaak.js";
export const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

export function maandRegels(budget) {
  return [
    ...budget.perMaand.map((m, i) => ({ maand: MAANDEN[i], ...m })),
    { maand: "Totaal", totaal: true, ...budget.totaal },
  ];
}

const getal = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",");
export function maandCsv(jaar, budget) {
  const kop = ["Maand", "Inkomsten", "Uitgaven", "Waarvan vaste lasten", "Sparen", "Over"];
  const regels = maandRegels(budget).map((r) => [r.maand, getal(r.inkomsten), getal(r.uitgaven), getal(r.vasteLasten), getal(r.sparen), getal(r.over)]);
  return [[`Maandoverzicht ${jaar}`], kop, ...regels].map((r) => r.join(";")).join("\r\n");
}

export function maandHtml(jaar, budget) {
  return metRapportKop(maandHtmlZonderKop(jaar, budget), [jaar]);
}
function maandHtmlZonderKop(jaar, budget) {
  const regels = maandRegels(budget).map((r) => rij(r.maand, [bedrag(r.inkomsten), bedrag(r.uitgaven), bedrag(r.vasteLasten), bedrag(r.sparen), bedrag(r.over)], r.totaal ? "sterk" : "")).join("");
  return document({
    titel: `Maandoverzicht ${jaar}`,
    sub: `privé · opgesteld ${new Date().toLocaleDateString("nl-NL")} · overboekingen tussen eigen rekeningen tellen niet mee`,
    inhoud: `<table><tr><th>Maand</th><th class="num">Inkomsten</th><th class="num">Uitgaven</th><th class="num">Waarvan vast</th><th class="num">Sparen</th><th class="num">Over</th></tr>${regels}</table>`,
  });
}

export async function maandExcel(jaar, budget) {
  const XLSX = await import("xlsx");
  const rijen = maandRegels(budget).map((r) => ({ Maand: r.maand, Inkomsten: r.inkomsten, Uitgaven: r.uitgaven, "Waarvan vaste lasten": r.vasteLasten, Sparen: r.sparen, Over: r.over }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rijen), `Per maand ${jaar}`);
  XLSX.writeFile(wb, `Maandoverzicht_${jaar}.xlsx`);
}
