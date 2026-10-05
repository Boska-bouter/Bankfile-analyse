import { parseDate } from "../utils/dates.js";
import { parseEuroNumber } from "../utils/amounts.js";
import { normalizeIban } from "../utils/normalization.js";

export function buildTransactions(parsedFiles) {
  const out = [];
  let id = 0;
  for (const pf of parsedFiles) {
    const { rows, mapping, sourceLabel } = pf;
    const fileTx = [];
    for (const r of rows) {
      const dateRaw = mapping.date ? r[mapping.date] : null;
      const date = parseDate(dateRaw);
      if (!date) continue;
      let amount = mapping.amount ? parseEuroNumber(r[mapping.amount]) : NaN;
      if (isNaN(amount)) continue;
      const afbijRaw = mapping.afbij ? String(r[mapping.afbij] || "").toLowerCase() : "";
      if (afbijRaw) {
        const isAf = ["af", "debit", "d", "-"].some((v) => afbijRaw.includes(v));
        const isBij = ["bij", "credit", "c", "+"].some((v) => afbijRaw.includes(v));
        amount = Math.abs(amount) * (isAf && !isBij ? -1 : 1);
      }
      const counterparty = mapping.counterparty ? String(r[mapping.counterparty] || "").trim() : "";
      let counterpartyIban = mapping.counterpartyIban ? normalizeIban(r[mapping.counterpartyIban]) : "";
      const ownAccount = mapping.ownAccount ? normalizeIban(r[mapping.ownAccount]) : "";
      const description = mapping.description ? String(r[mapping.description] || "").trim() : "";
      const fullDescription = mapping.fullDescription ? String(r[mapping.fullDescription] || "").trim() : description;
      // V37 — ING zet bij o.a. incasso-stornoboekingen de tegenrekening niet in de kolom "Tegenrekening"
      // maar alleen in de mededelingen ("... IBAN: NL32ABNA0442706820 Kenmerk: ..."). Zonder
      // terugvaller miste zo'n boeking zijn IBAN (en dus de koppeling met de oorspronkelijke boeking).
      if (!counterpartyIban && mapping.counterpartyIban) {
        const m = /\bIBAN:\s*([A-Z]{2}\d{2}[A-Z0-9]{10,30})/i.exec(`${fullDescription} ${description}`);
        if (m) counterpartyIban = normalizeIban(m[1]);
      }
      const balance = mapping.balance ? parseEuroNumber(r[mapping.balance]) : NaN;
      fileTx.push({
        id: id++,
        date,
        year: date.getFullYear(),
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        amount,
        counterparty,
        counterpartyIban,
        ownAccount,
        description,
        fullDescription,
        source: sourceLabel,
        balance: isNaN(balance) ? null : balance,
      });
    }
    // Herkent of dit bestand overduidelijk over 1 kalenderjaar gaat. Zo ja, dan krijgen losse
    // transacties met een afwijkend jaar een markering mee ("outOfYearRange").
    if (fileTx.length > 0) {
      const yearCounts = {};
      for (const tx of fileTx) yearCounts[tx.year] = (yearCounts[tx.year] || 0) + 1;
      const years = Object.keys(yearCounts);
      const dominantYear = years.reduce((a, b) => (yearCounts[a] >= yearCounts[b] ? a : b));
      const dominantShare = yearCounts[dominantYear] / fileTx.length;
      if (dominantShare >= 0.9) {
        for (const tx of fileTx) {
          if (String(tx.year) !== dominantYear) tx.outOfYearRange = true;
        }
      }
    }
    out.push(...fileTx);
  }
  out.sort((a, b) => a.date - b.date);
  return out;
}

// Controlepas voor het importcontrolescherm: telt per bestand hoeveel regels zijn overgeslagen
// (geen leesbare datum/bedrag) — dat gebeurt in buildTransactions() hierboven stilzwijgend, maar
// hier maken we dat zichtbaar, samen met periode, ontbrekende tegenpartij en de saldo-check.
export function computeImportDiagnostics(parsedFiles, allTransactions, openingBalanceCorrections = {}) {
  return parsedFiles.map((pf) => {
    const { rows, mapping, sourceLabel } = pf;
    let skippedNoDate = 0, skippedBadAmount = 0;
    for (const r of rows) {
      const dateRaw = mapping.date ? r[mapping.date] : null;
      const date = parseDate(dateRaw);
      if (!date) {
        skippedNoDate++;
        continue;
      }
      const amount = mapping.amount ? parseEuroNumber(r[mapping.amount]) : NaN;
      if (isNaN(amount)) skippedBadAmount++;
    }
    const fileTx = allTransactions.filter((t) => t.source === sourceLabel);
    const missingCounterparty = fileTx.filter((t) => !t.counterparty && !t.description).length;
    const dates = fileTx.map((t) => t.date.getTime());
    const from = dates.length ? new Date(Math.min(...dates)) : null;
    const to = dates.length ? new Date(Math.max(...dates)) : null;
    const balanceCheck = checkBalanceConsistency(fileTx, openingBalanceCorrections[sourceLabel]);
    return {
      fileName: sourceLabel, totalRows: rows.length, importedCount: fileTx.length,
      skippedNoDate, skippedBadAmount, missingCounterparty, from, to, balanceCheck,
    };
  });
}

// Controleert of het opgetelde bedrag van alle transacties overeenkomt met het verschil tussen
// het eerste en laatste "saldo na mutatie" — brengt ontbrekende of dubbel ingelezen transacties
// aan het licht. Retourneert null als er geen saldokolom is.
//
// Gesorteerd op `id` (= exact de volgorde van de regels in het bronbestand), NIET op datum: het
// "saldo na mutatie" dat de bank in het bestand zet, is opgebouwd in de eigen volgorde van de
// bank — die is meestal wel chronologisch, maar niet gegarandeerd, en een resort op datum kan dan
// juist een vals-positieve afwijking laten zien op een andere plek dan waar het echt misgaat.
// Zo blijft dit ook 1-op-1 vergelijkbaar met het origineel bij het uitzoeken van een afwijking.
//
// `openingBalanceOverride` (optioneel): laat het beginsaldo van het bestand handmatig corrigeren
// — bijvoorbeeld als het beginsaldo op 1 januari net niet exact aansluit bij het eindsaldo van
// 31 december van het voorgaande jaar (een ander bestand, een andere periode-afsluiting, of een
// mutatie die buiten dit bestand valt) en je dat bewust als uitgangspunt wilt nemen in plaats van
// het eerste saldo dat in dít bestand staat.
export function checkBalanceConsistency(txForFile, openingBalanceOverride) {
  const byFileOrder = txForFile.filter((t) => t.balance != null).sort((a, b) => a.id - b.id);
  if (byFileOrder.length < 2) return null;
  // Sommige banken exporteren nieuwste-eerst (de meest recente mutatie bovenaan het bestand) —
  // het "saldo na mutatie" is dan nog steeds chronologisch opgebouwd, alleen in de tegenovergestelde
  // richting van de bestandsvolgorde. Vergelijk de datum van de eerste met de laatste regel (in
  // bestandsvolgorde) om dat te herkennen, en reken in dat geval terug in werkelijk-chronologische
  // volgorde — anders lijkt het saldo systematisch niet te kloppen terwijl er niets mis is.
  const isNewestFirst = byFileOrder[0].date > byFileOrder[byFileOrder.length - 1].date;
  const withBalance = isNewestFirst ? [...byFileOrder].reverse() : byFileOrder;
  const first = withBalance[0];
  const last = withBalance[withBalance.length - 1];
  const openingBalance = openingBalanceOverride != null ? openingBalanceOverride : first.balance;
  const sumBetween = withBalance.slice(1).reduce((a, t) => a + t.amount, 0);
  const expected = openingBalance + sumBetween;
  const diff = Math.round((expected - last.balance) * 100) / 100;
  const ok = Math.abs(diff) < 0.01;

  let breakpoints = [];
  if (!ok) {
    let runningBalance = openingBalance;
    for (let i = 1; i < withBalance.length; i++) {
      const tx = withBalance[i];
      const expectedBalance = Math.round((runningBalance + tx.amount) * 100) / 100;
      const actualBalance = Math.round(tx.balance * 100) / 100;
      const rowDiff = Math.round((expectedBalance - actualBalance) * 100) / 100;
      if (Math.abs(rowDiff) >= 0.01) {
        breakpoints.push({ tx, expectedBalance, actualBalance, diff: rowDiff });
      }
      runningBalance = tx.balance;
    }
  }
  return {
    ok, diff, first: openingBalance, fileOpeningBalance: first.balance, last: last.balance,
    isCorrected: openingBalanceOverride != null && openingBalanceOverride !== first.balance,
    breakpoints: breakpoints.slice(0, 10),
  };
}

// Vergelijkt, per rekeningtype (Zakelijk/Prive), het eindsaldo van het ene bestand met het
// beginsaldo van het eerstvolgende (chronologisch) bestand — bijv. eindsaldo 31-12-2023 tegenover
// beginsaldo 1-1-2024. Puur informatief: een klein verschil is heel normaal (bank-afronding, een
// mutatie die net over de jaargrens valt, of simpelweg twee afzonderlijke periode-exports die niet
// exact op elkaar aansluiten) en betekent niet per se een fout in een van beide bestanden.
//
// v260 — was één harde grens (€100, alles daarboven "rood"/een echt gat). Op expliciet verzoek nu
// drie niveaus, specifiek voor het aansluitverschil tussen twee bestanden bij zo'n overgang: tot
// €500 verschil maakt voor het dossier meestal weinig uit (groen, alleen een opmerking), €500–€999
// is de moeite waard om even te bekijken (geel), en pas vanaf €1000 telt het als een echt gat
// (rood) dat de jaarstatus beïnvloedt en in het Aangiftevoorstel als waarschuwing verschijnt.
export const CONTINUITY_GAP_GEEL = 500;
export const CONTINUITY_GAP_ROOD = 1000;
// Losstaande, ongewijzigde tolerantie voor de saldocontrole bínnen één bestand (begin- + mutaties =
// eindsaldo van dát bestand) — een ander soort check dan de aansluiting tussen twee bestanden
// hierboven, en bewust niet meegeschoven naar €1000 toen die grens drie niveaus kreeg.
export const INTRA_FILE_BALANCE_THRESHOLD = 100;

export function classifyContinuityGap(diff) {
  const abs = Math.abs(diff);
  if (abs >= CONTINUITY_GAP_ROOD) return "rood";
  if (abs >= CONTINUITY_GAP_GEEL) return "geel";
  return "groen";
}

export function computeFileContinuity(diagnostics, accountTypeByFile) {
  const results = [];
  const groups = {};
  for (const d of diagnostics) {
    const type = accountTypeByFile[d.fileName];
    if (!type || !d.from || !d.to || !d.balanceCheck) continue;
    (groups[type] ||= []).push(d);
  }
  for (const [type, files] of Object.entries(groups)) {
    const sorted = files.slice().sort((a, b) => a.from - b.from);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (b.from <= a.to) continue; // overlappende periodes — geen zinvol aansluitpunt
      const bOpening = b.balanceCheck.fileOpeningBalance;
      const diff = Math.round((bOpening - a.balanceCheck.last) * 100) / 100;
      const ok = Math.abs(diff) < 0.01;
      results.push({
        type, fileA: a.fileName, fileB: b.fileName, aTo: a.to, bFrom: b.from,
        aLastBalance: a.balanceCheck.last, bOpeningBalance: bOpening, diff, ok,
        severity: ok ? "groen" : classifyContinuityGap(diff),
      });
    }
  }
  return results;
}

// Herkent een IBAN-achtige reeks in de bestandsnaam zelf (landcode + 2 controlecijfers + minstens
// 10 tekens) — veel bankexports (en deze tool zelf, bij een eerdere download) noemen het bestand
// naar het rekeningnummer, bijv. "2025NL63INGB0008292483_2025-01-01_2025-12-31.940". Alleen als
// fallback gebruikt, dus de kans dat een toevallige cijferreeks in de bestandsnaam hiermee verward
// wordt is verwaarloosbaar (een IBAN-patroon is te specifiek om per ongeluk te ontstaan).
const IBAN_IN_FILENAME_RE = /[A-Z]{2}\d{2}[A-Z0-9]{10,30}/;

// Bepaalt per bestand het eigen rekeningnummer (uit de "ownAccount"-kolom, indien aanwezig) —
// nodig om overboekingen tussen je eigen rekeningen te herkennen wanneer je meerdere eigen
// bestanden tegelijk laadt. Neemt de eerst-gevonden, niet-lege waarde per bestand (die is per
// bestand toch steeds hetzelfde rekeningnummer). Bevat het bankbestand zelf geen bruikbaar eigen
// rekeningnummer (sommige CSV-exports hebben geen "eigen rekening"-kolom), dan wordt de
// bestandsnaam als fallback doorzocht op een IBAN-achtige reeks.
export function computeOwnAccountByFile(allTransactions) {
  const result = {};
  for (const tx of allTransactions) {
    if (result[tx.source]) continue;
    if (tx.ownAccount) result[tx.source] = tx.ownAccount;
  }
  const sources = new Set(allTransactions.map((tx) => tx.source));
  for (const source of sources) {
    if (result[source]) continue;
    const match = String(source || "").toUpperCase().match(IBAN_IN_FILENAME_RE);
    if (match) result[source] = match[0];
  }
  return result;
}
