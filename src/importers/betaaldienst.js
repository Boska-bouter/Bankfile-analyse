// huishoudboekje-V6R6 — de echte partij achter een betaaldienst (ChatGPT-analyse 6-11, Boska akkoord 7-11). Banken zetten bij Tikkie,
// betaalverzoeken en sommige betaalplatforms alleen de dienst als naam ("ABN AMRO Bank NV", "ING Bank NV Betaalverzoek", "Tikkie",
// "Online Payments Foundation"); de echte naam staat in de omschrijving. Dan vielen tientallen verschillende mensen en winkels onder één
// tegenpartij. Nu wordt het "<naam> via <dienst>", net zoals banken het zelf vaak al doen ("Mejedi Houimli via Tikkie"). De oorspronkelijke
// naam blijft bewaard als counterpartyOrigineel (oude keuzes blijven gelden, vingerafdrukken veranderen niet). Werkt voor elke bank.
const DIENST = [
  [/^(abn amro bank n\.?v\.?|aab retail inz tikkie|abn amro inz tikkie|tikkie)$/i, "Tikkie"],
  [/^tikkie zakelijk$/i, "Tikkie Zakelijk"],
  [/^(ing bank n\.?v\.? betaalverzoek|ing betaalverzoek(?: via ing bank n\.?v\.? betaalverzoek)?)$/i, "ING Betaalverzoek"],
  [/^rabo(?:bank)?(?: zakelijk)? betaalverzoek$/i, "Rabo Betaalverzoek"],
  [/^(?:asn bank|asn|sns|regiobank)(?: bank)?(?: voorheen sns)? betaalverzoek$/i, "Betaalverzoek"],
  [/^online payments? foundation$/i, "Online Payments Foundation"],
];
const IBAN = "[A-Z]{2}\\d{2}[A-Z0-9]{10,30}";
const PATRONEN = [
  new RegExp(`\\bBetaling van (.+?) ${IBAN}`),                      // ING-betaalverzoek ontvangen
  new RegExp(`\\bVan ([^,]+), ${IBAN}`, "i"),                        // oude ABN-Tikkie ontvangen ("Tikkie ID …, eten, Van A.N. GERREBRANDS, NL70…")
  new RegExp(`^${IBAN} \\d{10,} ([^:]+):`),                           // Rabo-betaalverzoek ("NL58RABO… 0020006275774378 W.J.A. Schijvenaars:Kortingscode")
  new RegExp(`^(?:B\\w+|\\d{9,}) \\d{12,} (.+?) ${IBAN}`),            // Tikkie betaald ("000482440078 0030010890445540 Latour NL65ABNA…")
  /^tra\w+ \d{10,} (.+?) Online Payments? Foundation/i,               // Online Payments Foundation ("tra10ebc… 0020008816000536 Bundles Nederland B.V. …")
  /^([A-Za-zÀ-ÿ'-]{3,}?)[A-Z]{2}\d{2}[A-Z]{4}\d{6,} \d{10,}/,           // ING-betaalverzoek betaald ("FdHondtNL70INGB0002333065 0051100363354009 Yalla yalla")
  /^([A-Za-zÀ-ÿ'-]{3,}) \d{12,} [A-Z]{2}\d{2}[A-Z]{4}\d{6,}/,           // SNS/ASN-betaalverzoek ("VEFernandez 0750015152542530 NL40SNSB…")
];

function omschrijvingVan(tekst) {
  const t = String(tekst || "");
  const m = /Omschrijving:\s*(.*?)\s*(?:IBAN:|Kenmerk:|Datum\/Tijd:|Valutadatum:|$)/i.exec(t);
  return (m ? m[1] : t).replace(/\s+/g, " ").trim();
}

export function echtePartijAchterDienst(counterparty, description = "", fullDescription = "") {
  const naam = String(counterparty || "").replace(/\s+/g, " ").trim();
  const dienst = DIENST.find(([re]) => re.test(naam))?.[1];
  if (!dienst) return null;
  for (const bron of [fullDescription, description]) {
    const oms = omschrijvingVan(bron);
    if (!oms) continue;
    for (const re of PATRONEN) {
      const m = re.exec(oms);
      const echt = m && m[1].replace(/\s+/g, " ").trim();
      if (echt && echt.length >= 2 && echt.length <= 50 && /[a-zà-ÿ]{2}/i.test(echt) && !/tikkie|betaalverzoek/i.test(echt)) return `${echt} via ${dienst}`;
    }
  }
  return null;
}
