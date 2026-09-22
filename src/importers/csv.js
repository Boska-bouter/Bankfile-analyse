import Papa from "papaparse";
import { hasUsableHeaders } from "./bankProfiles.js";

// Sommige bank-exports (o.a. bepaalde ING-varianten) wikkelen elke regel in een extra paar
// aanhalingstekens, met de eigenlijke komma-gescheiden kolommen daarbinnen. Dat pakken we hier
// uit tot de eigenlijke, normale CSV-inhoud.
export function unwrapDoubleQuotedCsvLines(text) {
  const lines = text.split(/\r\n|\n/);
  const unwrapped = lines.map((line) => {
    if (line.length >= 2 && line[0] === '"' && line[line.length - 1] === '"') {
      return line.slice(1, -1).replace(/""/g, '"');
    }
    return line;
  });
  return unwrapped.join("\n");
}

// Herkent een titelregel bovenaan een CSV (zoals "KNAB EXPORT;;;;;;;;;;;;;;;;" bij Knab-exports)
// — een regel waarbij, ongeacht welk scheidingsteken je gebruikt, bijna alle velden leeg zijn.
export function looksLikeTitleLine(line) {
  if (!line || !line.trim()) return false;
  for (const delim of [";", ",", "\t"]) {
    const parts = line.split(delim);
    if (parts.length < 4) continue;
    const nonEmpty = parts.filter((p) => p.replace(/"/g, "").trim() !== "").length;
    if (nonEmpty <= 1) return true;
  }
  return false;
}

export async function parseCsvFile(file) {
  let text = await file.text();

  const firstLineEnd = text.search(/\r\n|\n/);
  const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
  if (looksLikeTitleLine(firstLine)) {
    text = firstLineEnd === -1 ? "" : text.slice(firstLineEnd).replace(/^\r?\n/, "");
  }

  let res;
  try {
    res = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: "" });
  } catch (e) {
    throw new Error(`Kon "${file.name}" niet inlezen als CSV (${e.message || e}). Controleer of het bestand niet beschadigd is.`);
  }
  let rows = res.data;

  if (!hasUsableHeaders(rows)) {
    const lines = text.split(/\r\n|\n/);
    if (lines.length > 1) {
      const retryText = lines.slice(1).join("\n");
      const res2 = Papa.parse(retryText, { header: true, skipEmptyLines: true, delimiter: "" });
      if (hasUsableHeaders(res2.data)) rows = res2.data;
    }
  }
  if (!hasUsableHeaders(rows)) {
    const unwrappedText = unwrapDoubleQuotedCsvLines(text);
    const res3 = Papa.parse(unwrappedText, { header: true, skipEmptyLines: true, delimiter: "" });
    if (hasUsableHeaders(res3.data)) rows = res3.data;
  }
  return rows;
}
