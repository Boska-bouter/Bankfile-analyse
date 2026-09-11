import { parseCsvFile } from "./csv.js";
import { parseExcelFile } from "./excel.js";
import { parseMT940, looksLikeMT940 } from "./mt940.js";
import { looksLikeCamt053 } from "./camt053.js";
import { buildColumnMapping } from "./bankProfiles.js";

// Bepaalt op basis van extensie (en, als vangnet, bestandsinhoud) welke parser een bestand moet
// verwerken, en levert daarna de kolomherkenning erbij — dit is de enige functie die de rest van
// de app hoeft aan te roepen voor het inlezen van een geüpload bestand.
export async function parseFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  let rows = [];

  if (ext === "csv") {
    rows = await parseCsvFile(file);
  } else if (ext === "xlsx" || ext === "xls") {
    rows = await parseExcelFile(file);
  } else if (["940", "sta", "mt940", "swi"].includes(ext)) {
    const text = await file.text();
    rows = parseMT940(text);
  } else {
    // Onbekende extensie: eerst kijken of het toch MT940 (bijv. .txt) of CAMT.053 (.xml) is,
    // anders als Excel proberen te lezen.
    const text = await file.text();
    if (looksLikeMT940(text)) {
      rows = parseMT940(text);
    } else if (looksLikeCamt053(text)) {
      throw new Error(
        `"${file.name}" lijkt een CAMT.053-bestand te zijn — dat formaat wordt nog niet ondersteund (zie src/importers/camt053.js).`
      );
    } else {
      rows = await parseExcelFile(file);
    }
  }

  rows = rows.filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));
  if (rows.length === 0) return { headers: [], rows: [], mapping: {} };
  const headers = Object.keys(rows[0]);
  const mapping = buildColumnMapping(headers);
  return { headers, rows, mapping };
}

// Herberekent de kolomherkenning (mapping) van eerder opgeslagen bestanden aan de hand van de
// huidige HEADER_ALIASES — nodig omdat de mapping ooit werd vastgelegd op het moment van
// uploaden; als de tool nadien beter is geworden in kolomherkenning, profiteren eerder
// opgeslagen/geladen projecten daar anders niet automatisch van.
export function refreshFileMappings(parsedFiles) {
  return (parsedFiles || []).map((pf) => {
    const headers = pf.headers && pf.headers.length ? pf.headers : pf.rows && pf.rows.length ? Object.keys(pf.rows[0]) : [];
    if (!headers.length) return pf;
    return { ...pf, headers, mapping: buildColumnMapping(headers) };
  });
}
