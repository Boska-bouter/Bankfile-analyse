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

// De vaste set SEPA-subveldnamen die in een ":86:"-veld kunnen voorkomen. We herkennen alléén deze
// namen als tag-grens; alles daartussen (ook als het toevallig weer slashes bevat) hoort bij de
// waarde van de voorgaande tag. Dat is nodig omdat CNTP (tegenpartij) en REMI (omschrijving) zelf
// weer uit meerdere, met "/" gescheiden subvelden bestaan — bijv. "/CNTP/<iban>/<bic>/<naam>///REMI/
// USTD//<vrije tekst>/". Matchen op "elke 2-4 hoofdletters tussen twee slashes" (de oude aanpak) laat
// die naam en die vrije tekst wegvallen: de eerstvolgende "/" na de tag werd al als einde van de
// waarde gezien, dus zowel de naam (3e subveld van CNTP) als de eigenlijke omschrijving (2e subveld
// van REMI) gingen verloren, en tegenpartij/omschrijving kwamen dan leeg of met een zinloze waarde
// (bijv. de kale referentiecode "USTD") in de app terecht.
const KNOWN_FIELD86_TAGS = [
  "EREF", "MREF", "CRED", "DEBT", "CNTP", "ORDP", "BENM", "ULTB", "ULTO",
  "PURP", "MARF", "REMI", "RTRN", "NAME", "ADDR", "CSID", "SVCL", "IBAN",
];
const FIELD86_TAG_RE = new RegExp(`/(${KNOWN_FIELD86_TAGS.join("|")})/`, "g");

export function parseMT940Field86(text) {
  const matches = [...text.matchAll(FIELD86_TAG_RE)];
  if (matches.length > 0) {
    const tags = {};
    for (let i = 0; i < matches.length; i++) {
      const tag = matches[i][1];
      const start = matches[i].index + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      // Een afsluitende "/" (of meerdere, bij lege sub-subvelden zoals de "///" tussen CNTP en REMI)
      // is het scheidingsteken náár de volgende tag, niet onderdeel van deze waarde.
      const raw = text.slice(start, end).replace(/\/+$/, "");
      tags[tag] = (tags[tag] ? tags[tag] + " " : "") + raw.trim();
    }

    // CNTP = <iban-of-leeg>/<bic>/<naam>. De naam is het laatst gevulde subveld.
    let cntpIban = "";
    let cntpName = "";
    if (tags.CNTP !== undefined) {
      const parts = tags.CNTP.split("/");
      cntpIban = (parts[0] || "").trim();
      const filled = parts.map((p) => p.trim()).filter(Boolean);
      cntpName = filled.length > 1 ? filled[filled.length - 1] : "";
    }

    // REMI = <structuurcode, meestal "USTD">/<vrije tekst>, of bij een gestructureerde variant nog een
    // extra niveau. We nemen alles na de structuurcode als omschrijving; is er geen "/" gevonden dan
    // was het al één geheel.
    let remiText = "";
    if (tags.REMI !== undefined) {
      const parts = tags.REMI.split("/").map((p) => p.trim()).filter(Boolean);
      remiText = parts.length > 1 ? parts.slice(1).join(" ") : parts[0] || "";
    }

    const counterparty = tags.NAME || cntpName || "";
    const description = remiText || tags.RTRN || "";
    const iban = tags.IBAN || cntpIban || "";
    if (counterparty || description) {
      // Alleen als er ook geen tegenpartij is teruggevonden, valt de ruwe tekst terug als omschrijving
      // (beter een rommelige regel dan helemaal niets); is er wél een tegenpartij, dan blijft een
      // ontbrekende omschrijving gewoon leeg in plaats van de ruwe "/CNTP/.../"-tags te tonen.
      const fallbackDescription = counterparty ? "" : text;
      return { counterparty: normalizeAllCapsName(counterparty), description: description || fallbackDescription, iban };
    }
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
        // :61: zelf mag doorlopen op een vervolgregel (bijv. "/TRCD/00100/", de mutatiesoort-code) —
        // die staat vóór een eventueel :86:-veld. Zonder deze regels over te slaan wordt zo'n
        // vervolgregel abusievelijk gezien als "er is geen :86:", en blijven tegenpartij en
        // omschrijving voor bijna elke transactie leeg terwijl :86: verderop wél gewoon aanwezig is.
        while (j < lines.length && !lines[j].startsWith(":86:") && !/^:\d/.test(lines[j])) {
          j++;
        }
        let field86 = "";
        if (j < lines.length && lines[j].startsWith(":86:")) {
          field86 = lines[j].slice(4);
          j++;
          // Een :86:-vervolgregel is een SWIFT-regelafbreking op een vaste kolombreedte, midden in
          // een woord — geen los "volgend woord". Direct aan elkaar plakken (geen spatie) voorkomt dat
          // een naam als "Bouwbedrijf" hier "Bouwbed rijf" wordt.
          while (j < lines.length && !/^:\d/.test(lines[j])) {
            field86 += lines[j];
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
