import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Check, Download, Trash2, Loader2, Printer, X, Lock, ChevronDown, ChevronRight, ListTree, Settings, AlertTriangle, Users, HelpCircle, Copy } from "lucide-react";

import { parseFile } from "./importers/detector.js";
import { buildTransactions, checkBalanceConsistency, computeImportDiagnostics, computeFileContinuity, computeOwnAccountByFile, CONTINUITY_GAP_THRESHOLD } from "./importers/transactions.js";
import ImportControlPanel from "./components/upload/ImportControlPanel.jsx";
import { resolveClassification } from "./classification/classify.js";
import { scoreClassification } from "./classification/confidence.js";
import { DEFAULT_RULES, mergeCategoryRules, migrateLegacyCategoryName, DEFAULT_FIXED_CATEGORIES, INCOME_TRANSFER_CATEGORIES, MAIN_CATEGORY_ORDER, MAIN_CATEGORY_DEFAULT_SUBTYPE, mainCategoryOf, subtypesForMainCategory, fiscalTreatmentOf } from "./classification/categories.js";
import { DEFAULT_BTW_RATES, EMPTY_BTW_RATES, mergeBtwRates, BTW_RATES_VERSION, DEFAULT_VOORBELASTING_EXCLUDED, computeQuarterlyBtwForYear, computeQuarterlyCostBreakdown, computeYearlyCostBreakdown } from "./tax/btw.js";
import { computeYearlySummary, computeYearlyOpenOB, computeVolledigeJaren, computeBusinessAdvies } from "./tax/yearlySummary.js";
import { computeGedeeldeHuurVoorJaar } from "./tax/gedeeldeHuur.js";
import { computeSplitsbareCategorieTotalenVoorJaar, heeftGeregistreerdeAutoOpDeZaak } from "./tax/categorySplit.js";
import {
  estimateIncomeTax, estimateZvw, computeOndernemersaftrekMetReserve, estimateIncomeTaxMetOndernemersaftrek,
  estimateZvwMetOndernemersaftrek, resolveZelfstandigenaftrekStatusForYear, computeBelastbareWinstUitsplitsing,
} from "./tax/incomeTax.js";
import { computePeriodeMismatches } from "./tax/periodDetection.js";
import { useLoansAndLease } from "./hooks/useLoansAndLease.js";
import { computeDuplicateInfo } from "./importers/duplicates.js";
import { computeIncomeSummary, computeCategorySummary, computeIncomeCategorySummary } from "./classification/reviewSummaries.js";
import { eur } from "./utils/amounts.js";
import { counterpartyKey, ibanKey, extractKeywordCandidate, normalizePersonName, ibansMatch } from "./utils/normalization.js";
import { makeUndoWrapped } from "./utils/withUndo.js";
import {
  loadPersistedParsedFiles, persistParsedFiles, clearPersistedData,
  loadPersistedSettings, persistSettings, clearPersistedSettings,
} from "./storage/projectStorage.js";
import { buildProjectFile, downloadProjectFile, readProjectFile } from "./storage/projectFile.js";
import ConfirmBanner from "./components/shared/ConfirmBanner.jsx";
import HelpPanel from "./components/shared/HelpPanel.jsx";
import HelpHint from "./components/shared/HelpHint.jsx";
import HelpPopupModal from "./components/shared/HelpPopupModal.jsx";
import CategoryChangeScopeModal from "./components/shared/CategoryChangeScopeModal.jsx";
import CategoryPercentageScopeModal from "./components/shared/CategoryPercentageScopeModal.jsx";
import SetupWizardModal from "./components/upload/SetupWizardModal.jsx";
import RekeninghouderModal from "./components/shared/RekeninghouderModal.jsx";
import { CategorySummaryCard, DetailTable } from "./components/overview/GroupView.jsx";
import BtwRatesPanel from "./components/btw/BtwRatesPanel.jsx";
import IncomeReviewStep from "./components/review/IncomeReviewStep.jsx";
import ReviewStep from "./components/review/ReviewStep.jsx";
import QuarterlyBtwPanel from "./components/btw/QuarterlyBtwPanel.jsx";
import { computeChecklistLikeDataForYear } from "./tax/checklist.js";
import OnzekerhedenPanel from "./components/overview/OnzekerhedenPanel.jsx";
import RecurringPaymentsPanel from "./components/overview/RecurringPaymentsPanel.jsx";
import MultiYearOverview from "./components/overview/MultiYearOverview.jsx";
import MultiYearOverviewBV from "./components/overview/MultiYearOverviewBV.jsx";
import { computeRekeningCourantVerloop, computeEigenVermogenVerloop, computeBvSignalering } from "./tax/bv.js";
import BvSignaleringPanel from "./components/overview/BvSignaleringPanel.jsx";
import HoldingBoekingenPanel from "./components/overview/HoldingBoekingenPanel.jsx";
import { estimateVpb } from "./tax/vpb.js";
import TodoPanel from "./components/dashboard/TodoPanel.jsx";
import AangifteStatusBar from "./components/dashboard/AangifteStatusBar.jsx";
import DashboardOverview from "./components/dashboard/DashboardOverview.jsx";
import StickyTopNav from "./components/dashboard/StickyTopNav.jsx";
import ClassificationConfidencePanel from "./components/dashboard/ClassificationConfidencePanel.jsx";
import UncertainTransactionsModal from "./components/dashboard/UncertainTransactionsModal.jsx";
import DuplicateGroupDetailModal from "./components/dashboard/DuplicateGroupDetailModal.jsx";
import KeywordSuggestionModal from "./components/shared/KeywordSuggestionModal.jsx";
import VerwachteMatchModal from "./components/shared/VerwachteMatchModal.jsx";
import CategoryOverviewModal from "./components/shared/CategoryOverviewModal.jsx";
import UpdateAvailableBanner from "./components/shared/UpdateAvailableBanner.jsx";
import { useVersionCheck } from "./hooks/useVersionCheck.js";
import StickyYearNav from "./components/dashboard/StickyYearNav.jsx";
import CategoryRulesPanel from "./components/settings/CategoryRulesPanel.jsx";
import CounterpartyRulesPanel from "./components/settings/CounterpartyRulesPanel.jsx";
import KeywordManager from "./components/settings/KeywordManager.jsx";
import FixedCategoriesPanel from "./components/settings/FixedCategoriesPanel.jsx";
import PeriodeReviewStep from "./components/review/PeriodeReviewStep.jsx";
import LoanInterestPanel from "./components/loans/LoanInterestPanel.jsx";
import LeaseInterestPanel from "./components/loans/LeaseInterestPanel.jsx";
import LoanDetailsModal from "./components/loans/LoanDetailsModal.jsx";
import FinancialLeaseDetailsModal from "./components/loans/FinancialLeaseDetailsModal.jsx";
import AutoOpDeZaakDetailsModal from "./components/loans/AutoOpDeZaakDetailsModal.jsx";
import ActivaPanel from "./components/loans/ActivaPanel.jsx";
import PersoonlijkeAannamesPanel from "./components/overview/PersoonlijkeAannamesPanel.jsx";
import CategoryPercentagePanel from "./components/overview/CategoryPercentagePanel.jsx";
import ActivaDetailsModal from "./components/loans/ActivaDetailsModal.jsx";
import { computeActivaSummary, computeAfschrijvingPerJaar, computeActivaAfschrijvingForYear } from "./tax/activa.js";
import { computeIbBoxMapping } from "./tax/boxMapping.js";
import RawFileReviewModal from "./components/upload/RawFileReviewModal.jsx";
import { exportExcel } from "./reports/excelExport.js";
import { buildAangiftevoorstelHtml, downloadAangiftevoorstel } from "./reports/aangiftevoorstel.js";
import { buildAangiftevoorstelBvHtml, downloadAangiftevoorstelBv } from "./reports/aangiftevoorstel-bv.js";
import { printReport, printHtmlDocument } from "./reports/printReport.js";
import { computeLoanRenteForYear, computeLeaseRenteForYear } from "./tax/loanAmortization.js";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, isCompleteFinancialLeaseDetails } from "./tax/financialLease.js";
import { computeLeaseAutoKostenVoorJaar } from "./tax/autoBijtelling.js";
import { computeAutoActivaKostenVoorJaar, combineAutoKosten } from "./tax/autoActiva.js";
import { computeKmVergoedingVoorJaar } from "./tax/kmVergoeding.js";

// ---------------------------------------------------------------------------
// Dit is bewust een MINIMALE, functionele schil rond de volledig gemigreerde
// logicalagen (importers/, classification/, tax/, storage/, utils/) — niet een
// volledige 1-op-1 kopie van de originele ~2000-regelige hoofdcomponent.
//
// Wat hier al werkt, end-to-end, met de nieuwe module-structuur:
//   upload -> rekeningtype per bestand -> parseFile() -> buildTransactions() ->
//   resolveClassification() (met correcties) -> per-jaar detailtabel, direct
//   bewerkbaar (categorie/type, tegenpartij-breed) -> categorietotalen + saldo-check
//   + project opslaan/laden (downloadbaar .json-bestand, incl. correcties/instellingen)
//   + automatisch bewaren per browser (window.storage), net als de vorige versie
//   + "Wis alles" en een geactualiseerd Help-paneel
//
// Wat hier NOG NIET zit (volgende fase van het migratieplan):
//   - review-stappen (inkomstenbronnen, overboekingen aan personen, "Overig" opruimen,
//     factuurperiode)
//   - BTW-kwartaaloverzicht, meerjarenoverzicht, aangiftevoorstel
//   - leningen/lease-invoervensters, instellingen-hub (categorieregels bewerken,
//     BTW-tarieven), zoeken/filteren in de detailtabel, "Werk te doen"-dashboard,
//     importcontrole-scherm
// ---------------------------------------------------------------------------

// Bepaalt de rechtsvorm bij het inladen van bestaande instellingen/een projectbestand. Ontbreekt
// het veld helemaal (een bestand/instellingen van vóór deze functie bestond) dan is dat altijd een
// bestaand zzp-dossier — direct "zzp", nooit de nieuwe vraag. Staat het veld er al wel (ook al is
// de waarde nog null, dus nog niet beantwoord), dan wordt die waarde gerespecteerd.
function resolveRechtsvorm(obj) {
  if (!obj || !Object.prototype.hasOwnProperty.call(obj, "rechtsvorm")) return "zzp";
  return typeof obj.rechtsvorm === "string" ? obj.rechtsvorm : null;
}

// Zelfde migratie-redenering als resolveRechtsvorm hierboven: ontbreekt het veld helemaal (een
// bestand van vóór deze vraag bestond), dan is er nooit een holding-vraag gesteld — behandel dat
// als "nee" (nooit meer vragen). Staat het veld er al wel (ook al is de waarde nog null, dus nog
// niet beantwoord), dan wordt die waarde gerespecteerd.
function resolveHeeftHolding(obj) {
  if (!obj || !Object.prototype.hasOwnProperty.call(obj, "heeftHolding")) return false;
  return typeof obj.heeftHolding === "boolean" ? obj.heeftHolding : null;
}

// mergeCategoryRules/mergeBtwRates migreren een oude categorienaam (bijv. "Boekhouder & advies" →
// "Boekhouder, accountant & administratie") al voor de categorieregels en de BTW-tarieven, maar
// overridesByCounterparty/overridesByRow zijn losse, per-transactie opgeslagen keuzes die dezelfde
// oude naam net zo goed nog letterlijk kunnen bevatten (bijv. een handmatige override die vóór de
// hernoeming is gezet). Zonder deze migratie blijven die transacties voor altijd onder de oude,
// niet meer bestaande naam hangen — ze vallen dan uit de win-en-verliesrekening in "Nog niet
// ingedeeld", ook al is er geen categorisatieprobleem, alleen een verouderde naam.
function migrateOverridesCategories(overrides) {
  if (!overrides || typeof overrides !== "object") return overrides || {};
  const out = {};
  for (const [key, val] of Object.entries(overrides)) {
    if (!val || typeof val !== "object" || !val.category) {
      out[key] = val;
      continue;
    }
    // "Terugboeking van prive" was tot v213 ook de naam voor de PRIVÉ-kant van deze overboeking
    // (geld terug náár zakelijk) — sindsdien heet dat aan de privékant "Terugboeking naar zakelijk"
    // (zie classify.js), zodat de twee kanten van deze boeking niet meer dezelfde naam delen. De
    // generieke migrateLegacyCategoryName hieronder kan deze migratie niet doen (die kent geen
    // `type`), dus dit specifieke geval eerst, vóór de generieke hernoeming.
    const category = val.category === "Terugboeking van prive" && val.type === "Prive"
      ? "Terugboeking naar zakelijk"
      : migrateLegacyCategoryName(val.category);
    out[key] = { ...val, category };
  }
  return out;
}

// v195 — punt 9 uit het reviewdocument: dezelfde statustekst als in het gegenereerde rapport
// (reports/aangiftevoorstel.js, functie statusTekst) — géén nieuw statussysteem, alleen dezelfde
// bestaande yearlyProgress-status (afgeleid uit categorisatie/onzekere transacties/bestandsgaten)
// nu ook zichtbaar vóórdat je het rapport genereert. "Groen" betekent hier uitdrukkelijk alleen dat
// de gegevenscontrole voldoende compleet is — niet dat de aangifte fiscaal correct is.
function aangifteStatusTekst(status, aantalPunten) {
  if (status === "rood") return "Nog onvoldoende gegevens voor een betrouwbare reconstructie";
  if (status === "oranje") return `Berekening beschikbaar — ${aantalPunten} punt${aantalPunten === 1 ? "" : "en"} controleren`;
  return "Berekening kan worden opgesteld";
}

export default function App() {
  const [parsedFiles, setParsedFiles] = useState([]);
  const [accountTypeByFile, setAccountTypeByFile] = useState({});
  const [categoryRules, setCategoryRules] = useState(DEFAULT_RULES);
  const [overridesByCounterparty, setOverridesByCounterparty] = useState({});
  const [overridesByRow, setOverridesByRow] = useState({});
  const [categoryBtwRates, setCategoryBtwRates] = useState(DEFAULT_BTW_RATES);
  const [btwVerlegd, setBtwVerlegd] = useState(null); // null = nog niet gevraagd
  const [korRegeling, setKorRegeling] = useState(null); // null = nog niet gevraagd
  // null = nog niet gevraagd (nieuw project); "zzp" | "bv". Bij het laden van bestaande
  // instellingen/projectbestanden die dit veld nog niet kennen (van vóór deze functie), wordt dit
  // altijd direct op "zzp" gezet — nooit null — zodat bestaande zzp-gebruikers deze vraag nooit te
  // zien krijgen en al hun bestaande gedrag exact hetzelfde blijft. Zie resolveRechtsvorm hieronder.
  const [rechtsvorm, setRechtsvorm] = useState(null);
  // null = nog niet gevraagd, alleen relevant zolang rechtsvorm === "bv". Zie resolveHeeftHolding.
  const [heeftHolding, setHeeftHolding] = useState(null);
  // Handmatig ingevoerde boekingen van de holding zelf — géén los bankbestand/eigen classificatie
  // (dat vraagt een veel grotere uitbreiding, zie het bouwplan). { "2025": { kapitaalstorting,
  // dividendOntvangen } }. Alleen gebruikt als heeftHolding === true, puur om te vergelijken met
  // de al berekende bedragen aan de kant van de werkmaatschappij (Kapitaalstorting/
  // Dividenduitkering-categorieën) — een simpele controle, geen eigen boekhouding.
  const [holdingBoekingen, setHoldingBoekingen] = useState({});
  const [excludedDuplicateFingerprints, setExcludedDuplicateFingerprints] = useState([]);
  const [dismissedDuplicateNotice, setDismissedDuplicateNotice] = useState(false);
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);
  const [excludedManualFingerprints, setExcludedManualFingerprints] = useState([]);
  // v203: vrije toelichtingstekst per transactie (bijv. "naheffing Q2 2025 LB"), voor als de
  // bank-omschrijving zelf niet duidelijk genoeg is. Gesleuteld op dezelfde inhoud-gebaseerde
  // "fingerprint" als excludedManualFingerprints hierboven (niet het technische, sessie-gebonden
  // tx.id) — zie duplicates.js — zodat een toelichting ook na herladen van het project blijft staan.
  const [transactionNotes, setTransactionNotes] = useState({}); // { [fingerprint]: string }
  const [reviewFileModal, setReviewFileModal] = useState(null);
  // v237 — houdt bij welke groep "mogelijk dubbele transacties" de gebruiker in detail wil vergelijken
  // (originele regels naast elkaar, incl. IBAN/volledige omschrijving/saldo per bestand).
  const [duplicateDetailGroup, setDuplicateDetailGroup] = useState(null);
  const [openingBalanceCorrections, setOpeningBalanceCorrections] = useState({}); // { fileName: number }
  const [businessKeywords, setBusinessKeywords] = useState([]);
  const [businessExpenseKeywords, setBusinessExpenseKeywords] = useState([]);
  const [reviewedIncomeKeys, setReviewedIncomeKeys] = useState([]);
  const [reviewedPersonKeys, setReviewedPersonKeys] = useState([]);
  const [reviewedOverigKeys, setReviewedOverigKeys] = useState([]);
  const [kwartaalStatus, setKwartaalStatus] = useState({});
  const [voorbelastingExcluded, setVoorbelastingExcluded] = useState(DEFAULT_VOORBELASTING_EXCLUDED);
  const [fixedCategories, setFixedCategories] = useState(DEFAULT_FIXED_CATEGORIES);
  const [ibStatus, setIbStatus] = useState({}); // { "2025": { gedaan: bool } }
  const [zvwStatus, setZvwStatus] = useState({}); // { "2025": { gedaan: bool } }
  // { "2025": "ja" | "nee" | "onbekend" } — ontbrekend jaar = niet aangegeven; wat dat dan betekent
  // hangt af van zaLegacyJaDefault hieronder (v194).
  const [zelfstandigenaftrekStatus, setZelfstandigenaftrekStatusState] = useState({});
  // v194 — punt 13 uit het reviewdocument: een onbeantwoord urencriterium-jaar rekende altijd
  // stilzwijgend met "ja" (zelfstandigenaftrek toegepast) — veilig voor bestaande dossiers wier
  // cijfers daarmee niet met terugwerkende kracht veranderen, maar een verkeerde indruk voor een
  // gebruiker die nog niets heeft ingevuld. true = dit gedrag behouden (default bij het LADEN van
  // een projectbestand van vóór deze wijziging, zie loadProjectFile hieronder); false = een
  // onbeantwoord jaar toont voortaan beide scenario's naast elkaar, net als een expliciete
  // "Onbekend"-keuze — de default voor een gloednieuw dossier (nog nooit een project geladen).
  // Zie resolveZelfstandigenaftrekStatusForYear in tax/incomeTax.js.
  const [zaLegacyJaDefault, setZaLegacyJaDefault] = useState(false);
  // { "2025": "ja" | "nee" } — ontbrekend jaar = niet aangegeven, geen startersaftrek toegepast.
  const [startersaftrekStatus, setStartersaftrekStatusState] = useState({});
  // { "2025": "zaak" | "prive" | "beide" } — of de auto van de zaak is (koop/operational/financial
  // lease), een privéauto zakelijk gebruikt wordt, of beide. Ontbrekend jaar = onbekend/niet
  // aangegeven — dan blijft de generieke %-splitsing (SPLITSBARE_CATEGORIEEN, zie
  // tax/categorySplit.js) op Brandstof/Parkeren gewoon bruikbaar, zoals nu. Vanaf v174 bepaalt dit
  // veld of Brandstof/Parkeren voor dat jaar uit die %-splitsing gehaald worden ten gunste van het
  // aparte auto-bijtellings-/km-vergoedingsmodel — in v173 alleen de vraag/opslag, nog geen effect
  // op de berekening.
  const [autoStatus, setAutoStatusState] = useState({});
  // { "2025": percentage (0-100) } — percentage zakelijk gebruik van "Huur (deels zakelijk)" per
  // jaar. Ontbrekend jaar = 100% (volledig aftrekbaar) — zie tax/gedeeldeHuur.js.
  const [huurZakelijkPercentageStatus, setHuurZakelijkPercentageStatusState] = useState({});
  // { categorie: { "2025": percentage (0-100) } } — generieke percentage-zakelijk-splitsing per
  // bestaande categorie per jaar (zie tax/categorySplit.js). In tegenstelling tot
  // huurZakelijkPercentageStatus hierboven (dat alleen voor de aparte categorie "Huur (deels
  // zakelijk)" geldt) werkt dit direct op elke bestaande "kosten"/"geen"-categorie, zonder dat
  // transacties van categorie hoeven te wisselen. Ontbrekende categorie/jaar = standaardgedrag
  // (100% voor "kosten", 0% voor "geen").
  const [categoryZakelijkPercentage, setCategoryZakelijkPercentageState] = useState({});
  // "Correctie privé-uitgaven" is verwijderd (overbodig geworden na Route B: de tool signaleert nu
  // zelf al wanneer zakelijke kosten vanaf de privérekening zijn betaald).
  const [aangiftevoorstelPreview, setAangiftevoorstelPreview] = useState(null); // HTML-string of null
  const [showAangifteYearPicker, setShowAangifteYearPicker] = useState(false);
  const [showAangifteMeerdereJaren, setShowAangifteMeerdereJaren] = useState(false); // "Ander jaar/meerdere jaren kiezen" binnen het Aangiftevoorstel-blok
  const [selectedAangifteYears, setSelectedAangifteYears] = useState([]);
  const [periodeQuarterOverrides, setPeriodeQuarterOverrides] = useState({});
  const [reviewedPeriodeKeys, setReviewedPeriodeKeys] = useState([]);
  const [loanDetails, setLoanDetails] = useState({});
  const [loanDetailsModalKey, setLoanDetailsModalKey] = useState(null);
  const [leaseDetails, setLeaseDetails] = useState({});
  const [leaseMergedInto, setLeaseMergedInto] = useState({}); // { bronKey: doelKey }
  const [leaseDetailsModalKey, setLeaseDetailsModalKey] = useState(null);
  const [activaDetails, setActivaDetails] = useState({});
  const [activaDetailsModalKey, setActivaDetailsModalKey] = useState(null);
  const [verwachteLease, setVerwachteLease] = useState(null); // null=nog niet gevraagd | [{naam, gevonden}, ...] (leeg = geen)
  const [verwachteLening, setVerwachteLening] = useState(null); // zelfde vorm als verwachteLease
  const [verwachteAOV, setVerwachteAOV] = useState(null);
  // null=nog niet gevraagd (wizard toont de vraag) | { status: "geen"|"zaak"|"prive"|"beide",
  // soort: "koop"|"operational"|"financial"|null }. Eén keer gevraagd bij het opstarten van een
  // dossier (net als verwachteLease/verwachteAOV hierboven), zet bij "zaak"/"prive"/"beide" de
  // standaardwaarde van autoStatus (zie hieronder) voor alle jaren in het dossier — per jaar is dat
  // daarna nog te corrigeren in "Persoonlijke aannames". Bij `soort: "financial"` verschijnt
  // aansluitend gewoon de bestaande leaseauto-vraag (stap 6) voor de contractdetails.
  const [autoWizardStatus, setAutoWizardStatus] = useState(null);
  // Bijtelling/afschrijving-gegevens voor een auto op de zaak die GEEN financiële lease is (dus
  // autoWizardStatus.soort "koop" of "operational") — zie tax/autoActiva.js en
  // AutoOpDeZaakDetailsModal.jsx. Financiële lease heeft hier al leaseDetails/
  // FinancialLeaseDetailsModal voor (gekoppeld aan de banktransacties van dat contract); "koop" en
  // "operational" hebben geen leningschema om aan op te hangen, vandaar dit eigen, eenvoudiger,
  // dossierbrede (niet per-lease) object. Standaard `{}` = niets ingevuld = geen enkel effect op de
  // berekening (net als leaseDetails/activaDetails bij een nieuw dossier).
  const [autoActivaDetails, setAutoActivaDetails] = useState({});
  const [showAutoActivaModal, setShowAutoActivaModal] = useState(false);
  // Kilometervergoeding per jaar voor een privéauto die zakelijk wordt gebruikt (autoStatus
  // "prive"/"beide") — zie tax/kmVergoeding.js. { [jaar]: { zakelijkeKilometers, vergoedingPerKm } }.
  // Standaard `{}` = niets ingevuld = geen effect op de berekening.
  const [kmVergoedingDetails, setKmVergoedingDetailsState] = useState({});
  const [heeftVoorraad, setHeeftVoorraad] = useState(null); // null | true | false
  const [eigenNamen, setEigenNamen] = useState(null); // null=nog niet gevraagd | {ondernemer, partner}
  const [showRekeninghouderModal, setShowRekeninghouderModal] = useState(false);
  const [eigenRekeningenExtra, setEigenRekeningenExtra] = useState(null); // null=nog niet gevraagd | [{iban, accountType}, ...] (leeg = geen)
  // null=nog niet gevraagd | {status: "ja"|"nee", naam: string|null} — of er een zakelijke
  // spaarrekening aan de zakelijke rekening hangt. Herkenning van overboekingen ernaartoe werkt
  // ook zónder deze vraag te beantwoorden (generieke trefwoorden zoals "spaarrekening"), dit is
  // vooral bedoeld voor een afwijkende naamgeving bij een andere bank, en kan altijd later nog
  // via de wizard worden ingevuld/aangevuld als het pas bij het controleren opvalt.
  const [zakelijkeSpaarRekening, setZakelijkeSpaarRekening] = useState(null);
  const [opdrachtgeversGevraagd, setOpdrachtgeversGevraagd] = useState(null); // null=nog niet gevraagd | true
  // Wizard-vraag "onder welk(e) BTW-tarief/tarieven vallen je diensten" — kan meer dan één zijn
  // aangevinkt. incomeBtwTarieven onthoudt de volledige keuze (bijv. ["9","21"]); het gekozen
  // "meest voorkomende" tarief wordt los als standaard op de generieke "Zakelijke inkomsten"-
  // categorie gezet (zie setIncomeBtwRateChoice). meerdereTarievenBevestigd houdt bij of de
  // "Werk te doen"-herinnering om de minder vaak voorkomende tarieven per klant na te lopen al is
  // afgevinkt.
  const [incomeBtwTarieven, setIncomeBtwTarieven] = useState(null); // null=nog niet gevraagd | ["9","21"] e.d.
  const [meerdereTarievenBevestigd, setMeerdereTarievenBevestigd] = useState(false);
  const [verwachteMatchSuggestie, setVerwachteMatchSuggestie] = useState(null); // {type, naam, matches, targetCategory}
  const [verwachteAangeboden, setVerwachteAangeboden] = useState({}); // {lease: aantalTransactiesToenGecontroleerd, ...}
  const [confirmedLeaseTypeKeys, setConfirmedLeaseTypeKeys] = useState([]);
  const [incomeSearch, setIncomeSearch] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [showPersonReview, setShowPersonReview] = useState(true);
  const [showOverigReview, setShowOverigReview] = useState(true);
  const [openConfidenceLevel, setOpenConfidenceLevel] = useState(null); // null | "heuristic" | "fallback"
  const [keywordSuggestion, setKeywordSuggestion] = useState(null); // { keyword, category, type, matches, sourceName }
  const [showCategoryOverview, setShowCategoryOverview] = useState(false);
  const { updateAvailable } = useVersionCheck();
  const [showSetupWizard, setShowSetupWizard] = useState(false); // gaat alleen open bij het laden van een bestand (zie handleFiles)
  // v199: handmatig geopend via de "Basisvragen bewerken"-knop — in dat geval moet de Rechtsvorm-
  // stap (zzp/BV) altijd in de wizard-wachtrij komen, ook als hij al eerder beantwoord is (zie
  // forceRechtsvormStep op SetupWizardModal), zodat je rechtsvorm achteraf nog kunt omzetten.
  const [manualWizardOpen, setManualWizardOpen] = useState(false);
  const [overigSearch, setOverigSearch] = useState("");
  const [activeYear, setActiveYear] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [lastSavedAt, setLastSavedAt] = useState(null); // Date — wanneer de automatische browseropslag voor het laatst is gelukt
  const [loadedProjectFileName, setLoadedProjectFileName] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpPopupChapter, setHelpPopupChapter] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState(null);
  const [lastActionSnapshot, setLastActionSnapshot] = useState(null); // { label, state }
  const projectFileInputRef = useRef(null);
  const bankFileInputRef = useRef(null); // v227 — "Bestand laden"-knop in de header, naast "Project opslaan"
  const skipNextPersistRef = useRef(false);
  const duplicatesSectionRef = useRef(null);
  const confidenceSectionRef = useRef(null);
  const personReviewSectionRef = useRef(null);
  const overigReviewSectionRef = useRef(null);
  const quarterlyBtwSectionRef = useRef(null);
  const multiYearSectionRef = useRef(null);
  const btwSettingsSectionRef = useRef(null);
  const checklistSectionRef = useRef(null);
  const obIbSectionRef = useRef(null);
  const periodeReviewSectionRef = useRef(null);
  const loansSectionRef = useRef(null);
  const leasesSectionRef = useRef(null);
  const incomeRatesSectionRef = useRef(null);
  const bvSignaleringSectionRef = useRef(null); // v219 — dashboard fase 3
  const detailsSectionRef = useRef(null); // v219 — sticky navbalk "Details"
  const importControleSectionRef = useRef(null); // v240 — mini-dashboard "Controleren"

  // ---- Tabbladen (v228) — de app was tot nu toe één lange scroll-pagina met een sticky navbalk die
  // alleen naar secties VERDER OP DEZELFDE PAGINA scrolde (StickyTopNav / jumpToSection hierboven).
  // Nu zijn het echte tabbladen: alle secties blijven altijd gemount (lokale state zoals
  // zoekvelden/ReviewStep-rijstate en de scroll-refs hierboven blijven zo intact), maar per sectie
  // wordt met een CSS display:none/block bepaald of hij zichtbaar is voor het actieve tabblad. Zie
  // TAB_KEYS/REF_TAB_ENTRIES/sectionTabStyle hieronder en de tabToevoeging her en der in de JSX.
  // v235 — "Details" is samengevoegd met "Controleren" (de detailtabellen staan onderaan dat
  // tabblad, ná de andere controlesecties — zie de fysieke volgorde in de JSX verderop, die bepaalt
  // wat waar staat binnen één tabblad).
  const TAB_KEYS = ["overzicht", "controleren", "resultaten", "instellingen"];
  const [activeTab, setActiveTab] = useState("overzicht");
  // Eén bron van waarheid voor "welke sectie-ref hoort bij welk tabblad" — gebruikt door
  // jumpToSection hieronder om bij een kruis-tabblad-sprong eerst het juiste tabblad te activeren
  // en dan pas te scrollen (de sectie stond tot dat moment op display:none).
  const REF_TAB_ENTRIES = [
    [importControleSectionRef, "controleren"],
    [confidenceSectionRef, "controleren"],
    [personReviewSectionRef, "controleren"],
    [overigReviewSectionRef, "controleren"],
    [duplicatesSectionRef, "controleren"],
    [periodeReviewSectionRef, "controleren"],
    [checklistSectionRef, "overzicht"],
    [multiYearSectionRef, "resultaten"],
    [quarterlyBtwSectionRef, "resultaten"],
    [obIbSectionRef, "resultaten"],
    [loansSectionRef, "resultaten"],
    [leasesSectionRef, "resultaten"],
    [bvSignaleringSectionRef, "resultaten"],
    [btwSettingsSectionRef, "instellingen"],
    [incomeRatesSectionRef, "instellingen"],
    [detailsSectionRef, "controleren"],
  ];
  // Klein hulpje om een sectie te tonen/verbergen op basis van het actieve tabblad, zonder 'm te
  // unmounten (zie de kop van dit blok hierboven).
  const sectionTabStyle = (tabKey) => ({ display: activeTab === tabKey ? undefined : "none" });
  // Wordt gezet door jumpToSection zodra er eerst nog van tabblad gewisseld moet worden — de
  // daadwerkelijke scrollIntoView gebeurt pas ná die tabwissel (zie de useEffect hieronder), anders
  // scrollt hij naar een sectie die nog display:none staat.
  const [pendingScrollRef, setPendingScrollRef] = useState(null);

  const effectiveCategoryBtwRates = korRegeling ? EMPTY_BTW_RATES : categoryBtwRates;

  const applySettingsToState = (settings) => {
    // De bestandsnaam van het laatst opgeslagen/geladen projectbestand hoort hier ook bij hersteld
    // te worden — anders "vergeet" de tool die naam zodra de sessie hervat wordt vanuit de
    // automatische browseropslag (bijv. na een tool-update of het herstarten van de browser), en
    // valt "Project opslaan" onterecht terug op de standaardnaam in plaats van door te tellen op de
    // bestandsnaam die al in gebruik was.
    setLoadedProjectFileName(settings.loadedProjectFileName ?? null);
    setAccountTypeByFile(settings.accountTypeByFile || {});
    setOverridesByCounterparty(migrateOverridesCategories(settings.overridesByCounterparty));
    setOverridesByRow(migrateOverridesCategories(settings.overridesByRow));
    if (Array.isArray(settings.categoryRules)) setCategoryRules(mergeCategoryRules(settings.categoryRules));
    setCategoryBtwRates(mergeBtwRates(settings.categoryBtwRates, settings.btwRatesVersion, migrateLegacyCategoryName));
    setBtwVerlegd(typeof settings.btwVerlegd === "boolean" ? settings.btwVerlegd : null);
    setKorRegeling(typeof settings.korRegeling === "boolean" ? settings.korRegeling : null);
    setRechtsvorm(resolveRechtsvorm(settings));
    setHeeftHolding(resolveHeeftHolding(settings));
    setHoldingBoekingen(settings.holdingBoekingen && typeof settings.holdingBoekingen === "object" ? settings.holdingBoekingen : {});
    setExcludedDuplicateFingerprints(Array.isArray(settings.excludedDuplicateFingerprints) ? settings.excludedDuplicateFingerprints : []);
    setDismissedDuplicateNotice(!!settings.dismissedDuplicateNotice);
    setExcludedManualFingerprints(Array.isArray(settings.excludedManualFingerprints) ? settings.excludedManualFingerprints : []);
    setTransactionNotes(settings.transactionNotes && typeof settings.transactionNotes === "object" ? settings.transactionNotes : {});
    setBusinessKeywords(Array.isArray(settings.businessKeywords) ? settings.businessKeywords : []);
    setBusinessExpenseKeywords(Array.isArray(settings.businessExpenseKeywords) ? settings.businessExpenseKeywords : []);
    setReviewedIncomeKeys(Array.isArray(settings.reviewedIncomeKeys) ? settings.reviewedIncomeKeys : []);
    setReviewedPersonKeys(Array.isArray(settings.reviewedPersonKeys) ? settings.reviewedPersonKeys : []);
    setReviewedOverigKeys(Array.isArray(settings.reviewedOverigKeys) ? settings.reviewedOverigKeys : []);
    setKwartaalStatus(settings.kwartaalStatus && typeof settings.kwartaalStatus === "object" ? settings.kwartaalStatus : {});
    setVoorbelastingExcluded(Array.isArray(settings.voorbelastingExcluded) ? settings.voorbelastingExcluded : DEFAULT_VOORBELASTING_EXCLUDED);
    setFixedCategories(Array.isArray(settings.fixedCategories) ? settings.fixedCategories : DEFAULT_FIXED_CATEGORIES);
    setPeriodeQuarterOverrides(settings.periodeQuarterOverrides && typeof settings.periodeQuarterOverrides === "object" ? settings.periodeQuarterOverrides : {});
    setReviewedPeriodeKeys(Array.isArray(settings.reviewedPeriodeKeys) ? settings.reviewedPeriodeKeys : []);
    setLoanDetails(settings.loanDetails && typeof settings.loanDetails === "object" ? settings.loanDetails : {});
    setLeaseDetails(settings.leaseDetails && typeof settings.leaseDetails === "object" ? settings.leaseDetails : {});
    setActivaDetails(settings.activaDetails && typeof settings.activaDetails === "object" ? settings.activaDetails : {});
    setVerwachteLease(settings.verwachteLease ?? null);
    setVerwachteLening(settings.verwachteLening ?? null);
    setVerwachteAOV(settings.verwachteAOV ?? null);
    setAutoWizardStatus(settings.autoWizardStatus ?? null);
    setAutoActivaDetails(settings.autoActivaDetails && typeof settings.autoActivaDetails === "object" ? settings.autoActivaDetails : {});
    setKmVergoedingDetailsState(settings.kmVergoedingDetails && typeof settings.kmVergoedingDetails === "object" ? settings.kmVergoedingDetails : {});
    setHeeftVoorraad(settings.heeftVoorraad ?? null);
    setEigenNamen(settings.eigenNamen ?? null);
    setEigenRekeningenExtra(settings.eigenRekeningenExtra ?? null);
    setZakelijkeSpaarRekening(settings.zakelijkeSpaarRekening ?? null);
    setOpdrachtgeversGevraagd(settings.opdrachtgeversGevraagd ?? null);
    setIncomeBtwTarieven(settings.incomeBtwTarieven ?? null);
    setMeerdereTarievenBevestigd(settings.meerdereTarievenBevestigd ?? false);
    setVerwachteAangeboden(settings.verwachteAangeboden && typeof settings.verwachteAangeboden === "object" ? settings.verwachteAangeboden : {});
    setLeaseMergedInto(settings.leaseMergedInto && typeof settings.leaseMergedInto === "object" ? settings.leaseMergedInto : {});
    setConfirmedLeaseTypeKeys(Array.isArray(settings.confirmedLeaseTypeKeys) ? settings.confirmedLeaseTypeKeys : []);
    setIbStatus(settings.ibStatus && typeof settings.ibStatus === "object" ? settings.ibStatus : {});
    setZvwStatus(settings.zvwStatus && typeof settings.zvwStatus === "object" ? settings.zvwStatus : {});
    setZelfstandigenaftrekStatusState(settings.zelfstandigenaftrekStatus && typeof settings.zelfstandigenaftrekStatus === "object" ? settings.zelfstandigenaftrekStatus : {});
    // v194: ontbreekt deze vlag (browseropslag van vóór deze wijziging), dan is dit een dossier dat
    // al bestond vóór het urencriterium-standaardgedrag veranderde — behoud dan het oude gedrag
    // (onbeantwoord jaar = "ja") in plaats van de nieuwe, veiligere default ("onbekend").
    setZaLegacyJaDefault(settings.zaLegacyJaDefault === false ? false : true);
    setStartersaftrekStatusState(settings.startersaftrekStatus && typeof settings.startersaftrekStatus === "object" ? settings.startersaftrekStatus : {});
    setAutoStatusState(settings.autoStatus && typeof settings.autoStatus === "object" ? settings.autoStatus : {});
    setHuurZakelijkPercentageStatusState(settings.huurZakelijkPercentageStatus && typeof settings.huurZakelijkPercentageStatus === "object" ? settings.huurZakelijkPercentageStatus : {});
    setCategoryZakelijkPercentageState(settings.categoryZakelijkPercentage && typeof settings.categoryZakelijkPercentage === "object" ? settings.categoryZakelijkPercentage : {});
    setOpeningBalanceCorrections(settings.openingBalanceCorrections && typeof settings.openingBalanceCorrections === "object" ? settings.openingBalanceCorrections : {});
  };
  const setKwartaalStatusField = (key, field, value) => {
    snapshotBeforeAction("BTW-kwartaalstatus aangepast");
    setKwartaalStatus((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };
  const setHoldingBoekingField = (year, field, value) => {
    snapshotBeforeAction("Holding-boeking aangepast");
    setHoldingBoekingen((prev) => ({ ...prev, [year]: { ...(prev[year] || {}), [field]: value } }));
  };
  const setTransactionNote = (tx, note) => {
    const fp = fingerprintByTxId[tx.id];
    if (!fp) return;
    snapshotBeforeAction("Toelichting aangepast");
    setTransactionNotes((prev) => {
      const trimmed = (note || "").trim();
      if (!trimmed) {
        if (!(fp in prev)) return prev;
        const next = { ...prev };
        delete next[fp];
        return next;
      }
      return { ...prev, [fp]: trimmed };
    });
  };
  const setIbGedaan = (year, gedaan) => {
    snapshotBeforeAction("IB-status aangepast");
    setIbStatus((prev) => ({ ...prev, [year]: { gedaan } }));
  };
  const setZvwGedaan = (year, gedaan) => {
    snapshotBeforeAction("Zvw-status aangepast");
    setZvwStatus((prev) => ({ ...prev, [year]: { gedaan } }));
  };
  const setZelfstandigenaftrekStatus = (year, status) => {
    snapshotBeforeAction("Zelfstandigenaftrek-status aangepast");
    setZelfstandigenaftrekStatusState((prev) => {
      const next = { ...prev };
      if (status) next[year] = status;
      else delete next[year];
      return next;
    });
  };
  // Zet de standaardwaarde van zelfstandigenaftrekStatus in één keer voor alle jaren in het dossier
  // — v192, gebruikt door de nieuwe wizard-vraag (zie SetupWizardModal), die maar één keer per
  // dossier wordt gesteld terwijl zelfstandigenaftrekStatus zelf een per-jaar instelling is. Zelfde
  // patroon als seedAutoStatusForAllYears hierboven. status=null (bijv. "weet ik nog niet") zet
  // bewust niets — de wizard toont die keuze dan ook niet als los te kiezen optie (zie de wizard-
  // stap zelf), zodat "niets gezet" hier hetzelfde betekent als vóór deze wizard-vraag bestond
  // (rekent voorlopig met "Ja", zie de toelichting bij PersoonlijkeAannamesPanel.jsx).
  const seedZelfstandigenaftrekStatusForAllYears = (yearsList, status) => {
    if (!status || !yearsList || yearsList.length === 0) return;
    snapshotBeforeAction("Zelfstandigenaftrek-status ingesteld (wizard)");
    setZelfstandigenaftrekStatusState((prev) => {
      const next = { ...prev };
      for (const y of yearsList) next[y] = status;
      return next;
    });
  };
  const setStartersaftrekStatus = (year, status) => {
    snapshotBeforeAction("Startersaftrek-status aangepast");
    setStartersaftrekStatusState((prev) => {
      const next = { ...prev };
      if (status) next[year] = status;
      else delete next[year];
      return next;
    });
  };
  const setAutoStatus = (year, status) => {
    snapshotBeforeAction("Auto-status aangepast");
    setAutoStatusState((prev) => {
      const next = { ...prev };
      if (status) next[year] = status;
      else delete next[year];
      return next;
    });
  };
  // Zet de standaardwaarde van autoStatus in één keer voor alle jaren in het dossier — gebruikt door
  // de wizard-vraag (zie SetupWizardModal), die maar één keer per dossier wordt gesteld terwijl
  // autoStatus zelf een per-jaar instelling is. status=null (bijv. "geen auto"/"onbekend") wist
  // eventueel eerder gezette jaren niet weer terug naar onbekend — er is dan gewoon niets te zetten.
  const seedAutoStatusForAllYears = (yearsList, status) => {
    if (!status || !yearsList || yearsList.length === 0) return;
    snapshotBeforeAction("Auto-status ingesteld (wizard)");
    setAutoStatusState((prev) => {
      const next = { ...prev };
      for (const y of yearsList) next[y] = status;
      return next;
    });
  };
  // Opslaan vanuit AutoOpDeZaakDetailsModal (zie tax/autoActiva.js) — dossierbreed, niet per jaar
  // (net als leaseDetails per contract, maar hier is er maar één object omdat "koop"/"operational"
  // geen los leningschema per contract kennen om aan te koppelen).
  const setAutoActivaDetailsField = (details) => {
    snapshotBeforeAction("Auto op de zaak (bijtelling/afschrijving) aangepast");
    setAutoActivaDetails(details);
  };
  // Kilometervergoeding-invoer per jaar (zie tax/kmVergoeding.js) — `veld` is "zakelijkeKilometers"
  // of "vergoedingPerKm". Leeg/0 op beide velden verwijdert het jaar weer uit de map (geen effect).
  const setKmVergoedingField = (year, veld, waarde) => {
    snapshotBeforeAction("Kilometervergoeding aangepast");
    setKmVergoedingDetailsState((prev) => {
      const next = { ...prev };
      const huidig = { ...(next[year] || {}) };
      if (waarde === "" || waarde == null) delete huidig[veld];
      else huidig[veld] = Number(waarde);
      if (!huidig.zakelijkeKilometers && !huidig.vergoedingPerKm) delete next[year];
      else next[year] = huidig;
      return next;
    });
  };
  const setHuurZakelijkPercentageStatus = (year, percentage) => {
    snapshotBeforeAction("Percentage zakelijk gebruik huur aangepast");
    setHuurZakelijkPercentageStatusState((prev) => {
      const next = { ...prev };
      if (percentage != null && percentage !== "") next[year] = Number(percentage);
      else delete next[year];
      return next;
    });
  };
  const setCategoryZakelijkPercentage = (category, year, percentage) => {
    snapshotBeforeAction("Percentage zakelijk per categorie aangepast");
    setCategoryZakelijkPercentageState((prev) => {
      const next = { ...prev };
      const forCategory = { ...(next[category] || {}) };
      if (percentage != null && percentage !== "") forCategory[year] = Number(percentage);
      else delete forCategory[year];
      if (Object.keys(forCategory).length > 0) next[category] = forCategory;
      else delete next[category];
      return next;
    });
  };
  // "Voor welke jaren geldt dit percentage?" — alleen relevant zodra het dossier meer dan 1 jaar
  // heeft (anders is er toch maar 1 mogelijk antwoord) én er een percentage wordt INgevuld (leeg
  // maken/wissen blijft altijd meteen alleen voor het actieve jaar, geen vraag nodig).
  const [pendingCategoryPercentage, setPendingCategoryPercentage] = useState(null); // { category, percentage, activeYear, years } | null
  const requestSetCategoryZakelijkPercentage = (category, year, percentage) => {
    if (percentage == null || percentage === "" || years.length <= 1) {
      setCategoryZakelijkPercentage(category, year, percentage);
      return;
    }
    setPendingCategoryPercentage({ category, percentage: Number(percentage), activeYear: year, years });
  };
  const applyCategoryPercentageToYears = (yearsToApply) => {
    if (!pendingCategoryPercentage || yearsToApply.length === 0) return;
    const { category, percentage } = pendingCategoryPercentage;
    snapshotBeforeAction("Percentage zakelijk per categorie aangepast (meerdere jaren)");
    setCategoryZakelijkPercentageState((prev) => {
      const next = { ...prev };
      const forCategory = { ...(next[category] || {}) };
      for (const y of yearsToApply) forCategory[y] = percentage;
      next[category] = forCategory;
      return next;
    });
    setPendingCategoryPercentage(null);
  };

  // ---- Eerder opgeslagen project laden bij openen — met keuze i.p.v. automatisch ----
  const [showStartupChoice, setShowStartupChoice] = useState(false);
  const pendingProjectRef = useRef(null);
  useEffect(() => {
    (async () => {
      const pendingData = await loadPersistedParsedFiles();
      const pendingSettings = await loadPersistedSettings();
      if (pendingData && pendingData.length > 0) {
        // Er is een eerder project met geüploade bestanden — laat de gebruiker kiezen.
        pendingProjectRef.current = { parsedFiles: pendingData, settings: pendingSettings };
        setShowStartupChoice(true);
      } else {
        // Niets om te kiezen — gewoon meteen starten, eventuele losse instellingen (zonder
        // bestanden) mogen alsnog ingeladen worden.
        skipNextPersistRef.current = true;
        if (pendingSettings) applySettingsToState(pendingSettings);
        setLoaded(true);
      }
    })();
  }, []);
  const resumeLastProject = () => {
    const pending = pendingProjectRef.current;
    skipNextPersistRef.current = true;
    if (pending) {
      setParsedFiles(pending.parsedFiles);
      if (pending.settings) applySettingsToState(pending.settings);
    }
    setShowStartupChoice(false);
    setLoaded(true);
  };
  const startEmpty = () => {
    // Bewust niets inladen — de eerder opgeslagen data in deze browser blijft intact totdat er
    // weer iets nieuws wordt opgeslagen (bijv. door een bestand te uploaden).
    skipNextPersistRef.current = true;
    setShowStartupChoice(false);
    setLoaded(true);
  };

  // ---- Automatisch bewaren per browser bij elke wijziging ----
  useEffect(() => {
    if (!loaded) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    (async () => {
      setSaveState("saving");
      const ok1 = await persistParsedFiles(parsedFiles);
      const ok2 = await persistSettings({
        accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
        categoryBtwRates, btwVerlegd, korRegeling, rechtsvorm, heeftHolding, holdingBoekingen, btwRatesVersion: BTW_RATES_VERSION,
        excludedDuplicateFingerprints, businessKeywords, businessExpenseKeywords,
        reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
        kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
        leaseDetails, leaseMergedInto, activaDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints, transactionNotes,
        ibStatus, zvwStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, dismissedDuplicateNotice,
        verwachteLease, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
        incomeBtwTarieven, meerdereTarievenBevestigd, verwachteAangeboden, loadedProjectFileName,
      });
      setSaveState(ok1 && ok2 ? "saved" : "error");
      if (ok1 && ok2) setLastSavedAt(new Date());
    })();
  }, [
    parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
    categoryBtwRates, btwVerlegd, korRegeling, rechtsvorm, heeftHolding, holdingBoekingen, excludedDuplicateFingerprints,
    businessKeywords, businessExpenseKeywords, reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
    kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
    leaseDetails, leaseMergedInto, activaDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints, transactionNotes,
    ibStatus, zvwStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, dismissedDuplicateNotice,
    verwachteLease, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
    incomeBtwTarieven, meerdereTarievenBevestigd, verwachteAangeboden, loadedProjectFileName,
    loaded,
  ]);

  const handleFiles = async (fileList) => {
    setError(null);
    const files = Array.from(fileList).filter((f) => /\.(csv|xlsx|xls|940|sta|mt940|swi|txt|xml)$/i.test(f.name));
    const results = [];
    const failed = [];
    for (const f of files) {
      try {
        const { headers, rows, mapping } = await parseFile(f);
        results.push({ headers, rows, mapping, sourceLabel: f.name, fileName: f.name });
      } catch (e) {
        failed.push(`${f.name}: ${e.message || e}`);
      }
    }
    if (failed.length > 0) setError(failed.join("\n"));
    if (results.length > 0) {
      setParsedFiles((prev) => [...prev.filter((p) => !results.some((r) => r.fileName === p.fileName)), ...results]);
      setShowSetupWizard(true);
    }
  };

  const allTransactions = useMemo(() => buildTransactions(parsedFiles), [parsedFiles]);
  const ownAccountByFile = useMemo(() => computeOwnAccountByFile(allTransactions), [allTransactions]);
  // Voor elk bestand: de eigen rekeningnummers van al je ándere geladen bestanden (met hun
  // rekeningtype) — gebruikt om overboekingen tussen je eigen rekeningen te herkennen, ongeacht
  // bankformaat. Alleen bestanden waarvan het rekeningtype al bekend is tellen mee (anders is niet
  // te bepalen of het bijv. "Terugboeking van prive" of "Uitbetaling aan prive" zou moeten zijn).
  const ownAccountsElsewhereByFile = useMemo(() => {
    const entries = Object.entries(ownAccountByFile)
      .filter(([fileName]) => accountTypeByFile[fileName])
      .map(([fileName, iban]) => ({ fileName, iban, accountType: accountTypeByFile[fileName], isLoadedFile: true }));
    // Handmatig opgegeven eigen rekeningen die je (nog) niet hebt geladen (zie de wizard-vraag) —
    // tellen voor élk geladen bestand mee, niet gekoppeld aan een specifiek fileName. Er kunnen er
    // meerdere zijn (bijv. een extra zakelijke rekening én twee privérekeningen). Is zo'n rekening
    // inmiddels ALSNOG als eigen bestand geladen (de wizard-invoer is dan achterhaald, maar wordt
    // nergens automatisch opgeruimd), dan die dubbele/verouderde entry hier negeren — anders staat
    // dezelfde rekening tweemaal in de lijst. Op zich onschadelijk zolang het rekeningtype gelijk
    // blijft (find/some hieronder gebruiken toch maar de eerste match), maar wél verwarrend, en een
    // reëel risico zodra iemand het rekeningtype van het echte bestand nog aanpast zonder aan deze
    // oude wizard-invoer te denken.
    // `isLoadedFile: false` — dit is bewust ANDERS dan de "entries" hierboven: een via de wizard
    // opgegeven rekening is nog GEEN geladen bestand, dus de daadwerkelijke tegenboeking staat nog
    // nergens in de data. De spiegelboeking hieronder (zie "classified") moet dit onderscheid kennen
    // — anders verdwijnt het geld van zo'n nog-niet-geladen rekening stilzwijgend uit het overzicht
    // (geen spiegel én geen echte transactie), in plaats van gewoon zichtbaar te blijven totdat die
    // rekening ook echt geladen wordt.
    const extra = (eigenRekeningenExtra || [])
      .filter((r) => r.iban && !entries.some((e) => ibansMatch(e.iban, r.iban)))
      .map((r) => ({ iban: r.iban, accountType: r.accountType, isLoadedFile: false }));
    const result = {};
    for (const pf of parsedFiles) {
      result[pf.fileName] = [
        ...entries.filter((e) => e.fileName !== pf.fileName).map((e) => ({ iban: e.iban, accountType: e.accountType, isLoadedFile: true })),
        ...extra,
      ];
    }
    return result;
  }, [ownAccountByFile, accountTypeByFile, parsedFiles, eigenRekeningenExtra]);
  const importDiagnostics = useMemo(
    () => computeImportDiagnostics(parsedFiles, allTransactions, openingBalanceCorrections),
    [parsedFiles, allTransactions, openingBalanceCorrections]
  );
  const fileContinuity = useMemo(() => computeFileContinuity(importDiagnostics, accountTypeByFile), [importDiagnostics, accountTypeByFile]);

  const { fingerprintByTxId, duplicateGroups, duplicateFingerprints, confirmedSeparateGroups } = useMemo(
    () => computeDuplicateInfo(allTransactions),
    [allTransactions]
  );
  const transactions = useMemo(() => {
    if (excludedDuplicateFingerprints.length === 0 && excludedManualFingerprints.length === 0) return allTransactions;
    const excludedSet = new Set([...excludedDuplicateFingerprints, ...excludedManualFingerprints]);
    return allTransactions.filter((tx) => !excludedSet.has(fingerprintByTxId[tx.id]));
  }, [allTransactions, excludedDuplicateFingerprints, excludedManualFingerprints, fingerprintByTxId]);
  // ---- Ongedaan maken laatste actie — momentopname/herstel voor de grote, risicovolle acties
  // (duplicaten verwijderen, wis alles). Bewust maar 1 stap terug — elke volgende momentopname
  // overschrijft de vorige. ----
  const snapshotBeforeAction = (label) => {
    setLastActionSnapshot({
      label,
      state: {
        parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
        categoryBtwRates, btwVerlegd, korRegeling, rechtsvorm, heeftHolding, holdingBoekingen, excludedDuplicateFingerprints, excludedManualFingerprints, transactionNotes,
        businessKeywords, businessExpenseKeywords, reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
        kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
        leaseDetails, leaseMergedInto, activaDetails, confirmedLeaseTypeKeys, fixedCategories, ibStatus, zvwStatus, zelfstandigenaftrekStatus, startersaftrekStatus, autoStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage,
        verwachteLease, verwachteLening, verwachteAOV, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
        incomeBtwTarieven, meerdereTarievenBevestigd,
      },
    });
  };
  const undoLastAction = () => {
    if (!lastActionSnapshot) return;
    const s = lastActionSnapshot.state;
    setParsedFiles(s.parsedFiles);
    setAccountTypeByFile(s.accountTypeByFile);
    setOverridesByCounterparty(s.overridesByCounterparty);
    setOverridesByRow(s.overridesByRow);
    setCategoryRules(s.categoryRules);
    setCategoryBtwRates(s.categoryBtwRates);
    setBtwVerlegd(s.btwVerlegd);
    setKorRegeling(s.korRegeling);
    setRechtsvorm(s.rechtsvorm);
    setHeeftHolding(s.heeftHolding);
    setHoldingBoekingen(s.holdingBoekingen);
    setExcludedDuplicateFingerprints(s.excludedDuplicateFingerprints);
    setExcludedManualFingerprints(s.excludedManualFingerprints);
    setTransactionNotes(s.transactionNotes || {});
    setBusinessKeywords(s.businessKeywords);
    setBusinessExpenseKeywords(s.businessExpenseKeywords);
    setReviewedIncomeKeys(s.reviewedIncomeKeys);
    setReviewedPersonKeys(s.reviewedPersonKeys);
    setReviewedOverigKeys(s.reviewedOverigKeys);
    setKwartaalStatus(s.kwartaalStatus);
    setVoorbelastingExcluded(s.voorbelastingExcluded);
    setPeriodeQuarterOverrides(s.periodeQuarterOverrides);
    setReviewedPeriodeKeys(s.reviewedPeriodeKeys);
    setLoanDetails(s.loanDetails);
    setLeaseDetails(s.leaseDetails);
    setLeaseMergedInto(s.leaseMergedInto || {});
    setActivaDetails(s.activaDetails || {});
    setVerwachteLease(s.verwachteLease ?? null);
    setVerwachteLening(s.verwachteLening ?? null);
    setVerwachteAOV(s.verwachteAOV ?? null);
    setAutoWizardStatus(s.autoWizardStatus ?? null);
    setAutoActivaDetails(s.autoActivaDetails && typeof s.autoActivaDetails === "object" ? s.autoActivaDetails : {});
    setKmVergoedingDetailsState(s.kmVergoedingDetails && typeof s.kmVergoedingDetails === "object" ? s.kmVergoedingDetails : {});
    setHeeftVoorraad(s.heeftVoorraad ?? null);
    setEigenNamen(s.eigenNamen ?? null);
    setEigenRekeningenExtra(s.eigenRekeningenExtra ?? null);
    setZakelijkeSpaarRekening(s.zakelijkeSpaarRekening ?? null);
    setOpdrachtgeversGevraagd(s.opdrachtgeversGevraagd ?? null);
    setIncomeBtwTarieven(s.incomeBtwTarieven ?? null);
    setMeerdereTarievenBevestigd(s.meerdereTarievenBevestigd ?? false);
    setConfirmedLeaseTypeKeys(s.confirmedLeaseTypeKeys);
    setFixedCategories(s.fixedCategories);
    setIbStatus(s.ibStatus);
    setZvwStatus(s.zvwStatus || {});
    setLastActionSnapshot(null);
  };

  // Wrappers voor panelen die de raw setState-functie direct doorkrijgen (CategoryRulesPanel,
  // FixedCategoriesPanel, BtwRatesPanel, CounterpartyRulesPanel) — zodat ook die wijzigingen
  // ongedaan te maken zijn. Zie utils/withUndo.js.
  const withUndo = makeUndoWrapped(snapshotBeforeAction);
  const setCategoryRulesWithUndo = withUndo("Categorieregels aangepast", setCategoryRules);
  const setFixedCategoriesWithUndo = withUndo("Vaste/variabele kosten aangepast", setFixedCategories);
  const setCategoryBtwRatesWithUndo = withUndo("BTW-percentage aangepast", setCategoryBtwRates);
  const setBtwVerlegdWithUndo = withUndo("BTW-verlegd aangepast", setBtwVerlegd);
  const setKorRegelingWithUndo = withUndo("KOR-instelling aangepast", setKorRegeling);
  const setRechtsvormWithUndo = withUndo("Rechtsvorm aangepast", setRechtsvorm);
  const setHeeftHoldingWithUndo = withUndo("Holdingstructuur aangepast", setHeeftHolding);
  const setOverridesByCounterpartyWithUndo = withUndo("Tegenpartijregel verwijderd", setOverridesByCounterparty);
  const setOpeningBalanceCorrection = (fileName, value) => {
    snapshotBeforeAction("Beginsaldo gecorrigeerd");
    setOpeningBalanceCorrections((prev) => {
      if (value == null) {
        const next = { ...prev };
        delete next[fileName];
        return next;
      }
      return { ...prev, [fileName]: value };
    });
  };

  const removeDuplicates = () => {
    snapshotBeforeAction("Duplicaten verwijderen");
    setExcludedDuplicateFingerprints((prev) => [...new Set([...prev, ...duplicateFingerprints])]);
  };
  const pendingDuplicateCount = duplicateFingerprints.size - excludedDuplicateFingerprints.filter((fp) => duplicateFingerprints.has(fp)).length;

  const pendingAccountFiles = useMemo(
    () => parsedFiles.map((f) => f.fileName).filter((name) => !(name in accountTypeByFile)),
    [parsedFiles, accountTypeByFile]
  );
  const setAccountType = (fileName, type) => {
    snapshotBeforeAction("Rekeningtype aangepast");
    setAccountTypeByFile((prev) => ({ ...prev, [fileName]: type }));
  };

  const removeFile = (fileName) => {
    snapshotBeforeAction(`Bestand "${fileName}" verwijderd`);
    setParsedFiles((prev) => prev.filter((f) => f.fileName !== fileName));
    setAccountTypeByFile((prev) => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
    setOpeningBalanceCorrections((prev) => {
      if (!(fileName in prev)) return prev;
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
  };

  const eigenNamenKeywords = useMemo(() => {
    if (!eigenNamen) return [];
    // v223: voorheen extractKeywordCandidate (bedoeld voor bedrijfsnamen) — die reduceert een naam
    // tot één kaal woord, meestal de achternaam, wat bij een veelvoorkomende achternaam veel te
    // makkelijk ook naamgenoten/familieleden matcht (zie classify.js/normalizePersonName).
    return [eigenNamen.ondernemer, eigenNamen.partner].map((n) => normalizePersonName(n)).filter(Boolean);
  }, [eigenNamen]);

  // Extra, door de gebruiker zelf opgegeven naam voor de zakelijke spaarrekening (bijv. bij een
  // bank die niet het generieke woord "spaarrekening" gebruikt) — de generieke herkenning in
  // autoClassify werkt sowieso al, dit is puur een aanvulling voor een afwijkende naamgeving.
  const zakelijkeSpaarKeywords = useMemo(() => {
    const naam = zakelijkeSpaarRekening?.naam;
    return naam ? [naam.toLowerCase()] : [];
  }, [zakelijkeSpaarRekening]);

  const classified = useMemo(() => {
    const base = transactions.map((tx) => {
      const resolved = resolveClassification(
        tx, categoryRules, businessKeywords, businessExpenseKeywords, accountTypeByFile[tx.source],
        overridesByCounterparty, overridesByRow, ownAccountsElsewhereByFile[tx.source] || [], eigenNamenKeywords, zakelijkeSpaarKeywords
      );
      const confidence = scoreClassification(tx, categoryRules, overridesByCounterparty, overridesByRow, resolved.category, ownAccountsElsewhereByFile[tx.source] || []);
      return { ...tx, ...resolved, confidence };
    });
    // "Prive opnames"/"Terugboeking van prive" (zakelijke kant) zijn geld dat tussen zakelijk en
    // privé beweegt. Staat zo'n boeking aan de zakelijke kant, dan voegen we er een
    // spiegelboeking van hetzelfde bedrag met omgekeerd teken aan toe — zodat de balans tussen
    // zakelijk en privé in beide richtingen klopt, zonder de oorspronkelijke boeking te veranderen.
    // Alleen als de bijbehorende privérekening niet zelf ook geladen is: staat die er wél bij, dan
    // heeft die eigen transactie via de eigen-rekening-herkenning hierboven al zijn eigen kant van
    // dezelfde overboeking gekregen — een spiegel zou die dan dubbel tellen.
    // `isLoadedFile` (zie ownAccountsElsewhereByFile hierboven) is hier bewust vereist: een via de
    // wizard opgegeven, maar nog niet geladen rekening levert nog GEEN eigen transactie op de andere
    // kant op — zonder deze voorwaarde werd de spiegel voor zo'n rekening ten onrechte óók
    // onderdrukt, waardoor het bedrag nergens meer zichtbaar was (geen spiegel én geen echte
    // transactie) totdat die rekening alsnog werd geladen.
    // v220: naast de specifieke IBAN-koppeling hieronder ook een generieke vangnet-check — is er
    // ÜBERHAUPT een privérekening-bestand in dit dossier geladen, dan is een spiegelboeking zo goed
    // als altijd overbodig (dit project volgt precies één ondernemer met hooguit een handvol eigen
    // rekeningen). Zonder dit vangnet bleef de spiegel ten onrechte bestaan zodra de IBAN-koppeling
    // om wat voor reden dan ook niet rond kwam (bijv. het bankbestand van de privérekening vermeldt
    // zijn eigen rekeningnummer niet op een manier die computeOwnAccountByFile herkent) — met een
    // reëel geladen privérekening-bestand ernaast leverde dat dan EXACT dezelfde overboeking dubbel
    // op: één keer als de echte, correct geclassificeerde privé-transactie, en één keer als
    // spiegelboeking die (per ongeluk) nog de zakelijke categorienaam ("Prive opnames"/"Terugboeking
    // van prive") droeg. Dit vangnet kiest bewust voor "geen spiegel" boven "misschien dubbel".
    const anyPriveFileLoaded = parsedFiles.some((pf) => accountTypeByFile[pf.fileName] === "Prive");
    const mirrors = [];
    for (const tx of base) {
      const otherSideAlsoLoaded =
        anyPriveFileLoaded || (ownAccountsElsewhereByFile[tx.source] || []).some((o) => o.accountType === "Prive" && o.isLoadedFile);
      if (
        (tx.category === "Prive opnames" || tx.category === "Terugboeking van prive") &&
        tx.type === "Zakelijk" && !otherSideAlsoLoaded
      ) {
        mirrors.push({ ...tx, id: `${tx.id}-prive-spiegel`, amount: -tx.amount, type: "Prive", isMirror: true });
      }
    }
    return mirrors.length ? [...base, ...mirrors] : base;
  }, [transactions, categoryRules, businessKeywords, businessExpenseKeywords, accountTypeByFile, overridesByCounterparty, overridesByRow, ownAccountsElsewhereByFile, eigenNamenKeywords, zakelijkeSpaarKeywords, parsedFiles]);

  // Zoekt, na een "ja" op de lease/lening/AOV-vraag in de wizard (met een naam erbij), of die naam
  // al voorkomt in de geladen transacties — zowel meteen na het invullen als steeds opnieuw
  // wanneer er later nog een bestand bijkomt (classified.length verandert dan). Ná een keer
  // aanbieden/afwijzen voor de HUIDIGE dataset niet opnieuw hetzelfde voorstel doen — pas weer als
  // er méér transacties bijkomen (een nieuw bestand), niet bij elke herclassificatie op zich.
  useEffect(() => {
    if (verwachteMatchSuggestie) return;
    const proberen = [];
    (verwachteLease || []).forEach((item, idx) => proberen.push({ type: "lease", idx, naam: item.naam, gevonden: item.gevonden, targetCategory: "Lease (financieel)" }));
    (verwachteLening || []).forEach((item, idx) => proberen.push({ type: "lening", idx, naam: item.naam, gevonden: item.gevonden, targetCategory: "Leningen" }));
    if (verwachteAOV?.status === "ja") {
      proberen.push({ type: "aov", idx: null, naam: verwachteAOV.naam, gevonden: verwachteAOV.gevonden, targetCategory: "AOV (arbeidsongeschiktheidsverzekering)" });
    }
    for (const { type, idx, naam, gevonden, targetCategory } of proberen) {
      if (!naam || gevonden) continue;
      const aangebodenKey = `${type}${idx ?? ""}`;
      if (verwachteAangeboden[aangebodenKey] === classified.length) continue;
      const keyword = extractKeywordCandidate(naam);
      if (!keyword) continue;
      const matches = classified.filter((t) => {
        if (t.isMirror || t.category === targetCategory) return false;
        const text = `${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase();
        return text.includes(keyword);
      });
      if (matches.length > 0) {
        setVerwachteMatchSuggestie({ type, idx, naam, matches, targetCategory });
        return;
      }
    }
  }, [classified, verwachteLease, verwachteLening, verwachteAOV, verwachteAangeboden, verwachteMatchSuggestie]);

  const addBusinessKeywords = (namen) => {
    if (namen.length > 0) {
      snapshotBeforeAction("Grootste opdrachtgevers ingevuld");
      setBusinessKeywords((prev) => [...prev, ...namen.filter((n) => !prev.includes(n))]);
    }
    setOpdrachtgeversGevraagd(true);
  };
  const addBusinessExpenseKeywords = (namen) => {
    if (namen.length > 0) {
      snapshotBeforeAction("Grootste leveranciers ingevuld");
      setBusinessExpenseKeywords((prev) => [...prev, ...namen.filter((n) => !prev.includes(n))]);
    }
    setOpdrachtgeversGevraagd(true);
  };
  const markLoanNotALoan = (loan) => {
    snapshotBeforeAction("Lening op Overig gezet");
    for (const tx of loan.transactions) {
      setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category: "Overig", type: tx.type }, tx.counterpartyIban);
    }
  };
  // De lening zelf is feitelijk PRIVÉ (bijv. een DUO-studieschuld of een privélening van familie) —
  // ongeacht van/naar welke rekening betaald wordt. "Leningen (privé)" heeft geen fiscale
  // aftrekbaarheid (fiscalTreatmentOf "geen"), in tegenstelling tot "Leningen" waar de rente wél
  // aftrekbaar is — zie categories.js/autoBijtelling.js-achtige toelichting bij SPLIT_CATEGORY_NAMES.
  const markLoanAsPrive = (loan) => {
    snapshotBeforeAction("Lening op Leningen (privé) gezet");
    for (const tx of loan.transactions) {
      setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category: "Leningen (privé)", type: tx.type }, tx.counterpartyIban);
    }
  };
  // Omgekeerde correctie: een eerder als privé gemarkeerde lening blijkt (bijv. na een gesprek met
  // de cliënt) toch een zakelijke lening te zijn — terug naar "Leningen", zodat de rente weer
  // meetelt als aftrekbare bedrijfskosten. Kan net zo goed via de algemene categorie-editor, maar
  // dit maakt het ook rechtstreeks vanuit het leningenpaneel mogelijk (zie privateLoanSummary).
  const markLoanAsZakelijk = (loan) => {
    snapshotBeforeAction("Lening op Leningen (zakelijk) gezet");
    for (const tx of loan.transactions) {
      setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category: "Leningen", type: tx.type }, tx.counterpartyIban);
    }
  };
  const acceptVerwachteMatch = () => {
    const { type, idx, matches, targetCategory } = verwachteMatchSuggestie;
    snapshotBeforeAction("Verwachte lease/lening/AOV ingedeeld");
    for (const tx of matches) {
      setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category: targetCategory, type: "Zakelijk" }, tx.counterpartyIban);
    }
    if (type === "lease") setVerwachteLease((prev) => prev.map((item, i) => (i === idx ? { ...item, gevonden: true } : item)));
    if (type === "lening") setVerwachteLening((prev) => prev.map((item, i) => (i === idx ? { ...item, gevonden: true } : item)));
    if (type === "aov") setVerwachteAOV((prev) => ({ ...prev, gevonden: true }));
    setVerwachteMatchSuggestie(null);
  };
  const dismissVerwachteMatch = () => {
    const aangebodenKey = `${verwachteMatchSuggestie.type}${verwachteMatchSuggestie.idx ?? ""}`;
    setVerwachteAangeboden((prev) => ({ ...prev, [aangebodenKey]: classified.length }));
    setVerwachteMatchSuggestie(null);
  };

  // ---- Zekerheid van de classificatie — hoeveel transacties zijn automatisch met vertrouwen
  // ingedeeld, en hoeveel verdienen een blik? Spiegelboekingen tellen niet mee (die zijn een
  // afgeleide van een al beoordeelde boeking, geen eigen bankregel). ----
  const confidenceSummary = useMemo(() => {
    let approved = 0, review = 0, unclear = 0;
    for (const tx of classified) {
      if (tx.isMirror) continue;
      if (tx.confidence.level === "override" || tx.confidence.level === "keyword") approved++;
      else if (tx.confidence.level === "heuristic") review++;
      else unclear++;
    }
    return { approved, review, unclear, needsReview: review + unclear, total: approved + review + unclear };
  }, [classified]);

  // ---- Data voor de 🟡/🔴-pop-up: "Overig" en "Overboekingen aan personen" horen daar altijd al
  // bij (die twee categorieën leveren per definitie nooit 🟢 op), dus die tellen we apart en
  // wijzen we liever naar de daarvoor bedoelde review-vensters dan dat we ze hier dupliceren. ----
  const uncertainModalData = useMemo(() => {
    if (!openConfidenceLevel) return null;
    const all = classified.filter((tx) => !tx.isMirror && tx.confidence.level === openConfidenceLevel);
    const overigCount = all.filter((tx) => tx.category === "Overig").length;
    const personenCount = all.filter((tx) => tx.category === "Overboekingen aan personen").length;
    const rest = all.filter((tx) => tx.category !== "Overig" && tx.category !== "Overboekingen aan personen");
    return { transactions: rest, bulkCounts: { overig: overigCount, personen: personenCount } };
  }, [classified, openConfidenceLevel]);
  const jumpToOverigFromModal = () => {
    setOpenConfidenceLevel(null);
    setShowOverigReview(true);
    jumpToSection(overigReviewSectionRef);
  };
  const jumpToPersonenFromModal = () => {
    setOpenConfidenceLevel(null);
    setShowPersonReview(true);
    jumpToSection(personReviewSectionRef);
  };

  // ---- Inkomstenbronnen-review ----
  const incomeSummary = useMemo(() => computeIncomeSummary(classified, accountTypeByFile), [classified, accountTypeByFile]);
  const pendingIncomeReview = useMemo(() => incomeSummary.filter((i) => !reviewedIncomeKeys.includes(i.key)), [incomeSummary, reviewedIncomeKeys]);
  const markIncomeSource = (item, choice) => {
    if (choice === "zakelijk") {
      setBusinessKeywords((prev) => (prev.includes(item.name) ? prev : [...prev, item.name]));
      setCounterpartyOverride(item.name, 1, { category: "Zakelijke inkomsten", type: "Zakelijk" });
      const kw = item.name.trim().toLowerCase();
      const matchingKeys = incomeSummary
        .filter((i) => {
          const n = i.name.trim().toLowerCase();
          return kw && n && (n.includes(kw) || kw.includes(n));
        })
        .map((i) => i.key);
      setReviewedIncomeKeys((prev) => [...new Set([...prev, item.key, ...matchingKeys])]);
      return;
    }
    // "Nee" — niet zakelijk: naar Overig, verder te verfijnen in de "Overig"-review of detailtabel
    // (in plaats van meteen een specifieke aanname als "Inkomsten" te forceren).
    setCounterpartyOverride(item.name, 1, { category: "Overig", type: "Prive" });
    setReviewedIncomeKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };

  // ---- "Overboekingen aan personen" en "Overig" opruimen ----
  const personSummary = useMemo(() => computeCategorySummary(classified, "Overboekingen aan personen"), [classified]);
  const pendingPersonReview = useMemo(() => personSummary.filter((i) => !reviewedPersonKeys.includes(i.key)), [personSummary, reviewedPersonKeys]);
  const markPersonSource = (item, category, type) => {
    setCounterpartyOverride(item.name, item.amount, { category, type });
    setReviewedPersonKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };
  const confirmPersonAsIs = (item) => {
    snapshotBeforeAction('"Klopt zo" bevestigd');
    setReviewedPersonKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };

  const overigSummary = useMemo(() => computeCategorySummary(classified, "Overig"), [classified]);
  const pendingOverigReview = useMemo(() => overigSummary.filter((i) => !reviewedOverigKeys.includes(i.key)), [overigSummary, reviewedOverigKeys]);
  const markOverigItem = (item, category, type) => {
    setCounterpartyOverride(item.name, item.amount, { category, type });
    setReviewedOverigKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };
  const bulkMarkOverigAsPriveOpname = () => {
    for (const item of pendingOverigReview) markOverigItem(item, "Prive opnames", "Zakelijk");
  };
  const confirmOverigAsIs = (item) => {
    snapshotBeforeAction('"Klopt zo" bevestigd');
    setReviewedOverigKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };

  const addBusinessKeyword = (kw) => {
    snapshotBeforeAction("Zakelijke tegenpartij toegevoegd");
    setBusinessKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  };
  const removeBusinessKeyword = (kw) => {
    snapshotBeforeAction("Zakelijke tegenpartij verwijderd");
    setBusinessKeywords((prev) => prev.filter((k) => k !== kw));
  };
  const addBusinessExpenseKeyword = (kw) => {
    snapshotBeforeAction("Zakelijke uitgave toegevoegd");
    setBusinessExpenseKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  };
  const removeBusinessExpenseKeyword = (kw) => {
    snapshotBeforeAction("Zakelijke uitgave verwijderd");
    setBusinessExpenseKeywords((prev) => prev.filter((k) => k !== kw));
  };
  const businessIncomeEntries = useMemo(() => computeIncomeCategorySummary(classified), [classified]);
  const businessExpenseEntries = useMemo(() => computeCategorySummary(classified, "Zakelijke inkoop/uitgaven"), [classified]);
  const reclassifyBusinessEntry = (item, newMainCategory) => {
    const newSubtype = MAIN_CATEGORY_DEFAULT_SUBTYPE[newMainCategory] || newMainCategory;
    // "Zakelijke tegenpartijen (inkomsten)" en "Zakelijke inkoop/uitgaven (leveranciers)" zijn per definitie
    // al bevestigd Zakelijk — hier alleen de categorie wijzigen mag dat nooit stilzwijgend naar
    // Prive omzetten (defaultTypeForCategory zou voor de meeste categorieën "Prive" teruggeven).
    requestCategoryChange({ counterparty: item.name, amount: item.amount }, { category: newSubtype, type: "Zakelijk" });
  };
  // Voor wie zowel laag- als hoogbelaste diensten factureert (zie de wizard-vraag na "BTW-verlegd:
  // nee"): hiermee kies je per klant tussen de generieke "Zakelijke inkomsten" en de twee
  // tariefspecifieke subtypes.
  const setIncomeRate = (item, choice) => {
    const category = choice === "0" ? "Zakelijke inkomsten 0%" : choice === "9" ? "Zakelijke inkomsten 9%" : choice === "21" ? "Zakelijke inkomsten 21%" : "Zakelijke inkomsten";
    requestCategoryChange({ counterparty: item.name, amount: item.amount }, { category, type: "Zakelijk" });
  };
  // Wizard-vraag "onder welk(e) BTW-tarief(ven) vallen je diensten" — nu een aanvinklijst (kan meer
  // dan één tarief zijn). Bij precies één gekozen tarief is dat meteen het standaardtarief voor de
  // generieke "Zakelijke inkomsten"-categorie. Bij meerdere is "standaard" het tarief dat het meeste
  // voorkomt (apart gevraagd in de wizard, zie TarievenVraag) — de overige tarieven blijven gewoon
  // beschikbaar als eigen categorie ("Zakelijke inkomsten 0%/9%/21%") om per klant/transactie te
  // kiezen via setIncomeRate hierboven. incomeBtwTarieven onthoudt de hele keuze zodat de "Werk te
  // doen"-herinnering hieronder weet dat er meerdere tarieven zijn en het dus de moeite waard is om
  // dat na te lopen.
  const setIncomeBtwRateChoice = (tarieven, standaard) => {
    setCategoryBtwRatesWithUndo((prev) => ({ ...prev, "Zakelijke inkomsten": Number(standaard) }));
    setIncomeBtwTarieven(tarieven);
    if (tarieven.length > 1) setMeerdereTarievenBevestigd(false);
  };
  // Sommige zzp'ers hebben tegelijk klanten met BTW-verlegd (bijv. onderaannemer in de bouw) én
  // klanten waar ze zelf gewoon 21% BTW over factureren — dat is dus geen aan/uit-instelling voor
  // de hele onderneming, maar iets per klant. De globale BTW-verlegd-instelling (uit de wizard)
  // blijft de standaardwaarde voor nog niet expliciet ingestelde tegenpartijen; hiermee wijk je
  // daar per klant van af. category/type expliciet meegeven zodat de override altijd compleet
  // blijft (anders zou een tegenpartij die nog geen eigen correctie had er ineens zonder categorie
  // bij kunnen komen te staan).
  const setCounterpartyBtwVerlegd = (item, value) => {
    setCounterpartyOverride(item.name, item.amount, { category: item.category, type: item.type, btwVerlegd: value });
  };

  // ---- Factuurperiode vs. boekingskwartaal ----
  const periodeMismatches = useMemo(
    () => computePeriodeMismatches(classified, reviewedPeriodeKeys, periodeQuarterOverrides),
    [classified, reviewedPeriodeKeys, periodeQuarterOverrides]
  );
  const confirmPeriodeAsIs = (tx) => {
    snapshotBeforeAction("Factuurperiode bevestigd");
    setReviewedPeriodeKeys((prev) => (prev.includes(tx.id) ? prev : [...prev, tx.id]));
  };
  const movePeriodeToQuarter = (tx, quarterKey) => {
    snapshotBeforeAction("Factuurperiode verplaatst");
    setPeriodeQuarterOverrides((prev) => ({ ...prev, [tx.id]: quarterKey }));
  };

  // yearsOverride: gebruikt door de "Voorstel bekijken"-snelknop voor het actieve jaar, die niet
  // wil wachten op de (asynchrone) state-update van selectedAangifteYears. Zonder override wordt
  // gewoon de bestaande jaren-selectie (uit de checkboxes) gebruikt.
  const exportAangiftevoorstel = (yearsOverride) => {
    const targetYears = yearsOverride || selectedAangifteYears;
    if (targetYears.length === 0) {
      window.alert("Selecteer minstens één jaar.");
      return;
    }
    if (yearsOverride) setSelectedAangifteYears(yearsOverride);
    const html = rechtsvorm === "bv"
      ? buildAangiftevoorstelBvHtml(targetYears, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, heeftHolding)
      : buildAangiftevoorstelHtml(targetYears, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, startersaftrekStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, zaLegacyJaDefault);
    setAangiftevoorstelPreview(html);
    setShowAangifteYearPicker(false);
    setShowAangifteMeerdereJaren(false);
  };
  const printAangiftevoorstelPreview = () => printHtmlDocument(aangiftevoorstelPreview);
  const downloadAangiftevoorstelPreview = () => (rechtsvorm === "bv" ? downloadAangiftevoorstelBv : downloadAangiftevoorstel)(aangiftevoorstelPreview, selectedAangifteYears);

  // Tegenpartij-brede correctie: geldt voor alle transacties van diezelfde tegenpartij (zelfde
  // teken), in alle jaren. Ruimt een eventuele losse rij-correctie voor diezelfde tegenpartij op
  // — anders zou die voorrang blijven houden boven deze bredere wijziging.
  // IBAN is stabieler dan de naam (die per bank-export kan wisselen) — dus die heeft voorrang
  // wanneer het bankbestand een tegenrekening-IBAN bevatte, zowel bij het opslaan van een
  // correctie als bij het zoeken naar "vergelijkbare transacties van dezelfde tegenpartij".
  const keyForTx = (tx) => ibanKey(tx.counterpartyIban, tx.amount) || counterpartyKey(tx.counterparty || tx.description, tx.amount);

  const setCounterpartyOverride = (counterparty, amount, patch, iban) => {
    snapshotBeforeAction("Categorie/type aangepast");
    const key = (iban && ibanKey(iban, amount)) || counterpartyKey(counterparty, amount);
    if (!key) return;
    setOverridesByCounterparty((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch, displayName: prev[key]?.displayName || counterparty, sign: amount >= 0 ? "pos" : "neg" },
    }));
    setOverridesByRow((prev) => {
      const idsToClear = classified.filter((tx) => keyForTx(tx) === key).map((tx) => tx.id);
      if (idsToClear.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const id of idsToClear) {
        if (id in next) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };
  const setRowOverride = (id, patch) => {
    snapshotBeforeAction("Categorie/type aangepast");
    setOverridesByRow((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  // ---- Leningen & Lease — zie hooks/useLoansAndLease.js ----
  const {
    loanSummary, privateLoanSummary, leaseSummary, leaseMerges, setLoanDetailField, markLoanUnknown, unmarkLoanUnknown,
    setLeaseDetailField, markLeaseUnknown, unmarkLeaseUnknown, confirmLeaseType, mergeLeaseInto, undoMergeLease,
  } = useLoansAndLease({
    classified, setLoanDetails, setLeaseDetails, setConfirmedLeaseTypeKeys, setLeaseDetailsModalKey,
    snapshotBeforeAction, setCounterpartyOverride, leaseMergedInto, setLeaseMergedInto,
  });

  // ---- Activa (bedrijfsmiddelen) — eenvoudiger dan Leningen/Lease: geen type-bevestiging nodig,
  // gegroepeerd per transactie (elke aanschaf is meestal eenmalig, niet per tegenpartij).
  const activaSummary = useMemo(() => computeActivaSummary(classified), [classified]);
  const setActivaDetailField = (key, newDetails) => {
    snapshotBeforeAction("Activagegevens aangepast");
    setActivaDetails((prev) => ({ ...prev, [key]: newDetails }));
  };
  const markActivaUnknown = (key) => {
    snapshotBeforeAction("Activum op onbekend gezet");
    setActivaDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: true } }));
  };
  const unmarkActivaUnknown = (key) => {
    snapshotBeforeAction("Activum toch invullen");
    setActivaDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: false } }));
  };

  // ---- Vraag bij een categorie/type-wijziging: alleen deze transactie, alle jaren, of gekozen
  // jaren? Alleen gevraagd als er ook echt meerdere transacties van dezelfde tegenpartij zijn —
  // bij een unieke tegenpartij (of geen bruikbare naam) wordt de wijziging direct doorgevoerd. ----
  const [pendingCategoryChange, setPendingCategoryChange] = useState(null);
  // Een 🟡/🔴-classificatie die bij nazien gewoon klopt: dit legt 'm vast als bevestigde regel
  // (net als een echte correctie, alleen met dezelfde categorie/type als nu al gold) — voortaan
  // dus 🟢. Loopt bewust via dezelfde requestCategoryChange-vraag als een echte wijziging: bij
  // meerdere vergelijkbare transacties vraagt de tool of dit voor alle jaren moet gelden, of voor
  // zelf gekozen jaren.
  // Zoekt, na een net bevestigde/gecorrigeerde tegenpartij, naar andere 🟡/🔴-transacties die op
  // dezelfde tegenpartij lijken (bijv. "Coolblue.nl" na het corrigeren van "Coolblue") — zodat je
  // in één keer een herbruikbaar trefwoord kunt vastleggen in plaats van dezelfde correctie steeds
  // opnieuw te moeten doen. Geen suggestie bij "Overig"/"Overboekingen aan personen" zelf, want dat
  // is geen bruikbaar trefwoord om aan andere transacties te koppelen.
  const suggestSimilarIfAny = (tx, patch) => {
    if (!patch.category || patch.category === "Overig" || patch.category === "Overboekingen aan personen") return;
    const keyword = extractKeywordCandidate(tx.counterparty || tx.description);
    if (!keyword) return;
    const matches = classified.filter((t) => {
      if (t.isMirror || t.id === tx.id) return false;
      if (!t.confidence || (t.confidence.level !== "heuristic" && t.confidence.level !== "fallback")) return false;
      const text = `${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase();
      return text.includes(keyword);
    });
    if (matches.length > 0) {
      setKeywordSuggestion({ keyword, category: patch.category, type: patch.type, matches, sourceName: tx.counterparty || tx.description });
    }
  };

  // Legt een bevestigde suggestie vast als een echt, herbruikbaar trefwoord bij de categorie —
  // zelfde plek en mechanisme als een trefwoord dat je zelf toevoegt bij "Categorieregels". Alle
  // transacties die dat trefwoord matchen (nu en straks) worden er automatisch door herkend.
  const acceptKeywordSuggestion = () => {
    if (!keywordSuggestion) return;
    const { keyword, category } = keywordSuggestion;
    snapshotBeforeAction(`Trefwoord "${keyword}" toegevoegd`);
    setCategoryRules((prev) =>
      prev.map((r) => (r.name === category && !r.keywords.includes(keyword) ? { ...r, keywords: [...r.keywords, keyword] } : r))
    );
    setKeywordSuggestion(null);
  };

  const confirmClassificationCorrect = (tx) => {
    requestCategoryChange(tx, { category: tx.category, type: tx.type });
  };

  // v236 — Bulk-bevestigen voor de 🟡/🔴-controleer-pop-up (UncertainTransactionsModal): "Alles
  // goedkeuren" markeert in één keer alle daar getoonde transacties als "klopt zo". Gaat NIET via
  // confirmClassificationCorrect/requestCategoryChange hierboven: die opent bij tegenpartijen met
  // meerdere transacties (matches.length > 1) een scope-modal ("deze rij / alle jaren / gekozen
  // jaren?") — bij honderden transacties achter elkaar zou dat honderden keren dezelfde
  // pendingCategoryChange-state overschrijven en alleen de allerlaatste daadwerkelijk tonen, terwijl
  // de rest onbevestigd blijft. Omdat "klopt zo" de waarde niet wijzigt (enkel bevestigt), is die
  // scope-keuze hier niet nodig — elke transactie krijgt gewoon zijn eigen expliciete override.
  const confirmAllUncertain = (txs) => {
    if (!txs || txs.length === 0) return;
    snapshotBeforeAction("Alle transacties in dit venster bevestigd");
    setOverridesByRow((prev) => {
      const next = { ...prev };
      for (const tx of txs) {
        if (tx.id == null) continue;
        next[tx.id] = { ...(next[tx.id] || {}), category: tx.category, type: tx.type };
      }
      return next;
    });
    // Een enkele transactie zonder bruikbaar row-id (zeldzaam) volgt dezelfde tegenpartij-override
    // als de normale (niet-bulk) bevestigingsflow (zie setCounterpartyOverride hieronder).
    const withoutId = txs.filter((tx) => tx.id == null);
    if (withoutId.length > 0) {
      setOverridesByCounterparty((prev) => {
        const next = { ...prev };
        for (const tx of withoutId) {
          const key = (tx.counterpartyIban && ibanKey(tx.counterpartyIban, tx.amount)) || counterpartyKey(tx.counterparty || tx.description, tx.amount);
          if (!key) continue;
          next[key] = {
            ...(next[key] || {}),
            category: tx.category,
            type: tx.type,
            displayName: next[key]?.displayName || tx.counterparty || tx.description,
            sign: tx.amount >= 0 ? "pos" : "neg",
          };
        }
        return next;
      });
    }
  };

  const requestCategoryChange = (tx, patch) => {
    // Een spiegelboeking (zie de aanmaak van "mirrors" hierboven) is een afgeleide weergave van de
    // onderliggende zakelijke boeking — die wordt bij elke herberekening opnieuw aangemaakt, niet
    // uit een override teruggelezen. Een wijziging rechtstreeks op de spiegel opslaan komt dus
    // nergens terecht en verdwijnt bij de volgende herberekening geheid weer. Wijzig in plaats
    // daarvan de echte, onderliggende boeking — verdwijnt de reden voor een spiegel (categorie is
    // niet langer een prive/zakelijk-beweging), dan vervalt de spiegel vanzelf.
    if (tx.isMirror) {
      const originalId = typeof tx.id === "string" ? Number(tx.id.replace(/-prive-spiegel$/, "")) : tx.id;
      const original = classified.find((t) => !t.isMirror && t.id === originalId);
      // Het type van een spiegel staat vast (die is per definitie de privékant) — neem daarom
      // alleen de categorie over en behoud het type van de originele boeking. Anders zou een
      // categoriewijziging op de spiegel (die type "Prive" meestuurt) de zakelijke originele
      // boeking ongemerkt naar Prive omzetten.
      if (original) return requestCategoryChange(original, { ...patch, type: original.type });
      return;
    }
    const key = keyForTx(tx);
    if (!key) {
      snapshotBeforeAction("Categorie/type aangepast");
      setRowOverride(tx.id, patch);
      return;
    }
    const matches = classified.filter((t) => !t.isMirror && keyForTx(t) === key);
    if (matches.length <= 1) {
      snapshotBeforeAction("Categorie/type aangepast");
      if (tx.id != null) setRowOverride(tx.id, patch);
      else setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, patch, tx.counterpartyIban);
      suggestSimilarIfAny(tx, patch);
      return;
    }
    const matchYears = [...new Set(matches.map((t) => t.year))].sort((a, b) => a - b);
    setPendingCategoryChange({ tx, patch, key, matchCount: matches.length, matchYears, viaIban: key.startsWith("IBAN::") });
  };
  const applyPendingToRowOnly = () => {
    const { tx, patch } = pendingCategoryChange;
    snapshotBeforeAction("Categorie/type aangepast");
    if (tx.id != null) setRowOverride(tx.id, patch);
    else setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, patch, tx.counterpartyIban);
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };
  const applyPendingToAllYears = () => {
    const { tx, patch } = pendingCategoryChange;
    setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, patch, tx.counterpartyIban);
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };
  const applyPendingToYears = (selectedYears) => {
    const { tx, key, patch } = pendingCategoryChange;
    snapshotBeforeAction("Categorie/type aangepast (gekozen jaren)");
    const idsToPatch = classified.filter((t) => !t.isMirror && keyForTx(t) === key && selectedYears.includes(t.year)).map((t) => t.id);
    setOverridesByRow((prev) => {
      const next = { ...prev };
      for (const id of idsToPatch) next[id] = { ...(next[id] || {}), ...patch };
      return next;
    });
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };

  // ---- Slepen tussen Zakelijk en Prive (Pointer Events — werkt ook op iOS/iPad) ----
  const [dragState, setDragState] = useState(null); // { tx, x, y, overZone }
  const [expandedTable, setExpandedTable] = useState(null); // "Zakelijk" | "Prive" | null
  const [expandedBusinessIncomeList, setExpandedBusinessIncomeList] = useState(false);
  const [expandedBusinessExpenseList, setExpandedBusinessExpenseList] = useState(false);
  const dragStateRef = useRef(null);
  dragStateRef.current = dragState;
  const startRowDrag = (e, tx) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
    setDragState({ tx, x: e.clientX, y: e.clientY, overZone: null });
  };
  useEffect(() => {
    if (!dragState) return;
    const handleMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const zoneEl = el && el.closest ? el.closest("[data-dropzone]") : null;
      const overZone = zoneEl ? zoneEl.getAttribute("data-dropzone") : null;
      setDragState((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY, overZone } : prev));
    };
    const handleUp = () => {
      const cur = dragStateRef.current;
      if (cur && !cur.tx.isMirror && cur.overZone && cur.overZone !== cur.tx.type) {
        requestCategoryChange(cur.tx, { category: cur.tx.category, type: cur.overZone });
      }
      setDragState(null);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [!!dragState]);

  const groups = useMemo(() => {
    const map = {};
    for (const tx of classified) {
      const key = `${tx.type} ${tx.year}`;
      if (!map[key]) map[key] = { label: `${tx.type === "Zakelijk" ? "Zakelijk" : "Prive"} ${tx.year}`, type: tx.type, year: tx.year, items: [] };
      map[key].items.push(tx);
    }
    return Object.values(map).sort((a, b) => a.year - b.year || (a.type === "Zakelijk" ? -1 : 1));
  }, [classified]);
  const years = useMemo(() => [...new Set(groups.map((g) => g.year))].sort((a, b) => a - b), [groups]);
  // Kwartalen voor de wizard-stap: alleen kwartalen die al voorbij zijn (geen zin om te vragen of
  // een kwartaal dat nog loopt al is aangegeven/betaald) — én die nog GEEN status hebben. Zonder
  // deze laatste voorwaarde kwam deze stap ("Welke BTW-kwartalen zijn al aangegeven/betaald?")
  // steeds weer terug bij elke volgende keer dat de wizard opende (bijv. bij het laden van nog een
  // rekening, ook een privérekening die met BTW niets te maken heeft) — ook als alle kwartalen al
  // een keer waren afgevinkt. Zodra een kwartaal hier ooit een status heeft gekregen (aangegeven
  // en/of betaald aangevinkt, of bewust op "nee" gelaten via de checkboxen), blijft die stap er dus
  // buiten; een kwartaal dat écht nog nooit is bekeken (bijv. een nieuw jaar) komt wél weer langs.
  const wizardQuarters = useMemo(() => {
    const now = new Date();
    const list = [];
    for (const year of years) {
      for (let kwartaal = 1; kwartaal <= 4; kwartaal++) {
        const quarterEnd = new Date(year, kwartaal * 3, 0);
        const key = `${year}-Q${kwartaal}`;
        if (quarterEnd < now && !kwartaalStatus[key]) list.push({ year, kwartaal });
      }
    }
    return list;
  }, [years, kwartaalStatus]);
  // De wizard-vragen over de auto en het urencriterium (zie SetupWizardModal) worden maar één keer
  // per dossier gesteld en zetten dan meteen autoStatus/zelfstandigenaftrekStatus voor alle jaren
  // die op dát moment al bekend waren. Komt er daarna nog een jaar bij (een later geladen bestand
  // met een nieuw jaartal — heel gebruikelijk in dit dossier-per-jaar-erbij-laden-patroon), dan
  // vraagt de wizard niet opnieuw (bewust, zie de "=== null"-check daar), maar zonder deze aanvulling
  // bleef zo'n nieuw jaar dan gewoon leeg in "Persoonlijke aannames" — alsof er nooit iets was
  // ingevuld. Vul een ontbrekend jaar daarom automatisch aan: voor de auto met de ene dossierbrede
  // keuze die de wizard kent, voor het urencriterium met het antwoord van het dichtstbijzijnde al
  // bekende jaar (er is geen dossierbrede variant van die vraag). Blijft in beide gevallen gewoon
  // per jaar te corrigeren in "Persoonlijke aannames" zelf.
  useEffect(() => {
    if (!autoWizardStatus?.status) return;
    if (!years.some((y) => !(y in autoStatus))) return;
    setAutoStatusState((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const y of years) {
        if (!(y in next)) { next[y] = autoWizardStatus.status; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [years, autoWizardStatus, autoStatus]);
  useEffect(() => {
    const bekendeJaren = Object.keys(zelfstandigenaftrekStatus || {}).map(Number).sort((a, b) => a - b);
    if (bekendeJaren.length === 0) return;
    if (!years.some((y) => !(y in zelfstandigenaftrekStatus))) return;
    setZelfstandigenaftrekStatusState((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const y of years) {
        if (y in next) continue;
        const eerderJaar = bekendeJaren.filter((ky) => ky < y).pop();
        const bronJaar = eerderJaar ?? bekendeJaren[0];
        next[y] = prev[bronJaar];
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [years, zelfstandigenaftrekStatus]);
  useEffect(() => {
    if (!activeYear && years.length) setActiveYear(years[0]);
    if (activeYear && !years.includes(activeYear) && years.length) setActiveYear(years[years.length - 1]);
  }, [years, activeYear]);
  const prevActiveYearRef = useRef(null);
  useEffect(() => {
    if (prevActiveYearRef.current != null && activeYear != null && prevActiveYearRef.current !== activeYear) {
      // Van jaar gewisseld — de Help-uitleg is voor de vorige context, dus sluit die.
      setShowHelp(false);
      setHelpPopupChapter(null);
    }
    prevActiveYearRef.current = activeYear;
  }, [activeYear]);
  const zakGroupForYear = groups.find((g) => g.year === activeYear && g.type === "Zakelijk") || { label: `Zakelijk ${activeYear}`, type: "Zakelijk", year: activeYear, items: [] };
  const priGroupForYear = groups.find((g) => g.year === activeYear && g.type === "Prive") || { label: `Prive ${activeYear}`, type: "Prive", year: activeYear, items: [] };

  // v188: zodra er ÉÉN auto-op-de-zaak geregistreerd staat — financial lease (soort "auto"), koop, of
  // operational lease — tellen computeLeaseAutoKostenVoorJaar (autoBijtelling.js) resp.
  // computeAutoActivaKostenVoorJaar (autoActiva.js) voor ELK jaar 100% van Brandstof/Parkeren mee —
  // ongeacht wat autoStatus voor dat jaar zegt. De generieke %-splitsing hieronder moet die twee
  // categorieën daarom ook mijden zodra dit dossierbreed het geval is, niet alleen in een jaar met
  // expliciet "Auto op de zaak" (zie heeftGeregistreerdeAutoOpDeZaak in tax/categorySplit.js).
  // Dossierbreed (geen jaarfilter) omdat de bronnen zelf dat ook niet hebben.
  const heeftLeaseAutoDossierBreed = useMemo(
    () => heeftGeregistreerdeAutoOpDeZaak(leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus),
    [leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus]
  );
  const quarterlyBtwData = useMemo(
    () => (activeYear ? computeQuarterlyBtwForYear(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed) : []),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed]
  );
  // Uitsluitend voor de "Uitgaven (netto)"-pop-up: dezelfde indeling als hierboven, alleen per
  // categorie apart gehouden — geen nieuwe berekening, puur het al berekende bedrag herleidbaar
  // maken.
  const costBreakdownByQuarter = useMemo(
    () => (activeYear ? computeQuarterlyCostBreakdown(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed) : {}),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed]
  );
  // Zelfde soort uitsplitsing, maar per jaar in één keer — voor de pop-ups bij "Voorbelasting" en
  // "Zakelijk totaal (netto)" in het meerjarenoverzicht.
  const costBreakdownByYear = useMemo(() => {
    const map = {};
    for (const year of years) {
      map[year] = computeYearlyCostBreakdown(classified, year, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed);
    }
    return map;
  }, [classified, years, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed]);
  // Totalen per (splitsbare) categorie voor het actieve jaar — voor CategoryPercentagePanel, zodat
  // die alleen categorieën toont die dit jaar daadwerkelijk transacties hebben.
  const categorieTotalenActiveYear = useMemo(
    () => (activeYear ? computeSplitsbareCategorieTotalenVoorJaar(classified, activeYear, autoStatus, heeftLeaseAutoDossierBreed) : {}),
    [classified, activeYear, autoStatus, heeftLeaseAutoDossierBreed]
  );
  // Rente-voor-jaar staat hier vóór yearlySummary/yearlySummaries: de winstberekening trekt alleen
  // de aftrekbare rente op leningen/financiële lease af (niet de volledige termijn), dus die rente
  // moet al bekend zijn vóórdat de winst berekend wordt — zie yearlySummary.js voor de achtergrond.
  const loanRenteForYear = useMemo(
    () => (activeYear ? computeLoanRenteForYear(loanSummary, loanDetails, activeYear) : null),
    [loanSummary, loanDetails, activeYear]
  );
  const leaseRenteForYear = useMemo(
    () => (activeYear ? computeLeaseRenteForYear(leaseSummary, leaseDetails, activeYear, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate) : null),
    [leaseSummary, leaseDetails, activeYear]
  );
  const renteAftrekbaarActiveYear = (loanRenteForYear?.totaalRente || 0) + (leaseRenteForYear?.totaalRente || 0);
  // Financiële-lease-auto/machine kapitalisatie + afschrijving (en bij een auto met privégebruik
  // >500 km/jaar de bijtelling/onttrekking) — zie tax/autoBijtelling.js. Volledig opt-in: null/0
  // zolang geen enkel leasecontract een "soort" heeft ingevuld, dus geen enkele invloed op
  // bestaande dossiers. Bewust alleen voor een zzp-dossier (rechtsvorm !== "bv") — de
  // onttrekkingsberekening hier is de IB-regel voor een eenmanszaak; een BV/DGA heeft een heel
  // andere bijtellingssystematiek (via de loonheffing), die deze tool niet nabootst.
  const leaseAutoKostenForActiveYear = useMemo(
    () =>
      activeYear && rechtsvorm !== "bv"
        ? combineAutoKosten(
            computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, activeYear, classified, effectiveCategoryBtwRates, btwVerlegd),
            computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, activeYear, classified, effectiveCategoryBtwRates, btwVerlegd)
          )
        : null,
    [leaseSummary, leaseDetails, activeYear, classified, rechtsvorm, effectiveCategoryBtwRates, btwVerlegd, autoActivaDetails, autoWizardStatus]
  );
  // "Huur (deels zakelijk)" — null zolang er dit jaar geen enkele transactie in deze categorie
  // voorkomt (verreweg de meeste dossiers), dus zonder enige invloed op de winst/voorbelasting
  // hieronder in dat (huidige) geval.
  const gedeeldeHuurForActiveYear = useMemo(
    () => (activeYear ? computeGedeeldeHuurVoorJaar(classified, activeYear, huurZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd) : null),
    [classified, activeYear, huurZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd]
  );
  // Kilometervergoeding voor een privéauto die zakelijk gebruikt wordt (autoStatus "prive"/"beide")
  // — zie tax/kmVergoeding.js. Zelfde rechtsvorm-beperking als leaseAutoKostenForActiveYear
  // hierboven (alleen zzp/eenmanszaak; een BV/DGA heeft hiervoor een andere systematiek).
  const kmVergoedingForActiveYear = useMemo(
    () => (activeYear && rechtsvorm !== "bv" ? computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, activeYear) : null),
    [kmVergoedingDetails, autoStatus, activeYear, rechtsvorm]
  );
  // v183: hier naartoe verplaatst (was verderop) — "Zakelijk - apparatuur/machines" telt sinds v183
  // niet meer als volledige kosten mee in yearlySummary.js (zie de toelichting daar), dus de
  // daadwerkelijk berekende afschrijving moet worden meegeteld in winstCorrectieActiveYear hieronder,
  // exact dezelfde constructie als de financiële-lease-afschrijving.
  const activaAfschrijvingForYear = useMemo(
    () => (activeYear ? computeActivaAfschrijvingForYear(activaSummary, activaDetails, activeYear) : null),
    [activaSummary, activaDetails, activeYear]
  );
  const winstCorrectieActiveYear =
    (leaseAutoKostenForActiveYear?.winstCorrectie || 0) - (gedeeldeHuurForActiveYear?.nietAftrekbaarBedrag || 0) +
    (kmVergoedingForActiveYear?.bedrag || 0) + (activaAfschrijvingForYear?.totaalAfschrijving || 0);
  const yearlySummary = useMemo(
    () => (activeYear ? computeYearlySummary(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, INCOME_TRANSFER_CATEGORIES, voorbelastingExcluded, renteAftrekbaarActiveYear, winstCorrectieActiveYear, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed) : null),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, voorbelastingExcluded, renteAftrekbaarActiveYear, winstCorrectieActiveYear, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed]
  );
  const yearlyOpenOB = useMemo(
    () => computeYearlyOpenOB(classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, kwartaalStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed),
    [classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, kwartaalStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed]
  );
  const ibEstimate = useMemo(
    () => (yearlySummary ? estimateIncomeTax(yearlySummary.winst, activeYear) : { belasting: 0, geëxtrapoleerd: false }),
    [yearlySummary, activeYear]
  );
  const zvwEstimate = useMemo(
    () => (yearlySummary ? estimateZvw(yearlySummary.winst, activeYear) : { bijdrage: 0, geëxtrapoleerd: false, grondslag: 0, gemaximeerd: false }),
    [yearlySummary, activeYear]
  );
  const yearlySummaries = useMemo(() => {
    const map = {};
    for (const y of years) {
      const loanRente = computeLoanRenteForYear(loanSummary, loanDetails, y);
      const leaseRente = computeLeaseRenteForYear(leaseSummary, leaseDetails, y, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
      const renteAftrekbaar = (loanRente?.totaalRente || 0) + (leaseRente?.totaalRente || 0);
      const leaseAutoKosten = rechtsvorm !== "bv"
        ? combineAutoKosten(
            computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, y, classified, effectiveCategoryBtwRates, btwVerlegd),
            computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, y, classified, effectiveCategoryBtwRates, btwVerlegd)
          )
        : null;
      const gedeeldeHuur = computeGedeeldeHuurVoorJaar(classified, y, huurZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      const kmVergoeding = rechtsvorm !== "bv" ? computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, y) : null;
      // v183: "Zakelijk - apparatuur/machines" telt sinds v183 niet meer als volledige kosten mee in
      // yearlySummary.js — de daadwerkelijk berekende afschrijving moet daarom hier worden meegeteld,
      // exact dezelfde constructie als de financiële-lease-afschrijving.
      const activaAfschrijving = computeActivaAfschrijvingForYear(activaSummary, activaDetails, y);
      const winstCorrectie =
        (leaseAutoKosten?.winstCorrectie || 0) - (gedeeldeHuur?.nietAftrekbaarBedrag || 0) +
        (kmVergoeding?.bedrag || 0) + (activaAfschrijving?.totaalAfschrijving || 0);
      map[y] = computeYearlySummary(classified, y, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, INCOME_TRANSFER_CATEGORIES, voorbelastingExcluded, renteAftrekbaar, winstCorrectie, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed);
    }
    return map;
  }, [years, classified, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, voorbelastingExcluded, loanSummary, loanDetails, leaseSummary, leaseDetails, rechtsvorm, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, activaSummary, activaDetails]);
  // v237 — Zelfde reserve-keten (niet-gerealiseerde zelfstandigenaftrek over de jaren heen) en
  // dezelfde "...MetOndernemersaftrek"-functies als het volledige Aangiftevoorstel-rapport
  // (reports/aangiftevoorstel.js), nu ook lichtgewicht herbruikt voor de dashboardkaarten "IB & Zvw"
  // en "Aftrekposten" bij het geselecteerde jaar — zodat die kaarten dezelfde bedragen tonen als de
  // uitgebreide berekening, i.p.v. een losstaande, mogelijk afwijkende schatting. Alleen relevant voor
  // zzp/eenmanszaak (rechtsvorm !== "bv"); een BV kent geen zelfstandigenaftrek/Zvw op deze manier.
  // Bewuste vereenvoudiging t.o.v. het volledige rapport: een jaar met "onbekend" urencriterium wordt
  // hier behandeld als "ja" (in plaats van beide scenario's apart te tonen) — te veel nuance voor een
  // compacte kaart; de volledige, preciezere uitsplitsing (incl. beide scenario's) staat in de
  // "Indicatieve aangifteberekening" zelf, waar deze kaarten ook naartoe doorklikken.
  const ondernemersaftrekPerJaar = useMemo(() => {
    if (rechtsvorm === "bv" || years.length === 0) return {};
    const jarenData = years.map((y) => ({
      year: y,
      winst: yearlySummaries[y]?.winst || 0,
      zelfstandigenaftrekStatus: resolveZelfstandigenaftrekStatusForYear(zelfstandigenaftrekStatus, y, zaLegacyJaDefault),
      startersaftrekToegepast: startersaftrekStatus?.[y] === "ja",
    }));
    return computeOndernemersaftrekMetReserve(jarenData);
  }, [rechtsvorm, years, yearlySummaries, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus]);
  const dashboardAangifteIndicatie = useMemo(() => {
    if (rechtsvorm === "bv" || !activeYear || !yearlySummary) return null;
    const aftrek = ondernemersaftrekPerJaar[activeYear];
    const startersaftrekToegepastDitJaar = startersaftrekStatus?.[activeYear] === "ja";
    const ondernemersaftrekBedrag = aftrek ? aftrek.zelfstandigenaftrekBedrag + aftrek.startersaftrekBedrag : 0;
    const winstUitsplitsing = computeBelastbareWinstUitsplitsing(yearlySummary.winst, activeYear, ondernemersaftrekBedrag, startersaftrekToegepastDitJaar);
    return {
      ib: estimateIncomeTaxMetOndernemersaftrek(yearlySummary.winst, activeYear, ondernemersaftrekBedrag, startersaftrekToegepastDitJaar),
      zvw: estimateZvwMetOndernemersaftrek(yearlySummary.winst, activeYear, ondernemersaftrekBedrag, startersaftrekToegepastDitJaar),
      zelfstandigenaftrekBedrag: aftrek?.zelfstandigenaftrekBedrag || 0,
      startersaftrekBedrag: aftrek?.startersaftrekBedrag || 0,
      mkbVrijstellingBedrag: winstUitsplitsing.mkbVrijstellingBedrag,
    };
  }, [rechtsvorm, activeYear, yearlySummary, ondernemersaftrekPerJaar, startersaftrekStatus]);
  // "Zakelijke kosten" per jaar, exact dezelfde optelsom als "Zakelijke kosten" in het
  // Aangiftevoorstel (zie buildYearSection/kostenTotaal in aangiftevoorstel.js): inkoopkosten +
  // afschrijving (berekend als Activa is ingevuld, anders het bruto aanschafbedrag ter herkenning)
  // + overige bedrijfskosten + aftrekbare rente. Bewust NIET zelf opnieuw berekend vanuit
  // computeYearlySummary — dat zou de kans op verschil met het Aangiftevoorstel juist vergroten.
  const kostenTotaalByYear = useMemo(() => {
    const map = {};
    for (const y of years) {
      const zakItemsVoorJaar = classified.filter((tx) => !tx.isMirror && tx.year === y && fiscalTreatmentOf(tx.category) !== "geen");
      const loanRente = computeLoanRenteForYear(loanSummary, loanDetails, y);
      const leaseRente = computeLeaseRenteForYear(leaseSummary, leaseDetails, y, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
      const renteAftrekbaar = (loanRente?.totaalRente || 0) + (leaseRente?.totaalRente || 0);
      const activaAfschrijvingVoorJaar = computeActivaAfschrijvingForYear(activaSummary, activaDetails, y);
      const leaseAutoKosten = rechtsvorm !== "bv"
        ? combineAutoKosten(
            computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, y, classified, effectiveCategoryBtwRates, btwVerlegd),
            computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, y, classified, effectiveCategoryBtwRates, btwVerlegd)
          )
        : null;
      const kmVergoeding = rechtsvorm !== "bv" ? computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, y) : null;
      const ib = computeIbBoxMapping(zakItemsVoorJaar, loanRente, leaseRente, activaAfschrijvingVoorJaar, effectiveCategoryBtwRates, btwVerlegd, leaseAutoKosten, y, categoryZakelijkPercentage, autoStatus, kmVergoeding);
      map[y] =
        (ib.inkoopkosten.totaal || 0) +
        (ib.afschrijvingen.berekendeApparatuurAfschrijving ?? ib.afschrijvingen.apparatuurInvestering ?? 0) +
        (ib.afschrijvingen.berekendeLeaseAfschrijving || 0) +
        (ib.autokostenOverig.totaal || 0) +
        ib.overigeBedrijfskosten.reduce((a, r) => a + (r.totaal || 0), 0) +
        ib.nogNietIngedeeld.reduce((a, r) => a + (r.totaal || 0), 0) +
        renteAftrekbaar -
        (ib.leaseAutoKosten?.onttrekking || 0);
    }
    return map;
  }, [years, classified, effectiveCategoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, activaSummary, activaDetails, rechtsvorm, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails]);
  // BV-specifiek: alleen berekend/gebruikt als rechtsvorm === "bv" (zie Meerjarenoverzicht BV en het
  // BV-Aangiftevoorstel), maar hier al altijd bijgehouden — dezelfde Route B-redenering als de rest
  // van de tool: deze categorieën bestaan niet in een zzp-dossier, dus deze waarden zijn dan gewoon
  // allemaal 0/leeg en hebben geen enkele invloed op de zzp-weergave.
  const dgaSalarisByYear = useMemo(() => {
    const map = {};
    for (const y of years) {
      map[y] = Math.abs(classified.filter((tx) => tx.category === "DGA-salaris" && !tx.isMirror && tx.year === y).reduce((a, tx) => a + tx.amount, 0));
    }
    return map;
  }, [classified, years]);
  const rcVerloop = useMemo(() => computeRekeningCourantVerloop(classified, years), [classified, years]);
  const evVerloop = useMemo(() => {
    const resultaatNaVpbPerJaar = {};
    for (const y of years) {
      const s = yearlySummaries[y];
      if (s) resultaatNaVpbPerJaar[y] = s.winst - estimateVpb(s.winst, y).belasting;
    }
    return computeEigenVermogenVerloop(classified, years, resultaatNaVpbPerJaar);
  }, [classified, years, yearlySummaries]);
  const bvSignalering = useMemo(
    () => (rechtsvorm === "bv" ? computeBvSignalering(activeYear, yearlySummaries, evVerloop, yearlyOpenOB, years) : null),
    [rechtsvorm, activeYear, yearlySummaries, evVerloop, yearlyOpenOB, years]
  );
  const volledigeJaren = useMemo(() => computeVolledigeJaren(classified), [classified]);
  // Is er daadwerkelijk een privérekening-BESTAND geladen in dit dossier? Zie de toelichting bij
  // `priveRekeningGeladen` in tax/checklist.js — bepaalt of de spiegelboeking-check daar nog
  // betekenis heeft, of dat de echte privétransacties zelf al hun eigen tegenboeking zijn.
  const priveRekeningGeladen = useMemo(() => Object.values(accountTypeByFile).includes("Prive"), [accountTypeByFile]);
  // v233: zelfde soort vlag, maar dan voor de zakelijke kant — gebruikt door de "Controle
  // overboeking zakelijk ↔ privé"-banner in het Details-tabblad hieronder, om net als hierboven
  // dossierbreed (niet per item-aantal van het actieve jaar) te bepalen of er überhaupt een
  // rekening van dat type geladen is.
  const zakelijkRekeningGeladen = useMemo(() => Object.values(accountTypeByFile).includes("Zakelijk"), [accountTypeByFile]);
  const checklistData = useMemo(
    () => computeChecklistLikeDataForYear(zakGroupForYear.items, priGroupForYear.items, quarterlyBtwData, kwartaalStatus, priveRekeningGeladen),
    [zakGroupForYear, priGroupForYear, quarterlyBtwData, kwartaalStatus, priveRekeningGeladen]
  );
  const businessAdvies = useMemo(() => {
    if (!activeYear || !yearlySummary) return null;
    return computeBusinessAdvies(activeYear, yearlySummary, yearlyOpenOB[activeYear] || 0, ibEstimate, !!ibStatus[activeYear]?.gedaan, priGroupForYear.items, zvwEstimate);
  }, [activeYear, yearlySummary, yearlyOpenOB, ibEstimate, zvwEstimate, ibStatus, priGroupForYear]);

  // ---- Voortgangspercentage per jaar (voor de jaarknoppen in "Werk te doen") ----
  const yearlyProgress = useMemo(() => {
    const map = {};
    for (const year of years) {
      const zakItems = (groups.find((g) => g.year === year && g.type === "Zakelijk") || { items: [] }).items;
      const priItems = (groups.find((g) => g.year === year && g.type === "Prive") || { items: [] }).items;
      const allYearItems = [...zakItems, ...priItems];
      const quartersForYear = computeQuarterlyBtwForYear(classified, year, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed);
      const yc = computeChecklistLikeDataForYear(zakItems, priItems, quartersForYear, kwartaalStatus, priveRekeningGeladen);
      const checks = [{ frac: yc.categorizedPct / 100 }];

      const personKeysThisYear = new Set(
        allYearItems.filter((tx) => tx.category === "Overboekingen aan personen" && !tx.isMirror).map((tx) => counterpartyKey(tx.counterparty || tx.description, tx.amount)).filter(Boolean)
      );
      if (personKeysThisYear.size > 0) {
        const done = [...personKeysThisYear].filter((k) => reviewedPersonKeys.includes(k)).length;
        checks.push({ frac: done / personKeysThisYear.size });
      }
      const overigKeysThisYear = new Set(
        allYearItems.filter((tx) => tx.category === "Overig" && !tx.isMirror).map((tx) => counterpartyKey(tx.counterparty || tx.description, tx.amount)).filter(Boolean)
      );
      if (overigKeysThisYear.size > 0) {
        const done = [...overigKeysThisYear].filter((k) => reviewedOverigKeys.includes(k)).length;
        checks.push({ frac: done / overigKeysThisYear.size });
      }
      checks.push({ frac: korRegeling !== null ? 1 : 0 });
      if (korRegeling === false) {
        checks.push({ frac: btwVerlegd !== null ? 1 : 0 });
        const kwTotal = quartersForYear.length;
        let kwScore = 0;
        for (const q of quartersForYear) {
          const s = kwartaalStatus[`${q.year}-Q${q.kwartaal}`] || {};
          kwScore += (s.aangegeven ? 0.5 : 0) + (s.betaald ? 0.5 : 0);
        }
        checks.push({ frac: kwTotal > 0 ? kwScore / kwTotal : 1 });
      }
      checks.push({ frac: ibStatus[year]?.gedaan ? 1 : 0 });
      checks.push({ frac: zvwStatus[year]?.gedaan ? 1 : 0 });
      const avgFrac = checks.length ? checks.reduce((a, c) => a + c.frac, 0) / checks.length : 1;

      // Samenvattende status — afgeleid uit bestaande controles, geen nieuw controlesysteem: het
      // voortgangspercentage hierboven, plus hoeveel transacties dit jaar nog onzeker zijn
      // geclassificeerd, plus of er een bekend gat in de bestandscontinuïteit dit jaar raakt.
      const onzekerDitJaar = allYearItems.filter((tx) => !tx.isMirror && tx.confidence.level !== "override" && tx.confidence.level !== "keyword" && tx.confidence.level !== "heuristic").length;
      // Een verschil van een paar cent (of zelfs een paar euro) bij een bestandsovergang is meestal
      // gewoon een afrondingsverschil, geen teken dat er data ontbreekt — pas boven deze drempel is
      // het de moeite waard om het als een echt gat te behandelen (zie CONTINUITY_GAP_THRESHOLD).
      const gatDitJaar = fileContinuity.some((g) => !g.ok && Math.abs(g.diff) >= CONTINUITY_GAP_THRESHOLD && (g.aTo.getFullYear() === year || g.bFrom.getFullYear() === year));
      let status;
      if (gatDitJaar) status = "rood";
      else if (avgFrac >= 0.95 && onzekerDitJaar === 0) status = "groen";
      else status = "oranje";

      map[year] = { pct: Math.round(avgFrac * 100), status, onzekerDitJaar, gatDitJaar };
    }
    return map;
  }, [years, groups, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, kwartaalStatus, korRegeling, reviewedPersonKeys, reviewedOverigKeys, fileContinuity, ibStatus, zvwStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, heeftLeaseAutoDossierBreed, priveRekeningGeladen]);

  // ---- Dashboard-overzicht (v217-v219) — dossierbrede + per-jaar + situationele kaarten met live
  // cijfers, elk een snelkoppeling naar de bijbehorende sectie verderop op dezelfde pagina.
  // v222: dit blok staat hier bewust op TWEE manieren precies goed geplaatst, allebei nodig:
  // 1) Het leest yearlyProgress/yearlySummary/loanSummary/leaseSummary/checklistData/bvSignalering/
  //    periodeMismatches, die hierboven (allemaal `const`) al gedeclareerd zijn — hoger in de
  //    component (zoals in v217/v218) gaf een "Cannot access before initialization"-crash.
  // 2) Het staat VÓÓR de vroege returns hieronder (showStartupChoice/!loaded) — hooks (useMemo) MOETEN
  //    bij elke render in dezelfde volgorde aangeroepen worden; erna zetten (zoals per ongeluk in
  //    v221 gebeurde) betekent dat deze twee useMemo's worden OVERGESLAGEN zolang het project nog aan
  //    het laden is, en er dus bij de overgang naar "geladen" ineens twee hooks BIJKOMEN — exact de
  //    "Rendered more hooks than during the previous render"-crash (ook een wit scherm, met dank aan
  //    de ErrorBoundary die dit nu tenminste zichtbaar maakt in plaats van stil te falen).
  const jumpToSection = (ref) => {
    const entry = REF_TAB_ENTRIES.find(([r]) => r === ref);
    const targetTab = entry ? entry[1] : null;
    if (targetTab && targetTab !== activeTab) {
      // Sectie zit op een ander tabblad: eerst wisselen, dan pas scrollen (zie de useEffect
      // hieronder — deze ref staat nu nog op display:none).
      setActiveTab(targetTab);
      setPendingScrollRef(ref);
      return;
    }
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  // Voert de scroll pas uit nadat het doel-tabblad daadwerkelijk actief (en dus zichtbaar) is
  // geworden — requestAnimationFrame wacht op de eerstvolgende render/paint na de tabwissel.
  useEffect(() => {
    if (!pendingScrollRef) return;
    const raf = requestAnimationFrame(() => {
      pendingScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollRef(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab, pendingScrollRef]);
  const dashboardCards = useMemo(() => {
    if (transactions.length === 0) return [];
    const yearProgress = activeYear ? yearlyProgress[activeYear] : null;
    const incompleteLoansCount = loanSummary.filter(
      (l) => !(loanDetails[l.key]?.leningbedrag && loanDetails[l.key]?.startdatum) && !loanDetails[l.key]?.onbekend
    ).length;
    const incompleteLeasesCount = leaseSummary.filter((l) => {
      if (!confirmedLeaseTypeKeys.includes(l.key)) return true;
      if (leaseDetails[l.key]?.onbekend) return false;
      return l.category === "Lease (financieel)" && !isCompleteFinancialLeaseDetails(leaseDetails[l.key]);
    }).length;
    const quartersOpenCount = checklistData?.quartersOpen?.length || 0;
    return [
      {
        key: "confidence",
        title: "Te controleren",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        value: confidenceSummary.needsReview,
        subtitle:
          confidenceSummary.needsReview > 0
            ? `${confidenceSummary.unclear} onduidelijk, ${confidenceSummary.review} controleren`
            : "Alles automatisch met vertrouwen ingedeeld",
        tone: confidenceSummary.needsReview > 0 ? "attention" : "ok",
        hint: "Transacties met onzekere classificatie bekijken",
        onClick: () => {
          if (confidenceSummary.needsReview > 0) setOpenConfidenceLevel(confidenceSummary.unclear > 0 ? "fallback" : "heuristic");
          jumpToSection(confidenceSectionRef);
        },
      },
      {
        key: "personReview",
        title: "Overboekingen aan personen",
        icon: <Users className="h-3.5 w-3.5" />,
        value: pendingPersonReview.length,
        subtitle: pendingPersonReview.length > 0 ? "nog te bepalen" : "Niets openstaand",
        tone: pendingPersonReview.length > 0 ? "attention" : "ok",
        hint: "Openstaande overboekingen aan personen bekijken",
        onClick: () => {
          setShowPersonReview(true);
          jumpToSection(personReviewSectionRef);
        },
      },
      {
        key: "overigReview",
        title: '"Overig" opruimen',
        icon: <HelpCircle className="h-3.5 w-3.5" />,
        value: pendingOverigReview.length,
        subtitle: pendingOverigReview.length > 0 ? "tegenpartij(en) nog te bepalen" : "Niets openstaand",
        tone: pendingOverigReview.length > 0 ? "attention" : "ok",
        hint: 'Openstaande "Overig"-tegenpartijen bekijken',
        onClick: () => {
          setShowOverigReview(true);
          jumpToSection(overigReviewSectionRef);
        },
      },
      {
        key: "duplicates",
        title: "Duplicaten",
        icon: <Copy className="h-3.5 w-3.5" />,
        value: pendingDuplicateCount,
        subtitle: pendingDuplicateCount > 0 ? "mogelijk dubbele transactie(s)" : "Geen gevonden",
        tone: pendingDuplicateCount > 0 ? "attention" : "ok",
        hint: "Mogelijk dubbele transacties bekijken",
        onClick: () => {
          if (pendingDuplicateCount > 0) setDismissedDuplicateNotice(false);
          jumpToSection(duplicatesSectionRef);
        },
      },
      // ---- Fase 2 (v218) — per geselecteerd jaar (activeYear), zelfde jaar als StickyYearNav. Deze
      // kaarten verschijnen alleen zodra er een jaar geselecteerd is (na het laden van transacties
      // is dat altijd het geval — zie de activeYear-init hieronder in de bestandsladers). ----
      ...(activeYear
        ? [
            {
              key: "yearStatus",
              title: `Aangifte ${activeYear}`,
              icon: <span>{{ groen: "🟢", oranje: "🟠", rood: "🔴" }[yearProgress?.status || "oranje"]}</span>,
              value: `${yearProgress?.pct ?? 0}%`,
              subtitle: yearProgress?.gatDitJaar
                ? "Gat in bestandscontinuïteit"
                : yearProgress?.onzekerDitJaar > 0
                ? `${yearProgress.onzekerDitJaar} onzeker dit jaar`
                : "Klaar voor aangifte",
              tone: yearProgress?.status === "groen" ? "ok" : yearProgress?.status === "rood" ? "attention" : "neutral",
              hint: "Naar de aangifte-checklist voor dit jaar",
              onClick: () => jumpToSection(checklistSectionRef),
            },
            {
              key: "result",
              title: `Resultaat ${activeYear}`,
              icon: <span>€</span>,
              value: yearlySummary ? eur(yearlySummary.winst) : "—",
              subtitle: yearlySummary && yearlySummary.winst < 0 ? "Verlies" : "Winst (indicatief)",
              tone: yearlySummary && yearlySummary.winst < 0 ? "attention" : "neutral",
              hint: "Naar het jaaroverzicht",
              onClick: () => jumpToSection(multiYearSectionRef),
            },
            // v237 — twee kaarten met de indicatieve fiscale doorrekening voor het geselecteerde jaar,
            // naast de "Resultaat"-kaart hierboven: IB+Zvw in 1 box, de drie aftrekposten in de andere.
            // Alleen bij zzp/eenmanszaak (rechtsvorm !== "bv") — een BV kent deze posten niet op deze
            // manier. Beide klikken door naar dezelfde "Indicatieve aangifteberekening" als elders in
            // de tool, waar de volledige, preciezere uitsplitsing (incl. het "onbekend"-urencriterium-
            // scenario) te zien is — deze kaarten zijn bewust een vereenvoudigde samenvatting.
            ...(rechtsvorm !== "bv" && dashboardAangifteIndicatie
              ? [
                  {
                    key: "ibZvw",
                    title: `IB & Zvw ${activeYear} (indicatief)`,
                    icon: <span>🧮</span>,
                    // v239 — losse bedragen (geen opgeteld totaal) — zie "lines" in DashboardOverview.jsx.
                    lines: [
                      { label: "IB", value: eur(dashboardAangifteIndicatie.ib.belasting) },
                      { label: "Zvw", value: eur(dashboardAangifteIndicatie.zvw.bijdrage) },
                    ],
                    tone: "neutral",
                    hint: "Naar de indicatieve aangifteberekening",
                    onClick: () => setShowAangifteYearPicker(true),
                  },
                  {
                    key: "aftrekposten",
                    title: "Aftrekposten (indicatief)",
                    icon: <span>➖</span>,
                    lines: [
                      { label: "Zelfstandigenaftrek", value: eur(dashboardAangifteIndicatie.zelfstandigenaftrekBedrag) },
                      { label: "MKB-winstvrijstelling", value: eur(dashboardAangifteIndicatie.mkbVrijstellingBedrag) },
                      { label: "Startersaftrek", value: eur(dashboardAangifteIndicatie.startersaftrekBedrag) },
                    ],
                    tone: "neutral",
                    hint: "Naar de indicatieve aangifteberekening",
                    onClick: () => setShowAangifteYearPicker(true),
                  },
                ]
              : []),
            {
              key: "loans",
              title: "Leningen",
              icon: <span>📄</span>,
              value: loanSummary.length,
              // v242 — 3 aparte kleurtoestanden i.p.v. 2 ("attention" dekte zowel "1 van de 3 nog
              // onvolledig" als "geen enkele lening heeft gegevens" met dezelfde amber kleur): "goed"
              // (alles compleet, groen), "deels" (sommige wel/sommige niet, amber) en "ontbreekt" (er
              // zijn leningen gevonden maar nergens iets ingevuld, rood — dringender dan "deels").
              // "Geen gevonden" (0 leningen) blijft neutraal, dat is geen echt op te lossen punt.
              subtitle:
                loanSummary.length === 0
                  ? "Geen gevonden"
                  : incompleteLoansCount === 0
                  ? "Alle gegevens compleet"
                  : incompleteLoansCount === loanSummary.length
                  ? "Nog geen gegevens ingevuld"
                  : `${incompleteLoansCount} van ${loanSummary.length} nog onvolledig`,
              tone:
                loanSummary.length === 0
                  ? "neutral"
                  : incompleteLoansCount === 0
                  ? "ok"
                  : incompleteLoansCount === loanSummary.length
                  ? "risk"
                  : "attention",
              hint: "Naar de leningen-sectie",
              onClick: () => jumpToSection(loansSectionRef),
            },
            {
              key: "leases",
              title: "Lease",
              icon: <span>🚗</span>,
              value: leaseSummary.length,
              subtitle: incompleteLeasesCount > 0 ? `${incompleteLeasesCount} nog niet bepaald` : leaseSummary.length > 0 ? "Alle gegevens compleet" : "Geen gevonden",
              // v234-fix: zelfde correctie als bij "Leningen" hierboven.
              tone: incompleteLeasesCount > 0 ? "attention" : leaseSummary.length > 0 ? "ok" : "neutral",
              hint: "Naar de lease-sectie",
              onClick: () => jumpToSection(leasesSectionRef),
            },
            {
              key: "btwQuarters",
              title: `BTW-kwartalen ${activeYear}`,
              icon: <span>🧾</span>,
              value: quartersOpenCount,
              subtitle: quartersOpenCount > 0 ? "nog niet aangegeven/betaald" : "Alle kwartalen bijgewerkt",
              tone: quartersOpenCount > 0 ? "attention" : "ok",
              hint: "Naar het BTW-kwartaaloverzicht",
              onClick: () => jumpToSection(quarterlyBtwSectionRef),
            },
            // v240 — vervangt de "Factuurperiode"-kaart die hier stond (die is verhuisd naar het
            // Controleren-tabblad) — zelfde stijl als "BTW-kwartalen" hierboven: een getal per
            // openstaand item (hier: IB/IH en Zvw voor {activeYear}, max. 2), i.p.v. een bedrag.
            {
              key: "ibZvwAangiften",
              title: `IB/Zvw aangiften ${activeYear}`,
              icon: <span>📮</span>,
              value: (ibStatus[activeYear]?.gedaan ? 0 : 1) + (zvwStatus[activeYear]?.gedaan ? 0 : 1),
              subtitle: ibStatus[activeYear]?.gedaan && zvwStatus[activeYear]?.gedaan ? "Beide afgehandeld" : "nog niet afgevinkt als gedaan",
              tone: ibStatus[activeYear]?.gedaan && zvwStatus[activeYear]?.gedaan ? "ok" : "attention",
              hint: "Naar de aangifte-checklist voor dit jaar",
              onClick: () => jumpToSection(checklistSectionRef),
            },
            // ---- Fase 3 (v219): situationeel, alleen als er echt een signaal is ----
            ...(rechtsvorm === "bv" && bvSignalering
              ? [
                  {
                    key: "bvSignalering",
                    title: "BV-signalering",
                    icon: <AlertTriangle className="h-3.5 w-3.5" />,
                    value: "!",
                    subtitle: bvSignalering.redenen[0] || "Bekijk de toelichting",
                    tone: "attention",
                    hint: "Naar de BV-signalering",
                    onClick: () => jumpToSection(bvSignaleringSectionRef),
                  },
                ]
              : []),
          ]
        : []),
      // ---- Fase 3 (v219, vervolg) — dossierbreed, niet jaar-gebonden ----
      ...(transactions.length > 0 && (korRegeling === null || (korRegeling === false && btwVerlegd === null))
        ? [
            {
              key: "btwSettings",
              title: "BTW-instellingen",
              icon: <Settings className="h-3.5 w-3.5" />,
              value: "!",
              subtitle: korRegeling === null ? "KOR-vraag nog niet beantwoord" : "BTW-verlegd-vraag nog niet beantwoord",
              tone: "attention",
              hint: "Naar de BTW-instellingen",
              onClick: () => jumpToSection(btwSettingsSectionRef),
            },
          ]
        : []),
      // v240 — "Factuurperiode" is verhuisd naar het nieuwe mini-dashboard op tabblad "Controleren"
      // (zie controlerenDashboardCards hieronder) — hier op Overzicht vervangen door "IB/Zvw
      // aangiften" hierboven, in dezelfde stijl (getal = nog te doen) als de BTW-kwartalen-kaart.
    ];
  }, [
    transactions.length,
    confidenceSummary,
    pendingPersonReview.length,
    pendingOverigReview.length,
    pendingDuplicateCount,
    activeYear,
    yearlyProgress,
    yearlySummary,
    dashboardAangifteIndicatie,
    ibStatus,
    zvwStatus,
    loanSummary,
    loanDetails,
    leaseSummary,
    leaseDetails,
    confirmedLeaseTypeKeys,
    checklistData,
    rechtsvorm,
    bvSignalering,
    korRegeling,
    btwVerlegd,
  ]);

  // v240 — hoeveel geladen bestanden een saldo-afwijking hebben (per bestand zelf, via
  // checkBalanceConsistency) of een echt aansluitgat hebben met het volgende bestand van dezelfde
  // rekening (computeFileContinuity) — hetzelfde "boven de CONTINUITY_GAP_THRESHOLD" criterium als
  // elders in de tool (kleine afrondingsverschillen tellen bewust niet mee). Gebruikt door de
  // "Import controle"-kaart in het nieuwe mini-dashboard op het Controleren-tabblad hieronder.
  const controlerenImportProblemCount = useMemo(() => {
    const balansProblemen = importDiagnostics.filter(
      (d) => d.balanceCheck && !d.balanceCheck.ok && Math.abs(d.balanceCheck.diff) >= CONTINUITY_GAP_THRESHOLD
    ).length;
    const aansluitProblemen = fileContinuity.filter((c) => !c.ok && Math.abs(c.diff) >= CONTINUITY_GAP_THRESHOLD).length;
    return balansProblemen + aansluitProblemen;
  }, [importDiagnostics, fileContinuity]);

  // v240 — Mini-dashboard voor tabblad "Controleren": dezelfde kaartstijl als Overzicht, maar dan
  // precies de items die je tijdens het daadwerkelijk controleren van een dossier afloopt (import,
  // classificatie, openstaande overboekingen/tegenpartijen, duplicaten, factuurperiode) — bij elkaar
  // op de plek waar je toch al aan het controleren bent, i.p.v. terug te moeten naar Overzicht.
  // "Factuurperiode" stond eerder op Overzicht en is hiernaartoe verhuisd (zie dashboardCards
  // hierboven, waar die kaart is weggehaald).
  const controlerenDashboardCards = useMemo(() => {
    if (transactions.length === 0) return [];
    return [
      {
        key: "importControle",
        title: "Import controle",
        icon: <FileSpreadsheet className="h-3.5 w-3.5" />,
        value: controlerenImportProblemCount,
        subtitle: controlerenImportProblemCount > 0 ? "bestand(en) met saldo-afwijking" : "Alle saldi kloppen",
        tone: controlerenImportProblemCount > 0 ? "attention" : "ok",
        hint: "Naar de importcontrole",
        onClick: () => jumpToSection(importControleSectionRef),
      },
      {
        key: "confidence",
        title: "Classificatie zekerheid",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        value: confidenceSummary.needsReview,
        subtitle:
          confidenceSummary.needsReview > 0
            ? `${confidenceSummary.unclear} onduidelijk, ${confidenceSummary.review} controleren`
            : "Alles automatisch met vertrouwen ingedeeld",
        tone: confidenceSummary.needsReview > 0 ? "attention" : "ok",
        hint: "Transacties met onzekere classificatie bekijken",
        onClick: () => {
          if (confidenceSummary.needsReview > 0) setOpenConfidenceLevel(confidenceSummary.unclear > 0 ? "fallback" : "heuristic");
          jumpToSection(confidenceSectionRef);
        },
      },
      {
        key: "personReview",
        title: "Overboekingen aan personen",
        icon: <Users className="h-3.5 w-3.5" />,
        value: pendingPersonReview.length,
        subtitle: pendingPersonReview.length > 0 ? "nog te bepalen" : "Niets openstaand",
        tone: pendingPersonReview.length > 0 ? "attention" : "ok",
        hint: "Openstaande overboekingen aan personen bekijken",
        onClick: () => {
          setShowPersonReview(true);
          jumpToSection(personReviewSectionRef);
        },
      },
      {
        key: "overigReview",
        title: '"Overig" opruimen',
        icon: <HelpCircle className="h-3.5 w-3.5" />,
        value: pendingOverigReview.length,
        subtitle: pendingOverigReview.length > 0 ? "tegenpartij(en) nog te bepalen" : "Niets openstaand",
        tone: pendingOverigReview.length > 0 ? "attention" : "ok",
        hint: 'Openstaande "Overig"-tegenpartijen bekijken',
        onClick: () => {
          setShowOverigReview(true);
          jumpToSection(overigReviewSectionRef);
        },
      },
      {
        key: "duplicates",
        title: "Duplicaten",
        icon: <Copy className="h-3.5 w-3.5" />,
        value: pendingDuplicateCount,
        subtitle: pendingDuplicateCount > 0 ? "mogelijk dubbele transactie(s)" : "Geen gevonden",
        tone: pendingDuplicateCount > 0 ? "attention" : "ok",
        hint: "Mogelijk dubbele transacties bekijken",
        onClick: () => {
          if (pendingDuplicateCount > 0) setDismissedDuplicateNotice(false);
          jumpToSection(duplicatesSectionRef);
        },
      },
      {
        key: "periode",
        title: "Factuurperiode",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        value: periodeMismatches.length,
        subtitle: periodeMismatches.length > 0 ? "afwijkend kwartaal" : "Geen afwijkingen",
        tone: periodeMismatches.length > 0 ? "attention" : "ok",
        hint: "Naar de factuurperiode-controle",
        onClick: () => jumpToSection(periodeReviewSectionRef),
      },
    ];
  }, [
    transactions.length,
    controlerenImportProblemCount,
    confidenceSummary,
    pendingPersonReview.length,
    pendingOverigReview.length,
    pendingDuplicateCount,
    periodeMismatches.length,
  ]);

  // ---- Sticky navbalk (v219, dashboard fase 3) — vaste snelkoppelingen naar dezelfde secties als
  // de dashboardkaarten hierboven, maar dan altijd bereikbaar tijdens het scrollen. "Overzicht"
  // scrollt terug naar de kaartenlaag bovenaan; de rest hergebruikt de bestaande sectie-refs. ----
  const topNavItems = useMemo(() => {
    if (transactions.length === 0) return [];
    // v228 — dit was een sticky navbalk die naar bestaande secties VERDER OP DEZELFDE PAGINA
    // scrolde (jumpToSection); nu zijn het echte tabbladen (zie activeTab hierboven) — gewoon van
    // tabblad wisselen, zonder erbij te scrollen (een tabblad opent altijd bovenaan).
    return [
      { key: "overzicht", label: "Overzicht", onClick: () => setActiveTab("overzicht") },
      { key: "controleren", label: "Controleren", onClick: () => setActiveTab("controleren") },
      { key: "resultaten", label: "Resultaten", onClick: () => setActiveTab("resultaten") },
      { key: "instellingen", label: "Instellingen", onClick: () => setActiveTab("instellingen") },
    ];
  }, [transactions.length]);

  // Korte bullet-lijst voor de "Aangiftevoorstel"-tussenstap. Bevat bewust NIET meer de punten die
  // de Aangifte-checklist hieronder al met (meer) detail toont (Overig-transacties, BTW-kwartalen,
  // ontbrekende spiegelboeking) — dat stond dubbel. Hier staat alleen wat de checklist niet laat zien.
  const aangifteOpenPunten = useMemo(() => {
    if (!activeYear) return [];
    const items = [];
    if (yearlyProgress[activeYear]?.status === "rood") {
      items.push("Saldo tussen twee bestanden sluit dit jaar niet aan");
    }
    if (!ibStatus[activeYear]?.gedaan) items.push("IB/IH nog niet afgevinkt als gedaan");
    if (!zvwStatus[activeYear]?.gedaan) items.push("Zvw nog niet afgevinkt als gedaan");
    return items;
  }, [activeYear, yearlyProgress, ibStatus, zvwStatus]);

  // Simpele 5-stappen workflow-indicator boven het actieve jaar — puur afgeleid uit bestaande
  // state (geen nieuwe reliability-engine): Bankbestanden → Transacties → BTW → Jaarcontrole →
  // Aangiftevoorstel. "Jaarcontrole" hergebruikt letterlijk yearlyProgress[activeYear].status.
  const workflowSteps = useMemo(() => {
    if (!activeYear) return [];
    const filesDone = parsedFiles.length > 0;
    const txDone = checklistData.categorizedPct === 100;
    let btwState;
    if (korRegeling === null) btwState = "todo";
    else if (korRegeling === true) btwState = "done";
    else if (btwVerlegd === null || checklistData.quartersOpen.length > 0) btwState = "oranje";
    else btwState = "done";
    return [
      { label: "Bankbestanden", state: filesDone ? "done" : "todo" },
      { label: "Transacties", state: txDone ? "done" : "oranje" },
      { label: "BTW", state: btwState },
      { label: "Jaarcontrole", state: yearlyProgress[activeYear]?.status || "oranje" },
      { label: "Indicatieve aangifteberekening", state: "todo" },
    ];
  }, [activeYear, parsedFiles.length, checklistData, korRegeling, btwVerlegd, yearlyProgress]);

  // ---- "Werk te doen" — bundelt de belangrijkste openstaande signalen ----
  const todoItems = useMemo(() => {
    const items = [];
    if (pendingDuplicateCount > 0 && !dismissedDuplicateNotice) {
      items.push({ key: "duplicates", text: `${pendingDuplicateCount} mogelijk dubbele transactie(s)`, ref: duplicatesSectionRef });
    }
    if (pendingPersonReview.length > 0) {
      items.push({ key: "personReview", text: `${pendingPersonReview.length} overboeking(en) aan personen nog te bepalen`, ref: personReviewSectionRef });
    }
    if (pendingOverigReview.length > 0) {
      items.push({ key: "overigReview", text: `${pendingOverigReview.length} tegenpartij(en) nog te bepalen in "Overig"`, ref: overigReviewSectionRef });
    }
    // BTW-kwartalen nog niet aangegeven/betaald staat niet meer hier — dat is jaar-specifiek en
    // staat al in "Aangifte {jaar}" (aangifteOpenPunten), geen dubbele melding meer nodig.
    if (periodeMismatches.length > 0) {
      items.push({ key: "periode", text: `${periodeMismatches.length} zakelijke ontvangst(en) met factuurperiode in ander kwartaal`, ref: periodeReviewSectionRef });
    }
    const incompleteLoans = loanSummary.filter((l) => !(loanDetails[l.key]?.leningbedrag && loanDetails[l.key]?.startdatum) && !loanDetails[l.key]?.onbekend);
    if (incompleteLoans.length > 0) {
      items.push({ key: "loans", text: `${incompleteLoans.length} lening(en) nog zonder volledige gegevens`, ref: loansSectionRef });
    }
    const incompleteLeases = leaseSummary.filter((l) => {
      if (!confirmedLeaseTypeKeys.includes(l.key)) return true;
      if (leaseDetails[l.key]?.onbekend) return false;
      return l.category === "Lease (financieel)" && !isCompleteFinancialLeaseDetails(leaseDetails[l.key]);
    });
    if (incompleteLeases.length > 0) {
      items.push({ key: "leases", text: `${incompleteLeases.length} lease(s) nog niet (volledig) bepaald`, ref: leasesSectionRef });
    }
    // Deze drie ("verwachte" lease/lening/AOV, uit de wizard) blijven een open punt totdat de
    // naam wordt teruggevonden in de transacties — maar bij een tikfout in de naam tijdens de
    // wizard (of als het toch niet relevant blijkt) gebeurt dat natuurlijk nooit. De wizard vraagt
    // dit maar één keer (zie SetupWizardModal: pas opnieuw als de state weer op null staat), dus
    // zonder een eigen manier om de naam hier te corrigeren of het punt te verwijderen bleef zo'n
    // open punt voor altijd hangen, met een "Ga erheen"-knop die nergens heen kan gaan als er
    // (door de verkeerde naam) sowieso geen lease/lening in de transacties herkend is.
    (verwachteLease || []).forEach((item, idx) => {
      if (!item.gevonden) {
        items.push({
          key: `verwachte-lease-${idx}`,
          text: `Je gaf aan dat er een leaseauto is${item.naam ? ` bij "${item.naam}"` : ""} — nog niet gevonden/bevestigd in de transacties`,
          ref: leasesSectionRef,
          naam: item.naam,
          onRename: (nieuweNaam) => setVerwachteLease((prev) => (prev || []).map((it, i) => (i === idx ? { ...it, naam: nieuweNaam } : it))),
          onRemove: () => setVerwachteLease((prev) => (prev || []).filter((_, i) => i !== idx)),
        });
      }
    });
    (verwachteLening || []).forEach((item, idx) => {
      if (!item.gevonden) {
        items.push({
          key: `verwachte-lening-${idx}`,
          text: `Je gaf aan dat er een zakelijke lening is${item.naam ? ` bij "${item.naam}"` : ""} — nog niet gevonden/bevestigd in de transacties`,
          ref: loansSectionRef,
          naam: item.naam,
          onRename: (nieuweNaam) => setVerwachteLening((prev) => (prev || []).map((it, i) => (i === idx ? { ...it, naam: nieuweNaam } : it))),
          onRemove: () => setVerwachteLening((prev) => (prev || []).filter((_, i) => i !== idx)),
        });
      }
    });
    if (verwachteAOV?.status === "ja" && !verwachteAOV.gevonden) {
      items.push({
        key: "verwachte-aov",
        text: `Je gaf aan dat er een AOV is${verwachteAOV.naam ? ` bij "${verwachteAOV.naam}"` : ""} — nog niet gevonden/bevestigd in de transacties`,
        naam: verwachteAOV.naam,
        onRename: (nieuweNaam) => setVerwachteAOV((prev) => ({ ...prev, naam: nieuweNaam })),
        onRemove: () => setVerwachteAOV(null),
      });
    }
    if (transactions.length > 0 && korRegeling === null) {
      items.push({ key: "kor", text: "KOR-vraag nog niet beantwoord", ref: btwSettingsSectionRef });
    }
    if (transactions.length > 0 && korRegeling === false && btwVerlegd === null) {
      items.push({ key: "btwVerlegd", text: "BTW-verlegd-vraag nog niet beantwoord", ref: btwSettingsSectionRef });
    }
    if ((incomeBtwTarieven?.length || 0) > 1 && !meerdereTarievenBevestigd) {
      items.push({
        key: "meerdereTarieven",
        text: `Je gaf aan dat je omzet onder ${incomeBtwTarieven.length} verschillende BTW-tarieven valt — controleer welke klanten bij welk tarief horen`,
        ref: incomeRatesSectionRef,
      });
    }
    if (confidenceSummary.needsReview > 0) {
      items.push({
        key: "confidence",
        text: `${confidenceSummary.needsReview} transactie(s) met onzekere classificatie — controleren`,
        ref: confidenceSectionRef,
      });
    }
    // IB/IH- en Zvw-status "nog niet gedaan" staat niet meer hier — dat is jaar-specifiek en staat
    // al in "Aangifte {jaar}" (aangifteOpenPunten), geen dubbele melding meer nodig.
    return items;
  }, [
    pendingDuplicateCount, dismissedDuplicateNotice, pendingPersonReview, pendingOverigReview,
    activeYear, korRegeling, quarterlyBtwData, kwartaalStatus, transactions, btwVerlegd,
    periodeMismatches, loanSummary, loanDetails, leaseSummary, leaseDetails, confirmedLeaseTypeKeys,
    confidenceSummary, verwachteLease, verwachteLening, verwachteAOV,
    incomeBtwTarieven, meerdereTarievenBevestigd,
  ]);

  // ---- Project opslaan als downloadbaar bestand ----
  const saveProjectFile = () => {
    const project = buildProjectFile({
      parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
      categoryBtwRates, btwVerlegd, korRegeling, rechtsvorm, heeftHolding, holdingBoekingen, btwRatesVersion: BTW_RATES_VERSION,
      excludedDuplicateFingerprints, dismissedDuplicateNotice, businessKeywords, businessExpenseKeywords,
      reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
      kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
      leaseDetails, leaseMergedInto, activaDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints, transactionNotes,
      verwachteLease, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
      ibStatus, zvwStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, incomeBtwTarieven, meerdereTarievenBevestigd, verwachteAangeboden,
    });
    const filename = downloadProjectFile(project, loadedProjectFileName, eigenNamen?.ondernemer);
    setLoadedProjectFileName(filename);
  };

  // ---- Project laden vanaf een bestand ----
  const loadProjectFile = async (file) => {
    try {
      const project = await readProjectFile(file);
      setParsedFiles(Array.isArray(project.parsedFiles) ? project.parsedFiles : []);
      setAccountTypeByFile(project.accountTypeByFile || {});
      setOverridesByCounterparty(migrateOverridesCategories(project.overridesByCounterparty));
      setOverridesByRow(migrateOverridesCategories(project.overridesByRow));
      if (Array.isArray(project.categoryRules)) setCategoryRules(mergeCategoryRules(project.categoryRules));
      setCategoryBtwRates(mergeBtwRates(project.categoryBtwRates, project.btwRatesVersion, migrateLegacyCategoryName));
      setBtwVerlegd(typeof project.btwVerlegd === "boolean" ? project.btwVerlegd : null);
      setKorRegeling(typeof project.korRegeling === "boolean" ? project.korRegeling : null);
      setRechtsvorm(resolveRechtsvorm(project));
      setHeeftHolding(resolveHeeftHolding(project));
      setHoldingBoekingen(project.holdingBoekingen && typeof project.holdingBoekingen === "object" ? project.holdingBoekingen : {});
      setExcludedDuplicateFingerprints(Array.isArray(project.excludedDuplicateFingerprints) ? project.excludedDuplicateFingerprints : []);
      setDismissedDuplicateNotice(!!project.dismissedDuplicateNotice);
      setBusinessKeywords(Array.isArray(project.businessKeywords) ? project.businessKeywords : []);
      setBusinessExpenseKeywords(Array.isArray(project.businessExpenseKeywords) ? project.businessExpenseKeywords : []);
      setReviewedIncomeKeys(Array.isArray(project.reviewedIncomeKeys) ? project.reviewedIncomeKeys : []);
      setReviewedPersonKeys(Array.isArray(project.reviewedPersonKeys) ? project.reviewedPersonKeys : []);
      setReviewedOverigKeys(Array.isArray(project.reviewedOverigKeys) ? project.reviewedOverigKeys : []);
      setKwartaalStatus(project.kwartaalStatus && typeof project.kwartaalStatus === "object" ? project.kwartaalStatus : {});
      setVoorbelastingExcluded(Array.isArray(project.voorbelastingExcluded) ? project.voorbelastingExcluded : DEFAULT_VOORBELASTING_EXCLUDED);
      setPeriodeQuarterOverrides(project.periodeQuarterOverrides && typeof project.periodeQuarterOverrides === "object" ? project.periodeQuarterOverrides : {});
      setReviewedPeriodeKeys(Array.isArray(project.reviewedPeriodeKeys) ? project.reviewedPeriodeKeys : []);
      setLoanDetails(project.loanDetails && typeof project.loanDetails === "object" ? project.loanDetails : {});
      // Oudere projectbestanden bewaarden alleen een simpel rentepercentage per lening
      // ("loanInterestRates"), zonder de volledige leningbedrag/startdatum-gegevens. Die
      // vullen we hier aan in loanDetails (alleen als daar nog geen rente in staat), zodat
      // een ouder projectbestand niet zomaar de eerder ingevulde rente verliest.
      if (project.loanInterestRates && typeof project.loanInterestRates === "object") {
        setLoanDetails((prev) => {
          const merged = { ...prev };
          for (const [key, rate] of Object.entries(project.loanInterestRates)) {
            if (merged[key]?.rente == null) merged[key] = { ...(merged[key] || {}), rente: Number(rate) };
          }
          return merged;
        });
      }
      setLeaseDetails(project.leaseDetails && typeof project.leaseDetails === "object" ? project.leaseDetails : {});
      setLeaseMergedInto(project.leaseMergedInto && typeof project.leaseMergedInto === "object" ? project.leaseMergedInto : {});
      setActivaDetails(project.activaDetails && typeof project.activaDetails === "object" ? project.activaDetails : {});
      setVerwachteLease(project.verwachteLease ?? null);
      setVerwachteLening(project.verwachteLening ?? null);
      setVerwachteAOV(project.verwachteAOV ?? null);
      setAutoWizardStatus(project.autoWizardStatus ?? null);
      setAutoActivaDetails(project.autoActivaDetails && typeof project.autoActivaDetails === "object" ? project.autoActivaDetails : {});
      setKmVergoedingDetailsState(project.kmVergoedingDetails && typeof project.kmVergoedingDetails === "object" ? project.kmVergoedingDetails : {});
      setHeeftVoorraad(project.heeftVoorraad ?? null);
      setEigenNamen(project.eigenNamen ?? null);
      setEigenRekeningenExtra(project.eigenRekeningenExtra ?? null);
      setZakelijkeSpaarRekening(project.zakelijkeSpaarRekening ?? null);
      setOpdrachtgeversGevraagd(project.opdrachtgeversGevraagd ?? null);
      setIncomeBtwTarieven(project.incomeBtwTarieven ?? null);
      setMeerdereTarievenBevestigd(project.meerdereTarievenBevestigd ?? false);
      setVerwachteAangeboden(project.verwachteAangeboden && typeof project.verwachteAangeboden === "object" ? project.verwachteAangeboden : {});
      setConfirmedLeaseTypeKeys(Array.isArray(project.confirmedLeaseTypeKeys) ? project.confirmedLeaseTypeKeys : []);
      setFixedCategories(Array.isArray(project.fixedCategories) ? project.fixedCategories : DEFAULT_FIXED_CATEGORIES);
      setExcludedManualFingerprints(Array.isArray(project.excludedManualFingerprints) ? project.excludedManualFingerprints : []);
      setTransactionNotes(project.transactionNotes && typeof project.transactionNotes === "object" ? project.transactionNotes : {});
      setIbStatus(project.ibStatus && typeof project.ibStatus === "object" ? project.ibStatus : {});
      setZvwStatus(project.zvwStatus && typeof project.zvwStatus === "object" ? project.zvwStatus : {});
      setZelfstandigenaftrekStatusState(project.zelfstandigenaftrekStatus && typeof project.zelfstandigenaftrekStatus === "object" ? project.zelfstandigenaftrekStatus : {});
      // v194: een projectbestand zonder deze vlag is opgeslagen vóór deze wijziging — behoud dan het
      // oude gedrag (onbeantwoord urencriterium-jaar = "ja") zodat een eerder gedeeld/afgedrukt cijfer
      // niet met terugwerkende kracht verandert. Alleen een bestand dat de vlag al draagt (opgeslagen
      // door v194 of later) volgt de nieuwe, veiligere default ("onbekend") voor een nog onbeantwoord jaar.
      setZaLegacyJaDefault(project.zaLegacyJaDefault === false ? false : true);
      setStartersaftrekStatusState(project.startersaftrekStatus && typeof project.startersaftrekStatus === "object" ? project.startersaftrekStatus : {});
      setAutoStatusState(project.autoStatus && typeof project.autoStatus === "object" ? project.autoStatus : {});
      setHuurZakelijkPercentageStatusState(project.huurZakelijkPercentageStatus && typeof project.huurZakelijkPercentageStatus === "object" ? project.huurZakelijkPercentageStatus : {});
      setCategoryZakelijkPercentageState(project.categoryZakelijkPercentage && typeof project.categoryZakelijkPercentage === "object" ? project.categoryZakelijkPercentage : {});
      setOpeningBalanceCorrections(project.openingBalanceCorrections && typeof project.openingBalanceCorrections === "object" ? project.openingBalanceCorrections : {});
      setLoadedProjectFileName(file.name);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  // ---- Wis alles ----
  const clearAllData = () => {
    setConfirmMessage(
      "Alle geüploade bestanden, rekeningtypes en correcties verwijderen? Dit kan niet ongedaan worden gemaakt zodra je bevestigt."
    );
  };
  const doClearAllData = async () => {
    snapshotBeforeAction("Wis alles");
    setConfirmMessage(null);
    setParsedFiles([]);
    setAccountTypeByFile({});
    setOverridesByCounterparty({});
    setOverridesByRow({});
    setCategoryRules(DEFAULT_RULES);
    setCategoryBtwRates(DEFAULT_BTW_RATES);
    setBtwVerlegd(null);
    setKorRegeling(null);
    setRechtsvorm(null);
    setHeeftHolding(null);
    setHoldingBoekingen({});
    setExcludedDuplicateFingerprints([]);
    setDismissedDuplicateNotice(false);
    setExcludedManualFingerprints([]);
    setTransactionNotes({});
    setReviewFileModal(null);
    setBusinessKeywords([]);
    setBusinessExpenseKeywords([]);
    setReviewedIncomeKeys([]);
    setReviewedPersonKeys([]);
    setReviewedOverigKeys([]);
    setKwartaalStatus({});
    setVoorbelastingExcluded(DEFAULT_VOORBELASTING_EXCLUDED);
    setPeriodeQuarterOverrides({});
    setReviewedPeriodeKeys([]);
    setLoanDetails({});
    setLeaseDetails({});
    setLeaseMergedInto({});
    setActivaDetails({});
    setConfirmedLeaseTypeKeys([]);
    setFixedCategories(DEFAULT_FIXED_CATEGORIES);
    setIbStatus({});
    setZvwStatus({});
    setOpeningBalanceCorrections({});
    setVerwachteLease(null);
    setVerwachteLening(null);
    setVerwachteAOV(null);
    setHeeftVoorraad(null);
    setEigenNamen(null);
    setEigenRekeningenExtra(null);
    setZakelijkeSpaarRekening(null);
    setOpdrachtgeversGevraagd(null);
    setIncomeBtwTarieven(null);
    setMeerdereTarievenBevestigd(false);
    setVerwachteMatchSuggestie(null);
    setVerwachteAangeboden({});
    setLoanDetailsModalKey(null);
    setLeaseDetailsModalKey(null);
    setActivaDetailsModalKey(null);
    setAangiftevoorstelPreview(null);
    setShowAangifteYearPicker(false);
    setSelectedAangifteYears([]);
    setActiveYear(null);
    setLoadedProjectFileName(null);
    setError(null);
    await clearPersistedData();
    await clearPersistedSettings();
    setSaveState("idle");
  };

  if (showStartupChoice) {
    const pending = pendingProjectRef.current;
    const fileCount = pending ? pending.parsedFiles.length : 0;
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border-2 border-slate-200 bg-white p-6 shadow-lg">
          <h1 className="text-lg font-semibold mb-1">Vorig project gevonden</h1>
          <p className="text-sm text-slate-500 mb-5">
            Er staat op dit apparaat nog een eerder project klaar ({fileCount} bestand{fileCount === 1 ? "" : "en"}
            {pending?.settings?.eigenNamen?.ondernemer ? <> — rekeninghouder: <strong>{pending.settings.eigenNamen.ondernemer}</strong></> : null}
            ). Wil je daarmee verdergaan, of leeg beginnen?
          </p>
          <div className="space-y-2">
            <button
              onClick={resumeLastProject}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-800"
            >
              Gebruik laatste project
            </button>
            <button
              onClick={startEmpty}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 text-slate-600 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              Leeg beginnen
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            "Leeg beginnen" verwijdert niets: het eerder opgeslagen project blijft in deze browser bewaard en dit
            keuzescherm verschijnt de volgende keer weer, totdat je zelf een nieuw bestand uploadt of een nieuw
            project instelt — pas dán wordt het oude project in deze browser overschreven.
          </p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Opgeslagen gegevens laden…
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-slate-900 text-stone-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Bankoverzicht — Zakelijk &amp; Privé</h1>
            {eigenNamen?.ondernemer ? (
              <p className="text-xs text-slate-400 mt-0.5">
                Rekeninghouder: {eigenNamen.ondernemer}{" "}
                <button onClick={() => setShowRekeninghouderModal(true)} className="underline decoration-dotted hover:text-slate-200">
                  wijzigen
                </button>
              </p>
            ) : (
              <button
                onClick={() => setShowRekeninghouderModal(true)}
                className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-200 mt-0.5"
              >
                + Rekeninghouder invullen
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs text-slate-400 flex items-center gap-1.5"
              title="Automatisch opgeslagen in déze browser — geen bestand. Verdwijnt als je browsergegevens wist. Gebruik 'Project opslaan' voor een bestand dat je kunt bewaren of meenemen."
            >
              {saveState === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Opslaan in browser…
                </>
              )}
              {saveState === "saved" && (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  Automatisch opgeslagen in browser{lastSavedAt ? `: ${lastSavedAt.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : ""}
                </>
              )}
              {saveState === "error" && (
                <>
                  <AlertCircle className="h-3 w-3 text-rose-400" /> Opslaan in browser mislukt
                </>
              )}
            </span>
            {/* v227 — "Bestand laden" stond eerst als aparte knop in de sticky navbalk (zie
                StickyTopNav), maar hoort inhoudelijk bij de andere bestandsacties hier in de
                header, vlak vóór "Project opslaan" — vandaar de verplaatsing. Tweede regel in
                kleiner lettertype toont welke bestandsformaten worden geaccepteerd, zodat de
                knoptekst zelf kort blijft. */}
            <button
              onClick={() => bankFileInputRef.current?.click()}
              className="text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg px-3 py-1.5 flex flex-col items-center leading-tight"
              title="Voeg een nieuw bank-bestand toe (CSV, XLS, MT940 of CAMT.053)"
            >
              <span className="flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" /> Bestand laden
              </span>
              <span className="text-[10px] font-normal text-teal-100">(CSV/XLS, MT940, CAMT.053)</span>
            </button>
            <input
              ref={bankFileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.940,.sta,.mt940,.swi,.txt,.xml"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {parsedFiles.length > 0 && (
              <button
                onClick={saveProjectFile}
                className="text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1"
                title="Download een projectbestand (.json) met alle transacties en instellingen — dit is het bestand om te bewaren, te delen of op een andere computer verder te werken. Anders dan de automatische opslag hierboven blijft dit bestand ook bewaard als je browsergegevens wist."
              >
                <Download className="h-3.5 w-3.5" /> Project opslaan
              </button>
            )}
            <button
              onClick={() => projectFileInputRef.current.click()}
              className="text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1"
              title="Laad een eerder opgeslagen projectbestand (.json)"
            >
              <Upload className="h-3.5 w-3.5" /> Project laden
            </button>
            <input
              ref={projectFileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) loadProjectFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
            {parsedFiles.length > 0 && (
              <button
                onClick={clearAllData}
                className="text-xs font-medium text-rose-700 bg-white hover:bg-rose-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Wis alles
              </button>
            )}
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1"
            >
              Help en uitleg
            </button>
          </div>
        </div>
      </header>

      <StickyTopNav items={topNavItems} activeTab={activeTab} />

      {updateAvailable && <UpdateAvailableBanner />}

      <StickyYearNav years={years} activeYear={activeYear} onSelectYear={setActiveYear} yearlyProgress={yearlyProgress} />

      {lastActionSnapshot && (
        <div className="fixed right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-40 rounded-xl border-2 border-slate-300 bg-white shadow-lg p-2.5 flex flex-col items-stretch gap-2 max-w-[9.5rem]">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[11px] text-slate-600 leading-tight">
              Laatste actie: <strong>{lastActionSnapshot.label}</strong>
            </p>
            <button onClick={() => setLastActionSnapshot(null)} className="text-slate-400 hover:text-slate-700 shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <button onClick={undoLastAction} className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800">
            Ongedaan maken
          </button>
        </div>
      )}

      <button
        onClick={() => setShowCategoryOverview(true)}
        className="fixed right-1.5 sm:right-2 bottom-4 z-[70] inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white shadow-lg px-4 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        title="Snel opzoeken: alle categorieën en subtypes"
      >
        <ListTree className="h-5 w-5 shrink-0" />
        <span className="hidden sm:inline">Categorieën</span>
      </button>

      {showCategoryOverview && <CategoryOverviewModal onClose={() => setShowCategoryOverview(false)} />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 py-8 space-y-6">
        <div style={sectionTabStyle("overzicht")}>
          <DashboardOverview cards={dashboardCards} />
        </div>

        {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

        {helpPopupChapter && <HelpPopupModal chapterKey={helpPopupChapter} onClose={() => setHelpPopupChapter(null)} />}

        {pendingCategoryChange && (
          <CategoryChangeScopeModal
            pending={pendingCategoryChange}
            onApplyRow={applyPendingToRowOnly}
            onApplyAllYears={applyPendingToAllYears}
            onApplyYears={applyPendingToYears}
            onClose={() => setPendingCategoryChange(null)}
          />
        )}

        {pendingCategoryPercentage && (
          <CategoryPercentageScopeModal
            pending={pendingCategoryPercentage}
            onApplyActiveYear={() => {
              setCategoryZakelijkPercentage(pendingCategoryPercentage.category, pendingCategoryPercentage.activeYear, pendingCategoryPercentage.percentage);
              setPendingCategoryPercentage(null);
            }}
            onApplyAllYears={() => applyCategoryPercentageToYears(pendingCategoryPercentage.years)}
            onApplyYears={(selectedYears) => applyCategoryPercentageToYears(selectedYears)}
            onClose={() => setPendingCategoryPercentage(null)}
          />
        )}

        {openConfidenceLevel && uncertainModalData && (
          <UncertainTransactionsModal
            level={openConfidenceLevel}
            transactions={uncertainModalData.transactions}
            bulkCounts={uncertainModalData.bulkCounts}
            onRequestChange={requestCategoryChange}
            onConfirmCorrect={confirmClassificationCorrect}
            onConfirmAll={confirmAllUncertain}
            onJumpToOverig={jumpToOverigFromModal}
            onJumpToPersonen={jumpToPersonenFromModal}
            onClose={() => setOpenConfidenceLevel(null)}
          />
        )}

        {keywordSuggestion && (
          <KeywordSuggestionModal
            suggestion={keywordSuggestion}
            onAccept={acceptKeywordSuggestion}
            onDismiss={() => setKeywordSuggestion(null)}
          />
        )}

        {verwachteMatchSuggestie && (
          <VerwachteMatchModal
            suggestie={verwachteMatchSuggestie}
            onAccept={acceptVerwachteMatch}
            onDismiss={dismissVerwachteMatch}
          />
        )}

        {parsedFiles.length === 0 && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2.5" style={sectionTabStyle("overzicht")}>
            <Lock className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-900">
              <strong>Privacy:</strong> je bankgegevens worden volledig lokaal in deze browser verwerkt. Er wordt niets
              naar een server gestuurd — alles blijft op dit apparaat, ook wat automatisch wordt bewaard.
            </p>
          </div>
        )}

        {error && (
          <section className="rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3 flex items-start gap-3" style={sectionTabStyle("overzicht")}>
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-900 whitespace-pre-line">{error}</p>
          </section>
        )}

        {reviewFileModal && (
          <RawFileReviewModal
            fileName={reviewFileModal}
            rawTx={allTransactions.filter((t) => t.source === reviewFileModal)}
            fingerprintByTxId={fingerprintByTxId}
            excludedManualFingerprints={excludedManualFingerprints}
            setExcludedManualFingerprints={setExcludedManualFingerprints}
            openingBalanceCorrection={openingBalanceCorrections[reviewFileModal]}
            onSetOpeningBalanceCorrection={setOpeningBalanceCorrection}
            onClose={() => setReviewFileModal(null)}
          />
        )}

        {/* v240 — Mini-dashboard bovenaan het Controleren-tabblad, zelfde soort kaarten als op
            Overzicht maar dan precies de items die je tijdens het controleren afloopt. */}
        <div style={sectionTabStyle("controleren")}>
          <DashboardOverview title="Controleren" cards={controlerenDashboardCards} />
        </div>

        {/* v230 — Importcontrole stond eerst op Overzicht, hoort inhoudelijk beter bij de andere
            controlestappen op het Controleren-tabblad. */}
        <div ref={importControleSectionRef} style={sectionTabStyle("controleren")}>
          <ImportControlPanel diagnostics={importDiagnostics} onReviewFile={setReviewFileModal} continuity={fileContinuity} onRemoveFile={removeFile} />
        </div>

        {transactions.length > 0 && (
          <div ref={confidenceSectionRef} style={sectionTabStyle("controleren")}>
            <ClassificationConfidencePanel classified={classified} onOpenHelp={setHelpPopupChapter} onConfirmCorrect={confirmClassificationCorrect} onOpenLevel={setOpenConfidenceLevel} />
          </div>
        )}

        {/* v198-fix: jaar-wisselaar + export/print/aangifte-knoppen stonden pas ver onderaan de
            pagina (na alle review-panelen), terwijl ze horen bij "welk jaar bekijk ik nu" — dat
            bepaalt namelijk ook wat classificatiezekerheid en de checklist hierboven/hieronder
            laten zien. Nu direct hier, tussen classificatiezekerheid en de aangifte-checklist. */}
        {years.length > 0 && activeYear && (
          <div className="flex items-center justify-between gap-2 flex-wrap" style={sectionTabStyle("overzicht")}>
            {years.length > 1 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">Jaar:</span>
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => setActiveYear(year)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium border ${
                      year === activeYear ? "bg-teal-700 border-teal-700 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => exportExcel(groups, effectiveCategoryBtwRates, btwVerlegd)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-slate-400"
              >
                <Download className="h-3.5 w-3.5" /> Excel exporteren
              </button>
              <button
                onClick={() => printReport(groups)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-slate-400"
                title="Opent direct het printvenster van je browser — kies daar een printer, of 'Opslaan als PDF'"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              {/* v241 — de knop "Indicatieve aangifteberekening bekijken" stond hier dubbel: dezelfde
                  knop staat ook al in de donkere "Aangifte {jaar}"-statusbalk direct hieronder (beide
                  openden hetzelfde showAangifteYearPicker-venster). Hier weggehaald, in de statusbalk
                  laten staan. */}
              {/* v199: heropent de wizard om basisvragen te wijzigen (o.a. rechtsvorm zzp/BV,
                  KOR, BTW-verlegd, leaseauto/lening/AOV) — de wizard vraagt normaal alleen nog
                  onbeantwoorde vragen, maar hier forceren we de Rechtsvorm-stap altijd terug in
                  de wachtrij (zie forceRechtsvormStep), zodat je zzp/BV ook achteraf kunt omzetten.
                  Wisselen van rechtsvorm haalt automatisch de bijbehorende vervolgvragen erbij
                  (bijv. holdingstructuur bij BV, of KOR/BTW-verlegd/urencriterium bij zzp) omdat
                  die velden voor de "andere" rechtsvorm nooit ingevuld zijn. */}
              <button
                onClick={() => setManualWizardOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-slate-400"
                title="Rechtsvorm, KOR, BTW-verlegd en andere basisvragen wijzigen"
              >
                <Settings className="h-3.5 w-3.5" /> Basisvragen bewerken
              </button>
            </div>
          </div>
        )}

        {showRekeninghouderModal && (
          <RekeninghouderModal
            eigenNamen={eigenNamen}
            onSave={(v) => { snapshotBeforeAction("Rekeninghouder aangepast"); setEigenNamen(v); }}
            onClose={() => setShowRekeninghouderModal(false)}
          />
        )}

        {(showSetupWizard || manualWizardOpen) && (
          <SetupWizardModal
            forceRechtsvormStep={manualWizardOpen}
            alreadyEstablished={Object.keys(accountTypeByFile).length > 0}
            pendingFileNames={pendingAccountFiles}
            onAccountTypeChoose={setAccountType}
            korRegeling={korRegeling}
            setKorRegeling={setKorRegelingWithUndo}
            rechtsvorm={rechtsvorm}
            setRechtsvorm={setRechtsvormWithUndo}
            heeftHolding={heeftHolding}
            setHeeftHolding={setHeeftHoldingWithUndo}
            btwVerlegd={btwVerlegd}
            setBtwVerlegd={setBtwVerlegdWithUndo}
            onSetIncomeBtwRateChoice={setIncomeBtwRateChoice}
            quartersToAsk={wizardQuarters}
            kwartaalStatus={kwartaalStatus}
            setKwartaalStatusField={setKwartaalStatusField}
            fileContinuity={fileContinuity}
            onSaveProject={saveProjectFile}
            verwachteLease={verwachteLease}
            setVerwachteLease={(v) => { snapshotBeforeAction("Leaseauto-vraag beantwoord"); setVerwachteLease(v); }}
            verwachteLening={verwachteLening}
            setVerwachteLening={(v) => { snapshotBeforeAction("Leningvraag beantwoord"); setVerwachteLening(v); }}
            verwachteAOV={verwachteAOV}
            setVerwachteAOV={(v) => { snapshotBeforeAction("AOV-vraag beantwoord"); setVerwachteAOV(v); }}
            autoWizardStatus={autoWizardStatus}
            setAutoWizardStatus={(v) => { snapshotBeforeAction("Auto-vraag beantwoord"); setAutoWizardStatus(v); }}
            years={years}
            onSeedAutoStatus={seedAutoStatusForAllYears}
            zelfstandigenaftrekStatus={zelfstandigenaftrekStatus}
            onSeedZelfstandigenaftrekStatus={seedZelfstandigenaftrekStatusForAllYears}
            heeftVoorraad={heeftVoorraad}
            setHeeftVoorraad={(v) => { snapshotBeforeAction("Voorraadvraag beantwoord"); setHeeftVoorraad(v); }}
            eigenNamen={eigenNamen}
            setEigenNamen={(v) => { snapshotBeforeAction("Eigen naam ingevuld"); setEigenNamen(v); }}
            eigenRekeningenExtra={eigenRekeningenExtra}
            setEigenRekeningenExtra={(v) => { snapshotBeforeAction("Andere eigen rekening ingevuld"); setEigenRekeningenExtra(v); }}
            zakelijkeSpaarRekening={zakelijkeSpaarRekening}
            setZakelijkeSpaarRekening={(v) => { snapshotBeforeAction("Zakelijke spaarrekening ingevuld"); setZakelijkeSpaarRekening(v); }}
            opdrachtgeversGevraagd={opdrachtgeversGevraagd}
            onAddBusinessKeywords={addBusinessKeywords}
            onAddBusinessExpenseKeywords={addBusinessExpenseKeywords}
            onClose={() => { setShowSetupWizard(false); setManualWizardOpen(false); }}
          />
        )}

        {activeYear && (
          <div ref={checklistSectionRef} style={sectionTabStyle("overzicht")}>
            <AangifteStatusBar
              activeYear={activeYear}
              yearStatus={yearlyProgress[activeYear]?.status || "oranje"}
              workflowSteps={workflowSteps}
              // v195-fix: dit knopje ging tot nu toe altijd rechtstreeks naar de Indicatieve
              // aangifteberekening voor alléén het actieve jaar, zonder mogelijkheid om andere/
              // meerdere jaren te kiezen — terwijl de andere knop met exact dezelfde tekst (verderop
              // op de pagina) wél eerst de jaren-picker opent. Nu doen beide knoppen hetzelfde: de
              // picker openen. v197-fix: de picker is nu een centraal modal-venster (in plaats van
              // een blok verderop op de pagina + scroll-naar-beneden), dus die verschijnt meteen
              // zichtbaar, ongeacht scrollpositie.
              onOpenAangiftevoorstel={() => {
                setShowAangifteMeerdereJaren(false);
                setShowAangifteYearPicker(true);
              }}
              checklistData={checklistData}
              rechtsvorm={rechtsvorm}
              korRegeling={korRegeling}
              btwVerlegd={btwVerlegd}
              ibGedaan={!!ibStatus[activeYear]?.gedaan}
              zvwGedaan={!!zvwStatus[activeYear]?.gedaan}
              onOpenHelp={setHelpPopupChapter}
              onRequestChange={requestCategoryChange}
              onConfirmCorrect={confirmClassificationCorrect}
            />
          </div>
        )}

        <div style={sectionTabStyle("overzicht")}>
          <TodoPanel items={todoItems} />
        </div>

        {years.length > 0 && (
          <div style={sectionTabStyle("overzicht")}>
            <OnzekerhedenPanel heeftVoorraad={heeftVoorraad} />
          </div>
        )}

        <div ref={multiYearSectionRef} style={sectionTabStyle("resultaten")}>
                  {rechtsvorm === "bv" ? (
                    <MultiYearOverviewBV
                      years={years}
                      yearlySummaries={yearlySummaries}
                      kostenTotaalByYear={kostenTotaalByYear}
                      dgaSalarisByYear={dgaSalarisByYear}
                      rcVerloop={rcVerloop}
                      evVerloop={evVerloop}
                      onYearClick={setActiveYear}
                      activeYear={activeYear}
                      onOpenHelp={setHelpPopupChapter}
                    />
                  ) : (
                    <MultiYearOverview
                      years={years}
                      yearlySummaries={yearlySummaries}
                      yearlyOpenOB={yearlyOpenOB}
                      korRegeling={korRegeling}
                      onYearClick={setActiveYear}
                      ibStatus={ibStatus}
                      setIbGedaan={setIbGedaan}
                      zvwStatus={zvwStatus}
                      setZvwGedaan={setZvwGedaan}
                      costBreakdownByYear={costBreakdownByYear}
                      kostenTotaalByYear={kostenTotaalByYear}
                      volledigeJaren={volledigeJaren}
                      businessAdvies={businessAdvies}
                      activeYear={activeYear}
                      onOpenHelp={setHelpPopupChapter}
                    />
                  )}
                </div>

                {rechtsvorm === "bv" && heeftHolding === true && (
                  <div className="mt-4" style={sectionTabStyle("resultaten")}>
                    <HoldingBoekingenPanel years={years} holdingBoekingen={holdingBoekingen} onSetField={setHoldingBoekingField} evVerloop={evVerloop} />
                  </div>
                )}

                {rechtsvorm === "bv" && bvSignalering && (
                  <div className="mt-4" ref={bvSignaleringSectionRef} style={sectionTabStyle("resultaten")}>
                    <BvSignaleringPanel signalering={bvSignalering} activeYear={activeYear} heeftHolding={heeftHolding} />
                  </div>
                )}

                <div ref={quarterlyBtwSectionRef} style={sectionTabStyle("resultaten")}>
                  {!korRegeling ? (
                    <QuarterlyBtwPanel
                      quarters={quarterlyBtwData}
                      kwartaalStatus={kwartaalStatus}
                      setKwartaalStatusField={setKwartaalStatusField}
                      activeYear={activeYear}
                      costBreakdownByQuarter={costBreakdownByQuarter}
                      onOpenHelp={setHelpPopupChapter}
                      obIbSectionRef={obIbSectionRef}
                    />
                  ) : (
                    // Bij KOR wordt het kwartaalpaneel hierboven niet getoond (geen OB-aangifte),
                    // maar de uitleg blijft relevant voor de IB-vakken hieronder (CategorySummaryCard) —
                    // dus die blijft hier los staan, net als voorheen.
                    <div ref={obIbSectionRef} className="flex items-center justify-end">
                      <HelpHint chapter="ob-ib-vakken" onOpen={setHelpPopupChapter} label="Waar vind ik dit op het aangifteformulier?" />
                    </div>
                  )}
                </div>


        {duplicateGroups.length > 0 && pendingDuplicateCount > 0 && !dismissedDuplicateNotice && (
          <section ref={duplicatesSectionRef} className="rounded-xl border-2 border-amber-300 bg-amber-50" style={sectionTabStyle("controleren")}>
            <div className="px-4 py-3 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-900">
                  <strong>{pendingDuplicateCount} mogelijk dubbele transactie(s)</strong> gevonden (zelfde datum, bedrag
                  én omschrijving) — kan gebeuren als bankexports elkaar overlappen.
                </p>
                <div className="mt-2 flex gap-3">
                  <button onClick={removeDuplicates} className="text-xs font-medium text-amber-900 underline hover:no-underline">
                    Duplicaten verwijderen (bewaar de eerste van elk stel)
                  </button>
                  <button onClick={() => setShowDuplicateDetails((v) => !v)} className="text-xs font-medium text-amber-900 underline hover:no-underline">
                    {showDuplicateDetails ? "Verberg details" : "Bekijk welke transacties"}
                  </button>
                  <button onClick={() => setDismissedDuplicateNotice(true)} className="text-xs text-amber-700 hover:text-amber-900">
                    Negeren
                  </button>
                </div>
              </div>
            </div>
            {showDuplicateDetails && (
              <div className="px-4 pb-3 space-y-2">
                {duplicateGroups.map((group) => {
                  const files = [...new Set(group.map((t) => t.source))];
                  const crossFile = files.length > 1;
                  const first = group[0];
                  // v237 — de certainty per transactie komt nu uit computeDuplicateInfo zelf (op basis
                  // van het lopende saldo, wanneer beschikbaar) i.p.v. hier opnieuw uitgerekend te
                  // worden — zie duplicates.js.
                  const zeker = first.certainty === "duplicaat";
                  return (
                    <div key={group[0].fingerprint} className="rounded-lg bg-white border border-amber-200 px-3 py-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-slate-700">
                          {first.date.toLocaleDateString("nl-NL")} · {eur(first.amount)} · {first.counterparty || first.description || "(geen omschrijving)"}
                          <span className="text-slate-400"> — {group.length}x</span>
                        </p>
                        <button
                          onClick={() => setDuplicateDetailGroup(group)}
                          className="shrink-0 text-[11px] font-medium text-amber-900 underline hover:no-underline whitespace-nowrap"
                        >
                          Bekijk originele regels
                        </button>
                      </div>
                      {crossFile ? (
                        <p className="mt-0.5 text-amber-700">
                          ⚠ Komt voor in <strong>meerdere bestanden</strong>: {files.join(", ")} — waarschijnlijk overlappende exportperiodes.
                        </p>
                      ) : (
                        <p className="mt-0.5 text-slate-400">Komt {group.length}x voor binnen hetzelfde bestand ({files[0]}).</p>
                      )}
                      {zeker ? (
                        <p className="mt-0.5 font-medium text-red-700">
                          ✓ Bevestigd op basis van saldo: het lopende saldo na mutatie is bij alle {group.length} regels
                          gelijk ({eur(first.balance)}) — dat kan alleen als het écht dezelfde boeking is, dus dit is met
                          zekerheid een dubbeling.
                        </p>
                      ) : (
                        <p className="mt-0.5 text-slate-400">
                          Geen (volledige) saldogegevens beschikbaar om dit automatisch te bevestigen — vergelijk de
                          originele regels hierboven om zelf te beoordelen.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {confirmedSeparateGroups.length > 0 && showDuplicateDetails && (
          <section className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3" style={sectionTabStyle("controleren")}>
            <p className="text-xs text-emerald-900">
              <strong>{confirmedSeparateGroups.length}x</strong> zelfde datum/bedrag/omschrijving gevonden, maar het
              lopende saldo na mutatie loopt bij elke boeking door — dat bevestigt dat dit losse, echte transacties zijn,
              geen duplicaten. Deze staan daarom niet (meer) bij de te controleren duplicaten hierboven.
            </p>
            <div className="mt-2 space-y-1.5">
              {confirmedSeparateGroups.map((group) => (
                <div key={group[0].fingerprint} className="flex items-center justify-between gap-2 text-[11px] text-emerald-800">
                  <span>
                    {group[0].date.toLocaleDateString("nl-NL")} · {eur(group[0].amount)} ·{" "}
                    {group[0].counterparty || group[0].description || "(geen omschrijving)"} — {group.length}x
                  </span>
                  <button
                    onClick={() => setDuplicateDetailGroup(group)}
                    className="shrink-0 underline hover:no-underline whitespace-nowrap"
                  >
                    Bekijk originele regels
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {duplicateDetailGroup && (
          <DuplicateGroupDetailModal group={duplicateDetailGroup} onClose={() => setDuplicateDetailGroup(null)} />
        )}

        

        {parsedFiles.length > 0 && (
          <div
            ref={incomeRatesSectionRef}
            className={expandedBusinessIncomeList || expandedBusinessExpenseList ? "grid grid-cols-1 gap-4" : "grid md:grid-cols-2 gap-4"}
            style={sectionTabStyle("instellingen")}
          >
            {!expandedBusinessExpenseList && (
              <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold mb-1">Zakelijke tegenpartijen (inkomsten)</h2>
                <p className="text-xs text-slate-500 mb-3">
                  Namen van klanten/opdrachtgevers waarvan binnenkomende betalingen als zakelijke inkomsten gelden.
                </p>
                {(incomeBtwTarieven?.length || 0) > 1 && !meerdereTarievenBevestigd && (
                  <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                    <p>
                      Je gaf in de wizard aan dat je omzet onder meerdere BTW-tarieven valt ({incomeBtwTarieven.map((t) => `${t}%`).join(", ")}).
                      Ken hieronder per klant het juiste tarief toe (kolom "BTW-tarief") — klanten die je nog niet apart hebt ingesteld
                      vallen op het standaardtarief.
                    </p>
                    <button
                      onClick={() => setMeerdereTarievenBevestigd(true)}
                      className="mt-2 rounded-md border border-amber-400 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100"
                    >
                      Nagelopen, verberg deze melding
                    </button>
                  </div>
                )}
                <KeywordManager
                  keywords={businessKeywords}
                  onAdd={addBusinessKeyword}
                  onRemove={removeBusinessKeyword}
                  placeholder="Naam tegenpartij…"
                  chipClass="bg-emerald-100 text-emerald-800"
                  addButtonClass="bg-emerald-600 hover:bg-emerald-700"
                  entries={businessIncomeEntries}
                  entriesLabel="Nu herkend als Zakelijke inkomsten"
                  onReclassify={reclassifyBusinessEntry}
                  onSetBtwVerlegd={setCounterpartyBtwVerlegd}
                  btwVerlegdDefault={btwVerlegd}
                  onSetIncomeRate={setIncomeRate}
                  isExpanded={expandedBusinessIncomeList}
                  onToggleExpand={() => setExpandedBusinessIncomeList((v) => !v)}
                />
              </section>
            )}
            {!expandedBusinessIncomeList && (
              <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold mb-1">Zakelijke inkoop/uitgaven (leveranciers)</h2>
                <p className="text-xs text-slate-500 mb-3">
                  Leveranciers die altijd als zakelijke kosten worden herkend — elke transactie die hierop matcht krijgt
                  automatisch het label Zakelijk.
                </p>
                <KeywordManager
                  keywords={businessExpenseKeywords}
                  onAdd={addBusinessExpenseKeyword}
                  onRemove={removeBusinessExpenseKeyword}
                  placeholder="bijv. LeasePlan, boekhouder-naam…"
                  chipClass="bg-teal-100 text-teal-800"
                  addButtonClass="bg-teal-600 hover:bg-teal-700"
                  entries={businessExpenseEntries}
                  entriesLabel="Nu herkend als Zakelijke inkoop/uitgaven"
                  onReclassify={reclassifyBusinessEntry}
                  isExpanded={expandedBusinessExpenseList}
                  onToggleExpand={() => setExpandedBusinessExpenseList((v) => !v)}
                />
              </section>
            )}
          </div>
        )}

        {transactions.length > 0 && pendingIncomeReview.length > 0 && (
          <div style={sectionTabStyle("controleren")}>
            <IncomeReviewStep
              items={pendingIncomeReview}
              totalCount={incomeSummary.length}
              doneCount={incomeSummary.length - pendingIncomeReview.length}
              search={incomeSearch}
              onSearch={setIncomeSearch}
              onMark={markIncomeSource}
            />
          </div>
        )}

        {transactions.length > 0 && pendingIncomeReview.length === 0 && (
          <>
            {personSummary.length > 0 && (
              <section ref={personReviewSectionRef} className="rounded-xl border-2 border-fuchsia-200 bg-white overflow-hidden shadow-sm" style={sectionTabStyle("controleren")}>
                <button
                  onClick={() => setShowPersonReview((v) => !v)}
                  className="w-full px-4 py-3 bg-fuchsia-50 text-fuchsia-900 flex items-center gap-2 text-left"
                >
                  <span className="text-sm font-semibold">Overboekingen aan personen controleren</span>
                  {pendingPersonReview.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {pendingPersonReview.length}
                    </span>
                  )}
                  <span className="flex-1" />
                  {showPersonReview ? <ChevronDown className="h-4 w-4 text-fuchsia-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-fuchsia-400 shrink-0" />}
                </button>
                {showPersonReview && (
                  <ReviewStep
                    items={pendingPersonReview}
                    allItems={personSummary}
                    allDone={pendingPersonReview.length === 0}
                    search={personSearch}
                    onSearch={setPersonSearch}
                    onMark={markPersonSource}
                    onConfirm={confirmPersonAsIs}
                    defaultCategory="Overboekingen aan personen"
                    confirmButtonClass="border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100"
                    explanation='Kies per tegenpartij de juiste categorie én of het zakelijk of privé is. De keuze geldt meteen voor alle transacties van diezelfde tegenpartij, in alle jaren.'
                  />
                )}
              </section>
            )}

            {overigSummary.length > 0 && (
              <section ref={overigReviewSectionRef} className="rounded-xl border-2 border-amber-200 bg-white overflow-hidden shadow-sm" style={sectionTabStyle("controleren")}>
                <button
                  onClick={() => setShowOverigReview((v) => !v)}
                  className="w-full px-4 py-3 bg-amber-50 text-amber-900 flex items-center gap-2 text-left"
                >
                  <span className="text-sm font-semibold">"Overig" opruimen</span>
                  {pendingOverigReview.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {pendingOverigReview.length}
                    </span>
                  )}
                  <span className="flex-1" />
                  {showOverigReview ? <ChevronDown className="h-4 w-4 text-amber-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />}
                </button>
                {showOverigReview && (
                  <ReviewStep
                    items={pendingOverigReview}
                    allItems={overigSummary}
                    allDone={pendingOverigReview.length === 0}
                    search={overigSearch}
                    onSearch={setOverigSearch}
                    onMark={markOverigItem}
                    onConfirm={confirmOverigAsIs}
                    defaultCategory="Overig"
                    confirmButtonClass="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    explanation='Kies per tegenpartij de juiste categorie én of het zakelijk of privé is, of klik "Klopt zo" als Overig hier bewust moet blijven staan.'
                    bulkAction={{
                      label: `Alles wat hier nog staat (${pendingOverigReview.length}) naar "Prive opnames" (zakelijke rekening)`,
                      confirmText: `${pendingOverigReview.length} tegenpartij(en) in "Overig" allemaal naar "Prive opnames" (Zakelijk) zetten? Dit is bedoeld voor een zakelijke rekening — gebruik dit niet als het om een privérekening gaat.`,
                      onApply: bulkMarkOverigAsPriveOpname,
                    }}
                  />
                )}
              </section>
            )}

            {periodeMismatches.length > 0 && (
              <section ref={periodeReviewSectionRef} className="rounded-xl border-2 border-sky-200 bg-white overflow-hidden shadow-sm" style={sectionTabStyle("controleren")}>
                <div className="px-4 py-3 bg-sky-50 text-sky-900 flex items-center gap-2">
                  <span className="text-sm font-semibold">Factuurperiode vs. boekingskwartaal controleren</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {periodeMismatches.length}
                  </span>
                </div>
                <PeriodeReviewStep items={periodeMismatches} onConfirm={confirmPeriodeAsIs} onMove={movePeriodeToQuarter} onOpenHelp={setHelpPopupChapter} />
              </section>
            )}

            <div ref={loansSectionRef} style={sectionTabStyle("resultaten")}>
              <LoanInterestPanel
                loanSummary={loanSummary}
                privateLoanSummary={privateLoanSummary}
                loanDetails={loanDetails}
                onOpenModal={setLoanDetailsModalKey}
                onMarkUnknown={markLoanUnknown}
                onUnmarkUnknown={unmarkLoanUnknown}
                onMarkNotALoan={markLoanNotALoan}
                onMarkAsPrive={markLoanAsPrive}
                onMarkAsZakelijk={markLoanAsZakelijk}
                onOpenHelp={setHelpPopupChapter}
              />
            </div>

            <div ref={leasesSectionRef} style={sectionTabStyle("resultaten")}>
              <LeaseInterestPanel
                leaseSummary={leaseSummary}
                leaseDetails={leaseDetails}
                confirmedLeaseTypeKeys={confirmedLeaseTypeKeys}
                onConfirmType={confirmLeaseType}
                onOpenModal={setLeaseDetailsModalKey}
                onMarkUnknown={markLeaseUnknown}
                onUnmarkUnknown={unmarkLeaseUnknown}
                onMergeInto={mergeLeaseInto}
                onUndoMerge={undoMergeLease}
                leaseMerges={leaseMerges}
                onOpenHelp={setHelpPopupChapter}
              />
            </div>

            <div style={sectionTabStyle("resultaten")}>
              <ActivaPanel
                activaSummary={activaSummary}
                activaDetails={activaDetails}
                activeYear={activeYear}
                onOpenModal={setActivaDetailsModalKey}
                onMarkUnknown={markActivaUnknown}
                onUnmarkUnknown={unmarkActivaUnknown}
                onOpenHelp={setHelpPopupChapter}
              />
            </div>

            <div style={sectionTabStyle("resultaten")}>
              <PersoonlijkeAannamesPanel
                activeYear={activeYear}
                winst={yearlySummary?.winst}
                zelfstandigenaftrekStatus={zelfstandigenaftrekStatus}
                onSetZelfstandigenaftrekStatus={setZelfstandigenaftrekStatus}
                zaLegacyJaDefault={zaLegacyJaDefault}
                startersaftrekStatus={startersaftrekStatus}
                onSetStartersaftrekStatus={setStartersaftrekStatus}
                autoStatus={autoStatus}
                onSetAutoStatus={setAutoStatus}
                autoWizardStatus={autoWizardStatus}
                onOpenAutoActivaModal={() => setShowAutoActivaModal(true)}
                kmVergoedingDetails={kmVergoedingDetails}
                onSetKmVergoedingField={setKmVergoedingField}
                activaSummary={activaSummary}
                activaDetails={activaDetails}
                gedeeldeHuur={gedeeldeHuurForActiveYear}
                huurZakelijkPercentageStatus={huurZakelijkPercentageStatus}
                onSetHuurZakelijkPercentageStatus={setHuurZakelijkPercentageStatus}
                categoryBtwRates={effectiveCategoryBtwRates}
                onOpenHelp={setHelpPopupChapter}
              />
            </div>

            <div style={sectionTabStyle("resultaten")}>
              <CategoryPercentagePanel
                activeYear={activeYear}
                categorieTotalen={categorieTotalenActiveYear}
                categoryZakelijkPercentage={categoryZakelijkPercentage}
                onSetCategoryZakelijkPercentage={requestSetCategoryZakelijkPercentage}
                autoOpDeZaakDitJaar={!!activeYear && (autoStatus?.[activeYear] === "zaak" || autoStatus?.[activeYear] === "beide")}
                onOpenHelp={setHelpPopupChapter}
              />
            </div>

            {years.length > 0 && activeYear && (
              <>
                {/* v195-fix / v197-fix: de jaren-kiezer verscheen eerst als een blok ver onderaan
                    de pagina, met een scroll-naar-beneden bij het klikken op het knopje bovenaan —
                    dat voelde onrustig/onverwacht. Nu een centraal modal-venster, direct zichtbaar
                    op de plek waar je al kijkt, ongeacht scrollpositie. Eerste stap: direct het
                    actieve jaar met status en openstaande punten, zodat iemand niet meteen een
                    jaren-selectie hoeft te maken voor de meest voorkomende situatie (het jaar waar
                    je toch al in zit). "Ander jaar/meerdere jaren kiezen" schakelt binnen hetzelfde
                    venster door naar de checkbox-lijst. */}
                {showAangifteYearPicker && (
                  <div
                    className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-2"
                    onClick={() => setShowAangifteYearPicker(false)}
                  >
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                      {!showAangifteMeerdereJaren ? (
                        <>
                          <p className="text-sm font-medium">Indicatieve aangifteberekening voor {activeYear}</p>
                          {yearlyProgress[activeYear] && (
                            <div>
                              <p className="text-sm flex items-center gap-1.5">
                                <span>{{ groen: "🟢", oranje: "🟠", rood: "🔴" }[yearlyProgress[activeYear].status]}</span>
                                <span className="font-medium">
                                  {aangifteStatusTekst(yearlyProgress[activeYear].status, aangifteOpenPunten.length)}
                                </span>
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">Gegevenscontrole, geen fiscale beoordeling.</p>
                            </div>
                          )}
                          {aangifteOpenPunten.length > 0 && (
                            <ul className="text-xs text-slate-500 list-disc pl-4 space-y-0.5">
                              {aangifteOpenPunten.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ul>
                          )}
                          <div className="flex gap-2 flex-wrap pt-1">
                            <button
                              onClick={() => exportAangiftevoorstel([activeYear])}
                              className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
                            >
                              Berekening bekijken
                            </button>
                            <button
                              onClick={() => {
                                if (selectedAangifteYears.length === 0) setSelectedAangifteYears([activeYear]);
                                setShowAangifteMeerdereJaren(true);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-600 underline"
                            >
                              Ander jaar/meerdere jaren kiezen
                            </button>
                            <button onClick={() => setShowAangifteYearPicker(false)} className="text-xs text-slate-400 hover:text-slate-600">
                              Annuleren
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium mb-2">Voor welke jaren wil je een indicatieve aangifteberekening?</p>
                          <div className="flex flex-wrap gap-3 mb-3">
                            {years.map((year) => (
                              <label key={year} className="inline-flex items-center gap-1.5 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedAangifteYears.includes(year)}
                                  onChange={(e) => setSelectedAangifteYears((prev) => (e.target.checked ? [...prev, year].sort() : prev.filter((y) => y !== year)))}
                                />
                                {year}
                              </label>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => exportAangiftevoorstel()} className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
                              Berekening tonen
                            </button>
                            <button onClick={() => setShowAangifteMeerdereJaren(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                              Terug
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                

                <div className="grid md:grid-cols-2 gap-4" style={sectionTabStyle("resultaten")}>
                  <CategorySummaryCard group={zakGroupForYear} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} onOpenHelp={setHelpPopupChapter} />
                  <CategorySummaryCard group={priGroupForYear} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} />
                </div>

                        {parsedFiles.length > 0 && (
          <section className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm" style={sectionTabStyle("controleren")}>
            <h3 className="text-sm font-semibold text-slate-500 mb-3">Controleren / Geladen files</h3>
            <div className="flex flex-wrap gap-2">
              {parsedFiles.map((f) => {
                const balanceCheck = checkBalanceConsistency(allTransactions.filter((t) => t.source === f.fileName));
                return (
                  <span key={f.fileName} className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                    {f.fileName} <span className="text-slate-400">({f.rows.length} regels)</span>
                    {balanceCheck &&
                      (balanceCheck.ok ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700">
                          <Check className="h-2.5 w-2.5" /> saldo klopt
                        </span>
                      ) : Math.abs(balanceCheck.diff) < CONTINUITY_GAP_THRESHOLD ? (
                        // v202: een verschil kleiner dan €100 wordt elders in de tool (jaaroverzicht,
                        // aangifteberekening) al niet als een echt probleem behandeld — puur afronding of
                        // een periodegrens die net niet exact aansluit. Dit chipje volgt nu dezelfde regel.
                        <button
                          onClick={() => setReviewFileModal(f.fileName)}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          title="Klein verschil, waarschijnlijk afronding — klik om te bekijken"
                        >
                          <Check className="h-2.5 w-2.5" /> saldo klopt (verschil {eur(balanceCheck.diff)})
                        </button>
                      ) : (
                        <button
                          onClick={() => setReviewFileModal(f.fileName)}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 hover:bg-amber-200"
                          title="Klik om de losse transacties te bekijken en zo nodig uit te sluiten"
                        >
                          <AlertCircle className="h-2.5 w-2.5" /> saldo klopt niet ({eur(balanceCheck.diff)})
                        </button>
                      ))}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {parsedFiles.length > 0 && (
          <div ref={btwSettingsSectionRef} style={sectionTabStyle("instellingen")}>
            <BtwRatesPanel
              categoryBtwRates={categoryBtwRates}
              setCategoryBtwRates={setCategoryBtwRatesWithUndo}
              btwVerlegd={btwVerlegd}
              setBtwVerlegd={setBtwVerlegdWithUndo}
              korRegeling={korRegeling}
              setKorRegeling={setKorRegelingWithUndo}
              onOpenHelp={setHelpPopupChapter}
            />
          </div>
        )}

        {parsedFiles.length > 0 && (
          <div style={sectionTabStyle("instellingen")}>
            <CategoryRulesPanel categoryRules={categoryRules} setCategoryRules={setCategoryRulesWithUndo} />
          </div>
        )}

        {parsedFiles.length > 0 && (
          <div style={sectionTabStyle("instellingen")}>
            <CounterpartyRulesPanel
              overridesByCounterparty={overridesByCounterparty}
              setOverridesByCounterparty={setOverridesByCounterpartyWithUndo}
              onOpenHelp={setHelpPopupChapter}
            />
          </div>
        )}

        {parsedFiles.length > 0 && (
          <div style={sectionTabStyle("instellingen")}>
            <FixedCategoriesPanel fixedCategories={fixedCategories} setFixedCategories={setFixedCategoriesWithUndo} onOpenHelp={setHelpPopupChapter} />
          </div>
        )}

                <div style={sectionTabStyle("resultaten")}>
                  <RecurringPaymentsPanel classified={classified} activeYear={activeYear} onOpenHelp={setHelpPopupChapter} />
                </div>

                {(() => {
                  // Sinds v213 heet dezelfde overboeking aan elke kant anders (zie classify.js): de
                  // zakelijke rekening gebruikt "Prive opnames" (geld weg) / "Terugboeking van prive"
                  // (geld terug), de privérekening gebruikt daarvoor "Ontvangen van zakelijk" / "Terugboeking
                  // naar zakelijk" — dus deze controle mag NIET meer op dezelfde categorienaam aan beide
                  // kanten filteren (dat leverde priSum altijd 0 op, en dus een valse mismatch-melding
                  // zodra de privérekening zelf ook geladen was). In plaats daarvan wordt per kant op de
                  // eigen categorienamen gefilterd — de bedragen (met hun eigen teken) moeten samen nog
                  // steeds op nul uitkomen.
                  const isZakTransferCat = (c) => c === "Prive opnames" || c === "Terugboeking van prive";
                  const isPriTransferCat = (c) => c === "Ontvangen van zakelijk" || c === "Terugboeking naar zakelijk";
                  const zakSum = zakGroupForYear.items.filter((t) => isZakTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
                  const priSum = priGroupForYear.items.filter((t) => isPriTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
                  const diff = Math.round((zakSum + priSum) * 100) / 100;
                  // v224/v233: als er in dit DOSSIER helemaal geen rekening van één van beide types
                  // geladen is (bijv. een dossier dat alleen de zakelijke rekening bevat), is deze
                  // controle sowieso niet uit te voeren — er is dan simpelweg niets om de zakelijke
                  // kant tegen af te zetten. Dat is geen fout/inconsistentie (de zakelijke boekingen
                  // kunnen prima kloppen), dus dan een neutrale melding tonen in plaats van de amber
                  // "komt niet overeen"-waarschuwing, die anders ten onrechte een probleem suggereert.
                  // v233-fix: dit keek eerst naar priGroupForYear/zakGroupForYear.items.length (aantal
                  // transacties in het ACTIEVE JAAR), maar spiegelboekingen voor privé-uitgaven die via
                  // de zakelijke rekening liepen, tellen daar ook in mee — waardoor priGroupForYear
                  // alsnog items kon bevatten terwijl er in werkelijkheid geen privé-bestand geladen was.
                  // Nu wordt dossierbreed gekeken of er ÜBERHAUPT een bestand van dat rekeningtype is
                  // geladen (priveRekeningGeladen/zakelijkRekeningGeladen hierboven), ongeacht het jaar.
                  const zijdeOntbreekt = !priveRekeningGeladen ? "Prive" : !zakelijkRekeningGeladen ? "Zakelijk" : null;
                  if (zijdeOntbreekt) {
                    if (zakSum === 0 && priSum === 0) return null;
                    // v233: dit is geen probleem (er ontbreekt niets fout — het dossier bevat simpelweg
                    // geen tegenrekening om tegen te verifiëren), dus groen/emerald in plaats van het
                    // neutrale grijs dat eerder suggereerde dat hier nog iets te checken viel.
                    return (
                      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3" style={sectionTabStyle("controleren")}>
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-emerald-900">
                          <strong>Controle overboeking zakelijk ↔ privé</strong>: geen {zijdeOntbreekt === "Prive" ? "privé" : "zakelijke"}-
                          rekening geladen in dit dossier, dus niet te verifiëren — dat is geen fout. De {zijdeOntbreekt === "Prive" ? "zakelijke" : "privé"}-
                          kant toont hier {eur(zijdeOntbreekt === "Prive" ? zakSum : priSum)} aan overboekingen, zonder dat daar iets tegenover kan staan.
                        </p>
                      </div>
                    );
                  }
                  if (zakSum === 0 && priSum === 0) return null;
                  const ok = Math.abs(diff) < 0.01;
                  return (
                    <div className={`rounded-xl border-2 px-4 py-3 flex items-start gap-3 ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`} style={sectionTabStyle("controleren")}>
                      {ok ? <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
                      <p className={`text-sm ${ok ? "text-emerald-900" : "text-amber-900"}`}>
                        <strong>Controle overboeking zakelijk ↔ privé</strong>: Zakelijk ("Prive opnames"/"Terugboeking van prive") {eur(zakSum)} tegenover Prive ("Ontvangen van zakelijk"/"Terugboeking naar zakelijk") {eur(priSum)}
                        {ok ? " — komt overeen (samen nul, zoals het hoort)." : <> — komt <strong>niet</strong> overeen (verschil {eur(diff)}). Mogelijk staat er aan de privékant een aparte, niet-gekoppelde transactie, of ontbreekt er iets.</>}
                      </p>
                    </div>
                  );
                })()}

                <p className="text-xs text-slate-400" style={sectionTabStyle("controleren")}>
                  Sleep een transactie (aan het handvat <span className="inline-block align-middle">⠿</span>) naar de andere tabel om 'm van Zakelijk naar Prive te verplaatsen, of andersom.
                </p>
                <div
                  ref={detailsSectionRef}
                  className={expandedTable ? "grid grid-cols-1 gap-4" : "grid md:grid-cols-2 gap-4 items-start"}
                  style={sectionTabStyle("controleren")}
                >
                  {(!expandedTable || expandedTable === "Zakelijk") && (
                    <div
                      data-dropzone="Zakelijk"
                      className={`rounded-xl transition-colors ${dragState && dragState.overZone === "Zakelijk" && dragState.tx.type !== "Zakelijk" ? "ring-2 ring-emerald-400" : ""}`}
                    >
                      <DetailTable
                        group={zakGroupForYear}
                        onRequestChange={requestCategoryChange}
                        onConfirmCorrect={confirmClassificationCorrect}
                        enableDrag
                        onRowDragStart={startRowDrag}
                        draggingTxId={dragState ? dragState.tx.id : null}
                        isExpanded={expandedTable === "Zakelijk"}
                        onToggleExpand={() => setExpandedTable((v) => (v === "Zakelijk" ? null : "Zakelijk"))}
                        onOpenHelp={setHelpPopupChapter}
                        fingerprintByTxId={fingerprintByTxId}
                        transactionNotes={transactionNotes}
                        onSetNote={setTransactionNote}
                      />
                    </div>
                  )}
                  {(!expandedTable || expandedTable === "Prive") && (
                    <div
                      data-dropzone="Prive"
                      className={`rounded-xl transition-colors ${dragState && dragState.overZone === "Prive" && dragState.tx.type !== "Prive" ? "ring-2 ring-slate-400" : ""}`}
                    >
                      <DetailTable
                        group={priGroupForYear}
                        onRequestChange={requestCategoryChange}
                        onConfirmCorrect={confirmClassificationCorrect}
                        enableDrag
                        onRowDragStart={startRowDrag}
                        draggingTxId={dragState ? dragState.tx.id : null}
                        isExpanded={expandedTable === "Prive"}
                        onToggleExpand={() => setExpandedTable((v) => (v === "Prive" ? null : "Prive"))}
                        fingerprintByTxId={fingerprintByTxId}
                        transactionNotes={transactionNotes}
                        onSetNote={setTransactionNote}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {aangiftevoorstelPreview && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={() => setAangiftevoorstelPreview(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
                <p className="text-sm font-semibold">Indicatieve aangifteberekening {selectedAangifteYears.join(", ")}</p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={downloadAangiftevoorstelPreview} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
                    <Download className="h-4 w-4" /> Downloaden
                  </button>
                  <button
                    onClick={printAangiftevoorstelPreview}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                    title="Opent het printvenster; werkt niet vanuit de app-op-beginscherm-modus — gebruik dan Downloaden."
                  >
                    <Printer className="h-4 w-4" /> Printen
                  </button>
                  <button onClick={() => setAangiftevoorstelPreview(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Sluiten
                  </button>
                </div>
              </div>
              <iframe srcDoc={aangiftevoorstelPreview} title="Voorbeeld aangiftevoorstel" className="w-full bg-white flex-1" style={{ border: "none" }} />
            </div>
          </div>
        )}
      </main>

      {dragState && (
        <div
          className={`fixed z-50 pointer-events-none rounded-lg border-2 shadow-lg px-3 py-2 text-xs font-medium bg-white ${
            dragState.overZone && dragState.overZone !== dragState.tx.type
              ? dragState.overZone === "Zakelijk" ? "border-emerald-500 text-emerald-800" : "border-slate-500 text-slate-800"
              : "border-slate-300 text-slate-500"
          }`}
          style={{ left: dragState.x + 12, top: dragState.y + 12, maxWidth: "16rem" }}
        >
          <p className="truncate font-semibold">{dragState.tx.counterparty || dragState.tx.description || "(geen omschrijving)"}</p>
          <p className="font-mono">{eur(dragState.tx.amount)}</p>
          {dragState.overZone && dragState.overZone !== dragState.tx.type && <p className="mt-0.5">→ naar {dragState.overZone}</p>}
        </div>
      )}

      {loanDetailsModalKey && loanSummary.find((l) => l.key === loanDetailsModalKey) && (
        <LoanDetailsModal
          loan={loanSummary.find((l) => l.key === loanDetailsModalKey)}
          details={loanDetails[loanDetailsModalKey]}
          onSave={setLoanDetailField}
          onClose={() => setLoanDetailsModalKey(null)}
        />
      )}

      {leaseDetailsModalKey && leaseSummary.find((l) => l.key === leaseDetailsModalKey) && (
        <FinancialLeaseDetailsModal
          lease={leaseSummary.find((l) => l.key === leaseDetailsModalKey)}
          details={leaseDetails[leaseDetailsModalKey]}
          onSave={setLeaseDetailField}
          onClose={() => setLeaseDetailsModalKey(null)}
        />
      )}

      {showAutoActivaModal && (autoWizardStatus?.soort === "koop" || autoWizardStatus?.soort === "operational") && (
        <AutoOpDeZaakDetailsModal
          soort={autoWizardStatus.soort}
          details={autoActivaDetails}
          years={years}
          onSave={setAutoActivaDetailsField}
          onClose={() => setShowAutoActivaModal(false)}
        />
      )}

      {activaDetailsModalKey && activaSummary.find((a) => a.key === activaDetailsModalKey) && (
        <ActivaDetailsModal
          activum={activaSummary.find((a) => a.key === activaDetailsModalKey)}
          details={activaDetails[activaDetailsModalKey]}
          onSave={setActivaDetailField}
          onClose={() => setActivaDetailsModalKey(null)}
        />
      )}

      <ConfirmBanner message={confirmMessage} onConfirm={doClearAllData} onCancel={() => setConfirmMessage(null)} />
    </div>
  );
}
