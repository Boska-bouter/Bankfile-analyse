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
      const counterpartyIban = mapping.counterpartyIban ? normalizeIban(r[mapping.counterpartyIban]) : "";
      const description = mapping.description ? String(r[mapping.description] || "").trim() : "";
      const fullDescription = mapping.fullDescription ? String(r[mapping.fullDescription] || "").trim() : description;
      const balance = mapping.balance ? parseEuroNumber(r[mapping.balance]) : NaN;
      fileTx.push({
        id: id++,
        date,
        year: date.getFullYear(),
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        amount,
        counterparty,
        counterpartyIban,
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
  const withBalance = txForFile.filter((t) => t.balance != null).sort((a, b) => a.id - b.id);
  if (withBalance.length < 2) return null;
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
      results.push({
        type, fileA: a.fileName, fileB: b.fileName, aTo: a.to, bFrom: b.from,
        aLastBalance: a.balanceCheck.last, bOpeningBalance: bOpening, diff, ok: Math.abs(diff) < 0.01,
      });
    }
  }
  return results;
}
