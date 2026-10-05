import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Check, Download, Trash2, Loader2, Printer, X, Lock, ChevronDown, ChevronRight, ListTree, Settings, AlertTriangle, Users, HelpCircle, Copy, ArrowLeft } from "lucide-react";

import { parseFile } from "./importers/detector.js";
import { buildTransactions, computeImportDiagnostics, computeFileContinuity, computeOwnAccountByFile, INTRA_FILE_BALANCE_THRESHOLD, classifyContinuityGap } from "./importers/transactions.js";
import ImportControlPanel from "./components/upload/ImportControlPanel.jsx";
import { resolveClassification, detectOwnAccountTransfer } from "./classification/classify.js";
import { scoreClassification } from "./classification/confidence.js";
import { DEFAULT_RULES, mergeCategoryRules, migrateLegacyCategoryName, DEFAULT_FIXED_CATEGORIES, INCOME_TRANSFER_CATEGORIES, MAIN_CATEGORY_ORDER, MAIN_CATEGORY_DEFAULT_SUBTYPE, subtypesForMainCategory, fiscalTreatmentOf } from "./classification/categories.js";
import { DEFAULT_BTW_RATES, EMPTY_BTW_RATES, mergeBtwRates, BTW_RATES_VERSION, DEFAULT_VOORBELASTING_EXCLUDED, computeQuarterlyBtwForYear, computeQuarterlyCostBreakdown, computeYearlyCostBreakdown, FIXED_BTW_RATE_CATEGORIES } from "./tax/btw.js";
import { computeYearlySummary, computeYearlyOpenOB, computeVolledigeJaren, computeBusinessAdvies } from "./tax/yearlySummary.js";
import { computeGedeeldeHuurVoorJaar, computeGedeeldeEnergieVoorJaar, computeGedeeldeGemeentelijkeKostenVoorJaar } from "./tax/gedeeldeHuur.js";
import { computeSplitsbareCategorieTotalenVoorJaar, heeftGeregistreerdeAutoOpDeZaak } from "./tax/categorySplit.js";
import {
  estimateIncomeTax, estimateZvw, computeOndernemersaftrekMetReserve, estimateIncomeTaxMetOndernemersaftrek,
  estimateZvwMetOndernemersaftrek, estimateHeffingskortingenMetOndernemersaftrek, resolveZelfstandigenaftrekStatusForYear, computeBelastbareWinstUitsplitsing,
} from "./tax/incomeTax.js";
import { computePeriodeMismatches, computeAllPeriodeSignals } from "./tax/periodDetection.js";
import { useLoansAndLease } from "./hooks/useLoansAndLease.js";
import { computeDuplicateInfo } from "./importers/duplicates.js";
import { computeIncomeSummary, computeCategorySummary, computeIncomeCategorySummary } from "./classification/reviewSummaries.js";
import { eur } from "./utils/amounts.js";
import { counterpartyKey, ibanKey, normKey, extractKeywordCandidate, normalizePersonName, ibansMatch } from "./utils/normalization.js";
import { makeUndoWrapped } from "./utils/withUndo.js";
import {
  loadPersistedParsedFiles, persistParsedFiles, clearPersistedData,
  loadPersistedSettings, persistSettings, clearPersistedSettings,
} from "./storage/projectStorage.js";
import { buildProjectFile, downloadProjectFile, readProjectFile } from "./storage/projectFile.js";
import ConfirmDialog from "./components/shared/ConfirmDialog.jsx";
import UndoToast from "./components/shared/UndoToast.jsx";
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
import HerkomstVanGeldPanel from "./components/review/HerkomstVanGeldPanel.jsx";
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
import SectionCardGrid from "./components/dashboard/SectionCard.jsx";
import AppSidebar from "./components/dashboard/AppSidebar.jsx";
import DashboardHeader from "./components/dashboard/DashboardHeader.jsx";
import CardIcon from "./components/shared/CardIcon.jsx";
import RollupCard from "./components/dashboard/RollupCard.jsx";
import JaaroverzichtCard from "./components/dashboard/JaaroverzichtCard.jsx";
import DetailsPanel from "./components/dashboard/DetailsPanel.jsx";
import YearDropdown from "./components/dashboard/YearDropdown.jsx";
import ClassificationConfidencePanel from "./components/dashboard/ClassificationConfidencePanel.jsx";
import UncertainTransactionsModal from "./components/dashboard/UncertainTransactionsModal.jsx";
import DuplicateGroupDetailModal from "./components/dashboard/DuplicateGroupDetailModal.jsx";
import KeywordSuggestionModal from "./components/shared/KeywordSuggestionModal.jsx";
import VerwachteMatchModal from "./components/shared/VerwachteMatchModal.jsx";
import CategoryOverviewModal from "./components/shared/CategoryOverviewModal.jsx";
import UpdateAvailableBanner from "./components/shared/UpdateAvailableBanner.jsx";
import { useVersionCheck } from "./hooks/useVersionCheck.js";
import CategoryRulesPanel from "./components/settings/CategoryRulesPanel.jsx";
import CounterpartyRulesPanel from "./components/settings/CounterpartyRulesPanel.jsx";
import KeywordManager from "./components/settings/KeywordManager.jsx";
import TegenpartijenPanel from "./components/settings/TegenpartijenPanel.jsx";
import FixedCategoriesPanel from "./components/settings/FixedCategoriesPanel.jsx";
import PeriodeReviewStep from "./components/review/PeriodeReviewStep.jsx";
import OpschonenPanel from "./components/review/OpschonenPanel.jsx";
import AansluitingDetailPanel from "./components/review/AansluitingDetailPanel.jsx";
import LoanInterestPanel from "./components/loans/LoanInterestPanel.jsx";
import LeaseInterestPanel from "./components/loans/LeaseInterestPanel.jsx";
import LoanDetailsModal from "./components/loans/LoanDetailsModal.jsx";
import FinancialLeaseDetailsModal from "./components/loans/FinancialLeaseDetailsModal.jsx";
import AutoOpDeZaakDetailsModal from "./components/loans/AutoOpDeZaakDetailsModal.jsx";
import ActivaPanel from "./components/loans/ActivaPanel.jsx";
import PersoonlijkeAannamesPanel from "./components/overview/PersoonlijkeAannamesPanel.jsx";
import CategoryPercentagePanel from "./components/overview/CategoryPercentagePanel.jsx";
import ActivaDetailsModal from "./components/loans/ActivaDetailsModal.jsx";
import { computeActivaSummary, computeActivaAfschrijvingForYear } from "./tax/activa.js";
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
// Dit is de functionele schil (upload, tabbladen, dashboard, alle panelen) rond de
// logicalagen: importers/ (inlezen en aansluiting tussen bestanden), classification/
// (categoriseren van transacties), tax/ (BTW/IB/Vpb-berekeningen), storage/
// (project opslaan/laden), utils/. De reports/-map bouwt de downloadbare/printbare
// Indicatieve aangifteberekening (zzp en BV) uit diezelfde tax/-berekeningen.
// ---------------------------------------------------------------------------

// Bepaalt de rechtsvorm bij het inladen van bestaande instellingen/een dossierbestand. Ontbreekt
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

// Dezelfde statustekst als in het gegenereerde rapport (reports/aangiftevoorstel.js, functie
// statusTekst) — géén apart statussysteem, alleen dezelfde bestaande yearlyProgress-status (afgeleid
// uit categorisatie/onzekere transacties/bestandsgaten) ook zichtbaar vóórdat je het rapport
// genereert. "Groen" betekent hier uitdrukkelijk alleen dat
// de gegevenscontrole voldoende compleet is — niet dat de aangifte fiscaal correct is.
function aangifteStatusTekst(status, aantalPunten) {
  if (status === "rood") return "Nog onvoldoende gegevens voor een betrouwbare reconstructie";
  if (status === "oranje") return `Berekening beschikbaar — ${aantalPunten} punt${aantalPunten === 1 ? "" : "en"} controleren`;
  return "Berekening kan worden opgesteld";
}

// V46 — zie `classified`: categorieën die in een privé-only dossier aan de zakelijke kant gespiegeld worden.
// Alle %-splitsbare kostencategorieën behalve de auto-categorieën (die volgen de wizard).
const PRIVE_ONLY_HUISVESTING_STANDAARD_NUL = [
  "Huur", "Energie-water", "Gemeentelijke kosten", "Zakelijk mobiel/internet", "Reiskosten (OV)", "Streaming diensten",
  "Software & Online diensten", "Boekhouder, accountant & administratie",
];
const ZAKELIJKE_SPIEGEL_CATEGORIEEN = ["Zakelijke inkomsten", "Zakelijke inkomsten 0%", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%", "Zakelijke inkoop/uitgaven"];

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
  // instellingen/dossierbestanden die dit veld nog niet kennen (van vóór deze functie), wordt dit
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
  // v282 — open/dicht-stand van HoldingBoekingenPanel, nu hier (i.p.v. lokaal in dat paneel) zodat
  // de holding-samenvattingskaart in DetailsPanel.jsx ("Bewerken") 'm kan openklappen.
  const [showHoldingBoekingen, setShowHoldingBoekingen] = useState(false);
  const [excludedDuplicateFingerprints, setExcludedDuplicateFingerprints] = useState([]);
  const [dismissedDuplicateNotice, setDismissedDuplicateNotice] = useState(false);
  // v243 — null = "auto", zelfde patroon als showPersonReview/showOverigReview hieronder.
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(null);
  // v246 — de "geen duplicaten, maar wel dezelfde datum/bedrag/omschrijving"-lijst (confirmedSeparateGroups)
  // stond altijd volledig uitgeklapt zodra de Duplicaten-sectie open was, óók als het er honderd waren —
  // dat overschaduwde de échte duplicaten die nog aandacht nodig hebben. Nu staat die lijst standaard
  // ingeklapt onder een eigen knopje, puur ter info/naslag.
  const [showConfirmedSeparateDuplicates, setShowConfirmedSeparateDuplicates] = useState(false);
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
  // v285 — BV-equivalent van ibStatus/zvwStatus hierboven: een BV kent geen IB/Zvw (dat bestaat
  // alleen voor een zzp/eenmanszaak), maar wel een jaarlijkse Vpb-aangifte — dit vinkje vervangt
  // ibStatus/zvwStatus in de "Werkelijke aangifte"-telling (yearlyProgress) zodra rechtsvorm "bv" is.
  const [vpbStatus, setVpbStatus] = useState({}); // { "2025": { gedaan: bool } }
  // { "2025": "ja" | "nee" | "onbekend" } — ontbrekend jaar = niet aangegeven; wat dat dan betekent
  // hangt af van zaLegacyJaDefault hieronder.
  const [zelfstandigenaftrekStatus, setZelfstandigenaftrekStatusState] = useState({});
  // Een onbeantwoord urencriterium-jaar stilzwijgend met "ja" (zelfstandigenaftrek toegepast) laten
  // rekenen is veilig voor bestaande dossiers wier cijfers daarmee niet met terugwerkende kracht
  // veranderen, maar geeft een verkeerde indruk aan een gebruiker die nog niets heeft ingevuld.
  // true = dit gedrag behouden (default bij het LADEN van een dossierbestand van vóór deze regel
  // bestond, zie loadProjectFile hieronder); false = een
  // onbeantwoord jaar toont voortaan beide scenario's naast elkaar, net als een expliciete
  // "Onbekend"-keuze — de default voor een gloednieuw dossier (nog nooit een project geladen).
  // Zie resolveZelfstandigenaftrekStatusForYear in tax/incomeTax.js.
  const [zaLegacyJaDefault, setZaLegacyJaDefault] = useState(false);
  // { "2025": "ja" | "nee" } — ontbrekend jaar = niet aangegeven, geen startersaftrek toegepast.
  const [startersaftrekStatus, setStartersaftrekStatusState] = useState({});
  // { "2025": "zaak" | "prive" | "beide" } — of de auto van de zaak is (koop/operational/financial
  // lease), een privéauto zakelijk gebruikt wordt, of beide. Ontbrekend jaar = onbekend/niet
  // aangegeven — dan blijft de generieke %-splitsing (SPLITSBARE_CATEGORIEEN, zie
  // tax/categorySplit.js) op Brandstof/Parkeren gewoon bruikbaar. Dit veld bepaalt of
  // Brandstof/Parkeren voor dat jaar uit die %-splitsing gehaald worden ten gunste van het aparte
  // auto-bijtellings-/km-vergoedingsmodel.
  const [autoStatus, setAutoStatusState] = useState({});
  // { "2025": percentage (0-100) } — percentage zakelijk gebruik van "Huur (deels zakelijk)" per
  // jaar. Ontbrekend jaar = 100% (volledig aftrekbaar) — zie tax/gedeeldeHuur.js.
  const [huurZakelijkPercentageStatus, setHuurZakelijkPercentageStatusState] = useState({});
  // v291 — zelfde constructie, nu ook voor "Energie-water (deels zakelijk)" en "Gemeentelijke
  // kosten (deels zakelijk)" (zie tax/gedeeldeHuur.js) — elk zijn eigen { jaar: percentage }-map,
  // los van huurZakelijkPercentageStatus hierboven.
  const [energieZakelijkPercentageStatus, setEnergieZakelijkPercentageStatusState] = useState({});
  const [gemeentelijkeKostenZakelijkPercentageStatus, setGemeentelijkeKostenZakelijkPercentageStatusState] = useState({});
  // { categorie: { "2025": percentage (0-100) } } — generieke percentage-zakelijk-splitsing per
  // bestaande categorie per jaar (zie tax/categorySplit.js). In tegenstelling tot
  // huurZakelijkPercentageStatus hierboven (dat alleen voor de aparte categorie "Huur (deels
  // zakelijk)" geldt) werkt dit direct op elke bestaande "kosten"/"geen"-categorie, zonder dat
  // transacties van categorie hoeven te wisselen. Ontbrekende categorie/jaar = standaardgedrag
  // (100% voor "kosten", 0% voor "geen").
  const [categoryZakelijkPercentage, setCategoryZakelijkPercentageState] = useState({});
  // V51 — dossier met ALLEEN privérekening(en): huisvesting (huur, energie/water, gemeentelijke
  // kosten) is dan standaard 100% privé (0% zakelijk) tot er expliciet een percentage is ingesteld.
  // `categoryZakelijkPercentage` blijft de ruwe, opgeslagen invoer; de berekeningen gebruiken
  // `categoryZakelijkPercentageEff`.
  // "Correctie privé-uitgaven" is verwijderd (overbodig geworden na Route B: de tool signaleert nu
  // zelf al wanneer zakelijke kosten vanaf de privérekening zijn betaald).
  const [aangiftevoorstelPreview, setAangiftevoorstelPreview] = useState(null); // HTML-string of null
  const [showAangifteYearPicker, setShowAangifteYearPicker] = useState(false);
  // Fase 3 (bouwvoorstel) — per kaart onthouden of 'ie is uitgeklapt naar het volledige
  // onderliggende paneel, i.p.v. ernaartoe te springen. Alleen voor kaarten die dat aankunnen
  // (zie toggleCardExpand hieronder) — de rest blijft in fase 3 v1 gewoon "Bekijken" (springen).
  const [expandedCardKeys, setExpandedCardKeys] = useState({});
  const toggleCardExpand = (key) => setExpandedCardKeys((prev) => ({ ...prev, [key]: !prev[key] }));
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
  // v275 — los van verwachteLease (die alleen nog gevraagd wordt als de auto-vraag daar aanleiding
  // toe geeft, zie SetupWizardModal): een aparte, altijd gestelde vraag voor overige financiële
  // leaseobjecten (machines, apparatuur — geen auto). Zelfde vorm/gebruik als verwachteLease, apart
  // gehouden zodat de twee wizardvragen elkaar niet overschrijven; bij classificatie/matching tellen
  // beide lijsten gewoon mee voor categorie "Lease (financieel)".
  const [verwachteLeaseOverig, setVerwachteLeaseOverig] = useState(null);
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
  // v243 — null = "auto" (open zodra er iets openstaat, ingeklapt zodra alles groen is); een
  // expliciete klik op de sectie-header zet 'm daarna op true/false en die keuze wint vanaf dan,
  // ongeacht of het aantal openstaande punten nog verandert. Dit is bewust NIET meer een simpele
  // "altijd open"-default: bij een schoon dossier hoeft niemand een leeg "niets openstaand"-paneel
  // te zien, maar via de chevron kan het altijd alsnog worden opengeklapt (zie ook
  // controlerenDashboardCards/dashboardCards hierboven, waarvan een klik hetzelfde doet).
  const [showPersonReview, setShowPersonReview] = useState(null);
  const [showOverigReview, setShowOverigReview] = useState(null);
  const [showPeriodeReview, setShowPeriodeReview] = useState(null);
  const [openConfidenceLevel, setOpenConfidenceLevel] = useState(null); // null | "heuristic" | "fallback"
  const [keywordSuggestion, setKeywordSuggestion] = useState(null); // { keyword, category, type, matches, sourceName }
  const [showCategoryOverview, setShowCategoryOverview] = useState(false);
  // v270 — Meerjarenoverzicht en BTW-aangifte per kwartaal stonden altijd uitgeklapt onder de
  // kaarten op Overzicht; op verzoek nu als pop-up i.p.v. daar permanent te staan.
  const [showMultiYearModal, setShowMultiYearModal] = useState(false);
  const [showQuarterlyBtwModal, setShowQuarterlyBtwModal] = useState(false);
  const { updateAvailable } = useVersionCheck();
  const [showSetupWizard, setShowSetupWizard] = useState(false); // gaat alleen open bij het laden van een bestand (zie handleFiles)
  // Handmatig geopend via de "Basisvragen bewerken"-knop — in dat geval moet de Rechtsvorm-stap
  // (zzp/BV) altijd in de wizard-wachtrij komen, ook als hij al eerder beantwoord is (zie
  // forceRechtsvormStep op SetupWizardModal), zodat je rechtsvorm achteraf nog kunt omzetten.
  const [manualWizardOpen, setManualWizardOpen] = useState(false);
  const [overigSearch, setOverigSearch] = useState("");
  const [activeYear, setActiveYear] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  // v305 (V27) — dossierbestand-status, los van de automatische browseropslag hierboven: hoeveel
  // wijzigingen er zijn sinds het dossier voor het laatst als dossierbestand is geëxporteerd (of
  // geladen), en wanneer dat was. Zie de teller-effect onder de autosave verderop.
  const [changesSinceExport, setChangesSinceExport] = useState(0);
  const [lastExportAt, setLastExportAt] = useState(null);
  const suppressChangeCountUntilRef = useRef(0);
  const suppressChangeCount = () => {
    // Laden/leegmaken/hervatten verandert veel state tegelijk — dat is geen "wijziging" van de
    // gebruiker. Een tijdvenster (i.p.v. een vlag) zodat het niet blijft hangen als er toevallig
    // niets daadwerkelijk verandert (bijv. hetzelfde dossierbestand twee keer laden).
    suppressChangeCountUntilRef.current = Date.now() + 1500;
  };
  const [lastSavedAt, setLastSavedAt] = useState(null); // Date — wanneer de automatische browseropslag voor het laatst is gelukt
  const [loadedProjectFileName, setLoadedProjectFileName] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpPopupChapter, setHelpPopupChapter] = useState(null);
  const [dialog, setDialog] = useState(null); // v304 — keuzevenster, zie ConfirmDialog.jsx
  const [lastActionSnapshot, setLastActionSnapshot] = useState(null); // { label, state }
  const projectFileInputRef = useRef(null);
  const bankFileInputRef = useRef(null); // v227 — "Bestand laden"-knop in de header, naast "Dossier opslaan"
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
  // v246 — nieuw, voor het mini-dashboard op tabblad "Instellingen" (instellingenDashboardCards):
  // Activa en Persoonlijke aannames hadden nog geen eigen ref om naartoe te kunnen springen.
  const activaSectionRef = useRef(null);
  const aannamesSectionRef = useRef(null);
  // v261 — nieuw, voor de "Percentage zakelijk/privé"-kaart in het Instellingen-dashboard.
  const categoryPercentageSectionRef = useRef(null);
  const bvSignaleringSectionRef = useRef(null); // v219 — dashboard fase 3
  const holdingBoekingenSectionRef = useRef(null); // v282 — link vanuit de nieuwe holding-samenvattingskaart in DetailsPanel.jsx
  const detailsSectionRef = useRef(null); // v219 — sticky navbalk "Details"
  const importControleSectionRef = useRef(null); // v240 — mini-dashboard "Controleren"
  const incomeReviewSectionRef = useRef(null); // Fase 2 — kaart "Herkomst van geld" (Controleren)
  const categorySectionRef = useRef(null); // Fase 2 — kaart "Categorieën" (Controleren)
  const automatiseringSectionRef = useRef(null); // Fase 2 — kaart "Automatisering" (Instellingen)

  // ---- Tabbladen (v228) — de app was tot nu toe één lange scroll-pagina met een sticky navbalk die
  // alleen naar secties VERDER OP DEZELFDE PAGINA scrolde (StickyTopNav / jumpToSection hierboven).
  // Nu zijn het echte tabbladen: alle secties blijven altijd gemount (lokale state zoals
  // zoekvelden/ReviewStep-rijstate en de scroll-refs hierboven blijven zo intact), maar per sectie
  // wordt met een CSS display:none/block bepaald of hij zichtbaar is voor het actieve tabblad. Zie
  // TAB_KEYS/REF_TAB_ENTRIES/sectionTabStyle hieronder en de tabToevoeging her en der in de JSX.
  // v235 — "Details" is samengevoegd met "Controleren" (de detailtabellen staan onderaan dat
  // tabblad, ná de andere controlesecties — zie de fysieke volgorde in de JSX verderop, die bepaalt
  // wat waar staat binnen één tabblad).
  // v245 — tabblad "Resultaten" is vervallen; de inhoud is verdeeld: Meerjarenoverzicht en
  // BTW-aangifte per kwartaal naar "Overzicht", de invulpanelen (leningen/lease/activa/persoonlijke
  // aannames/percentage zakelijk per categorie/terugkerende betalingen) naar "Instellingen", en de
  // categorie-overzichten (Zakelijk/Privé) naar "Controleren" (boven de detailtabellen).
  const [activeTab, setActiveTab] = useState("overzicht");
  // v267 — Onthoudt het vorige tabblad voor de floating "Terug"-knop hieronder — bijgewerkt ná elke
  // activeTab-wijziging, zodat previousTabRef.current altijd het tabblad is waar je vandaan kwam
  // (niet het huidige). Geen wijziging aan setActiveTab zelf nodig: alle bestaande aanroepen
  // (onSelectTab, jumpToSection, enz.) blijven ongewijzigd werken.
  const previousTabRef = useRef("overzicht");
  const activeTabTrackerRef = useRef("overzicht");
  useEffect(() => {
    previousTabRef.current = activeTabTrackerRef.current;
    activeTabTrackerRef.current = activeTab;
  }, [activeTab]);
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
    [multiYearSectionRef, "overzicht"],
    [quarterlyBtwSectionRef, "overzicht"],
    [obIbSectionRef, "overzicht"],
    [bvSignaleringSectionRef, "overzicht"],
    [loansSectionRef, "instellingen"],
    [leasesSectionRef, "instellingen"],
    [activaSectionRef, "instellingen"],
    [aannamesSectionRef, "instellingen"],
    [btwSettingsSectionRef, "instellingen"],
    [incomeRatesSectionRef, "instellingen"],
    [detailsSectionRef, "controleren"],
  ];
  // Fase 3 — sommige van de secties hierboven staan zelf op !expandedCardKeys.<key> (verborgen/
  // unmounted zodra de bijbehorende SectionCard is uitgeklapt, zie controlerenCardGroups/
  // instellingenCardGroups hieronder), zodat er nooit twee live kopieën van hetzelfde paneel
  // tegelijk zichtbaar zijn. Een link die naar zo'n ref springt (bijv. vanuit "Details en
  // overzichten" op Overzicht, of vanuit een "Nog te controleren/in te stellen"-rollup-item) deed
  // dan niets: ref.current was null omdat die sectie op dat moment niet gemount was. jumpToSection
  // hieronder klapt de kaart daarom eerst automatisch in (als hij openstond) vóór het scrollen —
  // geen enkele aanroepende plek hoeft hier zelf rekening mee te houden.
  // v281 — op verzoek staat de onderliggende sectie voor de meeste kaarten nu ALLEEN nog gemount
  // zolang de kaart is uitgeklapt (in plaats van andersom); alleen "Categorieën" en "Aansluiting &
  // detail" op Controleren blijven de uitzondering (die staan juist standaard zichtbaar, en
  // verdwijnen van hun vaste plek zodra je ze uitklapt — het oude gedrag). Het derde getal hieronder
  // geeft aan welke expandedCardKeys-stand nodig is om de sectie zichtbaar te maken: true = de kaart
  // moet uitgeklapt zijn, false = de kaart moet ingeklapt zijn.
  const REF_COLLAPSE_KEYS = [
    [importControleSectionRef, "importKwaliteit", true],
    [confidenceSectionRef, "importKwaliteit", true],
    [incomeReviewSectionRef, "herkomstVanGeld", true],
    [personReviewSectionRef, "herkomstVanGeld", true],
    [categorySectionRef, "categorieen", false],
    [activaSectionRef, "bedrijfsmiddelen", true],
    [leasesSectionRef, "bedrijfsmiddelen", true],
    [loansSectionRef, "bedrijfsmiddelen", true],
    [aannamesSectionRef, "persoonlijkeAannames", true],
    [categoryPercentageSectionRef, "zakelijkPrive", true],
    [btwSettingsSectionRef, "btw", true],
    [automatiseringSectionRef, "automatisering", true],
    [incomeRatesSectionRef, "tegenpartijen", true],
    [overigReviewSectionRef, "opschonen", true],
    [duplicatesSectionRef, "opschonen", true],
    [periodeReviewSectionRef, "opschonen", true],
    [detailsSectionRef, "aansluitingDetail", false],
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
    // De bestandsnaam van het laatst opgeslagen/geladen dossierbestand hoort hier ook bij hersteld
    // te worden — anders "vergeet" de tool die naam zodra de sessie hervat wordt vanuit de
    // automatische browseropslag (bijv. na een tool-update of het herstarten van de browser), en
    // valt "Dossier opslaan" onterecht terug op de standaardnaam in plaats van door te tellen op de
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
    setVerwachteLeaseOverig(settings.verwachteLeaseOverig ?? null);
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
    setVpbStatus(settings.vpbStatus && typeof settings.vpbStatus === "object" ? settings.vpbStatus : {});
    setZelfstandigenaftrekStatusState(settings.zelfstandigenaftrekStatus && typeof settings.zelfstandigenaftrekStatus === "object" ? settings.zelfstandigenaftrekStatus : {});
    // Ontbreekt deze vlag (browseropslag van vóór deze regel bestond), dan is dit een dossier dat al
    // bestond vóór het urencriterium-standaardgedrag veranderde — behoud dan het oude gedrag
    // (onbeantwoord jaar = "ja") in plaats van de nieuwe, veiligere default ("onbekend").
    setZaLegacyJaDefault(settings.zaLegacyJaDefault === false ? false : true);
    setStartersaftrekStatusState(settings.startersaftrekStatus && typeof settings.startersaftrekStatus === "object" ? settings.startersaftrekStatus : {});
    setAutoStatusState(settings.autoStatus && typeof settings.autoStatus === "object" ? settings.autoStatus : {});
    setHuurZakelijkPercentageStatusState(settings.huurZakelijkPercentageStatus && typeof settings.huurZakelijkPercentageStatus === "object" ? settings.huurZakelijkPercentageStatus : {});
    setEnergieZakelijkPercentageStatusState(settings.energieZakelijkPercentageStatus && typeof settings.energieZakelijkPercentageStatus === "object" ? settings.energieZakelijkPercentageStatus : {});
    setGemeentelijkeKostenZakelijkPercentageStatusState(settings.gemeentelijkeKostenZakelijkPercentageStatus && typeof settings.gemeentelijkeKostenZakelijkPercentageStatus === "object" ? settings.gemeentelijkeKostenZakelijkPercentageStatus : {});
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
  const setVpbGedaan = (year, gedaan) => {
    snapshotBeforeAction("Vpb-status aangepast");
    setVpbStatus((prev) => ({ ...prev, [year]: { gedaan } }));
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
  // — gebruikt door de wizard-vraag (zie SetupWizardModal), die maar één keer per dossier wordt
  // gesteld terwijl zelfstandigenaftrekStatus zelf een per-jaar instelling is. Zelfde patroon als
  // seedAutoStatusForAllYears hierboven. status=null (bijv. "weet ik nog niet") zet bewust niets — de
  // wizard toont die keuze dan ook niet als los te kiezen optie (zie de wizard-stap zelf), zodat
  // "niets gezet" hier hetzelfde betekent als wanneer deze wizard-vraag niet bestond (rekent
  // voorlopig met "Ja", zie de toelichting bij PersoonlijkeAannamesPanel.jsx).
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
  // v250 — dit zette de ingetypte tekst meteen om naar Number(), en die omgezette waarde ging weer
  // terug als de controlled value van het invoerveld. Bij een kommagetal ging dat mis zodra je bij
  // "0" begon: "0." wordt door Number() al 0 (het punt valt weg), dus het veld toonde meteen weer
  // "0" i.p.v. "0." — de volgende toets (bijv. "2") kwam er dan achter "0" bij te staan ("02"), wat
  // een number-input niet toestaat. Nu blijft de ingetypte tekst gewoon bewaard (zoals ook al gebeurt
  // in de losse-formulieren-modals, bijv. LoanDetailsModal) — pas de plekken die er ECHT mee rekenen
  // (tax/kmVergoeding.js) zetten 'm om naar een getal; overal elders (vermenigvuldiging, > 0-check,
  // tekst-interpolatie) werkt een numerieke string door JS' eigen coercion toch al.
  const setKmVergoedingField = (year, veld, waarde) => {
    snapshotBeforeAction("Kilometervergoeding aangepast");
    setKmVergoedingDetailsState((prev) => {
      const next = { ...prev };
      const huidig = { ...(next[year] || {}) };
      if (waarde === "" || waarde == null) delete huidig[veld];
      else huidig[veld] = waarde;
      // V52 — alleen weggooien als beide velden echt leeg zijn; "0" of "0," moet kunnen blijven staan terwijl je typt.
      if (huidig.zakelijkeKilometers == null && huidig.vergoedingPerKm == null) delete next[year];
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
  const setEnergieZakelijkPercentageStatus = (year, percentage) => {
    snapshotBeforeAction("Percentage zakelijk gebruik energie-water aangepast");
    setEnergieZakelijkPercentageStatusState((prev) => {
      const next = { ...prev };
      if (percentage != null && percentage !== "") next[year] = Number(percentage);
      else delete next[year];
      return next;
    });
  };
  const setGemeentelijkeKostenZakelijkPercentageStatus = (year, percentage) => {
    snapshotBeforeAction("Percentage zakelijk gebruik gemeentelijke kosten aangepast");
    setGemeentelijkeKostenZakelijkPercentageStatusState((prev) => {
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

  // ---- Eerder opgeslagen dossier laden bij openen — met keuze i.p.v. automatisch ----
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
        suppressChangeCount();
        if (pendingSettings) applySettingsToState(pendingSettings);
        setLoaded(true);
      }
    })();
  }, []);
  const resumeLastProject = () => {
    const pending = pendingProjectRef.current;
    skipNextPersistRef.current = true;
    suppressChangeCount();
    if (pending) {
      setParsedFiles(pending.parsedFiles);
      if (pending.settings) applySettingsToState(pending.settings);
    }
    setShowStartupChoice(false);
    setLoaded(true);
  };
  const startEmpty = () => {
    // Bewust niets wissen — de eerder opgeslagen data in deze browser blijft intact totdat er
    // weer iets nieuws wordt opgeslagen (bijv. door een bestand toe te voegen). (v304: een
    // tussentijdse versie wiste hier de browseropslag zonder bevestiging — dat is teruggedraaid:
    // één klik naast "Verder met dit dossier" mag nooit een niet-geëxporteerd dossier vernietigen.)
    skipNextPersistRef.current = true;
    suppressChangeCount();
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
        ibStatus, zvwStatus, vpbStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, dismissedDuplicateNotice,
        verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
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
    ibStatus, zvwStatus, vpbStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, dismissedDuplicateNotice,
    verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
    incomeBtwTarieven, meerdereTarievenBevestigd, verwachteAangeboden, loadedProjectFileName,
    loaded,
  ]);

  // v305 (V27) — telt wijzigingen sinds de laatste export. Zelfde afhankelijkheden als de autosave
  // hierboven, maar bewust zonder loadedProjectFileName (die verandert bij het exporteren zelf).
  useEffect(() => {
    if (!loaded) return;
    if (Date.now() < suppressChangeCountUntilRef.current) {
      suppressChangeCountUntilRef.current = 0;
      setChangesSinceExport(0);
      return;
    }
    setChangesSinceExport((n) => n + 1);
  }, [
    parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
    categoryBtwRates, btwVerlegd, korRegeling, rechtsvorm, heeftHolding, holdingBoekingen, excludedDuplicateFingerprints,
    businessKeywords, businessExpenseKeywords, reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
    kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
    leaseDetails, leaseMergedInto, activaDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints, transactionNotes,
    ibStatus, zvwStatus, vpbStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, dismissedDuplicateNotice,
    verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
    incomeBtwTarieven, meerdereTarievenBevestigd, verwachteAangeboden,
  ]);

  // v305 (V27) — waarschuwing bij het sluiten/verversen van de pagina zolang er wijzigingen zijn die
  // nog niet als dossierbestand zijn geëxporteerd. (De automatische browseropslag blijft gewoon
  // bestaan; dit is voor wie op een ander apparaat/browser verder wil of de browserdata wist.)
  const heeftNietGeexporteerdeWijzigingen = changesSinceExport > 0 && parsedFiles.length > 0;
  useEffect(() => {
    if (!heeftNietGeexporteerdeWijzigingen) return;
    const waarschuw = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [heeftNietGeexporteerdeWijzigingen]);

  // V55 — rekeningtype dat al bij "Extra bankbestand toevoegen" is gekozen (zakelijk/privé); geldt voor
  // de eerstvolgende gekozen bestanden zodat de wizard er niet nog eens naar hoeft te vragen.
  const pendingAccountTypeRef = useRef(null);
  const handleFiles = async (fileList) => {
    setError(null);
    const presetType = pendingAccountTypeRef.current;
    pendingAccountTypeRef.current = null;
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
      if (presetType) setAccountTypeByFile((prev) => { const next = { ...prev }; for (const r of results) next[r.fileName] = presetType; return next; });
      setShowSetupWizard(true);
      // v286 — op verzoek: alle uitklapbare kaarten (Controleren/Instellingen) moeten bij het laden
      // van (nieuwe/extra) bestanden altijd weer ingeklapt beginnen, in plaats van een kaart die van
      // eerder in de sessie nog openstond gewoon open te laten staan.
      setExpandedCardKeys({});
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
        leaseDetails, leaseMergedInto, activaDetails, confirmedLeaseTypeKeys, fixedCategories, ibStatus, zvwStatus, vpbStatus, zelfstandigenaftrekStatus, startersaftrekStatus, autoStatus, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentage,
        verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
        incomeBtwTarieven, meerdereTarievenBevestigd,
      },
    });
  };
  // v305 (V27) — alleen deze ingrijpende acties houden de opvallende, blijvende "Ongedaan maken"-
  // kaart in de zijbalk; alle kleine acties krijgen een tijdelijke melding (UndoToast.jsx).
  const isBigUndoLabel = (label) =>
    /^(Nieuw dossier|Dossier geladen|Duplicaten verwijderen|Alle transacties|Bestand ")/.test(label || "");
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
    setVerwachteLeaseOverig(s.verwachteLeaseOverig ?? null);
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
    setVpbStatus(s.vpbStatus || {});
    // v269 — deze 5 velden zaten al in de momentopname (snapshotBeforeAction hierboven) maar werden
    // hier nooit teruggezet: "Percentage zakelijk per categorie" en de aftrek-/auto-instellingen
    // leken daardoor ten onrechte NIET ongedaan te maken (de state bleef gewoon op de nieuwe waarde
    // staan, alleen het paneel las hem uit alsof er niets gebeurd was).
    setZelfstandigenaftrekStatusState(s.zelfstandigenaftrekStatus || {});
    setStartersaftrekStatusState(s.startersaftrekStatus || {});
    setAutoStatusState(s.autoStatus || {});
    setHuurZakelijkPercentageStatusState(s.huurZakelijkPercentageStatus || {});
    setEnergieZakelijkPercentageStatusState(s.energieZakelijkPercentageStatus || {});
    setGemeentelijkeKostenZakelijkPercentageStatusState(s.gemeentelijkeKostenZakelijkPercentageStatus || {});
    setCategoryZakelijkPercentageState(s.categoryZakelijkPercentage || {});
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
  // v246 — hetzelfde mechanisme als removeDuplicates hierboven, maar dan per afzonderlijke groep, zodat
  // je niet alles in 1 keer hoeft te verwijderen — en met een tegenhanger (restoreDuplicateGroup) om een
  // eerdere verwijdering weer ongedaan te maken, ook rechtstreeks vanuit de detailweergave (originele
  // regels bekijken) waar je de boeking nog eens goed kunt bekijken voordat je beslist.
  const isDuplicateGroupRemoved = (group) => group.slice(1).every((t) => excludedDuplicateFingerprints.includes(t.fingerprint));
  const removeDuplicateGroup = (group) => {
    snapshotBeforeAction("Duplicaat verwijderd");
    const fps = group.slice(1).map((t) => t.fingerprint);
    setExcludedDuplicateFingerprints((prev) => [...new Set([...prev, ...fps])]);
  };
  const restoreDuplicateGroup = (group) => {
    snapshotBeforeAction("Duplicaat hersteld");
    const fpSet = new Set(group.slice(1).map((t) => t.fingerprint));
    setExcludedDuplicateFingerprints((prev) => prev.filter((fp) => !fpSet.has(fp)));
  };
  const pendingDuplicateCount = duplicateFingerprints.size - excludedDuplicateFingerprints.filter((fp) => duplicateFingerprints.has(fp)).length;
  // v246 — splitst pendingDuplicateCount uit naar "zeker" (het lopende saldo bevestigt met zekerheid dat
  // het dezelfde boeking is — er valt niets meer te beoordelen, alleen nog te verwijderen) versus
  // "onzeker" (geen saldogegevens beschikbaar, dus dit vraagt echt een eigen beoordeling). Alleen de
  // onzekere groepen rechtvaardigen nog de amber "aandacht nodig"-kleur/melding; zodra die op 0 staan is
  // er in feite niets meer te BEOORDELEN (ook al staan de zekere duplicaten nog niet verwijderd).
  const duplicatePendingBreakdown = useMemo(() => {
    let zeker = 0, onzeker = 0;
    for (const group of duplicateGroups) {
      const pendingInGroup = group.slice(1).filter((t) => !excludedDuplicateFingerprints.includes(t.fingerprint)).length;
      if (pendingInGroup === 0) continue;
      if (group[0].certainty === "onzeker") onzeker += pendingInGroup;
      else zeker += pendingInGroup;
    }
    return { zeker, onzeker };
  }, [duplicateGroups, excludedDuplicateFingerprints]);

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
      const transferLocked = !!detectOwnAccountTransfer(tx, accountTypeByFile[tx.source], ownAccountsElsewhereByFile[tx.source] || []);
      // accountType = het type van de REKENING waar de boeking op staat (weergave in detailvensters). `type`
      // blijft zoals het was: een override (bijv. een bevestigde zakelijke klant) kan daar "Zakelijk" op zetten
      // zodat de boeking in de zakelijke overzichten meetelt, ook als hij op een privérekening staat.
      return { ...tx, ...resolved, confidence, transferLocked, accountType: accountTypeByFile[tx.source] === "Zakelijk" ? "Zakelijk" : "Prive" };
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
    const result = mirrors.length ? [...base, ...mirrors] : base;
    // V46 — dossier met ALLEEN privérekening(en): elke transactie met categorie "Zakelijke
    // inkomsten"/"Zakelijke inkoop/uitgaven" is een zakelijke boeking via de privérekening. Het
    // `type` blijft de rekening (Prive); alleen de zakelijke OVERZICHTEN (viewType) tonen ze, zodat
    // de zakelijke kant exact de spiegel is van die categorieën op de privékant.
    const heeftZakelijkeRekening = Object.values(accountTypeByFile).includes("Zakelijk");
    if (heeftZakelijkeRekening) return result;
    return result.map((tx) =>
      !tx.isMirror && tx.viewType !== "Zakelijk" && ZAKELIJKE_SPIEGEL_CATEGORIEEN.includes(tx.category) ? { ...tx, viewType: "Zakelijk" } : tx
    );
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
    // v275 — losse lijst voor overige leaseobjecten (machines, apparatuur), zie verwachteLeaseOverig
    // hierboven; eigen "type" (i.p.v. "lease") zodat de idx-gebaseerde verwachteAangeboden-sleutel
    // niet botst met die van verwachteLease.
    (verwachteLeaseOverig || []).forEach((item, idx) => proberen.push({ type: "lease-overig", idx, naam: item.naam, gevonden: item.gevonden, targetCategory: "Lease (financieel)" }));
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
  }, [classified, verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, verwachteAangeboden, verwachteMatchSuggestie]);

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
    if (type === "lease-overig") setVerwachteLeaseOverig((prev) => prev.map((item, i) => (i === idx ? { ...item, gevonden: true } : item)));
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
  // v243 — inclusief al afgehandelde items (met status) — voor "toon toch" in het Controleren-
  // mini-dashboard, zodat je een al-groene factuurperiode-controle alsnog kunt naslaan.
  const periodeAllSignals = useMemo(
    () => computeAllPeriodeSignals(classified, reviewedPeriodeKeys, periodeQuarterOverrides),
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
      : buildAangiftevoorstelHtml(targetYears, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, startersaftrekStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, zaLegacyJaDefault, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus);
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
  // V53 — een IBAN is alleen een goede tegenpartij-sleutel als er (vrijwel) maar één partij achter zit.
  // Tussenpersonen (Mollie/Adyen/"via Stichting ...", ING-betaalverzoek) delen één IBAN voor tientallen
  // verschillende bedrijven; daar bepaalde de IBAN ten onrechte dat een wijziging voor IWG ook voor
  // alle andere winkels gold. Is minder dan 90% van de transacties met dezelfde IBAN (+teken) van
  // dezelfde partij (eerste woord van de naam), dan gebruiken we de naam als sleutel.
  const ibanExclusiveMap = useMemo(() => {
    const per = {};
    for (const tx of transactions) {
      const ik = ibanKey(tx.counterpartyIban, tx.amount);
      if (!ik) continue;
      const w = (normKey(tx.counterparty || tx.description || "").split(" ")[0]) || "";
      const e = (per[ik] ||= { n: 0, w: {} });
      e.n++;
      e.w[w] = (e.w[w] || 0) + 1;
    }
    const res = {};
    for (const [k, e] of Object.entries(per)) res[k] = Math.max(...Object.values(e.w)) / e.n >= 0.9;
    return res;
  }, [transactions]);
  const exclusiveIbanKey = (iban, amount) => {
    const ik = ibanKey(iban, amount);
    return ik && ibanExclusiveMap[ik] !== false ? ik : "";
  };
  const keyForTx = (tx) => exclusiveIbanKey(tx.counterpartyIban, tx.amount) || counterpartyKey(tx.counterparty || tx.description, tx.amount);

  const setCounterpartyOverride = (counterparty, amount, patch, iban) => {
    snapshotBeforeAction("Categorie/type aangepast");
    const key = (iban && exclusiveIbanKey(iban, amount)) || counterpartyKey(counterparty, amount);
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
          const key = (tx.counterpartyIban && exclusiveIbanKey(tx.counterpartyIban, tx.amount)) || counterpartyKey(tx.counterparty || tx.description, tx.amount);
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

  const requestCategoryChange = (tx, patch, opts) => {
    // v303 — op verzoek: "type" (Zakelijk/Prive) van een transactie volgt uitsluitend het
    // bankbestand waaruit hij is ingelezen en mag nooit meer handmatig worden aangepast (zie
    // autoClassify in classify.js) — dit is het ene doorgeefluik waar alle categorie/type-wijzigingen
    // doorheen gaan (detailtabel, onzekere-transacties-modal, eerdere sleepfunctie, enz.), dus hier
    // negeren we een eventueel meegestuurd `type` altijd en behouden we het bestaande type van tx.
    patch = { ...patch, type: tx.type };
    // v311 (V33) — overboekingen tussen eigen rekeningen (herkend op IBAN) liggen vast, zie detectOwnAccountTransfer.
    if (tx.transferLocked) return;
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
      if (original) return requestCategoryChange(original, { ...patch, type: original.type }, opts);
      return;
    }
    // V53 — actieve zoekopdracht in de detailtabel: de reikwijdte is wat het zoekwoord vindt, niet de IBAN.
    const sq = (opts?.searchQuery || "").toLowerCase();
    if (sq && tx.id != null) {
      const kwMatches = classified.filter(
        (t) =>
          !t.isMirror && !t.transferLocked && (t.amount >= 0) === (tx.amount >= 0) &&
          `${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase().includes(sq)
      );
      if (kwMatches.length > 1 && kwMatches.some((t) => t.id === tx.id)) {
        const matchYears = [...new Set(kwMatches.map((t) => t.year))].sort((a, b) => a - b);
        setPendingCategoryChange({ tx, patch, key: null, matchCount: kwMatches.length, matchYears, viaIban: false, keywordQuery: opts.searchQuery, matchIds: kwMatches.map((t) => t.id) });
        return;
      }
    }
    const key = keyForTx(tx);
    if (!key) {
      snapshotBeforeAction("Categorie/type aangepast");
      setRowOverride(tx.id, patch);
      return;
    }
    const matches = classified.filter((t) => !t.isMirror && !t.transferLocked && keyForTx(t) === key);
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
  const applyRowsOverride = (ids, patch, tx) => {
    snapshotBeforeAction("Categorie/type aangepast (zoekwoord)");
    setOverridesByRow((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = { ...(next[id] || {}), ...patch };
      return next;
    });
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };
  const applyPendingToAllYears = () => {
    const { tx, patch, matchIds } = pendingCategoryChange;
    if (matchIds) return applyRowsOverride(matchIds, patch, tx);
    setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, patch, tx.counterpartyIban);
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };
  const applyPendingToYears = (selectedYears) => {
    const { tx, key, patch, matchIds } = pendingCategoryChange;
    snapshotBeforeAction("Categorie/type aangepast (gekozen jaren)");
    const idsToPatch = matchIds
      ? classified.filter((t) => matchIds.includes(t.id) && selectedYears.includes(t.year)).map((t) => t.id)
      : classified.filter((t) => !t.isMirror && keyForTx(t) === key && selectedYears.includes(t.year)).map((t) => t.id);
    setOverridesByRow((prev) => {
      const next = { ...prev };
      for (const id of idsToPatch) next[id] = { ...(next[id] || {}), ...patch };
      return next;
    });
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };

  // v303 — op verzoek: het type (Zakelijk/Prive) is niet meer handmatig aanpasbaar, dus de
  // sleepfunctionaliteit tussen de Zakelijk/Prive-tabellen (die `type` wijzigde) is verwijderd.
  const [expandedTable, setExpandedTable] = useState(null); // "Zakelijk" | "Prive" | null
  const [expandedBusinessIncomeList, setExpandedBusinessIncomeList] = useState(false);
  const [expandedBusinessExpenseList, setExpandedBusinessExpenseList] = useState(false);

    const groups = useMemo(() => {
    const map = {};
    for (const tx of classified) {
      const vt = tx.viewType || tx.type;
      const key = `${vt} ${tx.year}`;
      if (!map[key]) map[key] = { label: `${vt === "Zakelijk" ? "Zakelijk" : "Prive"} ${tx.year}`, type: vt, year: tx.year, items: [] };
      map[key].items.push(tx);
    }
    return Object.values(map).sort((a, b) => a.year - b.year || (a.type === "Zakelijk" ? -1 : 1));
  }, [classified]);
  const years = useMemo(() => [...new Set(groups.map((g) => g.year))].sort((a, b) => a - b), [groups]);
  // v300 — gecorrigeerd op verzoek: de eerste versie telde jaren met minstens één transactie van
  // het TYPE "Prive" (tx.type, na classificatie) — maar een "prive opname"-boeking (en zijn
  // spiegelboeking) op de ZAKELIJKE rekening krijgt ook type "Prive", terwijl dat jaar geen eigen
  // privérekening-bestand heeft. Dat telde een privérekening-jaar te veel (3 i.p.v. 2 bij één
  // zakelijk bestand 2020-2026 + twee privébestanden 2024/2025). Nu geteld via het brongegeven van
  // elke transactie (`tx.source`, de bestandsnaam) opgezocht in `accountTypeByFile` — dus welk jaar
  // heeft minstens één transactie UIT EEN ALS ZAKELIJK/PRIVÉ GEMARKEERD BESTAND, ongeacht hoe de
  // transactie zelf later geclassificeerd is.
  const zakelijkYearsCount = useMemo(() => {
    const s = new Set();
    for (const tx of classified) if (accountTypeByFile[tx.source] === "Zakelijk") s.add(tx.year);
    return s.size;
  }, [classified, accountTypeByFile]);
  const priveYearsCount = useMemo(() => {
    const s = new Set();
    for (const tx of classified) if (accountTypeByFile[tx.source] === "Prive") s.add(tx.year);
    return s.size;
  }, [classified, accountTypeByFile]);
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
  // V46 — privé-only dossier: de privékant toont álle transacties van de rekening (ook die met een
  // zakelijke categorie, die aan de zakelijke kant gespiegeld staan). Alleen voor weergave; controles
  // en checklists blijven op `priGroupForYear` rekenen zodat niets dubbel geteld wordt.
  const priGroupShown = useMemo(() => {
    if (Object.values(accountTypeByFile).includes("Zakelijk")) return priGroupForYear;
    const extra = zakGroupForYear.items.filter((t) => !t.isMirror);
    return extra.length ? { ...priGroupForYear, items: [...priGroupForYear.items, ...extra].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) } : priGroupForYear;
  }, [priGroupForYear, zakGroupForYear, accountTypeByFile]);

  // Zodra er ÉÉN auto-op-de-zaak geregistreerd staat — financial lease (soort "auto"), koop, of
  // operational lease — tellen computeLeaseAutoKostenVoorJaar (autoBijtelling.js) resp.
  // computeAutoActivaKostenVoorJaar (autoActiva.js) voor ELK jaar 100% van Brandstof/Parkeren mee —
  // ongeacht wat autoStatus voor dat jaar zegt. De generieke %-splitsing hieronder moet die twee
  // categorieën daarom ook mijden zodra dit dossierbreed het geval is, niet alleen in een jaar met
  // expliciet "Auto op de zaak" (zie heeftGeregistreerdeAutoOpDeZaak in tax/categorySplit.js).
  // Dossierbreed (geen jaarfilter) omdat de bronnen zelf dat ook niet hebben.
  const priveOnlyDossier = useMemo(() => {
    const types = Object.values(accountTypeByFile);
    return types.includes("Prive") && !types.includes("Zakelijk");
  }, [accountTypeByFile]);
  const categoryZakelijkPercentageEff = useMemo(() => {
    if (!priveOnlyDossier) return categoryZakelijkPercentage;
    const jaren = [...new Set(classified.map((tx) => tx.year))];
    const result = { ...categoryZakelijkPercentage };
    for (const cat of PRIVE_ONLY_HUISVESTING_STANDAARD_NUL) {
      const perJaar = { ...(result[cat] || {}) };
      for (const y of jaren) if (perJaar[y] == null) perJaar[y] = 0;
      result[cat] = perJaar;
    }
    return result;
  }, [priveOnlyDossier, categoryZakelijkPercentage, classified]);
  const heeftLeaseAutoDossierBreed = useMemo(
    () => heeftGeregistreerdeAutoOpDeZaak(leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus),
    [leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus]
  );
  const quarterlyBtwData = useMemo(
    () => (activeYear ? computeQuarterlyBtwForYear(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus) : []),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus]
  );
  // Uitsluitend voor de "Uitgaven (netto)"-pop-up: dezelfde indeling als hierboven, alleen per
  // categorie apart gehouden — geen nieuwe berekening, puur het al berekende bedrag herleidbaar
  // maken.
  const costBreakdownByQuarter = useMemo(
    () => (activeYear ? computeQuarterlyCostBreakdown(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed) : {}),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed]
  );
  // Zelfde soort uitsplitsing, maar per jaar in één keer — voor de pop-ups bij "Voorbelasting" en
  // "Zakelijk totaal (netto)" in het meerjarenoverzicht.
  const costBreakdownByYear = useMemo(() => {
    const map = {};
    for (const year of years) {
      map[year] = computeYearlyCostBreakdown(classified, year, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed);
    }
    return map;
  }, [classified, years, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed]);
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
  // v291 — zelfde constructie, nu ook voor "Energie-water (deels zakelijk)"/"Gemeentelijke kosten
  // (deels zakelijk)" (zie tax/gedeeldeHuur.js).
  const gedeeldeEnergieForActiveYear = useMemo(
    () => (activeYear ? computeGedeeldeEnergieVoorJaar(classified, activeYear, energieZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd) : null),
    [classified, activeYear, energieZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd]
  );
  const gedeeldeGemeentelijkeKostenForActiveYear = useMemo(
    () => (activeYear ? computeGedeeldeGemeentelijkeKostenVoorJaar(classified, activeYear, gemeentelijkeKostenZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd) : null),
    [classified, activeYear, gemeentelijkeKostenZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd]
  );
  // Kilometervergoeding voor een privéauto die zakelijk gebruikt wordt (autoStatus "prive"/"beide")
  // — zie tax/kmVergoeding.js. Zelfde rechtsvorm-beperking als leaseAutoKostenForActiveYear
  // hierboven (alleen zzp/eenmanszaak; een BV/DGA heeft hiervoor een andere systematiek).
  const kmVergoedingForActiveYear = useMemo(
    () => (activeYear && rechtsvorm !== "bv" ? computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, activeYear) : null),
    [kmVergoedingDetails, autoStatus, activeYear, rechtsvorm]
  );
  // "Zakelijk - apparatuur/machines" telt niet als volledige kosten mee in yearlySummary.js (zie de
  // toelichting daar), dus de daadwerkelijk berekende afschrijving moet worden meegeteld in
  // winstCorrectieActiveYear hieronder, exact dezelfde constructie als de financiële-lease-afschrijving.
  const activaAfschrijvingForYear = useMemo(
    () => (activeYear ? computeActivaAfschrijvingForYear(activaSummary, activaDetails, activeYear) : null),
    [activaSummary, activaDetails, activeYear]
  );
  const winstCorrectieActiveYear =
    (leaseAutoKostenForActiveYear?.winstCorrectie || 0) - (gedeeldeHuurForActiveYear?.nietAftrekbaarBedrag || 0) -
    (gedeeldeEnergieForActiveYear?.nietAftrekbaarBedrag || 0) - (gedeeldeGemeentelijkeKostenForActiveYear?.nietAftrekbaarBedrag || 0) +
    (kmVergoedingForActiveYear?.bedrag || 0) + (activaAfschrijvingForYear?.totaalAfschrijving || 0);
  const yearlySummary = useMemo(
    () => (activeYear ? computeYearlySummary(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, INCOME_TRANSFER_CATEGORIES, voorbelastingExcluded, renteAftrekbaarActiveYear, winstCorrectieActiveYear, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed) : null),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, voorbelastingExcluded, renteAftrekbaarActiveYear, winstCorrectieActiveYear, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed]
  );
  const yearlyOpenOB = useMemo(
    () => computeYearlyOpenOB(classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus),
    [classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, kwartaalStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus]
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
      // v291 — zelfde correctie, nu ook voor "Energie-water (deels zakelijk)"/"Gemeentelijke kosten
      // (deels zakelijk)" (zie tax/gedeeldeHuur.js).
      const gedeeldeEnergie = computeGedeeldeEnergieVoorJaar(classified, y, energieZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      const gedeeldeGemeentelijkeKosten = computeGedeeldeGemeentelijkeKostenVoorJaar(classified, y, gemeentelijkeKostenZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      const kmVergoeding = rechtsvorm !== "bv" ? computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, y) : null;
      // "Zakelijk - apparatuur/machines" telt niet als volledige kosten mee in yearlySummary.js — de
      // daadwerkelijk berekende afschrijving moet daarom hier worden meegeteld, exact dezelfde
      // constructie als de financiële-lease-afschrijving.
      const activaAfschrijving = computeActivaAfschrijvingForYear(activaSummary, activaDetails, y);
      const winstCorrectie =
        (leaseAutoKosten?.winstCorrectie || 0) - (gedeeldeHuur?.nietAftrekbaarBedrag || 0) -
        (gedeeldeEnergie?.nietAftrekbaarBedrag || 0) - (gedeeldeGemeentelijkeKosten?.nietAftrekbaarBedrag || 0) +
        (kmVergoeding?.bedrag || 0) + (activaAfschrijving?.totaalAfschrijving || 0);
      map[y] = computeYearlySummary(classified, y, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, INCOME_TRANSFER_CATEGORIES, voorbelastingExcluded, renteAftrekbaar, winstCorrectie, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed);
    }
    return map;
  }, [years, classified, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, voorbelastingExcluded, loanSummary, loanDetails, leaseSummary, leaseDetails, rechtsvorm, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, activaSummary, activaDetails]);
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
      // Toegevoegd zodat de "Indicatieve aangifte"-kaart (DetailsPanel.jsx/IndicatieveAangifteCard.jsx)
      // onder "Totaal belasting en premies" ook laat zien wélke heffingskorting daar al in is verrekend
      // — zonder dit veld leek "Totaal" alleen IB + Zvw te zijn, zonder de aftrek die daar al in zit.
      heffingskortingen: estimateHeffingskortingenMetOndernemersaftrek(yearlySummary.winst, activeYear, ondernemersaftrekBedrag, startersaftrekToegepastDitJaar),
      zelfstandigenaftrekBedrag: aftrek?.zelfstandigenaftrekBedrag || 0,
      startersaftrekBedrag: aftrek?.startersaftrekBedrag || 0,
      mkbVrijstellingBedrag: winstUitsplitsing.mkbVrijstellingBedrag,
      // Toegevoegd voor de "Indicatieve aangifte"-kaart in DetailsPanel.jsx (Overzicht-tabblad,
      // sub-tab Jaaroverzicht) — dezelfde belastbare winst als in winstUitsplitsing, alleen nog niet
      // apart doorgegeven.
      belastbareWinst: winstUitsplitsing.belastbaar,
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
      const ib = computeIbBoxMapping(zakItemsVoorJaar, loanRente, leaseRente, activaAfschrijvingVoorJaar, effectiveCategoryBtwRates, btwVerlegd, leaseAutoKosten, y, categoryZakelijkPercentageEff, autoStatus, kmVergoeding);
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
  }, [years, classified, effectiveCategoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, activaSummary, activaDetails, rechtsvorm, categoryZakelijkPercentageEff, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails]);
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
  // v282 — BV-equivalent van dashboardAangifteIndicatie hierboven, voor de "Indicatieve
  // vennootschapsbelasting"-kaart in DetailsPanel.jsx (Overzicht-tabblad, sub-tab Jaaroverzicht).
  // Zelfde estimateVpb(...) als evVerloop hierboven en het BV-Aangiftevoorstel — geen nieuwe/
  // afwijkende berekening.
  const dashboardVpbIndicatie = useMemo(() => {
    if (rechtsvorm !== "bv" || !activeYear || !yearlySummary) return null;
    return estimateVpb(yearlySummary.winst, activeYear);
  }, [rechtsvorm, activeYear, yearlySummary]);
  // v283 — zelfde drieluik (Omzet incl. BTW / Omzet excl. BTW / Zakelijke kosten) als de
  // "kerncijfers"-kaart in het BV-Aangiftevoorstel (reports/aangiftevoorstel-bv.js), nu ook als korte
  // toelichting onder "Indicatieve vennootschapsbelasting" op het Jaaroverzicht. Geen nieuwe
  // berekening: omzetExclBtw = yearlySummary.zakelijkeInkomstenNetto (zelfde definitie als "1.
  // Opbrengsten" in het Aangiftevoorstel), omzetInclBtw = daar de over dit jaar verschuldigde BTW op
  // de omzet (som van box 1a/1b per kwartaal, uit quarterlyBtwData) bovenop, en zakelijkeKosten wordt
  // afgeleid uit winst = omzetExclBtw - kosten (dezelfde identiteit als het Aangiftevoorstel, dat
  // hetzelfde totaal via een andere optelling — inkoop/afschrijving/overig/rente — uitrekent), zodat
  // dit bedrag hier altijd exact aansluit bij "Resultaat vóór Vpb" hierboven.
  const dashboardVpbBreakdown = useMemo(() => {
    if (rechtsvorm !== "bv" || !activeYear || !yearlySummary) return null;
    const omzetExclBtw = yearlySummary.zakelijkeInkomstenNetto || 0;
    const btwOverOmzetTotaal = quarterlyBtwData.reduce((a, q) => a + (q.verschuldigdBtw21 || 0) + (q.verschuldigdBtw9 || 0), 0);
    const omzetInclBtw = omzetExclBtw + btwOverOmzetTotaal;
    const zakelijkeKosten = omzetExclBtw - yearlySummary.winst;
    const gebruikt21 = quarterlyBtwData.some((q) => (q.verschuldigdBtw21 || 0) > 0);
    const gebruikt9 = quarterlyBtwData.some((q) => (q.verschuldigdBtw9 || 0) > 0);
    const btwTariefLabel = gebruikt21 && gebruikt9 ? "21% en 9%" : gebruikt9 ? "9%" : "21%";
    return { omzetInclBtw, omzetExclBtw, zakelijkeKosten, btwTariefLabel, toonOmzetInclBtw: btwOverOmzetTotaal > 0 };
  }, [rechtsvorm, activeYear, yearlySummary, quarterlyBtwData]);
  // v282 — samenvatting van de holding-boekingen voor het actieve jaar, als compacte kaart (zelfde
  // vorm als aannamesCard) voor diezelfde Jaaroverzicht-sub-tab. Herhaalt bewust dezelfde
  // verschil-berekening als de rij voor dit jaar in HoldingBoekingenPanel.jsx — puur een
  // samenvatting/link daarnaartoe, geen nieuwe databron.
  const holdingSummaryCard = useMemo(() => {
    if (rechtsvorm !== "bv" || heeftHolding !== true || !activeYear) return null;
    const b = holdingBoekingen?.[activeYear] || {};
    const ev = evVerloop?.[activeYear] || { kapitaalstorting: 0, dividend: 0 };
    const kapitaalstortingHolding = b.kapitaalstorting ?? null;
    const dividendOntvangenHolding = b.dividendOntvangen ?? null;
    const ingevuld = kapitaalstortingHolding != null || dividendOntvangenHolding != null;
    const kapitaalVerschil = (kapitaalstortingHolding || 0) - ev.kapitaalstorting;
    const dividendVerschil = (dividendOntvangenHolding || 0) - ev.dividend;
    const heeftVerschil = ingevuld && (Math.abs(kapitaalVerschil) >= 1 || Math.abs(dividendVerschil) >= 1);
    return {
      key: "holdingBoekingen",
      title: `Holding-boekingen ${activeYear}`,
      icon: <CardIcon name="building" />,
      lines: [
        { label: "Kapitaalstorting (holding)", value: kapitaalstortingHolding != null ? eur(kapitaalstortingHolding) : "— nog niet ingevuld" },
        { label: "Dividend ontvangen (holding)", value: dividendOntvangenHolding != null ? eur(dividendOntvangenHolding) : "— nog niet ingevuld" },
      ],
      subtitle: !ingevuld
        ? "Nog niet ingevuld"
        : heeftVerschil
        ? `Verschil met werkmaatschappij: kapitaal ${eur(kapitaalVerschil)}, dividend ${eur(dividendVerschil)}`
        : "Sluit aan met de werkmaatschappij",
      tone: !ingevuld ? "neutral" : heeftVerschil ? "attention" : "ok",
      hint: "Naar de holding-boekingen",
      onClick: () => {
        setShowHoldingBoekingen(true);
        jumpToSection(holdingBoekingenSectionRef);
      },
      actionLabel: "Bewerken",
    };
  }, [rechtsvorm, heeftHolding, activeYear, holdingBoekingen, evVerloop]);
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
  // v286 — gedeelde berekening voor de "Controle overboeking zakelijk ↔ privé"-info (v283, eerder
  // gedupliceerd in AansluitingDetailPanel.jsx en de losse "aansluitControle"-kaart) — nu ook
  // hergebruikt door de nieuwe "Bestanden geladen"-kaart op Overzicht (zie dashboardCards), zodat er
  // maar één plek is die zakSum/priSum/diff uitrekent.
  const aansluitControleInfo = useMemo(() => {
    const isZakTransferCat = (c) => c === "Prive opnames" || c === "Terugboeking van prive";
    const isPriTransferCat = (c) => c === "Ontvangen van zakelijk" || c === "Terugboeking naar zakelijk";
    const zakSum = zakGroupForYear.items.filter((t) => isZakTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
    const priSum = priGroupForYear.items.filter((t) => isPriTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
    const diff = Math.round((zakSum + priSum) * 100) / 100;
    const zijdeOntbreekt = !priveRekeningGeladen ? "Prive" : !zakelijkRekeningGeladen ? "Zakelijk" : null;
    const heeftData = !(zakSum === 0 && priSum === 0);
    let tone, subtitle;
    if (!heeftData) {
      tone = "neutral";
      subtitle = "Geen overboekingen tussen zakelijk en privé gevonden dit jaar.";
    } else if (zijdeOntbreekt) {
      tone = "ok";
      subtitle = `Geen ${zijdeOntbreekt === "Prive" ? "privé" : "zakelijke"}-rekening geladen, dus niet te verifiëren — dat is geen fout. ${zijdeOntbreekt === "Prive" ? "Zakelijk" : "Prive"}: ${eur(zijdeOntbreekt === "Prive" ? zakSum : priSum)}.`;
    } else {
      const ok = Math.abs(diff) < 0.01;
      tone = ok ? "ok" : "attention";
      subtitle = ok
        ? `Zakelijk ${eur(zakSum)} tegenover Prive ${eur(priSum)} — komt overeen (samen nul, zoals het hoort).`
        : `Zakelijk ${eur(zakSum)} tegenover Prive ${eur(priSum)} — komt niet overeen (verschil ${eur(diff)}).`;
    }
    return { zakSum, priSum, diff, zijdeOntbreekt, heeftData, tone, subtitle };
  }, [zakGroupForYear, priGroupForYear, priveRekeningGeladen, zakelijkRekeningGeladen]);
  const checklistData = useMemo(
    () => computeChecklistLikeDataForYear(zakGroupForYear.items, priGroupForYear.items, quarterlyBtwData, kwartaalStatus, priveRekeningGeladen),
    [zakGroupForYear, priGroupForYear, quarterlyBtwData, kwartaalStatus, priveRekeningGeladen]
  );
  const businessAdvies = useMemo(() => {
    if (!activeYear || !yearlySummary) return null;
    return computeBusinessAdvies(activeYear, yearlySummary, yearlyOpenOB[activeYear] || 0, ibEstimate, priGroupForYear.items, zvwEstimate);
  }, [activeYear, yearlySummary, yearlyOpenOB, ibEstimate, zvwEstimate, ibStatus, priGroupForYear]);

  // v246 — hierboven stonden incompleteLoansCount/incompleteLeasesCount alleen lokaal in de
  // dashboardCards-berekening verderop; nu ook in een eigen useMemo (plus incompleteActivaCount,
  // die nog nergens dossierbreed werd bijgehouden) zodat het mini-dashboard op tabblad
  // "Instellingen" (instellingenDashboardCards) dezelfde tellingen kan hergebruiken i.p.v. ze een
  // tweede keer uit te rekenen. v254 — hiernaartoe verplaatst (was ná yearlyProgress) omdat
  // yearlyProgress ze nu zelf ook nodig heeft, voor het "aannames"-signaal bij Indicatieve aangifte.
  const incompleteLoansCount = useMemo(
    () => loanSummary.filter((l) => !(loanDetails[l.key]?.leningbedrag && loanDetails[l.key]?.startdatum) && !loanDetails[l.key]?.onbekend).length,
    [loanSummary, loanDetails]
  );
  const incompleteLeasesCount = useMemo(
    () =>
      leaseSummary.filter((l) => {
        if (!confirmedLeaseTypeKeys.includes(l.key)) return true;
        if (leaseDetails[l.key]?.onbekend) return false;
        return l.category === "Lease (financieel)" && !isCompleteFinancialLeaseDetails(leaseDetails[l.key]);
      }).length,
    [leaseSummary, leaseDetails, confirmedLeaseTypeKeys]
  );
  const incompleteActivaCount = useMemo(
    () =>
      activaSummary.filter((a) => {
        const details = activaDetails[a.key];
        if (details?.onbekend) return false;
        return !(details && details.aanschafwaarde && details.aanschafdatum && details.afschrijvingstermijnJaren);
      }).length,
    [activaSummary, activaDetails]
  );

  // ---- Voortgangspercentage per jaar (voor de jaarknoppen in "Werk te doen") ----
  //
  // v254 — herzien op expliciet verzoek: dit percentage/status ging voorheen ook over of de
  // IB/Zvw-aangifte en BTW-kwartalen al daadwerkelijk AANGEGEVEN/BETAALD/GEDAAN waren. Dat
  // suggereerde ten onrechte dat "100%"/groen zou betekenen dat de aangifte is ingediend. Vanaf nu
  // is dit zuiver een DOSSIERCONTROLE-percentage (is alles administratief op orde: ingedeeld,
  // beoordeeld, instellingen bekend?) — een dossier kan dus 100% groen staan terwijl de aangiften
  // zelf nog niet gedaan zijn. Die drie waren daarvoor gewone `checks`-fracties tussen de andere in;
  // nu apart in `werkelijkAangifteChecks`, dat NIET meetelt in `pct`/`status`, maar wel een eigen
  // signaal levert (`werkelijkAangifteStatus`) voor de losse "Werkelijke aangifte"-regel op de
  // dashboardkaart. Verder nieuw: `openPunten` (hoeveel van de dossiercontrole-checks nog niet
  // volledig klaar zijn — een klein, telbaar aantal i.p.v. alleen een percentage) en
  // `aannamesCount`/`aannamesStatus` — hoeveel aannames de INDICATIEVE berekening nog bevat
  // (urencriterium/gedeelde-huur-percentage onbevestigd, onvolledige leningen/lease/activa-
  // gegevens). Bewust NIET meegenomen als "aanname": startersaftrek (leeg laten is daar een
  // geldig, expliciet "nee/n.v.t." — geen open vraag) en het generieke "percentage zakelijk per
  // categorie"-systeem (te generiek om zonder ruis te tellen; huur (deels zakelijk) heeft wél een
  // eigen status-veld en telt daarom wel mee).
  const yearlyProgress = useMemo(() => {
    const map = {};
    for (const year of years) {
      const zakItems = (groups.find((g) => g.year === year && g.type === "Zakelijk") || { items: [] }).items;
      const priItems = (groups.find((g) => g.year === year && g.type === "Prive") || { items: [] }).items;
      const allYearItems = [...zakItems, ...priItems];
      const quartersForYear = computeQuarterlyBtwForYear(classified, year, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus);
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
      const kwTotal = quartersForYear.length;
      if (korRegeling === false) {
        checks.push({ frac: btwVerlegd !== null ? 1 : 0 });
      }
      // avgFrac/pct/openPunten hieronder zijn zuiver DOSSIERCONTROLE (administratief) — of de
      // aangiften al daadwerkelijk gedaan/betaald zijn, telt hier bewust niet meer mee (zie
      // werkelijkAangifteChecks verderop).
      const avgFrac = checks.length ? checks.reduce((a, c) => a + c.frac, 0) / checks.length : 1;
      const openPunten = checks.filter((c) => c.frac < 0.999).length;

      // ---- Werkelijke aangifte — apart signaal, telt niet mee in pct/status hierboven ----
      // v285 — voorheen telde de BTW (alle kwartalen samen) hier als ÉÉN item, even zwaar als IB of
      // Zvw afzonderlijk — een dossier met 1 van de 4 BTW-kwartalen gedaan en IB/Zvw nog niet kon zo
      // al "deels" tonen, terwijl feitelijk pas 1 van de (in totaal) 6 aangiftes rond was. Nu telt elk
      // afzonderlijk BTW-kwartaal als eigen item (net als IB/Zvw), zodat "X van N gedaan" hieronder
      // klopt met het werkelijke aantal aangiftes. Bewust nog steeds gebaseerd op quartersForYear (de
      // kwartalen die dit jaar daadwerkelijk transacties bevatten) i.p.v. altijd vaste 4 — een
      // onvolledig eerste/laatste jaar hoeft niet alle 4 kwartalen verschuldigd te zijn. Maandaangifte
      // (i.p.v. kwartaal) is bewust nog niet ondersteund — dat is een aparte, grotere uitbreiding
      // (nieuwe wizardvraag + eigen maandregistratie) die nog niet is gebouwd.
      const btwAangifteChecks =
        korRegeling === false
          ? quartersForYear.map((q) => {
              const s = kwartaalStatus[`${q.year}-Q${q.kwartaal}`] || {};
              return { frac: (s.aangegeven ? 0.5 : 0) + (s.betaald ? 0.5 : 0) };
            })
          : [];
      // v285 — een BV kent geen IB/Zvw (dat bestaat alleen voor een zzp/eenmanszaak) maar wel een
      // jaarlijkse Vpb-aangifte — vpbStatus vervangt ibStatus/zvwStatus hier zodra rechtsvorm "bv" is,
      // i.p.v. dat IB/Zvw daar (nooit ingevuld, want niet van toepassing) de teller eeuwig op "deels"
      // hielden.
      const overigeAangifteChecks =
        rechtsvorm === "bv"
          ? [{ frac: vpbStatus[year]?.gedaan ? 1 : 0 }]
          : [{ frac: ibStatus[year]?.gedaan ? 1 : 0 }, { frac: zvwStatus[year]?.gedaan ? 1 : 0 }];
      const werkelijkAangifteChecks = [...btwAangifteChecks, ...overigeAangifteChecks];
      const werkelijkAangifteDone = werkelijkAangifteChecks.filter((c) => c.frac >= 0.999).length;
      const werkelijkAangifteTotal = werkelijkAangifteChecks.length;
      const werkelijkAangifteStatus =
        werkelijkAangifteDone === 0 ? "niet-geregistreerd" : werkelijkAangifteDone === werkelijkAangifteTotal ? "gedaan" : "deels";

      // ---- Indicatieve aangifte — aantal aannames dat de berekening nog bevat (v254) ----
      // Bewust dossierbreed voor leningen/lease/activa (net als instellingenDashboardCards) — een
      // lening/lease/activum loopt meestal over meerdere jaren, dus een aparte telling per jaar zou
      // hier geen scherper beeld geven. Alleen relevant voor zzp/eenmanszaak: een BV kent het
      // urencriterium/zelfstandigenaftrek niet.
      // v308 (V31) — naast het aantal nu ook WELKE aannames het zijn, zodat de kop en het rapport kunnen
      // tonen waar het "1 aanname" over gaat (BTW-verlegd/KOR zijn feiten uit de basisvragen, geen aanname).
      const aannamesLabels = [];
      if (incompleteLoansCount > 0) aannamesLabels.push(`${incompleteLoansCount === 1 ? "lening" : "leningen"} onvolledig`);
      if (incompleteLeasesCount > 0) aannamesLabels.push(`${incompleteLeasesCount === 1 ? "leasecontract" : "leasecontracten"} onvolledig`);
      if (incompleteActivaCount > 0) aannamesLabels.push(`activa onvolledig`);
      if (rechtsvorm !== "bv") {
        const zaRaw = zelfstandigenaftrekStatus?.[year];
        if (zaRaw == null || zaRaw === "onbekend") aannamesLabels.push("urencriterium onbekend");
      }
      const gedeeldeHuurDitJaar = computeGedeeldeHuurVoorJaar(classified, year, huurZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      if (gedeeldeHuurDitJaar && huurZakelijkPercentageStatus?.[year] == null) aannamesLabels.push("% zakelijk huur");
      const gedeeldeEnergieDitJaar = computeGedeeldeEnergieVoorJaar(classified, year, energieZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      if (gedeeldeEnergieDitJaar && energieZakelijkPercentageStatus?.[year] == null) aannamesLabels.push("% zakelijk energie/water");
      const gedeeldeGemeentelijkeKostenDitJaar = computeGedeeldeGemeentelijkeKostenVoorJaar(classified, year, gemeentelijkeKostenZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      if (gedeeldeGemeentelijkeKostenDitJaar && gemeentelijkeKostenZakelijkPercentageStatus?.[year] == null) aannamesLabels.push("% zakelijk gemeentelijke kosten");
      const aannamesCount = (incompleteLoansCount + incompleteLeasesCount + incompleteActivaCount) + aannamesLabels.filter((l) => !/onvolledig$/.test(l)).length;

      // Samenvattende status — afgeleid uit bestaande controles, geen nieuw controlesysteem: het
      // voortgangspercentage hierboven, plus hoeveel transacties dit jaar nog onzeker zijn
      // geclassificeerd, plus of er een bekend gat in de bestandscontinuïteit dit jaar raakt.
      const onzekerDitJaar = allYearItems.filter((tx) => !tx.isMirror && tx.confidence.level !== "override" && tx.confidence.level !== "keyword" && tx.confidence.level !== "heuristic").length;
      // v260 — drie niveaus i.p.v. één harde grens (zie classifyContinuityGap in transactions.js):
      // tot €500 verschil bij een bestandsovergang is voor het dossier verwaarloosbaar (groen, geen
      // invloed op de jaarstatus), €500–€999 is "geel" (zet de status op zijn minst op oranje, ook
      // als verder alles compleet is), vanaf €1000 is het een echt gat (rood).
      const gatDitJaar = fileContinuity.some((g) => !g.ok && classifyContinuityGap(g.diff) === "rood" && (g.aTo.getFullYear() === year || g.bFrom.getFullYear() === year));
      const geelDitJaar = fileContinuity.some((g) => !g.ok && classifyContinuityGap(g.diff) === "geel" && (g.aTo.getFullYear() === year || g.bFrom.getFullYear() === year));
      let status;
      if (gatDitJaar) status = "rood";
      else if (openPunten === 0 && onzekerDitJaar === 0 && !geelDitJaar) status = "groen";
      else status = "oranje";

      map[year] = {
        pct: Math.round(avgFrac * 100), status, onzekerDitJaar, gatDitJaar, geelDitJaar, openPunten, aannamesCount, aannamesLabels,
        werkelijkAangifteStatus, werkelijkAangifteDone, werkelijkAangifteTotal,
      };
    }
    return map;
  }, [years, groups, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, kwartaalStatus, korRegeling, reviewedPersonKeys, reviewedOverigKeys, fileContinuity, ibStatus, zvwStatus, vpbStatus, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, priveRekeningGeladen, incompleteLoansCount, incompleteLeasesCount, incompleteActivaCount, rechtsvorm, zelfstandigenaftrekStatus]);

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
    // v281 — als deze ref bij een kaart hoort waarvan de zichtbaarheid afhangt van de
    // uitgeklapt/ingeklapt-stand (zie REF_COLLAPSE_KEYS hierboven), en de kaart staat nu niet in de
    // daarvoor benodigde stand, is de sectie op dit moment niet gemount — eerst de kaart in de juiste
    // stand zetten, dan pas (na een extra render) scrollen, anders gebeurt er niets (ref.current is
    // null).
    const visibilityEntry = REF_COLLAPSE_KEYS.find(([r]) => r === ref);
    const visibilityKey = visibilityEntry ? visibilityEntry[1] : null;
    const requiredExpanded = visibilityEntry ? visibilityEntry[2] : null;
    const needsToggle = !!(visibilityKey && !!expandedCardKeys[visibilityKey] !== requiredExpanded);
    if (needsToggle) {
      setExpandedCardKeys((prev) => ({ ...prev, [visibilityKey]: requiredExpanded }));
    }
    const entry = REF_TAB_ENTRIES.find(([r]) => r === ref);
    const targetTab = entry ? entry[1] : null;
    if (targetTab && targetTab !== activeTab) {
      // Sectie zit op een ander tabblad: eerst wisselen, dan pas scrollen (zie de useEffect
      // hieronder — deze ref staat nu nog op display:none).
      setActiveTab(targetTab);
      setPendingScrollRef(ref);
      return;
    }
    if (needsToggle) {
      // Zelfde tabblad, maar de sectie moet eerst weer (op)nieuw gemount worden nu de kaart net van
      // stand is gewisseld — via dezelfde pendingScrollRef-route als een tabwissel hierboven.
      setPendingScrollRef(ref);
      return;
    }
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  // Voert de scroll pas uit nadat het doel-tabblad daadwerkelijk actief (en dus zichtbaar) is
  // geworden — requestAnimationFrame wacht op de eerstvolgende render/paint na de tabwissel. Ook
  // opnieuw triggeren op expandedCardKeys (Fase 3): na het automatisch inklappen van een kaart
  // (zie jumpToSection hierboven) moet er ook zonder tabwissel een extra render/paint afgewacht
  // worden vóórdat de doel-sectie weer gemount is.
  useEffect(() => {
    if (!pendingScrollRef) return;
    const raf = requestAnimationFrame(() => {
      pendingScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollRef(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab, expandedCardKeys, pendingScrollRef]);
  const dashboardCards = useMemo(() => {
    if (transactions.length === 0) return [];
    const yearProgress = activeYear ? yearlyProgress[activeYear] : null;
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
        // v246 — de kleur/melding is nu gebaseerd op duplicatePendingBreakdown.onzeker (echt zelf te
        // beoordelen) i.p.v. pendingDuplicateCount als geheel: zodra alle gevonden duplicaten met
        // zekerheid zijn bevestigd op basis van het lopende saldo, is er niets meer te BEOORDELEN (wel
        // nog te verwijderen), dus geen amber "aandacht" meer nodig.
        key: "duplicates",
        title: "Duplicaten",
        icon: <Copy className="h-3.5 w-3.5" />,
        value: pendingDuplicateCount,
        subtitle:
          duplicatePendingBreakdown.onzeker > 0
            ? `${duplicatePendingBreakdown.onzeker} zelf te beoordelen`
            : pendingDuplicateCount > 0
            ? "alle bevestigd — nog te verwijderen"
            : "Geen gevonden",
        tone: duplicatePendingBreakdown.onzeker > 0 ? "attention" : "ok",
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
            // v254 — herzien op expliciet verzoek: deze kaart heette "Aangifte {jaar} X%", wat
            // suggereerde dat X% = hoe ver de aangifte zelf gevorderd is. Nu drie losse regels die
            // niet met elkaar verrekend worden: Dossiercontrole (zuiver administratief — is alles
            // ingedeeld/beoordeeld/bekend?), Indicatieve aangifte (hoeveel aannames zitten er nog in
            // de berekening?) en Werkelijke aangifte (is de aangifte zelf al geregistreerd als
            // gedaan?). Een dossier kan dus "Dossiercontrole: Compleet" tonen terwijl "Werkelijke
            // aangifte: Niet geregistreerd" blijft staan — dat is precies het punt.
            {
              key: "yearStatus",
              title: `Dossierstatus ${activeYear}`,
              icon: <CardIcon name="list" />,
              lines: [
                {
                  label: "Dossiercontrole",
                  value: !yearProgress || yearProgress.openPunten === 0 ? "🟢 Compleet" : `🟠 ${yearProgress.openPunten} ${yearProgress.openPunten === 1 ? "punt" : "punten"}`,
                },
                {
                  label: "Indicatieve aangifte",
                  value: !yearProgress || yearProgress.aannamesCount === 0 ? "🟢 Geen aannames" : `🟠 ${yearProgress.aannamesCount} ${yearProgress.aannamesCount === 1 ? "aanname" : "aannames"}${yearProgress.aannamesLabels?.length > 0 && yearProgress.aannamesLabels.length <= 2 ? ` (${yearProgress.aannamesLabels.join(", ")})` : ""}`,
                },
                {
                  // v285 — voorheen maar 3 vaste standen (Niet/Deels/Gedaan), ongeacht hoeveel van de
                  // aangiftes al waren afgevinkt — nu een concreet aantal ("X van N gedaan") met een
                  // kleur die per stap oploopt van rood (nog niks) naar groen (alles gedaan), zodat 1
                  // van de 6 gedaan er zichtbaar anders uitziet dan 5 van de 6. N is het werkelijke
                  // aantal verschuldigde aangiftes dit jaar (BTW-kwartalen die dit jaar transacties
                  // hadden, plus IB+Zvw voor zzp/eenmanszaak of Vpb voor een BV — zie yearlyProgress).
                  label: "Werkelijke aangifte",
                  value: (() => {
                    const done = yearProgress?.werkelijkAangifteDone ?? 0;
                    const total = yearProgress?.werkelijkAangifteTotal ?? 0;
                    if (total === 0) return "⚪ Niet van toepassing";
                    const frac = done / total;
                    const dot = frac === 0 ? "🔴" : frac < 0.5 ? "🟠" : frac < 1 ? "🟡" : "🟢";
                    return `${dot} ${done} van ${total} gedaan`;
                  })(),
                },
              ],
              subtitle: yearProgress?.gatDitJaar
                ? "Gat in bestandscontinuïteit (verschil ≥ €1000)"
                : yearProgress?.onzekerDitJaar > 0
                ? `${yearProgress.onzekerDitJaar} onzeker dit jaar`
                : yearProgress?.geelDitJaar
                ? "Saldo tussen bestanden sluit niet helemaal aan (verschil €500–€999)"
                : null,
              tone: yearProgress?.status === "groen" ? "ok" : yearProgress?.status === "rood" ? "attention" : "neutral",
              hint: "Naar de aangifte-checklist voor dit jaar",
              onClick: () => jumpToSection(checklistSectionRef),
            },
            {
              // v246 — deze kaart keek voorheen alleen naar de winst zelf (pas amber bij een verlies).
              // Daardoor kon een jaar met prima winst hier "neutraal" ogen, terwijl het Meerjarenoverzicht
              // verderop (ingeklapt, dus niet altijd zichtbaar) al een Tekort/Over-waarschuwing toont —
              // winst die niet volstaat naast privé-uitgaven + belasting. Nu neemt deze kaart dat signaal
              // (businessAdvies, dezelfde berekening als de rode balk in het Meerjarenoverzicht) mee, zodat
              // je het niet kunt missen zonder dat blok open te klappen. Een echt verlies (winst < 0) blijft
              // het meest ernstige signaal (rood/"risk"); een tekort ondanks positieve winst is amber.
              // v254 — de kaart toonde voorheen alleen de winst zelf als groot bedrag, met de Tekort/Over-
              // duiding puur in de subtitel-tekst. Dat liet de indruk ontstaan dat een "tekort" een fiscaal
              // verlies zou zijn. Nu twee losse, duidelijk gelabelde regels (zelfde "lines"-opzet als de
              // IB & Zvw-kaart hieronder): het fiscale resultaat (winst uit onderneming) los van het
              // privé/kasstroomsignaal (Tekort/Over — dekt de winst de privé-uitgaven + belasting?).
              key: "result",
              title: `Resultaat ${activeYear}`,
              icon: <CardIcon name="euro" />,
              lines: [
                { label: "Fiscaal resultaat", value: yearlySummary ? `Winst ${eur(yearlySummary.winst)}` : "—" },
                {
                  label: "Privé/kasstroomsignaal",
                  value:
                    businessAdvies == null
                      ? "—"
                      : businessAdvies.niveau === "negatief"
                      ? `Indicatief tekort ${eur(Math.abs(businessAdvies.verschil))}`
                      : `Indicatief over ${eur(businessAdvies.verschil)}`,
                },
              ],
              subtitle:
                yearlySummary && yearlySummary.winst < 0
                  ? "Fiscaal verlies"
                  : businessAdvies?.niveau === "negatief"
                  ? "Winst, maar tekort t.o.v. privé-uitgaven + belasting — geen fiscaal verlies"
                  : "Winst (indicatief)",
              tone:
                yearlySummary && yearlySummary.winst < 0
                  ? "risk"
                  : businessAdvies?.niveau === "negatief"
                  ? "attention"
                  : "ok",
              hint: "Naar het jaaroverzicht",
              onClick: () => setShowMultiYearModal(true),
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
                    icon: <CardIcon name="calc" />,
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
                    icon: <CardIcon name="minus" />,
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
              icon: <CardIcon name="doc" />,
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
                  ? `🟠 Nog geen gegevens ingevuld`
                  : `🟠 ${incompleteLoansCount} van ${loanSummary.length} heeft nog ontbrekende gegevens`,
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
              actionLabel: incompleteLoansCount > 0 ? "Controleren" : null,
            },
            {
              key: "leases",
              title: "Lease",
              icon: <CardIcon name="car" />,
              value: leaseSummary.length,
              subtitle:
                incompleteLeasesCount > 0
                  ? `🟠 ${incompleteLeasesCount} ${incompleteLeasesCount === 1 ? "contract heeft" : "contracten hebben"} nog ontbrekende gegevens`
                  : leaseSummary.length > 0
                  ? "Alle gegevens compleet"
                  : "Geen gevonden",
              // v234-fix: zelfde correctie als bij "Leningen" hierboven.
              tone: incompleteLeasesCount > 0 ? "attention" : leaseSummary.length > 0 ? "ok" : "neutral",
              hint: "Naar de lease-sectie",
              onClick: () => jumpToSection(leasesSectionRef),
              actionLabel: incompleteLeasesCount > 0 ? "Controleren" : null,
            },
            {
              // Toonde eerst alleen een getal ("X nog niet aangegeven/betaald") — nu per kwartaal
              // meteen het BTW-saldo (verschuldigde BTW min voorbelasting, zelfde berekening als de
              // "BTW-saldo per kwartaal"-regel in het aangiftevoorstel), zodat je in één oogopslag
              // ziet om welke bedragen het gaat i.p.v. alleen dát er nog iets openstaat. Een kwartaal
              // zonder transacties (nog) telt hier als € 0,00, niet als ontbrekend.
              key: "btwQuarters",
              title: `BTW-kwartalen ${activeYear}`,
              icon: <CardIcon name="receipt" />,
              // v284 — rechtsboven in de kop van deze kaart nu ook het jaartotaal (som van de 4
              // kwartaalsaldo's), eveneens met expliciet "te betalen"/"te ontvangen" — zelfde
              // dubbelzinnigheid-fix als bij de losse Q1-Q4-regels hieronder, maar dan voor het jaar
              // als geheel, zodat je dat in één oogopslag ziet zonder de 4 regels bij elkaar op te
              // hoeven tellen.
              value: (() => {
                const totaal = [1, 2, 3, 4].reduce((a, kwartaal) => {
                  const q = quarterlyBtwData.find((item) => item.kwartaal === kwartaal);
                  return a + (q ? q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting : 0);
                }, 0);
                return `${eur(Math.abs(totaal))} ${totaal < 0 ? "te ontvangen" : "te betalen"}`;
              })(),
              lines: [1, 2, 3, 4].map((kwartaal) => {
                const q = quarterlyBtwData.find((item) => item.kwartaal === kwartaal);
                const saldo = q ? q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting : 0;
                // v283 — voorheen stond er bij een positief saldo alleen het bedrag (zonder "te
                // betalen"), en bij een negatief saldo "terug" — op verzoek nu bij élk kwartaal
                // expliciet "te betalen" of "te ontvangen" erachter, zodat het nooit dubbelzinnig is.
                return {
                  label: `Q${kwartaal}`,
                  value: `${eur(Math.abs(saldo))} ${saldo < 0 ? "te ontvangen" : "te betalen"}`,
                };
              }),
              subtitle: quartersOpenCount > 0 ? "nog niet aangegeven/betaald" : "Alle kwartalen bijgewerkt",
              tone: quartersOpenCount > 0 ? "attention" : "ok",
              hint: "Naar het BTW-kwartaaloverzicht",
              onClick: () => setShowQuarterlyBtwModal(true),
            },
            // v240 — vervangt de "Factuurperiode"-kaart die hier stond (die is verhuisd naar het
            // Controleren-tabblad) — zelfde stijl als "BTW-kwartalen" hierboven: een getal per
            // openstaand item (hier: IB/IH en Zvw voor {activeYear}, max. 2), i.p.v. een bedrag.
            // v285 — deze kaart ging er tot nu toe altijd van uit dat IB/Zvw bestaan, ook voor een BV
            // (die kent geen IB/Zvw, alleen Vpb) — daardoor stond dit voor een BV eeuwig op "1 open"
            // (Zvw wordt nooit afgevinkt) terwijl er niets fout was. Nu voor een BV de Vpb-aangifte
            // i.p.v. IB/Zvw.
            rechtsvorm === "bv"
              ? {
                  key: "ibZvwAangiften",
                  title: `Vpb-aangifte ${activeYear}`,
                  icon: <CardIcon name="mail" />,
                  value: vpbStatus[activeYear]?.gedaan ? 0 : 1,
                  subtitle: vpbStatus[activeYear]?.gedaan ? "Afgehandeld" : "nog niet afgevinkt als gedaan",
                  tone: vpbStatus[activeYear]?.gedaan ? "ok" : "attention",
                  hint: "Naar de aangifte-checklist voor dit jaar",
                  onClick: () => jumpToSection(checklistSectionRef),
                }
              : {
                  key: "ibZvwAangiften",
                  title: `IB/Zvw aangiften ${activeYear}`,
                  icon: <CardIcon name="mail" />,
                  value: (ibStatus[activeYear]?.gedaan ? 0 : 1) + (zvwStatus[activeYear]?.gedaan ? 0 : 1),
                  subtitle: ibStatus[activeYear]?.gedaan && zvwStatus[activeYear]?.gedaan ? "Beide afgehandeld" : "nog niet afgevinkt als gedaan",
                  tone: ibStatus[activeYear]?.gedaan && zvwStatus[activeYear]?.gedaan ? "ok" : "attention",
                  hint: "Naar de aangifte-checklist voor dit jaar",
                  onClick: () => jumpToSection(checklistSectionRef),
                },
            // v286 — op verzoek: nergens was in één oogopslag te zien hoeveel bestanden zakelijk/
            // privé geladen zijn en of die onderling matchen (overboekingen zakelijk ↔ privé) — deze
            // kaart hergebruikt dezelfde aansluitControleInfo als de "Controle zakelijk ↔ privé"-kaart
            // op Controleren (geen tweede berekening), plus een simpele telling uit accountTypeByFile.
            {
              key: "bestandenOverzicht",
              title: "Bestanden geladen",
              icon: <CardIcon name="folder" />,
              lines: [
                { label: "Zakelijk", value: `${Object.values(accountTypeByFile).filter((t) => t === "Zakelijk").length}x` },
                { label: "Privé", value: `${Object.values(accountTypeByFile).filter((t) => t === "Prive").length}x` },
              ],
              subtitle: aansluitControleInfo.heeftData
                ? aansluitControleInfo.subtitle
                : `Geen overboekingen zakelijk ↔ privé gevonden in ${activeYear}.`,
              tone: aansluitControleInfo.heeftData ? aansluitControleInfo.tone : "neutral",
              hint: "Naar de aansluiting & detailtabellen",
              onClick: () => jumpToSection(detailsSectionRef),
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
    duplicatePendingBreakdown,
    activeYear,
    yearlyProgress,
    yearlySummary,
    businessAdvies,
    dashboardAangifteIndicatie,
    ibStatus,
    zvwStatus,
    vpbStatus,
    accountTypeByFile,
    aansluitControleInfo,
    loanSummary,
    loanDetails,
    incompleteLoansCount,
    leaseSummary,
    leaseDetails,
    confirmedLeaseTypeKeys,
    incompleteLeasesCount,
    checklistData,
    rechtsvorm,
    bvSignalering,
    korRegeling,
    btwVerlegd,
    quarterlyBtwData,
  ]);

  // v240 — hoeveel geladen bestanden een saldo-afwijking hebben (per bestand zelf, via
  // checkBalanceConsistency) of een echt aansluitgat hebben met het volgende bestand van dezelfde
  // rekening (computeFileContinuity). Gebruikt door de "Import controle"-kaart in het mini-
  // dashboard op het Controleren-tabblad hieronder. v260 — de twee soorten afwijking hebben elk hun
  // eigen, losstaande drempel: de saldocontrole bínnen één bestand blijft bij €100 (ongewijzigd,
  // zie INTRA_FILE_BALANCE_THRESHOLD), de aansluiting tússen bestanden gebruikt nu de rode grens
  // van de drie niveaus (€1000, zie classifyContinuityGap) — een verschil van €500–€999 daar is nu
  // "geel" (de moeite waard om te bekijken) en telt hier bewust niet meer als een telbaar probleem.
  const controlerenImportProblemCount = useMemo(() => {
    const balansProblemen = importDiagnostics.filter(
      (d) => d.balanceCheck && !d.balanceCheck.ok && Math.abs(d.balanceCheck.diff) >= INTRA_FILE_BALANCE_THRESHOLD
    ).length;
    const aansluitProblemen = fileContinuity.filter((c) => !c.ok && classifyContinuityGap(c.diff) === "rood").length;
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
        openCount: controlerenImportProblemCount,
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
        openCount: confidenceSummary.needsReview,
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
        // Fase 2 — deze stap (IncomeReviewStep, "van wie komt dit inkomen") had nog geen eigen
        // kaart/badge, terwijl het net als de andere controlestappen hier een open punt is dat
        // afgehandeld moet worden — hoort inhoudelijk (net als personReview) bij "Herkomst van
        // geld" uit het bouwvoorstel.
        key: "incomeReview",
        title: "Herkomst van inkomsten",
        icon: <Users className="h-3.5 w-3.5" />,
        value: pendingIncomeReview.length,
        openCount: pendingIncomeReview.length,
        subtitle: pendingIncomeReview.length > 0 ? "nog te bepalen (zakelijk/privé)" : "Niets openstaand",
        tone: pendingIncomeReview.length > 0 ? "attention" : "ok",
        hint: "Openstaande herkomst-van-inkomsten bekijken",
        onClick: () => jumpToSection(incomeReviewSectionRef),
      },
      {
        key: "personReview",
        title: "Overboekingen aan personen",
        icon: <Users className="h-3.5 w-3.5" />,
        value: pendingPersonReview.length,
        openCount: pendingPersonReview.length,
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
        openCount: pendingOverigReview.length,
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
        // Open punt = wat je zelf nog moet beoordelen (de toon van de kaart volgt dezelfde regel);
        // "alle bevestigd — nog te verwijderen" is een opruimactie, geen open controlepunt.
        openCount: duplicatePendingBreakdown.onzeker,
        subtitle:
          duplicatePendingBreakdown.onzeker > 0
            ? `${duplicatePendingBreakdown.onzeker} zelf te beoordelen`
            : pendingDuplicateCount > 0
            ? "alle bevestigd — nog te verwijderen"
            : "Geen gevonden",
        tone: duplicatePendingBreakdown.onzeker > 0 ? "attention" : "ok",
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
        openCount: periodeMismatches.length,
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
    pendingIncomeReview.length,
    pendingPersonReview.length,
    pendingOverigReview.length,
    pendingDuplicateCount,
    duplicatePendingBreakdown,
    periodeMismatches.length,
  ]);

  // v261 — telt, over alle (niet-vaste-tarief) subtype-categorieën, hoeveel er op 21%/9%/0% staan —
  // gebruikt door de "BTW-instellingen"-kaart hieronder. Losstaand van het actieve jaar: dit zijn
  // dossierbrede instellingen, geen jaargebonden aannames.
  const btwRateCounts = useMemo(() => {
    let c21 = 0, c9 = 0, c0 = 0;
    for (const main of MAIN_CATEGORY_ORDER) {
      for (const c of subtypesForMainCategory(main)) {
        if (FIXED_BTW_RATE_CATEGORIES[c] != null) continue;
        const rate = categoryBtwRates[c] ?? 21;
        if (rate === 21) c21++;
        else if (rate === 9) c9++;
        else c0++;
      }
    }
    return { c21, c9, c0 };
  }, [categoryBtwRates]);

  // v246 — mini-dashboard voor tabblad "Instellingen", zelfde soort kaarten als op Overzicht/
  // Controleren (zie dashboardCards/controlerenDashboardCards hierboven) maar dan precies de
  // instellingen-items die een compleet/onvolledig-status hebben: Leningen, Lease en Activa
  // (rentepercentages/afschrijving nodig voor een kloppende winstberekening), Persoonlijke aannames
  // (urencriterium voor de zelfstandigenaftrek — bepaalt of die aftrek uberhaupt van toepassing is)
  // en BTW-instellingen (KOR/btw-verlegd, dezelfde kaart als al op Overzicht stond — hier ook, want
  // de daadwerkelijke instelling staat nu fysiek op dit tabblad). Categorie-/tegenpartijregels en de
  // andere pure configuratielijsten (geen vaste lijst met wel/niet-compleet) staan er bewust niet
  // bij, net zoals "Geladen files" ook geen eigen kaart kreeg op het Controleren-dashboard.
  const instellingenDashboardCards = useMemo(() => {
    if (transactions.length === 0) return [];
    const zelfstandigenaftrekStatusDitJaar = activeYear
      ? resolveZelfstandigenaftrekStatusForYear(zelfstandigenaftrekStatus, activeYear, zaLegacyJaDefault)
      : null;
    return [
      {
        key: "loans",
        title: "Leningen",
        icon: <CardIcon name="doc" />,
        value: loanSummary.length,
        openCount: incompleteLoansCount,
        subtitle:
          loanSummary.length === 0
            ? "Geen gevonden"
            : incompleteLoansCount === 0
            ? "Alle gegevens compleet"
            : incompleteLoansCount === loanSummary.length
            ? `🟠 Nog geen gegevens ingevuld`
            : `🟠 ${incompleteLoansCount} van ${loanSummary.length} heeft nog ontbrekende gegevens`,
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
        actionLabel: incompleteLoansCount > 0 ? "Controleren" : null,
      },
      {
        key: "leases",
        title: "Lease",
        icon: <CardIcon name="car" />,
        value: leaseSummary.length,
        openCount: incompleteLeasesCount,
        subtitle:
          incompleteLeasesCount > 0
            ? `🟠 ${incompleteLeasesCount} ${incompleteLeasesCount === 1 ? "contract heeft" : "contracten hebben"} nog ontbrekende gegevens`
            : leaseSummary.length > 0
            ? "Alle gegevens compleet"
            : "Geen gevonden",
        tone: incompleteLeasesCount > 0 ? "attention" : leaseSummary.length > 0 ? "ok" : "neutral",
        hint: "Naar de lease-sectie",
        onClick: () => jumpToSection(leasesSectionRef),
        actionLabel: incompleteLeasesCount > 0 ? "Controleren" : null,
      },
      {
        key: "activa",
        title: "Activa (afschrijving)",
        icon: <CardIcon name="tag" />,
        value: activaSummary.length,
        openCount: incompleteActivaCount,
        subtitle:
          activaSummary.length === 0
            ? "Geen gevonden"
            : incompleteActivaCount === 0
            ? "Alle gegevens compleet"
            : incompleteActivaCount === activaSummary.length
            ? `🟠 Nog geen gegevens ingevuld`
            : `🟠 ${incompleteActivaCount} van ${activaSummary.length} heeft nog ontbrekende gegevens`,
        tone:
          activaSummary.length === 0
            ? "neutral"
            : incompleteActivaCount === 0
            ? "ok"
            : incompleteActivaCount === activaSummary.length
            ? "risk"
            : "attention",
        hint: "Naar de activa-sectie",
        onClick: () => jumpToSection(activaSectionRef),
        actionLabel: incompleteActivaCount > 0 ? "Controleren" : null,
      },
      // v261 — was alleen het urencriterium (1 item, en alleen zichtbaar/onzichtbaar i.p.v. duidelijk
      // "wel/niet opgegeven"); nu alle 3 persoonlijke-aannames-items die op dit jaar van toepassing
      // zijn, elk met een eigen 🟢/🟠/⚪-status: urencriterium (zelfstandigenaftrek), startersaftrek
      // en auto (zakelijk/privé gebruik) — zelfde 3 items als in het "Persoonlijke aannames"-paneel
      // zelf (PersoonlijkeAannamesPanel.jsx). Gedeelde huur staat hier bewust niet (meer) bij: dat
      // hoort bij "Percentage zakelijk per categorie", niet bij deze persoonlijke aannames.
      ...(rechtsvorm !== "bv" && activeYear
        ? (() => {
            const autoStatusDitJaar = autoStatus?.[activeYear];
            const autoLabel =
              autoStatusDitJaar === "zaak"
                ? "Op de zaak"
                : autoStatusDitJaar === "prive"
                ? "Privé zakelijk gebruikt"
                : autoStatusDitJaar === "beide"
                ? "Beide"
                : autoStatusDitJaar === "geen"
                ? "Geen auto"
                : null;
            // Startersaftrek heeft geen "onbekend"-status: leeg/niet ingevuld betekent gewoon "Nee /
            // niet van toepassing" (zie PersoonlijkeAannamesPanel.jsx) — telt daarom niet mee als
            // "nog niet opgegeven".
            const startersaftrekAan = startersaftrekStatus?.[activeYear] === "ja";
            // v309 (V31) — de deels-zakelijke percentages (huur, energie-water, gemeentelijke kosten) tellen al
            // mee als aanname in de kop; nu staan ze ook als regel in deze kaart (alleen als dit jaar van toepassing).
            const gedeeldeLijnen = [
              { label: "% zakelijk huur", gedeelde: gedeeldeHuurForActiveYear, status: huurZakelijkPercentageStatus?.[activeYear] },
              { label: "% zakelijk energie-water", gedeelde: gedeeldeEnergieForActiveYear, status: energieZakelijkPercentageStatus?.[activeYear] },
              { label: "% zakelijk gemeentelijke kosten", gedeelde: gedeeldeGemeentelijkeKostenForActiveYear, status: gemeentelijkeKostenZakelijkPercentageStatus?.[activeYear] },
            ].filter((l) => l.gedeelde);
            const missing =
              (zelfstandigenaftrekStatusDitJaar === "onbekend" ? 1 : 0) +
              (autoLabel == null ? 1 : 0) +
              gedeeldeLijnen.filter((l) => l.status == null).length;
            return [
              {
                key: "aannames",
                title: `Persoonlijke aannames ${activeYear}`,
                openCount: missing,
                icon: <CardIcon name="user" />,
                lines: [
                  {
                    label: "Urencriterium",
                    value:
                      zelfstandigenaftrekStatusDitJaar === "onbekend"
                        ? "🟠 Niet opgegeven"
                        : zelfstandigenaftrekStatusDitJaar === "ja"
                        ? "🟢 Ja"
                        : "🟢 Nee",
                  },
                  { label: "Startersaftrek", value: startersaftrekAan ? "🟢 Ja" : "⚪ Nee" },
                  { label: "Auto", value: autoLabel ? `🟢 ${autoLabel}` : "🟠 Niet opgegeven" },
                  ...gedeeldeLijnen.map((l) => ({ label: l.label, value: l.status == null ? "🟠 Niet opgegeven" : `🟢 ${l.status}%` })),
                ],
                subtitle: missing === 0 ? "Alles opgegeven" : `${missing} ${missing === 1 ? "item" : "items"} nog niet opgegeven`,
                tone: missing === 0 ? "ok" : "attention",
                hint: "Naar de persoonlijke aannames voor dit jaar",
                onClick: () => jumpToSection(aannamesSectionRef),
                actionLabel: missing > 0 ? "Controleren" : null,
              },
            ];
          })()
        : []),
      // v261 — nieuw, informatief (geen "moet nog ingevuld worden"-toon: leeg laten = bewust de
      // standaard gebruiken, zie CategoryPercentagePanel.jsx) — laat in één oogopslag zien hoeveel
      // van de dit jaar relevante categorieën een expliciet percentage zakelijk hebben gekregen.
      ...(transactions.length > 0 && activeYear
        ? (() => {
            const categorieenSplitsbaar = Object.keys(categorieTotalenActiveYear || {});
            const percentageAangepast = categorieenSplitsbaar.filter((c) => categoryZakelijkPercentage?.[c]?.[activeYear] != null).length;
            return [
              {
                key: "categoryPercentages",
                title: "Percentage zakelijk/privé",
                icon: <CardIcon name="divide" />,
                value: `${percentageAangepast}/${categorieenSplitsbaar.length}`,
                subtitle:
                  categorieenSplitsbaar.length === 0
                    ? "Geen splitsbare categorieën dit jaar"
                    : percentageAangepast === 0
                    ? "Nog niets opgegeven — standaard percentages gebruikt"
                    : percentageAangepast === categorieenSplitsbaar.length
                    ? "Voor alle categorieën opgegeven"
                    : `Voor ${percentageAangepast} van ${categorieenSplitsbaar.length} categorieën opgegeven`,
                tone: "neutral",
                hint: "Naar percentage zakelijk per categorie",
                onClick: () => jumpToSection(categoryPercentageSectionRef),
              },
            ];
          })()
        : []),
      // v261 — was alleen zichtbaar zolang KOR/BTW-verlegd nog niet beantwoord waren ("!"-kaart);
      // blijft nu ook daarna staan, met de gevraagde 21%/9%/0%-verdeling van de categorieën, zodat
      // je in één oogopslag kunt zien of de BTW-instellingen er redelijk uitzien.
      ...(transactions.length > 0 && !korRegeling
        ? [
            korRegeling === null || btwVerlegd === null
              ? {
                  key: "btwSettings",
                  title: "BTW-instellingen",
                  icon: <Settings className="h-3.5 w-3.5" />,
                  value: "!",
                  openCount: (korRegeling === null ? 1 : 0) + (btwVerlegd === null ? 1 : 0),
                  subtitle: korRegeling === null ? "KOR-vraag nog niet beantwoord" : "BTW-verlegd-vraag nog niet beantwoord",
                  tone: "attention",
                  hint: "Naar de BTW-instellingen",
                  onClick: () => jumpToSection(btwSettingsSectionRef),
                  actionLabel: "Beantwoorden",
                }
              : {
                  key: "btwSettings",
                  title: "BTW-instellingen",
                  icon: <Settings className="h-3.5 w-3.5" />,
                  lines: [
                    { label: "21%", value: String(btwRateCounts?.c21 ?? 0) },
                    { label: "9%", value: String(btwRateCounts?.c9 ?? 0) },
                    { label: "0%", value: String(btwRateCounts?.c0 ?? 0) },
                  ],
                  subtitle: "Categorieën per BTW-tarief",
                  tone: "neutral",
                  hint: "Naar de BTW-instellingen",
                  onClick: () => jumpToSection(btwSettingsSectionRef),
                },
          ]
        : []),
      // v251 — "Zakelijke tegenpartijen (inkomsten)" en "Zakelijke inkoop/uitgaven (leveranciers)"
      // hadden nog geen eigen kaart — puur informatief (geen compleet/onvolledig-status, dus neutrale
      // kleur), maar wel handig als snelkoppeling. Een klik doet hetzelfde als het bestaande
      // uitklap-knopje in KeywordManager zelf (isExpanded/onToggleExpand): de betreffende lijst gaat
      // naar de volle-breedte "uitklap box"-weergave (de andere lijst klapt dan vanzelf weg, zie de
      // grid/!expandedBusiness...List-conditie hierboven bij incomeRatesSectionRef).
      ...(parsedFiles.length > 0
        ? [
            {
              key: "businessIncomeEntries",
              title: "Zakelijke tegenpartijen",
              icon: <CardIcon name="handshake" />,
              value: businessIncomeEntries.length,
              subtitle: businessIncomeEntries.length === 1 ? "klant herkend" : "klanten herkend",
              tone: "neutral",
              hint: "Zakelijke tegenpartijen (inkomsten) bekijken",
              onClick: () => {
                setExpandedBusinessIncomeList(true);
                jumpToSection(incomeRatesSectionRef);
              },
            },
            {
              key: "businessExpenseEntries",
              title: "Zakelijke inkoop/uitgaven",
              icon: <CardIcon name="package" />,
              value: businessExpenseEntries.length,
              subtitle: businessExpenseEntries.length === 1 ? "leverancier herkend" : "leveranciers herkend",
              tone: "neutral",
              hint: "Zakelijke inkoop/uitgaven (leveranciers) bekijken",
              onClick: () => {
                setExpandedBusinessExpenseList(true);
                jumpToSection(incomeRatesSectionRef);
              },
            },
          ]
        : []),
    ];
  }, [
    transactions.length,
    parsedFiles.length,
    loanSummary,
    incompleteLoansCount,
    leaseSummary,
    incompleteLeasesCount,
    activaSummary,
    incompleteActivaCount,
    gedeeldeHuurForActiveYear,
    gedeeldeEnergieForActiveYear,
    gedeeldeGemeentelijkeKostenForActiveYear,
    huurZakelijkPercentageStatus,
    energieZakelijkPercentageStatus,
    gemeentelijkeKostenZakelijkPercentageStatus,
    rechtsvorm,
    activeYear,
    zelfstandigenaftrekStatus,
    zaLegacyJaDefault,
    korRegeling,
    btwVerlegd,
    businessIncomeEntries,
    businessExpenseEntries,
    autoStatus,
    startersaftrekStatus,
    categorieTotalenActiveYear,
    categoryZakelijkPercentage,
    btwRateCounts,
  ]);

  // Fase 2 (bouwvoorstel Stijl F) — groepeert de bestaande controlerenDashboardCards/
  // instellingenDashboardCards (dezelfde berekeningen, geen nieuwe) in precies de 5 categorieën uit
  // het bouwvoorstel, weergegeven als SectionCard (dezelfde kaartstijl als Overzicht, fase 1)
  // i.p.v. de oudere DashboardOverview-tegel. Een paar categorieën ("Categorieën",
  // "Aansluiting & detail" op Controleren; "Automatisering" op Instellingen) hadden nog geen eigen
  // kaart/telling — die krijgen hier een informatieve kaart (geen nieuw berekend aantal) die naar de
  // bestaande sectie springt. De onderliggende panelen/componenten en hun logica blijven ongewijzigd.
  const controlerenCardsByKey = useMemo(
    () => Object.fromEntries(controlerenDashboardCards.map((c) => [c.key, c])),
    [controlerenDashboardCards]
  );
  const instellingenCardsByKey = useMemo(
    () => Object.fromEntries(instellingenDashboardCards.map((c) => [c.key, c])),
    [instellingenDashboardCards]
  );
  // Groepeert een aantal bestaande kaarten (by key) tot 1 SectionCard: elk lid wordt 1 regel
  // (🟢/🟠/🔴 + de bestaande waarde), de "ergste" tone van de leden bepaalt de tone van de groep, en
  // een klik springt naar het lid dat aandacht nodig heeft (of anders het eerste lid).
  const groupCards = (membersByKey, memberKeys, extra) => {
    const members = memberKeys.map((k) => membersByKey[k]).filter(Boolean);
    if (members.length === 0) return extra || null;
    const toneRank = { risk: 3, attention: 2, neutral: 1, ok: 0 };
    const worstTone = members.reduce((acc, m) => (toneRank[m.tone] > toneRank[acc] ? m.tone : acc), "ok");
    const primary = members.find((m) => m.tone === "risk") || members.find((m) => m.tone === "attention") || members[0];
    const lines = members.flatMap((m) =>
      m.lines
        ? m.lines
        : [
            {
              label: m.title,
              value: `${m.tone === "ok" ? "🟢 " : m.tone === "attention" ? "🟠 " : m.tone === "risk" ? "🔴 " : ""}${m.value ?? m.subtitle ?? ""}`,
            },
          ]
    );
    return { tone: worstTone, lines, onClick: primary.onClick, hint: primary.hint };
  };
  // Fase 3 — maakt een kaart "uitklapbaar": i.p.v. naar de sectie te springen, klapt de kaart zelf
  // open en toont dan (via expandedContent) een live kopie van het volledige onderliggende paneel,
  // met dezelfde props/state als de sectie verderop op de pagina — geen nieuwe berekening, alleen
  // hetzelfde paneel ook hier tonen. Alleen toegepast op kaarten die 1-op-1 uit kant-en-klare,
  // zelfstandige paneelcomponenten bestaan (geen met andere ui-state verweven inline secties) — zie
  // de toelichting bij de kaarten hieronder voor welke dat (nog) niet zijn.
  const withExpand = (card, key, expandedContent) => {
    if (!card) return null;
    const isOpen = !!expandedCardKeys[key];
    // v283 — "Uitklappen ↓" hernoemd naar hetzelfde "Alle …… bekijken"-patroon als de RollupCard-
    // knoppen op tabblad "Overzicht" ("Alle controles bekijken →" e.d.), op verzoek om dit
    // consistent te maken. "Inklappen ↑" (uitgeklapte stand) blijft ongewijzigd — dat werd niet
    // gevraagd.
    return {
      ...card,
      expandable: true,
      expanded: isOpen,
      expandedContent,
      onClick: () => toggleCardExpand(key),
      actionLabel: isOpen ? "Inklappen ↑" : `Alle ${card.title} bekijken`,
    };
  };
  const controlerenCardGroups = useMemo(() => {
    if (transactions.length === 0) return [];
    const g = (key, title, icon, memberKeys, extra) => {
      const built = groupCards(controlerenCardsByKey, memberKeys, extra);
      if (!built) return null;
      return { key, title, icon, tone: built.tone, lines: built.lines, onClick: built.onClick, hint: built.hint, actionLabel: "Bekijken" };
    };
    return [
      withExpand(
        g("importKwaliteit", "Import & kwaliteit", <FileSpreadsheet className="h-3.5 w-3.5" />, ["importControle", "confidence"]),
        "importKwaliteit",
        <div className="space-y-3">
          <div ref={importControleSectionRef}>
            <ImportControlPanel diagnostics={importDiagnostics} onReviewFile={setReviewFileModal} continuity={fileContinuity} onRemoveFile={removeFile} accountTypeByFile={accountTypeByFile} />
          </div>
          <div ref={confidenceSectionRef}>
            <ClassificationConfidencePanel
              classified={classified}
              onOpenHelp={setHelpPopupChapter}
              onConfirmCorrect={confirmClassificationCorrect}
              onOpenLevel={setOpenConfidenceLevel}
            />
          </div>
        </div>
      ),
      withExpand(
        g("herkomstVanGeld", "Herkomst van geld", <Users className="h-3.5 w-3.5" />, ["incomeReview", "personReview"]),
        "herkomstVanGeld",
        <HerkomstVanGeldPanel
          incomeReviewRef={incomeReviewSectionRef}
          pendingIncomeReview={pendingIncomeReview}
          incomeSummary={incomeSummary}
          incomeSearch={incomeSearch}
          onIncomeSearch={setIncomeSearch}
          onMarkIncomeSource={markIncomeSource}
          personReviewRef={personReviewSectionRef}
          personSummary={personSummary}
          pendingPersonReview={pendingPersonReview}
          showPersonReview={showPersonReview}
          onToggleShowPersonReview={setShowPersonReview}
          personSearch={personSearch}
          onPersonSearch={setPersonSearch}
          onMarkPersonSource={markPersonSource}
          onConfirmPersonAsIs={confirmPersonAsIs}
        />
      ),
      withExpand(
        g("opschonen", "Opschonen", <HelpCircle className="h-3.5 w-3.5" />, ["overigReview", "duplicates", "periode"]),
        "opschonen",
        <OpschonenPanel
          overigReviewRef={overigReviewSectionRef}
          overigSummary={overigSummary}
          pendingOverigReview={pendingOverigReview}
          showOverigReview={showOverigReview}
          onToggleShowOverigReview={setShowOverigReview}
          overigSearch={overigSearch}
          onOverigSearch={setOverigSearch}
          onMarkOverigItem={markOverigItem}
          onConfirmOverigAsIs={confirmOverigAsIs}
          onBulkMarkOverigAsPriveOpname={bulkMarkOverigAsPriveOpname}
          duplicatesRef={duplicatesSectionRef}
          duplicateGroups={duplicateGroups}
          confirmedSeparateGroups={confirmedSeparateGroups}
          duplicatePendingBreakdown={duplicatePendingBreakdown}
          showDuplicateDetails={showDuplicateDetails}
          onToggleShowDuplicateDetails={setShowDuplicateDetails}
          pendingDuplicateCount={pendingDuplicateCount}
          onRemoveDuplicates={removeDuplicates}
          onDismissDuplicateNotice={() => setDismissedDuplicateNotice(true)}
          isDuplicateGroupRemoved={isDuplicateGroupRemoved}
          onShowDuplicateDetailGroup={setDuplicateDetailGroup}
          onRestoreDuplicateGroup={restoreDuplicateGroup}
          onRemoveDuplicateGroup={removeDuplicateGroup}
          showConfirmedSeparateDuplicates={showConfirmedSeparateDuplicates}
          onToggleShowConfirmedSeparateDuplicates={() => setShowConfirmedSeparateDuplicates((v) => !v)}
          periodeReviewRef={periodeReviewSectionRef}
          periodeAllSignals={periodeAllSignals}
          periodeMismatches={periodeMismatches}
          showPeriodeReview={showPeriodeReview}
          onToggleShowPeriodeReview={setShowPeriodeReview}
          onConfirmPeriodeAsIs={confirmPeriodeAsIs}
          onMovePeriodeToQuarter={movePeriodeToQuarter}
          onOpenHelp={setHelpPopupChapter}
        />
      ),
      withExpand(
        {
          key: "categorieen",
          title: "Categorieën",
          icon: <CardIcon name="chart" />,
          tone: "neutral",
          subtitle: "Categorieoverzicht zakelijk en privé bekijken",
          hint: "Naar de categorieoverzichten",
          helpChapter: "categorieen-overzicht",
        },
        "categorieen",
        <div className="grid md:grid-cols-2 gap-4">
          <CategorySummaryCard group={zakGroupForYear} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} onOpenHelp={setHelpPopupChapter} />
          <CategorySummaryCard group={priGroupShown} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} />
        </div>
      ),
      withExpand(
        {
          key: "aansluitingDetail",
          title: "Aansluiting & detail",
          icon: <CardIcon name="link" />,
          tone: "neutral",
          subtitle: "Controle zakelijk ↔ privé en de detailtabellen",
          hint: "Naar de aansluitcontrole en detailtabellen",
        },
        "aansluitingDetail",
        <AansluitingDetailPanel
          detailsRef={detailsSectionRef}
          zakGroupForYear={zakGroupForYear}
          priGroupForYear={priGroupShown}
          priveRekeningGeladen={priveRekeningGeladen}
          zakelijkRekeningGeladen={zakelijkRekeningGeladen}
          expandedTable={expandedTable}
          onToggleExpandTable={(zone) => setExpandedTable((v) => (v === zone ? null : zone))}
          onRequestCategoryChange={requestCategoryChange}
          onConfirmCorrect={confirmClassificationCorrect}
          fingerprintByTxId={fingerprintByTxId}
          transactionNotes={transactionNotes}
          onSetNote={setTransactionNote}
          onOpenHelp={setHelpPopupChapter}
        />
      ),
      // v283 — de "Controle overboeking zakelijk ↔ privé"-banner stond voorheen alleen ín de
      // uitgeklapte "Aansluiting & detail"-kaart hierboven; op verzoek nu ook als eigen, altijd
      // zichtbare "box" ernaast — zelfde berekening als voorheen in AansluitingDetailPanel.jsx (nu
      // verwijderd, om dubbele content te voorkomen), hier alleen samengevat i.p.v. als volledige
      // banner-tekst. v286 — die berekening staat nu in de gedeelde aansluitControleInfo hierboven.
      aansluitControleInfo.heeftData
        ? {
            key: "aansluitControle",
            title: "Controle zakelijk ↔ privé",
            icon: <CardIcon name="repeat" />,
            tone: aansluitControleInfo.tone,
            subtitle: aansluitControleInfo.subtitle,
            hint: "Naar de aansluiting & detailtabellen",
            onClick: () => jumpToSection(detailsSectionRef),
          }
        : null,
    ].filter(Boolean);
  }, [
    transactions.length,
    controlerenCardsByKey,
    expandedCardKeys,
    importDiagnostics,
    fileContinuity,
    classified,
    zakGroupForYear,
    priGroupForYear,
    priGroupShown,
    effectiveCategoryBtwRates,
    btwVerlegd,
    pendingIncomeReview,
    incomeSummary,
    incomeSearch,
    personSummary,
    pendingPersonReview,
    showPersonReview,
    personSearch,
    overigSummary,
    pendingOverigReview,
    showOverigReview,
    overigSearch,
    duplicateGroups,
    confirmedSeparateGroups,
    duplicatePendingBreakdown,
    showDuplicateDetails,
    pendingDuplicateCount,
    showConfirmedSeparateDuplicates,
    periodeAllSignals,
    periodeMismatches,
    showPeriodeReview,
    priveRekeningGeladen,
    zakelijkRekeningGeladen,
    aansluitControleInfo,
    expandedTable,
    fingerprintByTxId,
    transactionNotes,
  ]);
  const instellingenCardGroups = useMemo(() => {
    if (transactions.length === 0) return [];
    const g = (key, title, icon, memberKeys, extra, helpChapter) => {
      const built = groupCards(instellingenCardsByKey, memberKeys, extra);
      if (!built) return null;
      return { key, title, icon, tone: built.tone, lines: built.lines, onClick: built.onClick, hint: built.hint, actionLabel: "Bekijken", helpChapter };
    };
    return [
      withExpand(
        g("tegenpartijen", "Tegenpartijen", <span>🤝</span>, ["businessIncomeEntries", "businessExpenseEntries"]),
        "tegenpartijen",
        <div ref={incomeRatesSectionRef}>
          <TegenpartijenPanel
            incomeBtwTarieven={incomeBtwTarieven}
            meerdereTarievenBevestigd={meerdereTarievenBevestigd}
            onConfirmMeerdereTarieven={() => setMeerdereTarievenBevestigd(true)}
            businessKeywords={businessKeywords}
            onAddBusinessKeyword={addBusinessKeyword}
            onRemoveBusinessKeyword={removeBusinessKeyword}
            businessIncomeEntries={businessIncomeEntries}
            onReclassifyBusinessEntry={reclassifyBusinessEntry}
            onSetCounterpartyBtwVerlegd={setCounterpartyBtwVerlegd}
            btwVerlegd={btwVerlegd}
            onSetIncomeRate={setIncomeRate}
            expandedBusinessIncomeList={expandedBusinessIncomeList}
            onToggleExpandBusinessIncomeList={() => setExpandedBusinessIncomeList((v) => !v)}
            businessExpenseKeywords={businessExpenseKeywords}
            onAddBusinessExpenseKeyword={addBusinessExpenseKeyword}
            onRemoveBusinessExpenseKeyword={removeBusinessExpenseKeyword}
            businessExpenseEntries={businessExpenseEntries}
            expandedBusinessExpenseList={expandedBusinessExpenseList}
            onToggleExpandBusinessExpenseList={() => setExpandedBusinessExpenseList((v) => !v)}
          />
        </div>
      ),
      withExpand(
        g("bedrijfsmiddelen", "Bedrijfsmiddelen & financiering", <span>🏷️</span>, ["loans", "leases", "activa"]),
        "bedrijfsmiddelen",
        <div className="space-y-3">
          <div ref={activaSectionRef}>
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
          <div ref={leasesSectionRef}>
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
          <div ref={loansSectionRef}>
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
        </div>
      ),
      withExpand(
        g("persoonlijkeAannames", "Persoonlijke aannames", <span>🧑</span>, ["aannames"]),
        "persoonlijkeAannames",
        <div className="space-y-3">
          <div ref={aannamesSectionRef}>
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
              leaseSummary={leaseSummary}
              leaseDetails={leaseDetails}
              gedeeldeHuur={gedeeldeHuurForActiveYear}
              huurZakelijkPercentageStatus={huurZakelijkPercentageStatus}
              onSetHuurZakelijkPercentageStatus={setHuurZakelijkPercentageStatus}
              gedeeldeEnergie={gedeeldeEnergieForActiveYear}
              energieZakelijkPercentageStatus={energieZakelijkPercentageStatus}
              onSetEnergieZakelijkPercentageStatus={setEnergieZakelijkPercentageStatus}
              gedeeldeGemeentelijkeKosten={gedeeldeGemeentelijkeKostenForActiveYear}
              gemeentelijkeKostenZakelijkPercentageStatus={gemeentelijkeKostenZakelijkPercentageStatus}
              onSetGemeentelijkeKostenZakelijkPercentageStatus={setGemeentelijkeKostenZakelijkPercentageStatus}
              categoryBtwRates={effectiveCategoryBtwRates}
              onOpenHelp={setHelpPopupChapter}
            />
          </div>
        </div>
      ),
      withExpand(
        g("zakelijkPrive", "Zakelijk-privé percentage splitsing", <span>⚖️</span>, ["categoryPercentages"]),
        "zakelijkPrive",
        <div ref={categoryPercentageSectionRef}>
            <CategoryPercentagePanel
              activeYear={activeYear}
              categorieTotalen={categorieTotalenActiveYear}
              categoryZakelijkPercentage={categoryZakelijkPercentage}
              huisvestingStandaardNul={priveOnlyDossier ? PRIVE_ONLY_HUISVESTING_STANDAARD_NUL : []}
              onSetCategoryZakelijkPercentage={requestSetCategoryZakelijkPercentage}
              autoOpDeZaakDitJaar={!!activeYear && (autoStatus?.[activeYear] === "zaak" || autoStatus?.[activeYear] === "beide")}
              onOpenHelp={setHelpPopupChapter}
              gedeeldeRijen={[
                { label: "Huur (deels zakelijk)", gedeelde: gedeeldeHuurForActiveYear, raw: huurZakelijkPercentageStatus?.[activeYear], onSet: setHuurZakelijkPercentageStatus },
                { label: "Energie-water (deels zakelijk)", gedeelde: gedeeldeEnergieForActiveYear, raw: energieZakelijkPercentageStatus?.[activeYear], onSet: setEnergieZakelijkPercentageStatus },
                { label: "Gemeentelijke kosten (deels zakelijk)", gedeelde: gedeeldeGemeentelijkeKostenForActiveYear, raw: gemeentelijkeKostenZakelijkPercentageStatus?.[activeYear], onSet: setGemeentelijkeKostenZakelijkPercentageStatus },
              ]}
            />
          </div>
      ),
      withExpand(
        g("btw", "BTW-instellingen", <Settings className="h-3.5 w-3.5" />, ["btwSettings"], undefined, "btw-percentages"),
        "btw",
        <div ref={btwSettingsSectionRef}>
          <BtwRatesPanel
            classified={classified}
            activeYear={activeYear}
            categoryBtwRates={categoryBtwRates}
            setCategoryBtwRates={setCategoryBtwRatesWithUndo}
            btwVerlegd={btwVerlegd}
            setBtwVerlegd={setBtwVerlegdWithUndo}
            korRegeling={korRegeling}
            setKorRegeling={setKorRegelingWithUndo}
            onOpenHelp={setHelpPopupChapter}
          />
        </div>
      ),
      withExpand(
        {
          key: "automatisering",
          title: "Automatisering",
          icon: <CardIcon name="settings" />,
          tone: "neutral",
          subtitle: "Categorie-/tegenpartijregels, vaste categorieën en vaste lasten",
          hint: "Naar de automatiseringsinstellingen",
        },
        "automatisering",
        <div className="space-y-3">
          <div ref={automatiseringSectionRef}>
            <CategoryRulesPanel categoryRules={categoryRules} setCategoryRules={setCategoryRulesWithUndo} />
          </div>
          <CounterpartyRulesPanel
            overridesByCounterparty={overridesByCounterparty}
            setOverridesByCounterparty={setOverridesByCounterpartyWithUndo}
            onOpenHelp={setHelpPopupChapter}
          />
          <FixedCategoriesPanel fixedCategories={fixedCategories} setFixedCategories={setFixedCategoriesWithUndo} onOpenHelp={setHelpPopupChapter} />
          <RecurringPaymentsPanel classified={classified} activeYear={activeYear} onOpenHelp={setHelpPopupChapter} />
        </div>
      ),
    ].filter(Boolean);
  }, [
    transactions.length,
    instellingenCardsByKey,
    expandedCardKeys,
    activaSummary,
    activaDetails,
    activeYear,
    leaseSummary,
    leaseDetails,
    confirmedLeaseTypeKeys,
    leaseMerges,
    loanSummary,
    privateLoanSummary,
    loanDetails,
    zelfstandigenaftrekStatus,
    zaLegacyJaDefault,
    startersaftrekStatus,
    autoStatus,
    autoWizardStatus,
    kmVergoedingDetails,
    gedeeldeHuurForActiveYear,
    huurZakelijkPercentageStatus,
    gedeeldeEnergieForActiveYear,
    energieZakelijkPercentageStatus,
    gedeeldeGemeentelijkeKostenForActiveYear,
    gemeentelijkeKostenZakelijkPercentageStatus,
    effectiveCategoryBtwRates,
    yearlySummary,
    categorieTotalenActiveYear,
    categoryZakelijkPercentage,
    categoryBtwRates,
    btwVerlegd,
    korRegeling,
    categoryRules,
    overridesByCounterparty,
    fixedCategories,
    classified,
    incomeBtwTarieven,
    meerdereTarievenBevestigd,
    businessKeywords,
    businessIncomeEntries,
    expandedBusinessIncomeList,
    businessExpenseKeywords,
    businessExpenseEntries,
    expandedBusinessExpenseList,
  ]);

  // ---- Navigatie (fase 1, dashboard-restyling) — de 3 tabbladen zitten nu in AppSidebar.jsx i.p.v.
  // in een sticky bovenbalk (StickyTopNav is uitgefaseerd). v271 — voorheen (net als bij de oude
  // topNavItems) pas zichtbaar zodra er transacties geladen zijn; op verzoek blijven de tabbladen nu
  // altijd zichtbaar (ook na "Wis alles" of vóór het laden van een eerste bestand) — de tabs tonen
  // dan gewoon een leeg/nul dashboard i.p.v. dat het hele linkermenu zijn navigatie verliest.
  const tabsVisible = true;

  // Badges op de Controleren/Instellingen-tab in AppSidebar.jsx en de "open punten" in de
  // dashboardkop (v305, V27): het aantal CONCRETE open punten — de som van `openCount` over de kaarten
  // die aandacht vragen (tone "attention"/"risk") — niet meer het aantal kaarten. Voorheen kon
  // "Controleren 1" betekenen: 1 kaart, terwijl er 25 inkomsten te beoordelen waren. Een kaart zonder
  // eigen `openCount` telt als 1 punt.
  const openPointsOf = (c) =>
    c.tone === "attention" || c.tone === "risk" ? (typeof c.openCount === "number" ? c.openCount : 1) : 0;
  const controlerenBadge = useMemo(
    () => controlerenDashboardCards.reduce((a, c) => a + openPointsOf(c), 0),
    [controlerenDashboardCards]
  );
  const instellingenBadge = useMemo(
    () => instellingenDashboardCards.reduce((a, c) => a + openPointsOf(c), 0),
    [instellingenDashboardCards]
  );

  const dossierOpenPoints = controlerenBadge + instellingenBadge;
  const dossierOpenBreakdown = [
    controlerenBadge > 0 ? `${controlerenBadge} controle` : null,
    instellingenBadge > 0 ? `${instellingenBadge} instelling${instellingenBadge === 1 ? "" : "en"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Fase 1, dashboard-restyling (Stijl F) — de 4 samenvattende categorie-kaarten bovenaan Overzicht
  // ("Nog te controleren"/"Nog in te stellen"/"Resultaten"/"Automatische herkenning" in het mockup).
  // Dit zijn ROLLUPS van bestaande data (controlerenDashboardCards/instellingenDashboardCards/
  // businessIncomeEntries/businessExpenseEntries) — geen nieuwe berekening, alleen samengevat en
  // doorklikbaar. Zie RollupCard.jsx.
  const dashboardCardsByKey = useMemo(() => Object.fromEntries(dashboardCards.map((c) => [c.key, c])), [dashboardCards]);
  const teControlerenItems = useMemo(
    () =>
      controlerenDashboardCards
        .filter((c) => c.tone === "attention" || c.tone === "risk")
        .map((c) => ({ label: c.title, count: typeof c.openCount === "number" ? c.openCount : c.value, onClick: c.onClick })),
    [controlerenDashboardCards]
  );
  const inTeStellenItems = useMemo(
    () =>
      instellingenDashboardCards
        .filter((c) => c.tone === "attention" || c.tone === "risk")
        .map((c) => ({ label: c.title, count: typeof c.openCount === "number" ? c.openCount : c.value, onClick: c.onClick })),
    [instellingenDashboardCards]
  );
  const resultatenItems = useMemo(
    () => [
      { label: "Meerjarenoverzicht", onClick: () => setShowMultiYearModal(true) },
      { label: "BTW-aangifte per kwartaal", onClick: () => setShowQuarterlyBtwModal(true) },
      {
        label: "Indicatieve aangifteberekening",
        onClick: () => {
          setShowAangifteMeerdereJaren(false);
          setShowAangifteYearPicker(true);
        },
      },
    ],
    []
  );
  const automatischeHerkenningItems = useMemo(() => {
    const incomeCard = instellingenDashboardCards.find((c) => c.key === "businessIncomeEntries");
    const expenseCard = instellingenDashboardCards.find((c) => c.key === "businessExpenseEntries");
    return [
      { label: "Categorieregels", count: categoryRules.length },
      incomeCard && { label: "Zakelijke klanten herkend", count: incomeCard.value, onClick: incomeCard.onClick },
      expenseCard && { label: "Zakelijke inkoop/uitgaven", count: expenseCard.value, onClick: expenseCard.onClick },
    ].filter(Boolean);
  }, [instellingenDashboardCards, categoryRules]);

  // Jaaroverzicht-kaart (omzet/kosten/winst) — %-vergelijking t.o.v. vorig jaar alleen tonen als
  // beide jaren "volledig" zijn (zelfde voorwaarde als het bestaande Meerjarenoverzicht hanteert).
  const previousYearlySummary = activeYear ? yearlySummaries[Number(activeYear) - 1] : null;
  const showJaaroverzichtTrend = !!(activeYear && volledigeJaren.has(Number(activeYear)) && volledigeJaren.has(Number(activeYear) - 1));

  // Springt naar de juiste plek voor het "Details en overzichten"-paneel (DetailsPanel.jsx) — hergebruikt
  // dezelfde refs/handlers die de rest van de app al gebruikt, geen nieuwe navigatielogica.
  const handleDetailsJump = (target) => {
    switch (target) {
      case "details":
      case "categorieen":
        jumpToSection(detailsSectionRef);
        break;
      case "activa":
        jumpToSection(activaSectionRef);
        break;
      case "leningen":
        jumpToSection(loansSectionRef);
        break;
      case "lease":
        jumpToSection(leasesSectionRef);
        break;
      case "btw":
        jumpToSection(btwSettingsSectionRef);
        break;
      case "excel":
        exportExcel(groups, effectiveCategoryBtwRates, btwVerlegd);
        break;
      case "print":
        printReport(groups);
        break;
      case "aangifte":
        setShowAangifteMeerdereJaren(false);
        setShowAangifteYearPicker(true);
        break;
      default:
        break;
    }
  };

  // Korte bullet-lijst voor de "Aangiftevoorstel"-tussenstap. Bevat bewust NIET meer de punten die
  // de Aangifte-checklist hieronder al met (meer) detail toont (Overig-transacties, BTW-kwartalen,
  // ontbrekende spiegelboeking) — dat stond dubbel. Hier staat alleen wat de checklist niet laat zien.
  const aangifteOpenPunten = useMemo(() => {
    if (!activeYear) return [];
    const items = [];
    if (yearlyProgress[activeYear]?.status === "rood") {
      items.push("Saldo tussen twee bestanden sluit dit jaar niet aan");
    }
    // v285 — een BV kent geen IB/Zvw (alleen Vpb) — zie ook yearlyProgress/werkelijkAangifteChecks.
    if (rechtsvorm === "bv") {
      if (!vpbStatus[activeYear]?.gedaan) items.push("Vpb-aangifte nog niet afgevinkt als gedaan");
    } else {
      if (!ibStatus[activeYear]?.gedaan) items.push("IB/IH nog niet afgevinkt als gedaan");
      if (!zvwStatus[activeYear]?.gedaan) items.push("Zvw nog niet afgevinkt als gedaan");
    }
    return items;
  }, [activeYear, yearlyProgress, ibStatus, zvwStatus, vpbStatus, rechtsvorm]);

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
    (verwachteLeaseOverig || []).forEach((item, idx) => {
      if (!item.gevonden) {
        items.push({
          key: `verwachte-lease-overig-${idx}`,
          text: `Je gaf aan dat er een ander leaseobject is${item.naam ? ` bij "${item.naam}"` : ""} — nog niet gevonden/bevestigd in de transacties`,
          ref: leasesSectionRef,
          naam: item.naam,
          onRename: (nieuweNaam) => setVerwachteLeaseOverig((prev) => (prev || []).map((it, i) => (i === idx ? { ...it, naam: nieuweNaam } : it))),
          onRemove: () => setVerwachteLeaseOverig((prev) => (prev || []).filter((_, i) => i !== idx)),
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
    confidenceSummary, verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV,
    incomeBtwTarieven, meerdereTarievenBevestigd,
  ]);

  // ---- Dossier opslaan als downloadbaar bestand ----
  const saveProjectFile = () => {
    const project = buildProjectFile({
      parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
      categoryBtwRates, btwVerlegd, korRegeling, rechtsvorm, heeftHolding, holdingBoekingen, btwRatesVersion: BTW_RATES_VERSION,
      excludedDuplicateFingerprints, dismissedDuplicateNotice, businessKeywords, businessExpenseKeywords,
      reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
      kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
      leaseDetails, leaseMergedInto, activaDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints, transactionNotes,
      verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
      ibStatus, zvwStatus, vpbStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, incomeBtwTarieven, meerdereTarievenBevestigd, verwachteAangeboden,
    });
    const filename = downloadProjectFile(project, loadedProjectFileName, eigenNamen?.ondernemer);
    setLoadedProjectFileName(filename);
    setChangesSinceExport(0);
    setLastExportAt(new Date());
  };

  // ---- Dossier laden vanaf een bestand ----
  const loadProjectFile = async (file) => {
    try {
      const project = await readProjectFile(file);
      suppressChangeCount();
      setLastExportAt(null);
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
      // Oudere dossierbestanden bewaarden alleen een simpel rentepercentage per lening
      // ("loanInterestRates"), zonder de volledige leningbedrag/startdatum-gegevens. Die
      // vullen we hier aan in loanDetails (alleen als daar nog geen rente in staat), zodat
      // een ouder dossierbestand niet zomaar de eerder ingevulde rente verliest.
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
      setVerwachteLeaseOverig(project.verwachteLeaseOverig ?? null);
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
      setVpbStatus(project.vpbStatus && typeof project.vpbStatus === "object" ? project.vpbStatus : {});
      setZelfstandigenaftrekStatusState(project.zelfstandigenaftrekStatus && typeof project.zelfstandigenaftrekStatus === "object" ? project.zelfstandigenaftrekStatus : {});
      // Een dossierbestand zonder deze vlag is opgeslagen vóórdat deze regel bestond — behoud dan het
      // oude gedrag (onbeantwoord urencriterium-jaar = "ja") zodat een eerder gedeeld/afgedrukt cijfer
      // niet met terugwerkende kracht verandert. Alleen een bestand dat de vlag al draagt volgt de
      // nieuwe, veiligere default ("onbekend") voor een nog onbeantwoord jaar.
      setZaLegacyJaDefault(project.zaLegacyJaDefault === false ? false : true);
      setStartersaftrekStatusState(project.startersaftrekStatus && typeof project.startersaftrekStatus === "object" ? project.startersaftrekStatus : {});
      setAutoStatusState(project.autoStatus && typeof project.autoStatus === "object" ? project.autoStatus : {});
      setHuurZakelijkPercentageStatusState(project.huurZakelijkPercentageStatus && typeof project.huurZakelijkPercentageStatus === "object" ? project.huurZakelijkPercentageStatus : {});
      setEnergieZakelijkPercentageStatusState(project.energieZakelijkPercentageStatus && typeof project.energieZakelijkPercentageStatus === "object" ? project.energieZakelijkPercentageStatus : {});
      setGemeentelijkeKostenZakelijkPercentageStatusState(project.gemeentelijkeKostenZakelijkPercentageStatus && typeof project.gemeentelijkeKostenZakelijkPercentageStatus === "object" ? project.gemeentelijkeKostenZakelijkPercentageStatus : {});
      setCategoryZakelijkPercentageState(project.categoryZakelijkPercentage && typeof project.categoryZakelijkPercentage === "object" ? project.categoryZakelijkPercentage : {});
      setOpeningBalanceCorrections(project.openingBalanceCorrections && typeof project.openingBalanceCorrections === "object" ? project.openingBalanceCorrections : {});
      setLoadedProjectFileName(file.name);
      // v286 — zie ook handleFiles hierboven: alle uitklapbare kaarten beginnen ingeklapt bij het
      // laden van een (ander) project, i.p.v. een kaart die van een vorig dossier in deze sessie nog
      // openstond gewoon open te laten staan.
      setExpandedCardKeys({});
      setActiveTab("overzicht"); // V52 — na laden altijd beginnen op Overzicht
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  // ---- Dossier laden: vraagt eerst bevestiging als er al een dossier openstaat (v304) ----
  // loadProjectFile vervangt het hele huidige dossier; voorheen zonder enige waarschuwing en zonder
  // ongedaan maken. Nu: keuzevenster mét namen van beide dossiers, optioneel eerst opslaan, en een
  // momentopname zodat "Ongedaan maken" het vorige dossier terugzet.
  // V52 — volgorde omgedraaid: eerst de vraag of het HUIDIGE dossier moet worden opgeslagen, pas daarna
  // het kiezen van het te laden dossier (voorheen eerst kiezen, dan pas vragen).
  const openProjectPicker = () => projectFileInputRef.current?.click();
  const startLoadProject = () => {
    if (parsedFiles.length === 0) { openProjectPicker(); return; }
    setDialog({
      title: "Huidig dossier opslaan?",
      message: (
        <>
          <p>
            <span className="text-slate-400">Huidig dossier: </span>
            <strong className="text-slate-700">{eigenNamen?.ondernemer || "zonder naam"}</strong> · {parsedFiles.length} bankbestand{parsedFiles.length === 1 ? "" : "en"}
          </p>
          <p className="text-xs text-slate-400 pt-1">
            Hierna kies je het dossier dat je wilt laden. Dat vervangt het huidige dossier; niet opgeslagen wijzigingen gaan uit
            beeld. Via "Ongedaan maken" in de zijbalk kun je dit direct terugdraaien.
          </p>
        </>
      ),
      actions: [
        { label: "Opslaan en daarna dossier kiezen", variant: "primary", onClick: () => {
          saveProjectFile();
          // Een browser kan niet zien of het "Bewaar als"-venster is afgebroken; daarom eerst bevestigen.
          setDialog({
            title: "Is het dossier opgeslagen?",
            message: <p>Het dossier is aangeboden om te downloaden. Controleer of het bestand echt is opgeslagen voordat je een ander dossier kiest.</p>,
            actions: [
              { label: "Ja, opgeslagen — dossier kiezen", variant: "primary", onClick: openProjectPicker },
              { label: "Nee, opnieuw opslaan", onClick: () => { saveProjectFile(); setDialog({
                title: "Is het dossier opgeslagen?",
                message: <p>Bevestig pas als het bestand echt is opgeslagen.</p>,
                actions: [{ label: "Ja, opgeslagen — dossier kiezen", variant: "primary", onClick: openProjectPicker }],
              }); } },
            ],
          });
        } },
        { label: "Niet opslaan, dossier kiezen", variant: "danger", onClick: openProjectPicker },
      ],
    });
  };
  const requestLoadProject = (file) => {
    if (parsedFiles.length > 0) snapshotBeforeAction("Dossier geladen");
    loadProjectFile(file);
  };

  // ---- Nieuw dossier (voorheen "Wis alles") ----
  // v304 — zelfde handeling als voorheen (alles leegmaken, met momentopname voor "Ongedaan maken"),
  // maar benoemd zoals een professional ernaar kijkt (klaar met cliënt A, nu cliënt B) en met de
  // kans om eerst een dossierbestand te bewaren. De oude tekst "kan niet ongedaan worden gemaakt"
  // klopte al niet meer: er wordt wel degelijk een momentopname gemaakt.
  const clearAllData = () => {
    // Leeg dossier (bijv. net een nieuw dossier gestart en de wizard afgebroken): niets om te wissen, dus direct de wizard.
    if (parsedFiles.length === 0) { setActiveTab("overzicht"); setManualWizardOpen(true); return; }
    setDialog({
      title: "Nieuw dossier starten?",
      message: (
        <>
          <p>
            Het huidige dossier ({eigenNamen?.ondernemer || "zonder naam"} · {parsedFiles.length} bankbestand{parsedFiles.length === 1 ? "" : "en"}) wordt
            gesloten: bestanden, rekeningtypes, correcties en instellingen worden leeggemaakt.
          </p>
          <p className="text-xs text-slate-400 pt-1">
            Niet als dossierbestand opgeslagen gegevens gaan verloren. Direct daarna kun je dit nog terugdraaien via
            "Ongedaan maken" in de zijbalk.
          </p>
        </>
      ),
      actions: [
        { label: "Opslaan en nieuw dossier starten", variant: "primary", onClick: () => {
          saveProjectFile();
          // Een browser kan niet zien of het "Bewaar als"-venster is afgebroken; daarom pas wissen na bevestiging.
          setDialog({
            title: "Is het dossier opgeslagen?",
            message: <p>Het dossier is aangeboden om te downloaden. Controleer of het bestand echt is opgeslagen voordat het huidige dossier wordt gesloten.</p>,
            actions: [
              { label: "Ja, opgeslagen — nieuw dossier starten", variant: "primary", onClick: () => doClearAllData(true) },
              { label: "Nee, opnieuw opslaan", onClick: () => { saveProjectFile(); setDialog({
                title: "Is het dossier opgeslagen?",
                message: <p>Bevestig pas als het bestand echt is opgeslagen.</p>,
                actions: [{ label: "Ja, opgeslagen — nieuw dossier starten", variant: "primary", onClick: () => doClearAllData(true) }],
              }); } },
            ],
          });
        } },
        { label: "Nieuw dossier starten zonder opslaan", variant: "danger", onClick: () => doClearAllData(true) },
      ],
    });
  };
  const doClearAllData = async (askWizard = false) => {
    snapshotBeforeAction("Nieuw dossier");
    setActiveTab("overzicht"); // V52 — nieuw dossier begint altijd op Overzicht
    suppressChangeCount();
    setLastExportAt(null);
    setExpandedCardKeys({});
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
    setVpbStatus({});
    setOpeningBalanceCorrections({});
    // v271 — deze 8 velden ontbraken hier: na "Wis alles" bleven ze stilzwijgend op hun oude waarde
    // staan (van vóór het wissen), waardoor bij het laden van een nieuw/ander dossier de wizard
    // sommige vragen ten onrechte oversloeg (bijv. urencriterium, stap 18, wordt overgeslagen zodra
    // zelfstandigenaftrekStatus niet leeg is) en "Persoonlijke aannames" leek al deels ingevuld met
    // gegevens van het vorige, inmiddels gewiste dossier.
    setZelfstandigenaftrekStatusState({});
    setStartersaftrekStatusState({});
    setAutoStatusState({});
    setAutoWizardStatus(null);
    setAutoActivaDetails({});
    setKmVergoedingDetailsState({});
    setHuurZakelijkPercentageStatusState({});
    setCategoryZakelijkPercentageState({});
    setVerwachteLease(null);
    setVerwachteLeaseOverig(null);
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
    if (askWizard === true) {
      setDialog({
        title: "Wizard starten?",
        message: <p>Het nieuwe dossier is leeg. Begin met het laden van je bankbestanden en beantwoord daarna de basisvragen (rechtsvorm, BTW, KOR enz.).</p>,
        actions: [{ label: "Wizard starten", variant: "primary", onClick: () => setManualWizardOpen(true) }],
      });
    }
  };

  if (showStartupChoice) {
    const pending = pendingProjectRef.current;
    const fileCount = pending ? pending.parsedFiles.length : 0;
    const pendingFileNames = pending ? pending.parsedFiles.map((f) => f.fileName).filter(Boolean) : [];
    const ondernemer = pending?.settings?.eigenNamen?.ondernemer;
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border-2 border-slate-200 bg-white p-6 shadow-lg">
          <h1 className="text-lg font-semibold mb-1">Vorig dossier gevonden</h1>
          <p className="text-sm text-slate-500 mb-3">
            Er staat op dit apparaat nog een eerder dossier klaar. Wil je daarmee verdergaan, of een nieuw dossier starten?
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 mb-5 text-sm">
            <p className="font-semibold text-slate-800">
              {ondernemer || "Dossier zonder naam"}
              <span className="font-normal text-slate-500"> · {fileCount} bankbestand{fileCount === 1 ? "" : "en"}</span>
            </p>
            {pendingFileNames.length > 0 && (
              <ul className="mt-1 text-xs text-slate-500 space-y-0.5">
                {pendingFileNames.slice(0, 4).map((n) => (
                  <li key={n} className="truncate">{n}</li>
                ))}
                {pendingFileNames.length > 4 && <li>+ {pendingFileNames.length - 4} meer</li>}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={resumeLastProject}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-800"
            >
              Verder met dit dossier
            </button>
            <button
              onClick={startEmpty}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 text-slate-600 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              Nieuw dossier
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            "Nieuw dossier" verwijdert niets: het vorige dossier blijft in deze browser bewaard en dit keuzescherm
            verschijnt de volgende keer weer, totdat je zelf een nieuw bestand toevoegt — pas dán wordt het
            oude dossier in deze browser overschreven.
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
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans flex">
      {/* Fase 1 van de dashboard-restyling: de donkere header-balk + StickyTopNav zijn vervangen
          door deze vaste linker zijbalk (AppSidebar.jsx) — zelfde handlers/refs als voorheen,
          alleen de plek van de knoppen is anders. Zie het bouwvoorstel-document. */}
      <AppSidebar
        orgName="© Paul Gerits"
        rekeninghouderNaam={eigenNamen?.ondernemer}
        onEditRekeninghouder={() => setShowRekeninghouderModal(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        tabsVisible={tabsVisible}
        controlerenBadge={controlerenBadge}
        instellingenBadge={instellingenBadge}
        onLoadFile={() =>
          setDialog({
            title: "Extra bankbestand toevoegen",
            message: <p>Is het bankbestand van een zakelijke rekening of van een privérekening? Kies je meerdere bestanden van verschillend type, kies dan de laatste optie: je geeft het type daarna per bestand aan.</p>,
            actions: [
              { label: "Zakelijke rekening", variant: "primary", onClick: () => { pendingAccountTypeRef.current = "Zakelijk"; bankFileInputRef.current?.click(); } },
              { label: "Privérekening", variant: "primary", onClick: () => { pendingAccountTypeRef.current = "Prive"; bankFileInputRef.current?.click(); } },
              { label: "Meerdere bestanden / verschillende typen — daarna per bestand kiezen", onClick: () => { pendingAccountTypeRef.current = null; bankFileInputRef.current?.click(); } },
            ],
          })
        }
        onSaveProject={saveProjectFile}
        canSaveProject={parsedFiles.length > 0}
        onLoadProject={startLoadProject}
        onClearAll={clearAllData}
        canClearAll
        onToggleHelp={() => setShowHelp((v) => !v)}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        projectStatus={{ hasData: parsedFiles.length > 0, changes: changesSinceExport, lastExportAt, loadedName: loadedProjectFileName }}
        showActies={years.length > 0 && !!activeYear}
        onEditBasisvragen={() => setManualWizardOpen(true)}
        onOpenAangifteberekening={() => { setShowAangifteMeerdereJaren(false); setShowAangifteYearPicker(true); }}
        lastActionSnapshot={lastActionSnapshot && isBigUndoLabel(lastActionSnapshot.label) ? lastActionSnapshot : null}
        onUndoLastAction={undoLastAction}
        onDismissLastAction={() => setLastActionSnapshot(null)}
      />
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
      <input
        ref={projectFileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const gekozen = e.target.files && e.target.files[0];
          e.target.value = "";
          if (gekozen) requestLoadProject(gekozen);
        }}
      />

      <div className="flex-1 min-w-0">

      {updateAvailable && <UpdateAvailableBanner />}

      {/* v268 — "Laatste actie / Ongedaan maken" stond hier als zwevend paneel rechts; is verplaatst
          naar de linker zijbalk (AppSidebar.jsx) zodat het niet meer over de inhoud heen hangt. */}

      {/* v277 — bottom iets ruimer (was bottom-4/1rem) plus env(safe-area-inset-bottom) erbovenop,
          zodat deze knop niet (bijna) achter de taakbalk/dock van een laptop of het home-indicator-
          gebied van een tablet komt te zitten. */}
      <button
        onClick={() => setShowCategoryOverview(true)}
        className="fixed right-1.5 sm:right-2 z-[70] inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/95 shadow px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
        title="Snel opzoeken: alle categorieën en subtypes"
      >
        <ListTree className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Categorieën</span>
      </button>

      {showCategoryOverview && <CategoryOverviewModal onClose={() => setShowCategoryOverview(false)} />}

      {/* v270 — Meerjarenoverzicht als pop-up i.p.v. permanent uitgeklapt onder de kaarten. */}
      {showMultiYearModal && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-3"
          onClick={() => setShowMultiYearModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-slate-800">Meerjarenoverzicht</h2>
              <button onClick={() => setShowMultiYearModal(false)} className="text-slate-400 hover:text-slate-700 shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              {rechtsvorm === "bv" ? (
                <MultiYearOverviewBV
                  years={years}
                  yearlySummaries={yearlySummaries}
                  kostenTotaalByYear={kostenTotaalByYear}
                  dgaSalarisByYear={dgaSalarisByYear}
                  rcVerloop={rcVerloop}
                  evVerloop={evVerloop}
                  onYearClick={setActiveYear}
                  onOpenHelp={setHelpPopupChapter}
                  yearlyProgress={yearlyProgress}
                  vpbStatus={vpbStatus}
                  setVpbGedaan={setVpbGedaan}
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
                  yearlyProgress={yearlyProgress}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* v270 — BTW-aangifte per kwartaal als pop-up i.p.v. permanent uitgeklapt onder de kaarten. */}
      {showQuarterlyBtwModal && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-3"
          onClick={() => setShowQuarterlyBtwModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-slate-800">BTW-aangifte per kwartaal {activeYear}</h2>
              <button onClick={() => setShowQuarterlyBtwModal(false)} className="text-slate-400 hover:text-slate-700 shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
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
          </div>
        </div>
      )}

      {/* v267 — Floating "terug"-knop: springt naar het vorige tabblad, of naar Overzicht ("home") als er
          geen vorig tabblad bekend is. Links onderin geplaatst, weg van de bestaande "Categorieën"-
          knop en het ongedaan-maken-paneel (die beide rechts staan). */}
      {activeTab !== "overzicht" && (
        <button
          onClick={() => {
            const target = previousTabRef.current && previousTabRef.current !== activeTab ? previousTabRef.current : "overzicht";
            setActiveTab(target);
          }}
          className="fixed left-[224px] sm:left-[228px] z-[70] inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/95 shadow px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
          title="Terug naar vorig tabblad"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Terug</span>
        </button>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 py-8 space-y-6">
        {/* Fase 1, dashboard-restyling (Stijl F, volledige mockup-indeling) — vervangt de eerdere
            platte kaartjes-lijst: DashboardHeader (titel + ringmeter + jaar-dropdown) bovenaan, dan
            de info-banner + Jaaroverzicht-kaart naast elkaar, dan de 4 rollup-categoriekaarten, dan
            het "Details en overzichten"-paneel met sub-tabs. Alle data hier is dezelfde die al
            bestond (dashboardCards/controlerenDashboardCards/instellingenDashboardCards/
            yearlySummaries) — alleen anders gegroepeerd, zie RollupCard.jsx/DetailsPanel.jsx. */}
        <div style={sectionTabStyle("overzicht")} className="space-y-5">
          <DashboardHeader
            title="Overzicht"
            subtitle={activeYear ? `Dossierstatus voor boekjaar ${activeYear}` : "Start een nieuw dossier (links) om te beginnen"}
            pct={activeYear ? yearlyProgress[activeYear]?.pct : null}
            openPoints={activeYear ? dossierOpenPoints : null}
            openBreakdown={dossierOpenBreakdown}
            statusLines={dashboardCards.find((c) => c.key === "yearStatus")?.lines}
            werkelijkAangifteDone={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteDone : null}
            werkelijkAangifteTotal={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteTotal : null}
            yearControl={
              years.length > 1 && (
                <YearDropdown years={years} activeYear={activeYear} onSelectYear={setActiveYear} yearlyProgress={yearlyProgress} zakelijkYears={zakelijkYearsCount} priveYears={priveYearsCount} showBreakdown={priveRekeningGeladen} />
              )
            }
          />

          {/* v273 — deze rij stond volledig verborgen zolang er geen jaren/project geladen waren;
              op verzoek toont het standaard-dashboard nu altijd deze sectie, met JaaroverzichtCard
              in een neutrale nul-stand i.p.v. helemaal te verdwijnen. */}
          <div className="grid md:grid-cols-2 gap-4 items-stretch">
            <OnzekerhedenPanel heeftVoorraad={heeftVoorraad} />
            <JaaroverzichtCard
              year={activeYear}
              summary={yearlySummary}
              previousSummary={previousYearlySummary}
              showTrend={showJaaroverzichtTrend}
              onOpenDetails={() => jumpToSection(detailsSectionRef)}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* v286 — tone stond hier vast op "risk"/"attention", ook zodra er 0 open punten meer
                waren (rood/oranje terwijl er niets meer te doen is) — nu "ok" (groen) zodra de
                teller op 0 staat, net als de andere statuskaarten in deze app. */}
            <RollupCard
              title="Nog te controleren"
              icon={<CardIcon name="warning" />}
              tone={controlerenBadge === 0 ? "ok" : "risk"}
              count={controlerenBadge}
              items={teControlerenItems}
              ctaLabel="Alle controles bekijken"
              onCta={() => setActiveTab("controleren")}
            />
            <RollupCard
              title="Nog in te stellen"
              icon={<CardIcon name="settings" />}
              tone={instellingenBadge === 0 ? "ok" : "attention"}
              count={instellingenBadge}
              items={inTeStellenItems}
              ctaLabel="Alle instellingen bekijken"
              onCta={() => setActiveTab("instellingen")}
            />
            <RollupCard
              title="Resultaten"
              icon={<CardIcon name="chart" />}
              tone="ok"
              items={resultatenItems}
              ctaLabel="Naar resultaten"
              onCta={() => jumpToSection(checklistSectionRef)}
            />
            <RollupCard
              title="Automatische herkenning"
              icon={<CardIcon name="repeat" />}
              tone="info"
              items={automatischeHerkenningItems}
              ctaLabel="Alle herkenningsregels bekijken"
              onCta={() => setActiveTab("instellingen")}
              helpChapter="tegenpartijregels"
              onOpenHelp={setHelpPopupChapter}
            />
          </div>

          {/* checklistSectionRef zat voorheen op de (inmiddels verwijderde) "Aangifte {jaar}"-balk —
              nu hier, zodat bestaande kaarten die ernaartoe springen (dashboardCards "yearStatus"/
              "bvSignalering", RollupCard "Naar resultaten") een zinvolle, nog bestaande sectie
              raken i.p.v. een dode scroll-target. */}
          {/* v273 — ook dit paneel toont nu altijd, met DetailsPanel zelf een lege-staat renderend
              wanneer er nog geen activeYear is. */}
          <div ref={checklistSectionRef}>
            <DetailsPanel
              year={activeYear}
              cardsByKey={dashboardCardsByKey}
              aannamesCard={instellingenDashboardCards.find((c) => c.key === "aannames")}
              dashboardAangifteIndicatie={dashboardAangifteIndicatie}
              rechtsvorm={rechtsvorm}
              vpbIndicatie={dashboardVpbIndicatie}
              vpbBreakdown={dashboardVpbBreakdown}
              holdingCard={holdingSummaryCard}
              winst={yearlySummary?.winst}
              previousWinst={previousYearlySummary?.winst}
              showTrend={showJaaroverzichtTrend}
              onShowFullCalculation={() => {
                setShowAangifteMeerdereJaren(false);
                setShowAangifteYearPicker(true);
              }}
              zakCount={zakGroupForYear.items.length}
              priCount={priGroupForYear.items.length}
              onJump={handleDetailsJump}
            />
          </div>
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

        {/* v278 — zonder geladen bestanden staan zowel DashboardOverview (cards.length===0) als
            ImportControlPanel (diagnostics.length===0) hieronder op "return null", en alles verderop
            op dit tabblad staat achter "transactions.length > 0". Sinds tabsVisible altijd true is
            (v271) is dit tabblad dus gewoon aan te klikken met een leeg dossier — zonder deze
            placeholder was dat een compleet wit scherm i.p.v. een duidelijke lege staat. */}
        {transactions.length === 0 && (
          <div style={sectionTabStyle("controleren")}>
            <section className="rounded-xl border-2 border-slate-200 bg-white p-8 shadow-sm text-center">
              <p className="text-sm text-slate-400 italic">Start een nieuw dossier of laad een eerder opgeslagen dossier (links bij "Dossier") om hier iets te controleren.</p>
            </section>
          </div>
        )}

        {/* Op verzoek: dezelfde volledige kop als Overzicht (status-kaart met ringmeter +
            dossiercontrole-regels + jaar-dropdown) i.p.v. alleen de losse titel+dropdown-regel
            hierboven — zelfde databron (yearlyProgress/dashboardCards "yearStatus"), alleen ook
            hier getoond i.p.v. alleen op Overzicht. Verving eerder de losse zwevende
            StickyYearNav-balk, die hier los over de inhoud heen hing. */}
        <div style={sectionTabStyle("controleren")}>
          <DashboardHeader
            title="Controleren"
            subtitle={activeYear ? `Dossierstatus voor boekjaar ${activeYear}` : "Start een nieuw dossier (links) om te beginnen"}
            pct={activeYear ? yearlyProgress[activeYear]?.pct : null}
            openPoints={activeYear ? dossierOpenPoints : null}
            openBreakdown={dossierOpenBreakdown}
            statusLines={dashboardCards.find((c) => c.key === "yearStatus")?.lines}
            werkelijkAangifteDone={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteDone : null}
            werkelijkAangifteTotal={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteTotal : null}
            yearControl={
              years.length > 1 && (
                <YearDropdown years={years} activeYear={activeYear} onSelectYear={setActiveYear} yearlyProgress={yearlyProgress} zakelijkYears={zakelijkYearsCount} priveYears={priveYearsCount} showBreakdown={priveRekeningGeladen} />
              )
            }
          />
        </div>

        {/* Fase 2 (bouwvoorstel) — Controleren in kaartstijl: dezelfde onderliggende kaarten als
            v240, nu gegroepeerd in precies de 5 categorieën uit het bouwvoorstel en getekend met
            SectionCard (dezelfde stijl als Overzicht) i.p.v. de oudere DashboardOverview-tegel. */}
        <div style={sectionTabStyle("controleren")}>
          <SectionCardGrid cards={controlerenCardGroups} onOpenHelp={setHelpPopupChapter} />
        </div>

        {/* v230 — Importcontrole stond eerst op Overzicht, hoort inhoudelijk beter bij de andere
            controlestappen op het Controleren-tabblad.
            Op verzoek (v281) staat dit alleen nog binnen de uitgeklapte kaart "Import & kwaliteit"
            (zie controlerenCardGroups hierboven) — niet meer standaard zichtbaar op de pagina. */}

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
            loadFilesFirst={parsedFiles.length === 0}
            loadedFileNames={parsedFiles.map((f) => f.fileName)}
            onPickFiles={() => { pendingAccountTypeRef.current = null; bankFileInputRef.current?.click(); }}
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
            verwachteLeaseOverig={verwachteLeaseOverig}
            setVerwachteLeaseOverig={(v) => { snapshotBeforeAction("Leaseobject-vraag beantwoord"); setVerwachteLeaseOverig(v); }}
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

        {/* v266 — de donkere "Aangifte {jaar}"-statusbalk (AangifteStatusBar) is hier weggehaald:
            overbodig geworden naast de DashboardHeader-statuskaart (Dossiercontrole/Indicatieve
            aangifte/Werkelijke aangifte) en de "Resultaten"-rollupkaart, die dezelfde informatie en
            de "Indicatieve aangifteberekening"-actie al tonen. checklistData/workflowSteps/
            ibStatus/zvwStatus blijven verder gewoon bestaan voor ander gebruik elders. */}

        {/* v276 — "Werk te doen"-paneel (TodoPanel) hier weggehaald: overbodig geworden naast de
            "Nog te controleren"/"Nog in te stellen"-rollupkaarten hierboven, die dezelfde
            openstaande signalen (dubbele transacties, overboekingen aan personen, "Overig",
            leningen/lease zonder gegevens, etc.) al tonen in het nieuwe dashboard. De todoItems-
            berekening hieronder is (nog) niet verwijderd — ongebruikt, maar onschadelijk — voor het
            geval dezelfde signalenlijst later toch weer ergens getoond moet worden. */}

        {/* v270 — Meerjarenoverzicht en BTW-aangifte per kwartaal stonden hier hardcoded uitgeklapt
            (sinds v245, toen ze vanuit het vervallen tabblad "Resultaten" hiernaartoe verhuisden).
            Op verzoek staan ze niet meer permanent onder de kaarten, maar alleen als pop-up — zie de
            twee modals verderop in de render, vlak na de Overzicht-tab-div. De kaarten/links die
            hiernaartoe verwezen (dashboardCards "yearStatus"/"btwQuarters", de "Resultaten"-
            rollupkaart) openen nu setShowMultiYearModal/setShowQuarterlyBtwModal in plaats van
            jumpToSection. HoldingBoekingenPanel/BvSignaleringPanel blijven wél gewoon inline staan
            (daar is niet om gevraagd). */}
                {rechtsvorm === "bv" && heeftHolding === true && (
                  <div className="mt-4" ref={holdingBoekingenSectionRef} style={sectionTabStyle("overzicht")}>
                    <HoldingBoekingenPanel
                      years={years}
                      holdingBoekingen={holdingBoekingen}
                      onSetField={setHoldingBoekingField}
                      evVerloop={evVerloop}
                      open={showHoldingBoekingen}
                      onToggleOpen={() => setShowHoldingBoekingen((v) => !v)}
                    />
                  </div>
                )}

                {rechtsvorm === "bv" && bvSignalering && (
                  <div className="mt-4" ref={bvSignaleringSectionRef} style={sectionTabStyle("overzicht")}>
                    <BvSignaleringPanel signalering={bvSignalering} activeYear={activeYear} heeftHolding={heeftHolding} />
                  </div>
                )}


        {/* v243 — de duplicaten-sectie stond hier (vóór Overboekingen/Overig); ze is verplaatst naar
            direct vóór "Factuurperiode" hieronder, zodat de volgorde van de secties op dit tabblad
            overeenkomt met de volgorde van de kaarten in het mini-dashboard erboven (Import controle →
            Classificatie → Personen → Overig → Duplicaten → Factuurperiode). Zie
            duplicatesSectionRef verderop. */}

        {duplicateDetailGroup && (
          <DuplicateGroupDetailModal
            group={duplicateDetailGroup}
            onClose={() => setDuplicateDetailGroup(null)}
            removed={isDuplicateGroupRemoved(duplicateDetailGroup)}
            onRemove={() => removeDuplicateGroup(duplicateDetailGroup)}
            onRestore={() => restoreDuplicateGroup(duplicateDetailGroup)}
          />
        )}

        {/* v278 — zelfde lege-staat placeholder als op Controleren: zonder geladen bestanden staat
            DashboardOverview hieronder op "return null" en alles verderop achter
            "parsedFiles.length > 0", wat anders een wit scherm gaf zodra dit tabblad (sinds
            tabsVisible altijd true is, v271) met een leeg dossier werd geopend. */}
        {parsedFiles.length === 0 && (
          <div style={sectionTabStyle("instellingen")}>
            <section className="rounded-xl border-2 border-slate-200 bg-white p-8 shadow-sm text-center">
              <p className="text-sm text-slate-400 italic">Start een nieuw dossier of laad een eerder opgeslagen dossier (links bij "Dossier") om hier iets in te stellen.</p>
            </section>
          </div>
        )}

        {/* Op verzoek: dezelfde volledige kop als Overzicht (status-kaart met ringmeter +
            dossiercontrole-regels + jaar-dropdown) i.p.v. alleen de losse titel+dropdown-regel
            hierboven — zelfde databron (yearlyProgress/dashboardCards "yearStatus"), alleen ook
            hier getoond i.p.v. alleen op Overzicht. */}
        <div style={sectionTabStyle("instellingen")}>
          <DashboardHeader
            title="Instellingen"
            subtitle={activeYear ? `Dossierstatus voor boekjaar ${activeYear}` : "Start een nieuw dossier (links) om te beginnen"}
            pct={activeYear ? yearlyProgress[activeYear]?.pct : null}
            openPoints={activeYear ? dossierOpenPoints : null}
            openBreakdown={dossierOpenBreakdown}
            statusLines={dashboardCards.find((c) => c.key === "yearStatus")?.lines}
            werkelijkAangifteDone={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteDone : null}
            werkelijkAangifteTotal={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteTotal : null}
            yearControl={
              years.length > 1 && (
                <YearDropdown years={years} activeYear={activeYear} onSelectYear={setActiveYear} yearlyProgress={yearlyProgress} zakelijkYears={zakelijkYearsCount} priveYears={priveYearsCount} showBreakdown={priveRekeningGeladen} />
              )
            }
          />
        </div>

        {/* Fase 2 (bouwvoorstel) — Instellingen in kaartstijl: dezelfde onderliggende kaarten als
            v246, nu gegroepeerd in precies de 5 categorieën uit het bouwvoorstel en getekend met
            SectionCard (dezelfde stijl als Overzicht) i.p.v. de oudere DashboardOverview-tegel. */}
        <div style={sectionTabStyle("instellingen")}>
          <SectionCardGrid cards={instellingenCardGroups} onOpenHelp={setHelpPopupChapter} />
        </div>

        {/* Op verzoek (v281) staat dit alleen nog binnen de uitgeklapte kaart "Tegenpartijen" (zie
            instellingenCardGroups hierboven) — niet meer standaard zichtbaar op de pagina. */}

        {/* Op verzoek (v281) staat "Herkomst van geld" (HerkomstVanGeldPanel.jsx) alleen nog binnen
            de uitgeklapte kaart (zie controlerenCardGroups hierboven) — niet meer standaard
            zichtbaar op de pagina. */}

        {transactions.length > 0 && pendingIncomeReview.length === 0 && (
          <>

            {/* Op verzoek (v281) staat "Opschonen" (OpschonenPanel.jsx) alleen nog binnen de
                uitgeklapte kaart (zie controlerenCardGroups hierboven) — niet meer standaard
                zichtbaar op de pagina. */}

            {/* v245 — Leningen/Lease/Activa/Persoonlijke aannames/Percentage zakelijk per categorie
                hiernaartoe verplaatst vanuit het vervallen tabblad "Resultaten".
                v252 — volgorde aangepast: "Rentepercentage per lening" moet direct onder "Percentage
                zakelijk per categorie" staan, en "Lease" (als die er is) daar weer boven — dus nu
                Activa → Persoonlijke aannames → Percentage zakelijk per categorie → Lease → Leningen. */}
            {/* Op verzoek (v281) staan "Bedrijfsmiddelen & financiering" en "Persoonlijke aannames"
                alleen nog binnen hun uitgeklapte kaart (zie controlerenCardGroups/
                instellingenCardGroups hierboven) — niet meer standaard zichtbaar op de pagina. */}

            {years.length > 0 && activeYear && (
              <>
                {/* De jaren-kiezer is een centraal modal-venster, direct zichtbaar op de plek waar
                    je al kijkt, ongeacht scrollpositie (in plaats van een blok ver onderaan de
                    pagina met een scroll-naar-beneden). Eerste stap: direct het
                    actieve jaar met status en openstaande punten, zodat iemand niet meteen een
                    jaren-selectie hoeft te maken voor de meest voorkomende situatie (het jaar waar
                    je toch al in zit). "Ander jaar/meerdere jaren kiezen" schakelt binnen hetzelfde
                    venster door naar de checkbox-lijst. */}



        {/* v243 — "Controleren / Geladen files" (de losse bestand-chips) stond hier apart, met
            grotendeels dezelfde informatie (bestandsnaam, regelaantal, saldo-check) als de
            "Importcontrole"-sectie bovenaan dit tabblad, die dat allemaal al toont (én uitgebreider:
            ook overgeslagen regels, ontbrekende tegenpartij en aansluiting tussen bestanden) — inclusief
            dezelfde klik-om-te-bekijken-knop (onReviewFile). Hier weggehaald om de dubbeling op te
            heffen; gebruik de Importcontrole-sectie (via de "Import controle"-kaart in het
            mini-dashboard) voor dit alles. */}

        {/* Op verzoek (v281) staan "BTW" en "Automatisering" alleen nog binnen hun uitgeklapte kaart
            (zie instellingenCardGroups hierboven) — niet meer standaard zichtbaar op de pagina. */}

                {/* v245 — "Categorieën Zakelijk"/"Categorieën Privé" hiernaartoe verplaatst vanuit het
                    vervallen tabblad "Resultaten", nu boven de detailtabellen ("Details", hieronder
                    via detailsSectionRef) binnen tabblad "Controleren", zoals gevraagd.
                    Fase 3 — verborgen zodra de kaart "Categorieën" is uitgeklapt (toont dit dan zelf). */}
                {!expandedCardKeys.categorieen && (
                <div ref={categorySectionRef} className="grid md:grid-cols-2 gap-4" style={sectionTabStyle("controleren")}>
                  <CategorySummaryCard group={zakGroupForYear} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} onOpenHelp={setHelpPopupChapter} />
                  <CategorySummaryCard group={priGroupShown} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} />
                </div>
                )}

                {/* Fase 3 — "Aansluiting & detail" (banner + detailtabellen Zakelijk/Prive) is nu
                    AansluitingDetailPanel.jsx, een zelfstandig onderdeel — verborgen zodra de kaart
                    "Aansluiting & detail" is uitgeklapt (toont dit paneel dan zelf, zie
                    controlerenCardGroups hierboven) om dubbele content te voorkomen. */}
                {!expandedCardKeys.aansluitingDetail && (
                  <div style={sectionTabStyle("controleren")}>
                    <AansluitingDetailPanel
                      detailsRef={detailsSectionRef}
                      zakGroupForYear={zakGroupForYear}
                      priGroupForYear={priGroupShown}
                      priveRekeningGeladen={priveRekeningGeladen}
                      zakelijkRekeningGeladen={zakelijkRekeningGeladen}
                      expandedTable={expandedTable}
                      onToggleExpandTable={(zone) => setExpandedTable((v) => (v === zone ? null : zone))}
                      onRequestCategoryChange={requestCategoryChange}
                      onConfirmCorrect={confirmClassificationCorrect}
                      fingerprintByTxId={fingerprintByTxId}
                      transactionNotes={transactionNotes}
                      onSetNote={setTransactionNote}
                      onOpenHelp={setHelpPopupChapter}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Indicatieve aangifte — globale modal.
            Belangrijk: deze modal mag niet binnen de pendingIncomeReview/transactions-rendering
            zitten. De knop kan immers ook worden gebruikt terwijl er nog inkomsten ter controle
            staan. In dat geval werd de state wel op true gezet, maar werd de modal helemaal niet
            gerenderd, waardoor de knop voor de gebruiker leek niets te doen. */}
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

      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />
      <UndoToast
        snapshot={lastActionSnapshot && !isBigUndoLabel(lastActionSnapshot.label) ? lastActionSnapshot : null}
        onUndo={undoLastAction}
        onDismiss={() => setLastActionSnapshot(null)}
      />
      </div>
    </div>
  );
}
