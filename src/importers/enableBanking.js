import { buildColumnMapping } from "./bankProfiles.js";

// nieuw-V3R8 — transacties uit de rechtstreekse bankkoppeling (Enable Banking, PSD2) omzetten naar dezelfde
// rij-vorm als de CAMT.053-parser ("Datum", "Naam / Omschrijving", "Af Bij", "Bedrag (EUR)", ...), zodat de
// rest van de importpijplijn (kolomherkenning, buildTransactions, saldocontrole, classificatie) ongewijzigd werkt.
// Alleen geboekte transacties (status BOOK) tellen mee: een "pending" boeking kan nog veranderen of verdwijnen.

const bedragTekst = (n) => String(Math.round(Math.abs(n) * 100) / 100).replace(".", ",");
const datumVan = (t) => String(t.booking_date || t.value_date || t.transaction_date || "").slice(0, 10);

// Unieke sleutel per transactie, om bij opnieuw ophalen geen dubbele boekingen te krijgen.
export function transactieSleutel(t) {
  if (t.entry_reference) return `ref:${t.entry_reference}`;
  if (t.transaction_id) return `id:${t.transaction_id}`;
  const tegen = t.credit_debit_indicator === "DBIT" ? t.creditor : t.debtor;
  return `x:${datumVan(t)}|${t.credit_debit_indicator}|${t.transaction_amount?.amount}|${tegen?.name || ""}|${(t.remittance_information || []).join(" ")}`;
}

export function transactiesNaarRijen(transacties, eigenIban = "") {
  const geboekt = (transacties || []).filter((t) => !t.status || t.status === "BOOK");
  const rijen = geboekt
    .map((t) => {
      const datum = datumVan(t);
      const bedrag = parseFloat(String(t.transaction_amount?.amount ?? "").replace(",", "."));
      if (!datum || isNaN(bedrag)) return null;
      const af = t.credit_debit_indicator === "DBIT" || (t.credit_debit_indicator !== "CRDT" && bedrag < 0);
      const tegen = af ? t.creditor : t.debtor;
      const tegenRek = af ? t.creditor_account : t.debtor_account;
      const omschrijving = [...(t.remittance_information || []), t.note].filter(Boolean).join(" ").trim();
      const naam = (tegen?.name || "").trim();
      const saldo = t.balance_after_transaction?.balance_amount?.amount;
      return {
        _sort: datum,
        _saldo: saldo != null && saldo !== "" ? String(saldo).replace(".", ",") : null,
        rij: {
          "Datum": datum.replace(/-/g, ""),
          "Naam / Omschrijving": naam || omschrijving || t.bank_transaction_code?.description || "",
          "Af Bij": af ? "D" : "C",
          "Bedrag (EUR)": bedragTekst(bedrag),
          "Omschrijving": omschrijving || t.bank_transaction_code?.description || "",
          "Tegenrekening IBAN/BBAN": tegenRek?.iban || "",
          "Rekening": eigenIban || "",
          "Transactiereferentie": transactieSleutel(t),
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a._sort < b._sort ? -1 : a._sort > b._sort ? 1 : 0));
  // De kolomherkenning kijkt naar de kolommen van de eerste rij: alleen een saldokolom als élke rij een saldo heeft.
  const allemaalSaldo = rijen.length > 0 && rijen.every((r) => r._saldo != null);
  return rijen.map((r) => (allemaalSaldo ? { ...r.rij, "Saldo na mutatie": r._saldo } : r.rij));
}

// Nieuwe rijen samenvoegen met eerder opgehaalde rijen van dezelfde rekening (zonder dubbelingen).
export function voegRijenSamen(oud, nieuw) {
  const gezien = new Set((oud || []).map((r) => r["Transactiereferentie"]).filter(Boolean));
  const extra = (nieuw || []).filter((r) => !gezien.has(r["Transactiereferentie"]));
  const alles = [...(oud || []), ...extra].sort((a, b) => (a["Datum"] < b["Datum"] ? -1 : a["Datum"] > b["Datum"] ? 1 : 0));
  // Saldokolom alleen houden als alle rijen hem hebben (anders klopt de saldocontrole niet).
  const metSaldo = alles.length > 0 && alles.every((r) => r["Saldo na mutatie"] != null);
  const rijen = metSaldo ? alles : alles.map(({ ["Saldo na mutatie"]: _weg, ...r }) => r);
  return { rijen, toegevoegd: extra.length };
}

// Zelfde vorm als parseFile() in detector.js levert.
export function rijenNaarParsedFile(rijen, { bank, iban, naam }) {
  const label = `${bank}${iban ? ` ${iban}` : ""} (koppeling)`;
  const headers = rijen.length ? Object.keys(rijen[0]) : [];
  return {
    headers,
    rows: rijen,
    mapping: buildColumnMapping(headers),
    sourceLabel: naam ? `${label} — ${naam}` : label,
    fileName: label,
    bankKoppeling: { bank, iban },
    ...(iban ? { eigenRekening: iban } : {}),
  };
}
