// CAMT.053/CAMT.054 XML-import — ISO 20022 "Bank to Customer Statement", een rijker
// XML-gebaseerd bankexportformaat dat door steeds meer Nederlandse banken wordt aangeboden naast
// CSV/MT940. Output in dezelfde rij-vorm als de CSV/MT940-parsers ("Datum", "Naam / Omschrijving",
// "Af Bij", "Bedrag (EUR)", "Omschrijving", "Tegenrekening IBAN/BBAN", en waar mogelijk ook
// "Saldo na mutatie"), zodat de rest van de importpijplijn ongewijzigd werkt.

export function looksLikeCamt053(text) {
  // Geen "<Document" vereisen: bij een namespace-prefix (bijv. "<ns:Document") zou die letterlijke
  // check net mislukken. "camt.053" en "BkToCstmrStmt" zijn op zichzelf al specifiek genoeg.
  return text.includes("camt.053") || text.includes("BkToCstmrStmt");
}

// ---- Namespace-onafhankelijke DOM-helpers ----
// CAMT-bestanden gebruiken bijna altijd een (default) namespace zonder prefix, maar om robuust te
// zijn tegen varianten met een prefix zoeken we op de lokale naam via de "*"-namespace-wildcard
// (breed ondersteund, onderdeel van de DOM-spec) in plaats van op de letterlijke tag-string.
function nsAll(el, tag) {
  return Array.from(el.getElementsByTagNameNS("*", tag));
}
function nsFirst(el, tag) {
  return nsAll(el, tag)[0] || null;
}
function nsText(el, tag) {
  const e = nsFirst(el, tag);
  return e ? (e.textContent || "").trim() : "";
}

function parseAmountEl(amtEl) {
  if (!amtEl) return NaN;
  return parseFloat((amtEl.textContent || "").trim().replace(",", "."));
}

// Balans van een <Bal>-element: alleen "OPBD" (opening booked) of "PRCD" (previous closing,
// gebruikt in plaats van OPBD bij sommige banken) resp. "CLBD" (closing booked) tellen mee.
function findStatementBalance(stmtEl, codes) {
  for (const balEl of nsAll(stmtEl, "Bal")) {
    const code = nsText(balEl, "Cd");
    if (!codes.includes(code)) continue;
    const amtEl = nsFirst(balEl, "Amt");
    const amount = parseAmountEl(amtEl);
    if (isNaN(amount)) continue;
    const sign = nsText(balEl, "CdtDbtInd") === "DBIT" ? -1 : 1;
    return amount * sign;
  }
  return null;
}

function extractParty(scope, isDebitEntry) {
  // Bij een afschrijving (DBIT) is de tegenpartij de crediteur (aan wie betaald is); bij een
  // bijschrijving (CRDT) is de tegenpartij de debiteur (van wie ontvangen is).
  const partyTag = isDebitEntry ? "Cdtr" : "Dbtr";
  const acctTag = isDebitEntry ? "CdtrAcct" : "DbtrAcct";
  const partyEl = nsFirst(scope, partyTag);
  const name = partyEl ? nsText(partyEl, "Nm") : "";
  const acctEl = nsFirst(scope, acctTag);
  const iban = acctEl ? nsText(acctEl, "IBAN") : "";
  return { name, iban };
}

function extractRemittanceInfo(scope) {
  const rmtEl = nsFirst(scope, "RmtInf");
  if (!rmtEl) return "";
  const parts = nsAll(rmtEl, "Ustrd").map((e) => (e.textContent || "").trim()).filter(Boolean);
  return parts.join(" ");
}

function bookingDateOf(ntryEl) {
  const dtEl = nsFirst(ntryEl, "BookgDt") || nsFirst(ntryEl, "ValDt");
  if (!dtEl) return "";
  // <Dt>2024-01-05</Dt> of <DtTm>2024-01-05T10:00:00</DtTm>
  const raw = nsText(dtEl, "Dt") || nsText(dtEl, "DtTm") || (dtEl.textContent || "").trim();
  return raw.slice(0, 10).replace(/-/g, "");
}

function parseStatement(stmtEl) {
  const rows = [];
  const openingBalance = findStatementBalance(stmtEl, ["OPBD", "PRCD"]);
  const closingBalance = findStatementBalance(stmtEl, ["CLBD"]);
  let runningBalance = openingBalance;

  for (const ntryEl of nsAll(stmtEl, "Ntry")) {
    const ntryAmount = parseAmountEl(nsFirst(ntryEl, "Amt"));
    if (isNaN(ntryAmount)) continue;
    const isDebitEntry = nsText(ntryEl, "CdtDbtInd") === "DBIT";
    const signedNtryAmount = isDebitEntry ? -ntryAmount : ntryAmount;
    const dateStr = bookingDateOf(ntryEl);
    if (!dateStr) continue;

    const txDtlsList = nsAll(ntryEl, "TxDtls");
    // Meestal precies 1 TxDtls per Ntry. Bij meerdere (een verzameltransactie/batch) wordt het
    // Ntry-bedrag naar rato verdeeld als er geen eigen bedrag per TxDtls te vinden is — zo blijft
    // de som van de rijen gelijk aan het bedrag dat de bank voor die boeking opgeeft.
    const scopes = txDtlsList.length > 0 ? txDtlsList : [ntryEl];
    const perScopeAmounts = scopes.map((s) => {
      if (s === ntryEl) return signedNtryAmount;
      const txAmtEl = nsFirst(s, "TxAmt");
      const own = txAmtEl ? parseAmountEl(nsFirst(txAmtEl, "Amt")) : NaN;
      return isNaN(own) ? signedNtryAmount / scopes.length : (isDebitEntry ? -own : own);
    });

    scopes.forEach((scope, i) => {
      const amount = Math.round(perScopeAmounts[i] * 100) / 100;
      const { name, iban } = extractParty(scope, isDebitEntry);
      const remittance = extractRemittanceInfo(scope) || nsText(ntryEl, "AddtlNtryInf");
      if (runningBalance != null) runningBalance = Math.round((runningBalance + amount) * 100) / 100;
      rows.push({
        "Datum": dateStr,
        "Naam / Omschrijving": name || remittance || "",
        "Af Bij": amount < 0 ? "D" : "C",
        "Bedrag (EUR)": String(Math.abs(amount)).replace(".", ","),
        "Omschrijving": remittance || "",
        "Tegenrekening IBAN/BBAN": iban || "",
        ...(runningBalance != null ? { "Saldo na mutatie": String(runningBalance).replace(".", ",") } : {}),
      });
    });
  }

  // Sluit onze eigen doorgerekende eindstand aan bij het eindsaldo dat de bank zelf in het
  // bestand claimt? Zo niet, dan hebben we vermoedelijk iets gemist (bijv. een entry-type dat
  // deze parser nog niet kent) — een duidelijke foutmelding is dan beter dan een stil verkeerd
  // resultaat.
  if (openingBalance != null && closingBalance != null && runningBalance != null) {
    const gap = Math.round((runningBalance - closingBalance) * 100) / 100;
    if (Math.abs(gap) >= 0.01) {
      throw new Error(
        `CAMT.053-bestand: het doorgerekende eindsaldo (${runningBalance}) komt niet overeen met het eindsaldo dat ` +
          `de bank zelf opgeeft (${closingBalance}, verschil ${gap}). Mogelijk bevat dit bestand een boekingstype dat ` +
          `deze parser nog niet herkent (bijv. een gestorneerde transactie). Neem contact op zodat dit uitgebreid kan worden.`
      );
    }
  }

  return rows;
}

export function parseCamt053(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error("Kon dit CAMT.053-bestand niet als XML lezen — is het bestand niet beschadigd of onvolledig?");
  }
  const statements = nsAll(doc, "Stmt");
  if (statements.length === 0) {
    throw new Error('Geen <Stmt>-element gevonden — dit lijkt geen geldig CAMT.053 "BkToCstmrStmt"-bestand te zijn.');
  }
  const rows = statements.flatMap(parseStatement);
  if (rows.length === 0) {
    throw new Error("Dit CAMT.053-bestand bevat geen leesbare boekingen (<Ntry>-elementen met bedrag en datum).");
  }
  return rows;
}
