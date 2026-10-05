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

// V41 — ASN Bank / SNS / RegioBank CSV: GEEN kopregel, komma-gescheiden, vaste kolomvolgorde
// (1 boekingsdatum, 2 eigen rekening, 3 tegenrekening, 4 naam tegenpartij, 5-7 adres, 8 valuta,
// 9 saldo VÓÓR de mutatie, 10 valuta, 11 bedrag met teken en punt als decimaalteken, 12 journaaldatum,
// 13 valutadatum, 14 interne code, 15 globale code (OVS/NGI/EIC/BEA/IDE…), 16 volgnummer,
// 17 betalingskenmerk, 18 omschrijving (tussen enkele aanhalingstekens), 19 afschriftnummer, 20 label).
// Zonder kopregel kon de generieke kolomherkenning hier niets mee en bleef het overzicht leeg.
const ASN_IBAN_RE = /^[A-Z]{2}\d{2}(ASNB|SNSB|RBRB)\d{10}$/;
export function parseAsnHeaderlessCsv(text) {
  const res = Papa.parse(text, { header: false, skipEmptyLines: true, delimiter: "," });
  const data = res.data;
  if (!data || data.length === 0) return null;
  const first = data[0];
  const looksAsn = (r) => r.length >= 19 && /^\d{2}-\d{2}-\d{4}$/.test(String(r[0]).trim()) && ASN_IBAN_RE.test(String(r[1]).trim().toUpperCase())
    && /^[A-Z]{3}$/.test(String(r[7]).trim()) && Number.isFinite(parseFloat(r[8])) && Number.isFinite(parseFloat(r[10]));
  if (!looksAsn(first)) return null;
  const clean = (v) => String(v ?? "").trim().replace(/^'/, "").replace(/'$/, "").trim();
  const rows = [];
  for (const r of data) {
    if (!looksAsn(r)) continue;
    const n = r.length;
    const desc = clean(r.slice(17, n - 2).join(","));
    const before = parseFloat(r[8]);
    const amount = parseFloat(r[10]);
    rows.push({
      "Datum": String(r[0]).trim(),
      "Rekening": String(r[1]).trim(),
      "Tegenrekening": String(r[2]).trim(),
      // Pin-/betaalpasbetalingen (BEA/GEA) hebben geen tegenpartijnaam; die staat vooraan de omschrijving,
      // vóór de plaats (">PLAATS") — zo krijgt elke winkel een stabiele naam i.p.v. een tekst met datum/pasnummer.
      "Naam tegenpartij": String(r[3]).trim() || (/^(BEA|GEA)$/.test(String(r[14]).trim()) && desc.includes(">") ? desc.split(">")[0].trim() : ""),
      "Bedrag (EUR)": String(r[10]).trim(),
      "Saldo na mutatie": (Math.round((before + amount) * 100) / 100).toFixed(2),
      "Omschrijving": desc,
      "Transactiecode": String(r[14]).trim(),
      "Label": clean(r[n - 1]),
    });
  }
  return rows.length ? rows : null;
}

export async function parseCsvFile(file) {
  let text = await file.text();

  const asn = parseAsnHeaderlessCsv(text);
  if (asn) return asn;

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
