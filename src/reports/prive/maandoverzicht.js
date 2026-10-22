// beide-V1R8 (fase 5/7) — maandoverzicht privé als regels en als CSV (Excel opent dit met puntkomma's).
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
