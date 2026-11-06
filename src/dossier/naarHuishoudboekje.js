// huishoudboekje-V1R3 — van een bestaand (zakelijk of privé) dossier een Huishoudboekje maken (wens Boska 2-11).
// Het origineel blijft zoals het is: dit maakt een nieuw dossierobject met alleen de privérekeningen. De keuzes per
// tegenpartij gaan mee; keuzes en notities per boeking krijgen het nieuwe boekingsnummer (de nummers lopen door over
// alle bestanden, dus zonder de zakelijke bestanden verschuiven ze). Zakelijke rekeningen worden opgegeven eigen
// rekeningen van de soort "bedrijf": wat daarvandaan binnenkomt, telt als inkomen uit eigen bedrijf.
import { buildTransactions, computeOwnAccountByFile } from "../importers/transactions.js";

const bronVan = (pf) => (pf.bankKoppeling ? pf.fileName : pf.sourceLabel);
const norm = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();

// Velden die alleen in een zakelijk of privé (belasting)dossier betekenis hebben; ze gaan niet mee.
const ALLEEN_BELASTING = [
  "btwVerlegd", "korRegeling", "kwartaalStatus", "voorbelastingExcluded", "periodeQuarterOverrides", "reviewedPeriodeKeys",
  "loanDetails", "leaseDetails", "leaseMergedInto", "activaDetails", "autoActivaDetails", "kmVergoedingDetails",
  "verwachteLease", "verwachteLeaseOverig", "verwachteLening", "verwachteAOV", "autoWizardStatus", "heeftVoorraad",
  "zakelijkeSpaarRekening", "opdrachtgeversGevraagd", "incomeBtwTarieven", "meerdereTarievenBevestigd", "verwachteAangeboden",
  "confirmedLeaseTypeKeys", "ibStatus", "zvwStatus", "vpbStatus", "zelfstandigenaftrekStatus", "startersaftrekStatus",
  "werkruimteStatus", "tariefOverrides", "overigInkomenBox1", "holdingBoekingen", "heeftHolding", "rechtsvorm",
  "categoryZakelijkPercentage", "categoryBtwRates", "businessKeywords", "businessExpenseKeywords", "reviewedIncomeKeys",
  "resumePositie", "overgeslagenStappen", "eenvoudigGezien", "bevestigdeControles",
];

export function naarHuishoudboekje(project, { van = "dossier" } = {}) {
  const bestanden = Array.isArray(project.parsedFiles) ? project.parsedFiles : [];
  const types = project.accountTypeByFile || {};
  const isZakelijk = (pf) => types[pf.fileName] === "Zakelijk";
  const privé = bestanden.filter((pf) => !isZakelijk(pf));
  const zakelijk = bestanden.filter(isZakelijk);

  // Oud → nieuw boekingsnummer: per bestand en volgorde binnen dat bestand.
  const oud = buildTransactions(bestanden);
  const nieuw = buildTransactions(privé);
  const plek = (txs) => { const teller = {}; return txs.map((t) => { teller[t.source] = (teller[t.source] || 0) + 1; return `${t.source}#${teller[t.source]}`; }); };
  const nieuwPerPlek = new Map(plek(nieuw).map((k, i) => [k, nieuw[i].id]));
  const idMap = new Map();
  plek(oud).forEach((k, i) => { if (nieuwPerPlek.has(k)) idMap.set(String(oud[i].id), nieuwPerPlek.get(k)); });
  const herNummer = (obj) => {
    const uit = {};
    for (const [id, v] of Object.entries(obj || {})) if (idMap.has(String(id))) uit[idMap.get(String(id))] = v;
    return uit;
  };

  // Zakelijke rekeningen (geladen of opgegeven) → opgegeven eigen rekening "bedrijf".
  const ibanPerBestand = computeOwnAccountByFile(oud);
  const zakelijkeIbans = new Set(zakelijk.map((pf) => norm(ibanPerBestand[bronVan(pf)])).filter(Boolean));
  const extra = [];
  const gezien = new Set();
  for (const r of Array.isArray(project.eigenRekeningenExtra) ? project.eigenRekeningenExtra : []) {
    const iban = norm(r?.iban);
    if (!iban || gezien.has(iban)) continue;
    gezien.add(iban);
    extra.push(r.accountType === "Zakelijk" ? { iban, accountType: "Prive", soort: "bedrijf" } : { ...r, iban, accountType: "Prive" });
  }
  for (const iban of zakelijkeIbans) if (!gezien.has(iban)) { gezien.add(iban); extra.push({ iban, accountType: "Prive", soort: "bedrijf" }); }

  const uit = { ...project };
  for (const k of ALLEEN_BELASTING) delete uit[k];
  // Uit een zakelijk dossier: de zakelijke categorieregels en vaste lasten passen niet bij de privé-indeling; het
  // Huishoudboekje begint dan met de eigen standaard (zoals een nieuw dossier). Je keuzes per tegenpartij blijven.
  if (project.dossierSoort !== "prive" && project.dossierSoort !== "huishoudboekje") { delete uit.categoryRules; delete uit.fixedCategories; }
  const typesUit = {};
  for (const pf of privé) typesUit[pf.fileName] = "Prive";
  return {
    ...uit,
    dossierSoort: "huishoudboekje",
    weergave: "uitgebreid",
    parsedFiles: privé,
    accountTypeByFile: typesUit,
    overridesByRow: herNummer(project.overridesByRow),
    transactionNotes: herNummer(project.transactionNotes),
    eigenRekeningenExtra: extra,
    bankKoppelingen: (Array.isArray(project.bankKoppelingen) ? project.bankKoppelingen : []).filter((k) => k?.accountType !== "Zakelijk"),
    auditLog: [...(Array.isArray(project.auditLog) ? project.auditLog.slice(-280) : []), { t: Date.now(), label: `Huishoudboekje gemaakt van ${van} (${privé.length} van ${bestanden.length} bestanden, alleen privé)` }],
    savedAt: new Date().toISOString(),
  };
}

// Hoeveel privé- en zakelijke bestanden heeft dit dossier (voor de uitleg in het venster)?
export function telRekeningen(parsedFiles = [], accountTypeByFile = {}) {
  let prive = 0, zakelijk = 0;
  for (const pf of parsedFiles) (accountTypeByFile[pf.fileName] === "Zakelijk" ? zakelijk++ : prive++);
  return { prive, zakelijk };
}
