// MT940 (SWIFT-bankafschriftformaat) parsen naar dezelfde "rij"-vorm als een geparste CSV, zodat
// de rest van de importpijplijn (kolomherkenning, transactie-opbouw, categorisering) ongewijzigd
// werkt voor dit formaat.

// Haalt tegenpartij/omschrijving uit een MT940 ":86:"-veld. Nederlandse banken gebruiken daarin
// vaak gestructureerde SEPA-subvelden zoals "/NAME/.../REMI/...", die we er specifiek uithalen;
// is er niets gestructureerds gevonden, dan gebruiken we de hele tekst als omschrijving (en ook
// als tegenpartij, zodat er in elk geval iets bruikbaars staat).
// MT940-velden (zowel de SEPA-slashtags als het ABN-labelformaat) staan van oorsprong in
// hoofdletters (SWIFT-conventie) — dat geldt voor een bedrijfsnaam én voor een persoonsnaam. Dat
// botst met de "staat volledig in hoofdletters" heuristiek in looksLikePerson (die daar elders
// juist automatische/institutionele omschrijvingen aan herkent) en zou een echte naam als
// "MATEUSZ SKOWRONSKI" onterecht als niet-persoon bestempelen. Daarom hier terugbrengen naar een
// normale schrijfwijze — initialen/korte tokens (max 2 tekens) blijven ongemoeid.
function normalizeAllCapsName(name) {
  if (!name) return name;
  const letters = name.replace(/[^a-zA-Z]/g, "");
  if (!letters || letters !== letters.toUpperCase() || letters === letters.toLowerCase()) return name;
  return name
    .split(" ")
    .map((word) => (word.length <= 2 ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(" ");
}

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
    const iban = tags.IBAN || "";
    return { counterparty: normalizeAllCapsName(counterparty), description, iban };
  }
  // Sommige banken (o.a. ABN AMRO) gebruiken in :86: geen SEPA-slashvelden maar losse,
  // dubbelepunt-gescheiden labels op één doorlopende regel, bijv.:
  // "SEPA OVERBOEKING   IBAN: NL85ABNA0885366433 BIC: ABNANL2A   NAAM: M SKOWRONSKI
  //  OMSCHRIJVING: OWN TRANSFER" — zonder deze herkenning bleef de hele rommelige regel
  // als tegenpartij/omschrijving staan (nooit een naam, geen IBAN).
  const labelPattern = /(IBAN|BIC|NAAM|OMSCHRIJVING|KENMERK|MACHTIGING ID|INCASSANT ID):\s*/g;
  const labelMatches = [...text.matchAll(labelPattern)];
  if (labelMatches.length > 0) {
    const leading = text.slice(0, labelMatches[0].index).trim();
    const labeled = {};
    for (let i = 0; i < labelMatches.length; i++) {
      const label = labelMatches[i][1];
      const start = labelMatches[i].index + labelMatches[i][0].length;
      const end = i + 1 < labelMatches.length ? labelMatches[i + 1].index : text.length;
      labeled[label] = text.slice(start, end).trim();
    }
    return {
      counterparty: normalizeAllCapsName(labeled.NAAM || leading || ""),
      description: labeled.OMSCHRIJVING || leading || text,
      iban: labeled.IBAN || "",
    };
  }
  return { counterparty: text, description: text, iban: "" };
}

export function parseMT940(text) {
  const lines = text.split(/\r\n|\r|\n/);
  const rows = [];
  let ownAccount = ""; // uit :25: — geldt voor alle :61:-regels erna, tot een eventuele volgende :25:
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith(":25:")) {
      ownAccount = line.slice(4).trim();
      i++;
      continue;
    }
    if (line.startsWith(":61:")) {
      // 6 cijfers waardedatum (YYMMDD), optioneel 4 cijfers boekdatum (MMDD), C/D (evt. met R
      // ervoor bij een storneringsregel — dan is het teken juist omgekeerd), bedrag met komma,
      // een N + 3-4 tekens mutatiesoort (SWIFT-standaard is alfabetisch zoals "NTRF", maar
      // sommige banken — waaronder ABN AMRO — gebruiken hier een numerieke eigen code zoals
      // "N526"), en de rest is een referentie.
      const m = line.match(/^:61:(\d{6})(\d{4})?(R?[CD])(\d+,\d*)N?[A-Z0-9]{3,4}(.*)$/);
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
        const { counterparty, description, iban } = parseMT940Field86(field86.trim());
        const yyyy = "20" + valueDate.slice(0, 2);
        const mm = valueDate.slice(2, 4);
        const dd = valueDate.slice(4, 6);
        rows.push({
          "Datum": `${yyyy}${mm}${dd}`,
          "Naam / Omschrijving": counterparty || description || "",
          "Af Bij": isCredit ? "C" : "D",
          "Bedrag (EUR)": amountRaw,
          "Omschrijving": description || "",
          "Tegenrekening IBAN/BBAN": iban || "",
          "Rekening": ownAccount,
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
