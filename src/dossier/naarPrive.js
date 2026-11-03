// beide-V13R7 — van een zakelijk dossier een privédossier maken (wens Boska 3-11), zodat eigen woning en box 3 kunnen
// zonder alles opnieuw in te voeren. Zelfde aanpak als "Maak er een Huishoudboekje van" (huishoudboekje-V1R3):
// het origineel blijft zoals het is; dit maakt een nieuw dossierobject met alleen de privérekeningen. De keuzes per
// tegenpartij, de namen en de antwoorden over het huishouden gaan mee; keuzes en notities per boeking krijgen het nieuwe
// boekingsnummer (de nummers lopen door over alle bestanden, dus zonder de zakelijke bestanden verschuiven ze).
// Zakelijke rekeningen worden opgegeven eigen betaalrekeningen: geld van en naar de zaak is een overboeking tussen eigen
// rekeningen, geen inkomen of uitgave. De twee dossiers zijn daarna los van elkaar.
import { buildTransactions, computeOwnAccountByFile } from "../importers/transactions.js";

const bronVan = (pf) => (pf.bankKoppeling ? pf.fileName : pf.sourceLabel);
const norm = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();

// Velden die alleen in een zakelijk dossier betekenis hebben; ze gaan niet mee.
const ALLEEN_ZAKELIJK = [
  "btwVerlegd", "korRegeling", "kwartaalStatus", "voorbelastingExcluded", "periodeQuarterOverrides", "reviewedPeriodeKeys",
  "loanDetails", "leaseDetails", "leaseMergedInto", "activaDetails", "autoActivaDetails", "kmVergoedingDetails",
  "verwachteLease", "verwachteLeaseOverig", "verwachteLening", "verwachteAOV", "autoWizardStatus", "heeftVoorraad",
  "zakelijkeSpaarRekening", "opdrachtgeversGevraagd", "incomeBtwTarieven", "meerdereTarievenBevestigd", "verwachteAangeboden",
  "confirmedLeaseTypeKeys", "ibStatus", "zvwStatus", "vpbStatus", "zelfstandigenaftrekStatus", "startersaftrekStatus",
  "werkruimteStatus", "tariefOverrides", "overigInkomenBox1", "holdingBoekingen", "heeftHolding", "rechtsvorm",
  "categoryZakelijkPercentage", "categoryBtwRates", "businessKeywords", "businessExpenseKeywords", "reviewedIncomeKeys",
  "resumePositie", "overgeslagenStappen", "eenvoudigGezien", "bevestigdeControles", "categoryRules", "fixedCategories",
];

export function naarPrive(project, { weergave = "uitgebreid" } = {}) {
  const bestanden = Array.isArray(project.parsedFiles) ? project.parsedFiles : [];
  const types = project.accountTypeByFile || {};
  const isZakelijk = (pf) => types[pf.fileName] === "Zakelijk";
  const prive = bestanden.filter((pf) => !isZakelijk(pf));
  const zakelijk = bestanden.filter(isZakelijk);

  // Oud → nieuw boekingsnummer: per bestand en volgorde binnen dat bestand.
  const oud = buildTransactions(bestanden);
  const nieuw = buildTransactions(prive);
  const plek = (txs) => { const teller = {}; return txs.map((t) => { teller[t.source] = (teller[t.source] || 0) + 1; return `${t.source}#${teller[t.source]}`; }); };
  const nieuwPerPlek = new Map(plek(nieuw).map((k, i) => [k, nieuw[i].id]));
  const idMap = new Map();
  plek(oud).forEach((k, i) => { if (nieuwPerPlek.has(k)) idMap.set(String(oud[i].id), nieuwPerPlek.get(k)); });
  const herNummer = (obj) => {
    const uit = {};
    for (const [id, v] of Object.entries(obj || {})) if (idMap.has(String(id))) uit[idMap.get(String(id))] = v;
    return uit;
  };

  // Zakelijke rekeningen (geladen of opgegeven) → opgegeven eigen betaalrekening.
  const ibanPerBestand = computeOwnAccountByFile(oud);
  const zakelijkeIbans = new Set(zakelijk.map((pf) => norm(ibanPerBestand[bronVan(pf)])).filter(Boolean));
  const extra = [];
  const gezien = new Set();
  for (const r of Array.isArray(project.eigenRekeningenExtra) ? project.eigenRekeningenExtra : []) {
    const iban = norm(r?.iban);
    if (!iban || gezien.has(iban)) continue;
    gezien.add(iban);
    extra.push(r.accountType === "Zakelijk" ? { iban, accountType: "Prive", soort: "betaal" } : { ...r, iban, accountType: "Prive" });
  }
  for (const iban of zakelijkeIbans) if (!gezien.has(iban)) { gezien.add(iban); extra.push({ iban, accountType: "Prive", soort: "betaal" }); }

  const uit = { ...project };
  for (const k of ALLEEN_ZAKELIJK) delete uit[k];
  const typesUit = {};
  for (const pf of prive) typesUit[pf.fileName] = "Prive";
  return {
    ...uit,
    dossierSoort: "prive",
    weergave,
    parsedFiles: prive,
    accountTypeByFile: typesUit,
    overridesByRow: herNummer(project.overridesByRow),
    transactionNotes: herNummer(project.transactionNotes),
    eigenRekeningenExtra: extra,
    bankKoppelingen: (Array.isArray(project.bankKoppelingen) ? project.bankKoppelingen : []).filter((k) => k?.accountType !== "Zakelijk"),
    auditLog: [...(Array.isArray(project.auditLog) ? project.auditLog.slice(-280) : []), { t: Date.now(), label: `Privédossier gemaakt van een zakelijk dossier (${prive.length} van ${bestanden.length} bestanden, alleen privé)` }],
    savedAt: new Date().toISOString(),
  };
}
