import { normalizeAutoStatus, normalizeAutoWizard } from "./dossierMigraties.js";

// beide-V6R4 — alle gegevens die bij een dossier horen, op één plek. Automatisch bewaren, het dossierbestand,
// het tellen van wijzigingen en "Ongedaan maken" lazen elk hun eigen, met de hand bijgehouden lijst; die liepen
// uiteen (bij "Ongedaan maken" ontbraken o.a. beginsaldo-correcties en 'klopt zo'-controles). App.jsx maakt met
// deze namen één object met de waarden (dossierGegevens) en één met de zetters (dossierZetters).
// Een nieuw dossierveld: hier toevoegen, en in App.jsx in beide objecten.
export const DOSSIER_VELDEN = [
  "parsedFiles", "accountTypeByFile", "overridesByCounterparty", "overridesByRow", "categoryRules",
  "categoryBtwRates", "btwVerlegd", "korRegeling", "rechtsvorm", "heeftHolding", "holdingBoekingen",
  "excludedDuplicateFingerprints", "dismissedDuplicateNotice", "bevestigdeControles", "businessKeywords", "businessExpenseKeywords",
  "reviewedIncomeKeys", "reviewedPersonKeys", "reviewedOverigKeys",
  "kwartaalStatus", "voorbelastingExcluded", "periodeQuarterOverrides", "reviewedPeriodeKeys", "loanDetails",
  "leaseDetails", "leaseMergedInto", "activaDetails", "confirmedLeaseTypeKeys", "fixedCategories", "excludedManualFingerprints", "transactionNotes",
  "verwachteLease", "verwachteLeaseOverig", "verwachteLening", "verwachteAOV", "heeftVoorraad", "eigenNamen", "eigenRekeningenExtra", "bankKoppelingen", "zakelijkeSpaarRekening", "opdrachtgeversGevraagd",
  "ibStatus", "zvwStatus", "vpbStatus", "zelfstandigenaftrekStatus", "zaLegacyJaDefault", "startersaftrekStatus", "werkruimteStatus", "weergave", "eenvoudigGezien",
  "tariefOverrides", "overigInkomenBox1", "priveAntwoorden", "autoStatus", "autoWizardStatus", "autoActivaDetails", "kmVergoedingDetails",
  "huurZakelijkPercentageStatus", "energieZakelijkPercentageStatus", "gemeentelijkeKostenZakelijkPercentageStatus", "categoryZakelijkPercentage",
  "openingBalanceCorrections", "incomeBtwTarieven", "meerdereTarievenBevestigd", "verwachteAangeboden",
];

// Wisselen tussen Eenvoudig en Uitgebreid telt niet als wijziging (nieuw-V6R6) en wordt niet teruggedraaid:
// die stap gaat maar één kant op (zakelijk-V7R8).
export const NIET_GETELD = new Set(["weergave"]);
export const NIET_TERUGGEZET = new Set(["weergave"]);

const obj = (v) => v || {};
const ofNull = (v) => v ?? null;
const echtObject = (v) => (v && typeof v === "object" ? v : {});
// Bij terugzetten: zelfde opvang van lege waarden als in het oude undoLastAction.
const HERSTEL = {
  transactionNotes: obj, leaseMergedInto: obj, activaDetails: obj, zvwStatus: obj, vpbStatus: obj,
  zelfstandigenaftrekStatus: obj, startersaftrekStatus: obj, werkruimteStatus: obj, tariefOverrides: obj,
  overigInkomenBox1: obj, priveAntwoorden: obj, huurZakelijkPercentageStatus: obj, energieZakelijkPercentageStatus: obj,
  gemeentelijkeKostenZakelijkPercentageStatus: obj, categoryZakelijkPercentage: obj, openingBalanceCorrections: obj,
  bevestigdeControles: obj, verwachteAangeboden: obj, eenvoudigGezien: obj,
  verwachteLease: ofNull, verwachteLeaseOverig: ofNull, verwachteLening: ofNull, verwachteAOV: ofNull, heeftVoorraad: ofNull,
  eigenNamen: ofNull, eigenRekeningenExtra: ofNull, zakelijkeSpaarRekening: ofNull, opdrachtgeversGevraagd: ofNull, incomeBtwTarieven: ofNull,
  meerdereTarievenBevestigd: (v) => v ?? false,
  autoWizardStatus: normalizeAutoWizard, autoStatus: normalizeAutoStatus,
  autoActivaDetails: echtObject, kmVergoedingDetails: echtObject,
  bankKoppelingen: (v) => (Array.isArray(v) ? v : []),
};

// Waarden in vaste volgorde, voor de afhankelijkheden van useEffect.
export const dossierWaardenLijst = (gegevens, zonder = null) =>
  DOSSIER_VELDEN.filter((k) => !zonder || !zonder.has(k)).map((k) => gegevens[k]);

// Zet een momentopname terug. Velden die niet in de momentopname zitten, blijven zoals ze zijn.
export function zetDossierTerug(momentopname, zetters) {
  for (const k of DOSSIER_VELDEN) {
    if (NIET_TERUGGEZET.has(k) || !(k in momentopname)) continue;
    zetters[k]((HERSTEL[k] || ((v) => v))(momentopname[k]));
  }
}
