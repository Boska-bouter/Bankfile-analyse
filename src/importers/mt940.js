// MT940 (SWIFT-bankafschriftformaat) parsen naar dezelfde "rij"-vorm als een geparste CSV, zodat
// de rest van de importpijplijn (kolomherkenning, transactie-opbouw, categorisering) ongewijzigd
// werkt voor dit formaat.

// Haalt tegenpartij/omschrijving uit een MT940 ":86:"-veld. Nederlandse banken gebruiken daarin
// vaak gestructureerde SEPA-subvelden zoals "/NAME/.../REMI/...", die we er specifiek uithalen;
// is er niets gestructureerds gevonden, dan gebruiken we de hele tekst als omschrijving (en ook
// als tegenpartij, zodat er in elk geval iets bruikbaars staat).
export function parseMT940Field86(text) {
  const tags = {};
  const re = /\/([A-Z]{2,4})\/([^/]*)/g;
  let m;
  let found = false;
  while ((m = re.exec(text))) {
    tags[m[1]] = (tags[m[1]] ? tags[m[1]] + " " : "") + m[2].trim();
    found = true;
  }
  if (found) {
    const counterparty = tags.NAME || tags.EREF || "";
    const description = tags.REMI || tags.RTRN || text;
    return { counterparty, description };
  }
  return { counterparty: text, description: text };
}

export function parseMT940(text) {
  const lines = text.split(/\r\n|\r|\n/);
  const rows = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith(":61:")) {
      // 6 cijfers waardedatum (YYMMDD), optioneel 4 cijfers boekdatum (MMDD), C/D (evt. met R
      // ervoor bij een storneringsregel — dan is het teken juist omgekeerd), bedrag met komma,
      // een N + 3-4 letters mutatiesoort, en de rest is een referentie.
      const m = line.match(/^:61:(\d{6})(\d{4})?(R?[CD])(\d+,\d*)N?[A-Z]{3,4}(.*)$/);
      if (m) {
        const [, valueDate, , cd, amountRaw] = m;
        const isReversal = cd.startsWith("R");
        const baseIsCredit = cd.endsWith("C");
        const isCredit = isReversal ? !baseIsCredit : baseIsCredit;
        let j = i + 1;
        let field86 = "";
        if (j < lines.length && lines[j].startsWith(":86:")) {
          field86 = lines[j].slice(4);
          j++;
          while (j < lines.length && !/^:\d/.test(lines[j])) {
            field86 += " " + lines[j];
            j++;
          }
        }
        const { counterparty, description } = parseMT940Field86(field86.trim());
        const yyyy = "20" + valueDate.slice(0, 2);
        const mm = valueDate.slice(2, 4);
        const dd = valueDate.slice(4, 6);
        rows.push({
          "Datum": `${yyyy}${mm}${dd}`,
          "Naam / Omschrijving": counterparty || description || "",
          "Af Bij": isCredit ? "C" : "D",
          "Bedrag (EUR)": amountRaw,
          "Omschrijving": description || "",
        });
        i = j;
        continue;
      }
    }
    i++;
  }
  return rows;
}

export function looksLikeMT940(text) {
  return text.includes(":61:") && (text.includes(":20:") || text.includes(":25:"));
}
