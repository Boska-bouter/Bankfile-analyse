import * as XLSX from "xlsx";
import { CATEGORY_ORDER } from "../classification/categories.js";
import { computeBtw } from "../tax/btw.js";

// Eén platte lijst van álle transacties (alle jaren, zakelijk en privé) — de vorm die een boekhouder
// of boekhoudpakket het makkelijkst inleest: één rij per transactie, jaar en rekeningtype als kolom.
function platteRijen(groups, categoryBtwRates, btwVerlegd) {
  return groups.flatMap((g) => g.items.map((t) => ({ _d: t.date,
    Jaar: t.year ?? t.date.getFullYear(),
    Datum: t.date.toLocaleDateString("nl-NL"),
    Rekening: g.type,
    Bedrag: t.amount,
    BTW: Math.round(computeBtw(t, categoryBtwRates, btwVerlegd) * 100) / 100,
    Categorie: t.category,
    Tegenpartij: t.counterparty,
    Omschrijving: t.description,
    Bron: t.source,
  }))).sort((a, b) => a._d - b._d).map(({ _d, ...rest }) => rest);
}

export function exportCsv(groups, categoryBtwRates, btwVerlegd) {
  const rijen = platteRijen(groups, categoryBtwRates, btwVerlegd);
  if (rijen.length === 0) { window.alert("Er is nog geen data om te exporteren — upload eerst een bankbestand."); return; }
  const kop = Object.keys(rijen[0]);
  const cel = (v) => { const s = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const tekst = [kop.join(";"), ...rijen.map((r) => kop.map((k) => cel(r[k])).join(";"))].join("\r\n");
  const blob = new Blob(["\uFEFF" + tekst], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "Bankoverzicht_transacties.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function exportExcel(groups, categoryBtwRates, btwVerlegd) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(platteRijen(groups, categoryBtwRates, btwVerlegd)), "Alle transacties");
  for (const g of groups) {
    const rows = g.items
      .slice()
      .sort((a, b) => a.date - b.date)
      .map((t) => ({
        Datum: t.date.toLocaleDateString("nl-NL"),
        Maand: t.month,
        Bedrag: t.amount,
        BTW: Math.round(computeBtw(t, categoryBtwRates, btwVerlegd) * 100) / 100,
        Categorie: t.category,
        Tegenpartij: t.counterparty,
        Omschrijving: t.description,
        "Volledige omschrijving": t.fullDescription,
        Bron: t.source,
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `${g.label} - Detail`.slice(0, 31));

    const totals = {};
    for (const t of g.items) totals[t.category] = (totals[t.category] || 0) + t.amount;
    const summaryRows = CATEGORY_ORDER.filter((c) => c in totals).map((c) => ({ Categorie: c, "Totaal (EUR)": totals[c] }));
    summaryRows.push({ Categorie: "Totaal", "Totaal (EUR)": Object.values(totals).reduce((a, b) => a + b, 0) });
    if (g.type === "Zakelijk") {
      const btwTotal = g.items.reduce((a, t) => a + computeBtw(t, categoryBtwRates, btwVerlegd), 0);
      summaryRows.push({ Categorie: "Waarvan BTW", "Totaal (EUR)": Math.round(btwTotal * 100) / 100 });
    } else {
      // Een zakelijke uitgave betaald vanaf de privérekening (bijv. Autokosten) staat wel met het
      // juiste BTW-bedrag op het detailblad hiernaast, maar telt in geen enkele totaalregel hier
      // mee — vandaar deze opmerking als dat zich voordoet, in plaats van dat het bedrag stilletjes
      // nergens in een totaal terug te vinden is.
      const btwTotal = g.items.reduce((a, t) => a + computeBtw(t, categoryBtwRates, btwVerlegd), 0);
      if (Math.round(btwTotal * 100) / 100 !== 0) {
        summaryRows.push({ Categorie: "(zie detailblad voor BTW op eventuele zakelijke uitgaven hier)", "Totaal (EUR)": "" });
      }
    }
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws2, `${g.label} - Samenvatting`.slice(0, 31));
  }
  XLSX.writeFile(wb, "Bankoverzicht_Zakelijk_Prive.xlsx");
}
