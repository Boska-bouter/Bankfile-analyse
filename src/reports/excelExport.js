import * as XLSX from "xlsx";
import { CATEGORY_ORDER } from "../classification/categories.js";
import { computeBtw } from "../tax/btw.js";

export function exportExcel(groups, categoryBtwRates, btwVerlegd) {
  const wb = XLSX.utils.book_new();
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
    }
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws2, `${g.label} - Samenvatting`.slice(0, 31));
  }
  XLSX.writeFile(wb, "Bankoverzicht_Zakelijk_Prive.xlsx");
}
