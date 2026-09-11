import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Check, Download, Trash2, Loader2, Printer, X } from "lucide-react";

import { parseFile } from "./importers/detector.js";
import { buildTransactions, checkBalanceConsistency } from "./importers/transactions.js";
import { resolveClassification, defaultTypeForCategory } from "./classification/classify.js";
import { DEFAULT_RULES, mergeCategoryRules, migrateLegacyCategoryName, DEFAULT_FIXED_CATEGORIES, INCOME_TRANSFER_CATEGORIES } from "./classification/categories.js";
import { DEFAULT_BTW_RATES, EMPTY_BTW_RATES, mergeBtwRates, BTW_RATES_VERSION, DEFAULT_VOORBELASTING_EXCLUDED, computeQuarterlyBtwForYear } from "./tax/btw.js";
import { computeYearlySummary, computeYearlyOpenOB, computeVolledigeJaren, computeBusinessAdvies } from "./tax/yearlySummary.js";
import { estimateIncomeTax } from "./tax/incomeTax.js";
import { computePeriodeMismatches } from "./tax/periodDetection.js";
import { computeLoanSummary, computeLeaseSummary } from "./tax/loanAmortization.js";
import { computeDuplicateInfo } from "./importers/duplicates.js";
import { computeIncomeSummary, computeCategorySummary } from "./classification/reviewSummaries.js";
import { eur } from "./utils/amounts.js";
import { counterpartyKey } from "./utils/normalization.js";
import {
  loadPersistedParsedFiles, persistParsedFiles, clearPersistedData,
  loadPersistedSettings, persistSettings, clearPersistedSettings,
} from "./storage/projectStorage.js";
import { buildProjectFile, downloadProjectFile, readProjectFile } from "./storage/projectFile.js";
import ConfirmBanner from "./components/shared/ConfirmBanner.jsx";
import HelpPanel from "./components/shared/HelpPanel.jsx";
import HelpHint from "./components/shared/HelpHint.jsx";
import HelpPopupModal from "./components/shared/HelpPopupModal.jsx";
import AccountTypeChooser from "./components/upload/AccountTypeChooser.jsx";
import { CategorySummaryCard, DetailTable } from "./components/overview/GroupView.jsx";
import BtwRatesPanel from "./components/btw/BtwRatesPanel.jsx";
import IncomeReviewStep from "./components/review/IncomeReviewStep.jsx";
import ReviewStep from "./components/review/ReviewStep.jsx";
import QuarterlyBtwPanel from "./components/btw/QuarterlyBtwPanel.jsx";
import { computeChecklistLikeDataForYear } from "./tax/checklist.js";
import YearSummaryCard from "./components/overview/YearSummaryCard.jsx";
import AangifteChecklistPanel from "./components/overview/AangifteChecklistPanel.jsx";
import RecurringPaymentsPanel from "./components/overview/RecurringPaymentsPanel.jsx";
import ObIbExplanationPanel from "./components/overview/ObIbExplanationPanel.jsx";
import MultiYearOverview from "./components/overview/MultiYearOverview.jsx";
import TodoPanel from "./components/dashboard/TodoPanel.jsx";
import StickyYearNav from "./components/dashboard/StickyYearNav.jsx";
import CategoryRulesPanel from "./components/settings/CategoryRulesPanel.jsx";
import KeywordManager from "./components/settings/KeywordManager.jsx";
import FixedCategoriesPanel from "./components/settings/FixedCategoriesPanel.jsx";
import PeriodeReviewStep from "./components/review/PeriodeReviewStep.jsx";
import LoanInterestPanel from "./components/loans/LoanInterestPanel.jsx";
import LeaseInterestPanel from "./components/loans/LeaseInterestPanel.jsx";
import LoanDetailsModal from "./components/loans/LoanDetailsModal.jsx";
import RawFileReviewModal from "./components/upload/RawFileReviewModal.jsx";
import { exportExcel } from "./reports/excelExport.js";
import { buildAangiftevoorstelHtml, downloadAangiftevoorstel } from "./reports/aangiftevoorstel.js";
import { printReport, printHtmlDocument } from "./reports/printReport.js";
import { computeBtwBoxMapping, computeIbBoxMapping } from "./tax/boxMapping.js";

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

export default function App() {
  const [parsedFiles, setParsedFiles] = useState([]);
  const [accountTypeByFile, setAccountTypeByFile] = useState({});
  const [categoryRules, setCategoryRules] = useState(DEFAULT_RULES);
  const [overridesByCounterparty, setOverridesByCounterparty] = useState({});
  const [overridesByRow, setOverridesByRow] = useState({});
  const [categoryBtwRates, setCategoryBtwRates] = useState(DEFAULT_BTW_RATES);
  const [btwVerlegd, setBtwVerlegd] = useState(null); // null = nog niet gevraagd
  const [korRegeling, setKorRegeling] = useState(null); // null = nog niet gevraagd
  const [excludedDuplicateFingerprints, setExcludedDuplicateFingerprints] = useState([]);
  const [dismissedDuplicateNotice, setDismissedDuplicateNotice] = useState(false);
  const [excludedManualFingerprints, setExcludedManualFingerprints] = useState([]);
  const [reviewFileModal, setReviewFileModal] = useState(null);
  const [businessKeywords, setBusinessKeywords] = useState([]);
  const [businessExpenseKeywords, setBusinessExpenseKeywords] = useState([]);
  const [reviewedIncomeKeys, setReviewedIncomeKeys] = useState([]);
  const [reviewedPersonKeys, setReviewedPersonKeys] = useState([]);
  const [reviewedOverigKeys, setReviewedOverigKeys] = useState([]);
  const [kwartaalStatus, setKwartaalStatus] = useState({});
  const [voorbelastingExcluded, setVoorbelastingExcluded] = useState(DEFAULT_VOORBELASTING_EXCLUDED);
  const [fixedCategories, setFixedCategories] = useState(DEFAULT_FIXED_CATEGORIES);
  const [ibStatus, setIbStatus] = useState({}); // { "2025": { gedaan: bool } }
  const [manualPriveUitgaven, setManualPriveUitgaven] = useState({}); // { "2025": "150" }
  const [aangiftevoorstelPreview, setAangiftevoorstelPreview] = useState(null); // HTML-string of null
  const [showAangifteYearPicker, setShowAangifteYearPicker] = useState(false);
  const [selectedAangifteYears, setSelectedAangifteYears] = useState([]);
  const [periodeQuarterOverrides, setPeriodeQuarterOverrides] = useState({});
  const [reviewedPeriodeKeys, setReviewedPeriodeKeys] = useState([]);
  const [loanDetails, setLoanDetails] = useState({});
  const [loanDetailsModalKey, setLoanDetailsModalKey] = useState(null);
  const [leaseDetails, setLeaseDetails] = useState({});
  const [leaseDetailsModalKey, setLeaseDetailsModalKey] = useState(null);
  const [confirmedLeaseTypeKeys, setConfirmedLeaseTypeKeys] = useState([]);
  const [incomeSearch, setIncomeSearch] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [overigSearch, setOverigSearch] = useState("");
  const [activeYear, setActiveYear] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [loadedProjectFileName, setLoadedProjectFileName] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpPopupChapter, setHelpPopupChapter] = useState(null);
  const [helpAutoOpenChapter, setHelpAutoOpenChapter] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState(null);
  const [lastActionSnapshot, setLastActionSnapshot] = useState(null); // { label, state }
  const projectFileInputRef = useRef(null);
  const skipNextPersistRef = useRef(false);
  const duplicatesSectionRef = useRef(null);
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

  const effectiveCategoryBtwRates = korRegeling ? EMPTY_BTW_RATES : categoryBtwRates;

  const applySettingsToState = (settings) => {
    setAccountTypeByFile(settings.accountTypeByFile || {});
    setOverridesByCounterparty(settings.overridesByCounterparty || {});
    setOverridesByRow(settings.overridesByRow || {});
    if (Array.isArray(settings.categoryRules)) setCategoryRules(mergeCategoryRules(settings.categoryRules));
    setCategoryBtwRates(mergeBtwRates(settings.categoryBtwRates, settings.btwRatesVersion, migrateLegacyCategoryName));
    setBtwVerlegd(typeof settings.btwVerlegd === "boolean" ? settings.btwVerlegd : null);
    setKorRegeling(typeof settings.korRegeling === "boolean" ? settings.korRegeling : null);
    setExcludedDuplicateFingerprints(Array.isArray(settings.excludedDuplicateFingerprints) ? settings.excludedDuplicateFingerprints : []);
    setExcludedManualFingerprints(Array.isArray(settings.excludedManualFingerprints) ? settings.excludedManualFingerprints : []);
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
    setConfirmedLeaseTypeKeys(Array.isArray(settings.confirmedLeaseTypeKeys) ? settings.confirmedLeaseTypeKeys : []);
    setIbStatus(settings.ibStatus && typeof settings.ibStatus === "object" ? settings.ibStatus : {});
    setManualPriveUitgaven(settings.manualPriveUitgaven && typeof settings.manualPriveUitgaven === "object" ? settings.manualPriveUitgaven : {});
  };
  const setKwartaalStatusField = (key, field, value) => {
    setKwartaalStatus((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };
  const setIbGedaan = (year, gedaan) => setIbStatus((prev) => ({ ...prev, [year]: { gedaan } }));

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
        categoryBtwRates, btwVerlegd, korRegeling, btwRatesVersion: BTW_RATES_VERSION,
        excludedDuplicateFingerprints, businessKeywords, businessExpenseKeywords,
        reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
        kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
        leaseDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints,
        ibStatus, manualPriveUitgaven,
      });
      setSaveState(ok1 && ok2 ? "saved" : "error");
    })();
  }, [
    parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
    categoryBtwRates, btwVerlegd, korRegeling, excludedDuplicateFingerprints,
    businessKeywords, businessExpenseKeywords, reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
    kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
    leaseDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints,
    ibStatus, manualPriveUitgaven,
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
    }
  };

  const allTransactions = useMemo(() => buildTransactions(parsedFiles), [parsedFiles]);

  const { fingerprintByTxId, duplicateGroups, duplicateFingerprints } = useMemo(
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
        categoryBtwRates, btwVerlegd, korRegeling, excludedDuplicateFingerprints, excludedManualFingerprints,
        businessKeywords, businessExpenseKeywords, reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
        kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
        leaseDetails, confirmedLeaseTypeKeys, fixedCategories, ibStatus, manualPriveUitgaven,
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
    setExcludedDuplicateFingerprints(s.excludedDuplicateFingerprints);
    setExcludedManualFingerprints(s.excludedManualFingerprints);
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
    setConfirmedLeaseTypeKeys(s.confirmedLeaseTypeKeys);
    setFixedCategories(s.fixedCategories);
    setIbStatus(s.ibStatus);
    setManualPriveUitgaven(s.manualPriveUitgaven);
    setLastActionSnapshot(null);
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
    setAccountTypeByFile((prev) => ({ ...prev, [fileName]: type }));
  };

  const classified = useMemo(() => {
    const base = transactions.map((tx) => ({
      ...tx,
      ...resolveClassification(tx, categoryRules, businessKeywords, businessExpenseKeywords, accountTypeByFile[tx.source], overridesByCounterparty, overridesByRow),
    }));
    // "Prive opnames"/"Uitbetaling aan prive"/"Terugboeking van prive" zijn geld dat tussen
    // zakelijk en privé beweegt. Staat zo'n boeking aan de zakelijke kant, dan voegen we er een
    // spiegelboeking van hetzelfde bedrag met omgekeerd teken aan toe — zodat de balans tussen
    // zakelijk en privé in beide richtingen klopt, zonder de oorspronkelijke boeking te veranderen.
    const mirrors = [];
    for (const tx of base) {
      if (
        (tx.category === "Prive opnames" || tx.category === "Uitbetaling aan prive" || tx.category === "Terugboeking van prive") &&
        tx.type === "Zakelijk"
      ) {
        mirrors.push({ ...tx, id: `${tx.id}-prive-spiegel`, amount: -tx.amount, type: "Prive", isMirror: true });
      }
    }
    return mirrors.length ? [...base, ...mirrors] : base;
  }, [transactions, categoryRules, businessKeywords, businessExpenseKeywords, accountTypeByFile, overridesByCounterparty, overridesByRow]);

  // ---- Inkomstenbronnen-review ----
  const incomeSummary = useMemo(() => computeIncomeSummary(transactions, accountTypeByFile), [transactions, accountTypeByFile]);
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
    } else if (choice === "prive") {
      setCounterpartyOverride(item.name, 1, { category: "Inkomsten", type: "Prive" });
    } else if (choice === "overig") {
      setCounterpartyOverride(item.name, 1, { category: "Overig", type: "Prive" });
    }
    setReviewedIncomeKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };

  // ---- "Overboekingen aan personen" en "Overig" opruimen ----
  const personSummary = useMemo(() => computeCategorySummary(classified, "Overboekingen aan personen"), [classified]);
  const pendingPersonReview = useMemo(() => personSummary.filter((i) => !reviewedPersonKeys.includes(i.key)), [personSummary, reviewedPersonKeys]);
  const markPersonSource = (item, category, type) => {
    setCounterpartyOverride(item.name, item.amount, { category, type });
    setReviewedPersonKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };
  const confirmPersonAsIs = (item) => setReviewedPersonKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));

  const overigSummary = useMemo(() => computeCategorySummary(classified, "Overig"), [classified]);
  const pendingOverigReview = useMemo(() => overigSummary.filter((i) => !reviewedOverigKeys.includes(i.key)), [overigSummary, reviewedOverigKeys]);
  const markOverigItem = (item, category, type) => {
    setCounterpartyOverride(item.name, item.amount, { category, type });
    setReviewedOverigKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };
  const confirmOverigAsIs = (item) => setReviewedOverigKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));

  const addBusinessKeyword = (kw) => setBusinessKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  const removeBusinessKeyword = (kw) => setBusinessKeywords((prev) => prev.filter((k) => k !== kw));
  const addBusinessExpenseKeyword = (kw) => setBusinessExpenseKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  const removeBusinessExpenseKeyword = (kw) => setBusinessExpenseKeywords((prev) => prev.filter((k) => k !== kw));
  const businessIncomeEntries = useMemo(() => computeCategorySummary(classified, "Zakelijke inkomsten"), [classified]);
  const businessExpenseEntries = useMemo(() => computeCategorySummary(classified, "Zakelijke uitgaven"), [classified]);
  const reclassifyBusinessEntry = (item, newCategory) => {
    setCounterpartyOverride(item.name, item.amount, { category: newCategory, type: defaultTypeForCategory(newCategory) });
  };

  // ---- Factuurperiode vs. boekingskwartaal ----
  const periodeMismatches = useMemo(
    () => computePeriodeMismatches(classified, reviewedPeriodeKeys, periodeQuarterOverrides),
    [classified, reviewedPeriodeKeys, periodeQuarterOverrides]
  );
  const confirmPeriodeAsIs = (tx) => setReviewedPeriodeKeys((prev) => (prev.includes(tx.id) ? prev : [...prev, tx.id]));
  const movePeriodeToQuarter = (tx, quarterKey) => setPeriodeQuarterOverrides((prev) => ({ ...prev, [tx.id]: quarterKey }));

  // ---- Leningen ----
  const loanSummary = useMemo(() => computeLoanSummary(classified), [classified]);
  const setLoanDetailField = (key, newDetails) => setLoanDetails((prev) => ({ ...prev, [key]: newDetails }));
  const markLoanUnknown = (key) => setLoanDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: true } }));
  const unmarkLoanUnknown = (key) => setLoanDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: false } }));

  // ---- Lease (operationeel/financieel) ----
  const leaseSummary = useMemo(() => computeLeaseSummary(classified), [classified]);
  const setLeaseDetailField = (key, newDetails) => setLeaseDetails((prev) => ({ ...prev, [key]: newDetails }));
  const markLeaseUnknown = (key) => setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: true } }));
  const unmarkLeaseUnknown = (key) => setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: false } }));
  const confirmLeaseType = (lease, type) => {
    setCounterpartyOverride(lease.name, lease.transactions[0].amount, {
      category: type === "financieel" ? "Lease (financieel)" : "Lease (operationeel)",
      type: "Zakelijk",
    });
    setConfirmedLeaseTypeKeys((prev) => (prev.includes(lease.key) ? prev : [...prev, lease.key]));
    if (type === "financieel") setLeaseDetailsModalKey(lease.key);
  };

  const exportAangiftevoorstel = () => {
    if (selectedAangifteYears.length === 0) {
      window.alert("Selecteer minstens één jaar.");
      return;
    }
    const html = buildAangiftevoorstelHtml(selectedAangifteYears, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides);
    setAangiftevoorstelPreview(html);
    setShowAangifteYearPicker(false);
  };
  const printAangiftevoorstelPreview = () => printHtmlDocument(aangiftevoorstelPreview);
  const downloadAangiftevoorstelPreview = () => downloadAangiftevoorstel(aangiftevoorstelPreview, selectedAangifteYears);

  // Tegenpartij-brede correctie: geldt voor alle transacties van diezelfde tegenpartij (zelfde
  // teken), in alle jaren. Ruimt een eventuele losse rij-correctie voor diezelfde tegenpartij op
  // — anders zou die voorrang blijven houden boven deze bredere wijziging.
  const setCounterpartyOverride = (counterparty, amount, patch) => {
    const key = counterpartyKey(counterparty, amount);
    if (!key) return;
    setOverridesByCounterparty((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch, displayName: prev[key]?.displayName || counterparty, sign: amount >= 0 ? "pos" : "neg" },
    }));
    setOverridesByRow((prev) => {
      const idsToClear = classified
        .filter((tx) => counterpartyKey(tx.counterparty || tx.description, tx.amount) === key)
        .map((tx) => tx.id);
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
    setOverridesByRow((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  // ---- Slepen tussen Zakelijk en Prive (Pointer Events — werkt ook op iOS/iPad) ----
  const [dragState, setDragState] = useState(null); // { tx, x, y, overZone }
  const [expandedTable, setExpandedTable] = useState(null); // "Zakelijk" | "Prive" | null
  const [expandedBusinessIncomeList, setExpandedBusinessIncomeList] = useState(false);
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
      if (cur && cur.overZone && cur.overZone !== cur.tx.type) {
        const patch = { category: cur.tx.category, type: cur.overZone };
        const key = (cur.tx.counterparty || cur.tx.description || "").trim();
        if (key) setCounterpartyOverride(key, cur.tx.amount, patch);
        else setRowOverride(cur.tx.id, patch);
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

  const quarterlyBtwData = useMemo(
    () => (activeYear ? computeQuarterlyBtwForYear(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides) : []),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides]
  );
  const yearlySummary = useMemo(
    () => (activeYear ? computeYearlySummary(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, INCOME_TRANSFER_CATEGORIES, voorbelastingExcluded) : null),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, voorbelastingExcluded]
  );
  const yearlyOpenOB = useMemo(
    () => computeYearlyOpenOB(classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, kwartaalStatus),
    [classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, kwartaalStatus]
  );
  const ibEstimate = useMemo(
    () => (yearlySummary ? estimateIncomeTax(yearlySummary.winst, activeYear) : { belasting: 0, geëxtrapoleerd: false }),
    [yearlySummary, activeYear]
  );
  const yearlySummaries = useMemo(() => {
    const map = {};
    for (const y of years) map[y] = computeYearlySummary(classified, y, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, INCOME_TRANSFER_CATEGORIES, voorbelastingExcluded);
    return map;
  }, [years, classified, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, voorbelastingExcluded]);
  const volledigeJaren = useMemo(() => computeVolledigeJaren(classified), [classified]);
  const checklistData = useMemo(
    () => computeChecklistLikeDataForYear(zakGroupForYear.items, priGroupForYear.items, quarterlyBtwData, kwartaalStatus),
    [zakGroupForYear, priGroupForYear, quarterlyBtwData, kwartaalStatus]
  );
  const btwBoxMapping = useMemo(() => computeBtwBoxMapping(effectiveCategoryBtwRates, voorbelastingExcluded), [effectiveCategoryBtwRates, voorbelastingExcluded]);
  const ibBoxMapping = useMemo(() => computeIbBoxMapping(zakGroupForYear.items), [zakGroupForYear]);
  const businessAdvies = useMemo(() => {
    if (!activeYear || !yearlySummary) return null;
    const manualCorrectie = Number(manualPriveUitgaven[activeYear]) || 0;
    return computeBusinessAdvies(activeYear, yearlySummary, yearlyOpenOB[activeYear] || 0, ibEstimate, !!ibStatus[activeYear]?.gedaan, priGroupForYear.items, manualCorrectie);
  }, [activeYear, yearlySummary, yearlyOpenOB, ibEstimate, ibStatus, priGroupForYear, manualPriveUitgaven]);

  // ---- Voortgangspercentage per jaar (voor de jaarknoppen in "Werk te doen") ----
  const yearlyProgress = useMemo(() => {
    const map = {};
    for (const year of years) {
      const zakItems = (groups.find((g) => g.year === year && g.type === "Zakelijk") || { items: [] }).items;
      const priItems = (groups.find((g) => g.year === year && g.type === "Prive") || { items: [] }).items;
      const allYearItems = [...zakItems, ...priItems];
      const quartersForYear = computeQuarterlyBtwForYear(classified, year, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides);
      const yc = computeChecklistLikeDataForYear(zakItems, priItems, quartersForYear, kwartaalStatus);
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
      const avgFrac = checks.length ? checks.reduce((a, c) => a + c.frac, 0) / checks.length : 1;
      map[year] = { pct: Math.round(avgFrac * 100) };
    }
    return map;
  }, [years, groups, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, kwartaalStatus, korRegeling, reviewedPersonKeys, reviewedOverigKeys]);

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
    if (activeYear && !korRegeling) {
      const openQuarters = quarterlyBtwData.filter((q) => {
        const s = kwartaalStatus[`${q.year}-Q${q.kwartaal}`] || {};
        return !s.aangegeven || !s.betaald;
      });
      if (openQuarters.length > 0) {
        items.push({
          key: "quarters",
          text: `${openQuarters.length} kwartaal(en) nog niet aangegeven/betaald (${activeYear})`,
          ref: quarterlyBtwSectionRef,
        });
      }
    }
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
      return l.category === "Lease (financieel)" && !(leaseDetails[l.key]?.leasebedrag && leaseDetails[l.key]?.startdatum);
    });
    if (incompleteLeases.length > 0) {
      items.push({ key: "leases", text: `${incompleteLeases.length} lease(s) nog niet (volledig) bepaald`, ref: leasesSectionRef });
    }
    if (transactions.length > 0 && korRegeling === null) {
      items.push({ key: "kor", text: "KOR-vraag nog niet beantwoord", ref: btwSettingsSectionRef });
    }
    if (transactions.length > 0 && korRegeling === false && btwVerlegd === null) {
      items.push({ key: "btwVerlegd", text: "BTW-verlegd-vraag nog niet beantwoord", ref: btwSettingsSectionRef });
    }
    return items;
  }, [
    pendingDuplicateCount, dismissedDuplicateNotice, pendingPersonReview, pendingOverigReview,
    activeYear, korRegeling, quarterlyBtwData, kwartaalStatus, transactions, btwVerlegd,
    periodeMismatches, loanSummary, loanDetails, leaseSummary, leaseDetails, confirmedLeaseTypeKeys,
  ]);

  // ---- Project opslaan als downloadbaar bestand ----
  const saveProjectFile = () => {
    const project = buildProjectFile({
      parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
      categoryBtwRates, btwVerlegd, korRegeling, btwRatesVersion: BTW_RATES_VERSION,
      excludedDuplicateFingerprints, businessKeywords, businessExpenseKeywords,
      reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
      kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
      leaseDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints,
      ibStatus, manualPriveUitgaven,
    });
    const filename = downloadProjectFile(project, loadedProjectFileName);
    setLoadedProjectFileName(filename);
  };

  // ---- Project laden vanaf een bestand ----
  const loadProjectFile = async (file) => {
    try {
      const project = await readProjectFile(file);
      setParsedFiles(Array.isArray(project.parsedFiles) ? project.parsedFiles : []);
      setAccountTypeByFile(project.accountTypeByFile || {});
      setOverridesByCounterparty(project.overridesByCounterparty || {});
      setOverridesByRow(project.overridesByRow || {});
      if (Array.isArray(project.categoryRules)) setCategoryRules(mergeCategoryRules(project.categoryRules));
      setCategoryBtwRates(mergeBtwRates(project.categoryBtwRates, project.btwRatesVersion, migrateLegacyCategoryName));
      setBtwVerlegd(typeof project.btwVerlegd === "boolean" ? project.btwVerlegd : null);
      setKorRegeling(typeof project.korRegeling === "boolean" ? project.korRegeling : null);
      setExcludedDuplicateFingerprints(Array.isArray(project.excludedDuplicateFingerprints) ? project.excludedDuplicateFingerprints : []);
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
      setConfirmedLeaseTypeKeys(Array.isArray(project.confirmedLeaseTypeKeys) ? project.confirmedLeaseTypeKeys : []);
      setFixedCategories(Array.isArray(project.fixedCategories) ? project.fixedCategories : DEFAULT_FIXED_CATEGORIES);
      setExcludedManualFingerprints(Array.isArray(project.excludedManualFingerprints) ? project.excludedManualFingerprints : []);
      setIbStatus(project.ibStatus && typeof project.ibStatus === "object" ? project.ibStatus : {});
      setManualPriveUitgaven(project.manualPriveUitgaven && typeof project.manualPriveUitgaven === "object" ? project.manualPriveUitgaven : {});
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
    setExcludedDuplicateFingerprints([]);
    setDismissedDuplicateNotice(false);
    setExcludedManualFingerprints([]);
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
    setConfirmedLeaseTypeKeys([]);
    setFixedCategories(DEFAULT_FIXED_CATEGORIES);
    setIbStatus({});
    setManualPriveUitgaven({});
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
        <div className="max-w-md w-full rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
          <h1 className="text-lg font-semibold mb-1">Vorig project gevonden</h1>
          <p className="text-sm text-slate-500 mb-5">
            Er staat op dit apparaat nog een eerder project klaar ({fileCount} bestand{fileCount === 1 ? "" : "en"}). Wil je daarmee verdergaan, of leeg beginnen?
          </p>
          <div className="space-y-2">
            <button
              onClick={resumeLastProject}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-700"
            >
              Gebruik laatste project
            </button>
            <button
              onClick={startEmpty}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 text-slate-600 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              Leeg beginnen
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Het eerder opgeslagen project blijft bewaard totdat je zelf iets nieuws uploadt of instelt.
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
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              {saveState === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Opslaan…
                </>
              )}
              {saveState === "saved" && (
                <>
                  <Check className="h-3 w-3 text-emerald-400" /> Opgeslagen
                </>
              )}
              {saveState === "error" && (
                <>
                  <AlertCircle className="h-3 w-3 text-rose-400" /> Opslaan mislukt
                </>
              )}
            </span>
            {parsedFiles.length > 0 && (
              <button
                onClick={saveProjectFile}
                className="text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 rounded-md px-2.5 py-1.5 flex items-center gap-1"
                title="Download een projectbestand met alle transacties"
              >
                <Download className="h-3.5 w-3.5" /> Project opslaan
              </button>
            )}
            <button
              onClick={() => projectFileInputRef.current.click()}
              className="text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 rounded-md px-2.5 py-1.5 flex items-center gap-1"
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
                className="text-xs font-medium text-rose-700 bg-white hover:bg-rose-50 rounded-md px-2.5 py-1.5 flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Wis alles
              </button>
            )}
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 rounded-md px-2.5 py-1.5 flex items-center gap-1"
            >
              Help en uitleg
            </button>
          </div>
        </div>
      </header>

      <StickyYearNav years={years} activeYear={activeYear} onSelectYear={setActiveYear} yearlyProgress={yearlyProgress} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {lastActionSnapshot && (
          <section className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              Laatste actie: <strong>{lastActionSnapshot.label}</strong>.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={undoLastAction} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                Ongedaan maken
              </button>
              <button onClick={() => setLastActionSnapshot(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {showHelp && <HelpPanel onClose={() => setShowHelp(false)} openChapter={helpAutoOpenChapter} />}

        {helpPopupChapter && (
          <HelpPopupModal
            chapterKey={helpPopupChapter}
            onClose={() => setHelpPopupChapter(null)}
            onViewAll={() => {
              setHelpAutoOpenChapter(helpPopupChapter);
              setHelpPopupChapter(null);
              setShowHelp(true);
            }}
          />
        )}

        <section
          className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 mb-3">Sleep hier je bank-CSV, XLS- of MT940-bestanden naartoe, of</p>
          <label className="inline-flex items-center gap-2 rounded-md bg-slate-900 text-stone-50 px-4 py-2 text-sm font-medium hover:bg-slate-800 cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" /> Bestanden kiezen
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.940,.sta,.mt940,.swi,.txt,.xml"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </section>

        {error && (
          <section className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-900 whitespace-pre-line">{error}</p>
          </section>
        )}

        {parsedFiles.length > 0 && (
          <section className="flex flex-wrap gap-2">
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
          </section>
        )}

        {reviewFileModal && (
          <RawFileReviewModal
            fileName={reviewFileModal}
            rawTx={allTransactions.filter((t) => t.source === reviewFileModal)}
            fingerprintByTxId={fingerprintByTxId}
            excludedManualFingerprints={excludedManualFingerprints}
            setExcludedManualFingerprints={setExcludedManualFingerprints}
            onClose={() => setReviewFileModal(null)}
          />
        )}

        <AccountTypeChooser pendingFileNames={pendingAccountFiles} onChoose={setAccountType} />

        <TodoPanel items={todoItems} years={years} activeYear={activeYear} onSelectYear={setActiveYear} yearlyProgress={yearlyProgress} />

        {duplicateGroups.length > 0 && pendingDuplicateCount > 0 && !dismissedDuplicateNotice && (
          <section ref={duplicatesSectionRef} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
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
                <button onClick={() => setDismissedDuplicateNotice(true)} className="text-xs text-amber-700 hover:text-amber-900">
                  Negeren
                </button>
              </div>
            </div>
          </section>
        )}

        {parsedFiles.length > 0 && (
          <div ref={btwSettingsSectionRef}>
            <BtwRatesPanel
              categoryBtwRates={categoryBtwRates}
              setCategoryBtwRates={setCategoryBtwRates}
              btwVerlegd={btwVerlegd}
              setBtwVerlegd={setBtwVerlegd}
              korRegeling={korRegeling}
              setKorRegeling={setKorRegeling}
              onOpenHelp={setHelpPopupChapter}
            />
          </div>
        )}

        {parsedFiles.length > 0 && (
          <CategoryRulesPanel categoryRules={categoryRules} setCategoryRules={setCategoryRules} />
        )}

        {parsedFiles.length > 0 && (
          <FixedCategoriesPanel fixedCategories={fixedCategories} setFixedCategories={setFixedCategories} onOpenHelp={setHelpPopupChapter} />
        )}

        {parsedFiles.length > 0 && (
          <div className={expandedBusinessIncomeList ? "grid grid-cols-1 gap-4" : "grid md:grid-cols-2 gap-4"}>
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold mb-1">Zakelijke tegenpartijen (inkomsten)</h2>
              <p className="text-xs text-slate-500 mb-3">
                Namen van klanten/opdrachtgevers waarvan binnenkomende betalingen als zakelijke inkomsten gelden.
              </p>
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
                isExpanded={expandedBusinessIncomeList}
                onToggleExpand={() => setExpandedBusinessIncomeList((v) => !v)}
              />
            </section>
            {!expandedBusinessIncomeList && (
              <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold mb-1">Zakelijke uitgaven (leveranciers)</h2>
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
                  entriesLabel="Nu herkend als Zakelijke uitgaven"
                  onReclassify={reclassifyBusinessEntry}
                />
              </section>
            )}
          </div>
        )}

        {transactions.length > 0 && pendingIncomeReview.length > 0 && (
          <IncomeReviewStep
            items={pendingIncomeReview}
            totalCount={incomeSummary.length}
            doneCount={incomeSummary.length - pendingIncomeReview.length}
            search={incomeSearch}
            onSearch={setIncomeSearch}
            onMark={markIncomeSource}
            accountTypeByFile={accountTypeByFile}
          />
        )}

        {transactions.length > 0 && pendingIncomeReview.length === 0 && (
          <>
            {personSummary.length > 0 && (
              <section ref={personReviewSectionRef} className="rounded-lg border border-fuchsia-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-fuchsia-50 text-fuchsia-900 flex items-center gap-2">
                  <span className="text-sm font-semibold">Overboekingen aan personen controleren</span>
                  {pendingPersonReview.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {pendingPersonReview.length}
                    </span>
                  )}
                </div>
                <ReviewStep
                  items={pendingPersonReview.length > 0 ? pendingPersonReview : personSummary}
                  allDone={pendingPersonReview.length === 0}
                  search={personSearch}
                  onSearch={setPersonSearch}
                  onMark={markPersonSource}
                  onConfirm={confirmPersonAsIs}
                  defaultCategory="Overboekingen aan personen"
                  confirmButtonClass="border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100"
                  explanation='Kies per tegenpartij de juiste categorie én of het zakelijk of privé is. De keuze geldt meteen voor alle transacties van diezelfde tegenpartij, in alle jaren.'
                />
              </section>
            )}

            {overigSummary.length > 0 && (
              <section ref={overigReviewSectionRef} className="rounded-lg border border-amber-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-amber-50 text-amber-900 flex items-center gap-2">
                  <span className="text-sm font-semibold">"Overig" opruimen</span>
                  {pendingOverigReview.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {pendingOverigReview.length}
                    </span>
                  )}
                </div>
                <ReviewStep
                  items={pendingOverigReview.length > 0 ? pendingOverigReview : overigSummary}
                  allDone={pendingOverigReview.length === 0}
                  search={overigSearch}
                  onSearch={setOverigSearch}
                  onMark={markOverigItem}
                  onConfirm={confirmOverigAsIs}
                  defaultCategory="Overig"
                  confirmButtonClass="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  explanation='Kies per tegenpartij de juiste categorie én of het zakelijk of privé is, of klik "Klopt zo" als Overig hier bewust moet blijven staan.'
                />
              </section>
            )}

            {periodeMismatches.length > 0 && (
              <section ref={periodeReviewSectionRef} className="rounded-lg border border-sky-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-sky-50 text-sky-900 flex items-center gap-2">
                  <span className="text-sm font-semibold">Factuurperiode vs. boekingskwartaal controleren</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {periodeMismatches.length}
                  </span>
                </div>
                <PeriodeReviewStep items={periodeMismatches} onConfirm={confirmPeriodeAsIs} onMove={movePeriodeToQuarter} onOpenHelp={setHelpPopupChapter} />
              </section>
            )}

            <div ref={loansSectionRef}>
              <LoanInterestPanel
                loanSummary={loanSummary}
                loanDetails={loanDetails}
                onOpenModal={setLoanDetailsModalKey}
                onMarkUnknown={markLoanUnknown}
                onUnmarkUnknown={unmarkLoanUnknown}
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
                onOpenHelp={setHelpPopupChapter}
              />
            </div>

            {years.length > 0 && activeYear && (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {years.length > 1 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400">Jaar:</span>
                      {years.map((year) => (
                        <button
                          key={year}
                          onClick={() => setActiveYear(year)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium border ${
                            year === activeYear ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
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
                      className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-slate-400"
                    >
                      <Download className="h-3.5 w-3.5" /> Excel exporteren
                    </button>
                    <button
                      onClick={() => printReport(groups)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-slate-400"
                      title="Opent direct het printvenster van je browser — kies daar een printer, of 'Opslaan als PDF'"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                    <button
                      onClick={() => {
                        if (!showAangifteYearPicker && selectedAangifteYears.length === 0) setSelectedAangifteYears([activeYear]);
                        setShowAangifteYearPicker((v) => !v);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-slate-400"
                      title="Kies voor welke jaren je een voorstel wilt zien"
                    >
                      <Download className="h-3.5 w-3.5" /> Aangiftevoorstel
                    </button>
                  </div>
                </div>

                {showAangifteYearPicker && (
                  <div className="rounded-lg border border-slate-300 bg-white p-4">
                    <p className="text-sm font-medium mb-2">Voor welke jaren wil je een aangiftevoorstel?</p>
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
                      <button onClick={exportAangiftevoorstel} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
                        Toon voorbeeld
                      </button>
                      <button onClick={() => setShowAangifteYearPicker(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                {yearlySummary && (
                  <YearSummaryCard
                    year={activeYear}
                    summary={yearlySummary}
                    openOB={yearlyOpenOB[activeYear] || 0}
                    ibEstimate={ibEstimate}
                    korRegeling={korRegeling}
                    manualPriveUitgaven={manualPriveUitgaven}
                    setManualPriveUitgaven={setManualPriveUitgaven}
                    ibGedaan={!!ibStatus[activeYear]?.gedaan}
                    setIbGedaan={setIbGedaan}
                    onOpenHelp={setHelpPopupChapter}
                  />
                )}

                <div ref={checklistSectionRef}>
                  <AangifteChecklistPanel checklistData={checklistData} activeYear={activeYear} korRegeling={korRegeling} btwVerlegd={btwVerlegd} />
                </div>

                <div ref={obIbSectionRef}>
                  <ObIbExplanationPanel
                    activeYear={activeYear}
                    btwBoxMapping={btwBoxMapping}
                    ibBoxMapping={ibBoxMapping}
                    korRegeling={korRegeling}
                    ibGedaan={!!ibStatus[activeYear]?.gedaan}
                    setIbGedaan={setIbGedaan}
                    loanSummary={loanSummary}
                    loanDetails={loanDetails}
                  />
                </div>

                <div ref={multiYearSectionRef}>
                  <MultiYearOverview
                    years={years}
                    yearlySummaries={yearlySummaries}
                    yearlyOpenOB={yearlyOpenOB}
                    korRegeling={korRegeling}
                    onYearClick={setActiveYear}
                    ibStatus={ibStatus}
                    manualPriveUitgaven={manualPriveUitgaven}
                    volledigeJaren={volledigeJaren}
                    businessAdvies={businessAdvies}
                    activeYear={activeYear}
                  />
                </div>

                <div ref={quarterlyBtwSectionRef}>
                  {!korRegeling && (
                    <QuarterlyBtwPanel
                      quarters={quarterlyBtwData}
                      kwartaalStatus={kwartaalStatus}
                      setKwartaalStatusField={setKwartaalStatusField}
                      activeYear={activeYear}
                      onOpenHelp={setHelpPopupChapter}
                    />
                  )}
                </div>

                {(() => {
                  const isTransferCat = (c) => c === "Uitbetaling aan prive" || c === "Prive opnames";
                  const zakSum = zakGroupForYear.items.filter((t) => isTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
                  const priSum = priGroupForYear.items.filter((t) => isTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
                  const diff = Math.round((zakSum + priSum) * 100) / 100;
                  if (zakSum === 0 && priSum === 0) return null;
                  const ok = Math.abs(diff) < 0.01;
                  return (
                    <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
                      {ok ? <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
                      <p className={`text-sm ${ok ? "text-emerald-900" : "text-amber-900"}`}>
                        <strong>Controle "Uitbetaling aan prive" / "Prive opnames"</strong>: Zakelijk {eur(zakSum)} tegenover Prive {eur(priSum)}
                        {ok ? " — komt overeen (samen nul, zoals het hoort)." : <> — komt <strong>niet</strong> overeen (verschil {eur(diff)}). Mogelijk staat er aan de privékant een aparte, niet-gekoppelde transactie, of ontbreekt er iets.</>}
                      </p>
                    </div>
                  );
                })()}

                <RecurringPaymentsPanel classified={classified} activeYear={activeYear} />

                <p className="text-xs text-slate-400">
                  Sleep een transactie (aan het handvat <span className="inline-block align-middle">⠿</span>) naar de andere tabel om 'm van Zakelijk naar Prive te verplaatsen, of andersom.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <CategorySummaryCard group={zakGroupForYear} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} />
                  <CategorySummaryCard group={priGroupForYear} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} />
                </div>
                <div className={expandedTable ? "grid grid-cols-1 gap-4" : "grid md:grid-cols-2 gap-4 items-start"}>
                  {(!expandedTable || expandedTable === "Zakelijk") && (
                    <div
                      data-dropzone="Zakelijk"
                      className={`rounded-lg transition-colors ${dragState && dragState.overZone === "Zakelijk" && dragState.tx.type !== "Zakelijk" ? "ring-2 ring-emerald-400" : ""}`}
                    >
                      <DetailTable
                        group={zakGroupForYear}
                        onCounterpartyOverride={setCounterpartyOverride}
                        onRowOverride={setRowOverride}
                        enableDrag
                        onRowDragStart={startRowDrag}
                        draggingTxId={dragState ? dragState.tx.id : null}
                        isExpanded={expandedTable === "Zakelijk"}
                        onToggleExpand={() => setExpandedTable((v) => (v === "Zakelijk" ? null : "Zakelijk"))}
                      />
                    </div>
                  )}
                  {(!expandedTable || expandedTable === "Prive") && (
                    <div
                      data-dropzone="Prive"
                      className={`rounded-lg transition-colors ${dragState && dragState.overZone === "Prive" && dragState.tx.type !== "Prive" ? "ring-2 ring-slate-400" : ""}`}
                    >
                      <DetailTable
                        group={priGroupForYear}
                        onCounterpartyOverride={setCounterpartyOverride}
                        onRowOverride={setRowOverride}
                        enableDrag
                        onRowDragStart={startRowDrag}
                        draggingTxId={dragState ? dragState.tx.id : null}
                        isExpanded={expandedTable === "Prive"}
                        onToggleExpand={() => setExpandedTable((v) => (v === "Prive" ? null : "Prive"))}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {aangiftevoorstelPreview && (
          <section className="rounded-lg border-2 border-slate-900 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
              <p className="text-sm font-semibold">Voorbeeld: Aangiftevoorstel {selectedAangifteYears.join(", ")}</p>
              <div className="flex gap-2 shrink-0">
                <button onClick={downloadAangiftevoorstelPreview} className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
                  <Download className="h-4 w-4" /> Downloaden
                </button>
                <button
                  onClick={printAangiftevoorstelPreview}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                  title="Opent het printvenster; werkt niet vanuit de app-op-beginscherm-modus — gebruik dan Downloaden."
                >
                  <Printer className="h-4 w-4" /> Printen
                </button>
                <button onClick={() => setAangiftevoorstelPreview(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Sluiten
                </button>
              </div>
            </div>
            <iframe srcDoc={aangiftevoorstelPreview} title="Voorbeeld aangiftevoorstel" className="w-full bg-white" style={{ height: "70vh", border: "none" }} />
          </section>
        )}
      </main>

      {dragState && (
        <div
          className={`fixed z-50 pointer-events-none rounded-md border-2 shadow-lg px-3 py-2 text-xs font-medium bg-white ${
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

      {loanDetailsModalKey && (
        <LoanDetailsModal
          loan={loanSummary.find((l) => l.key === loanDetailsModalKey)}
          details={loanDetails[loanDetailsModalKey]}
          onSave={setLoanDetailField}
          onClose={() => setLoanDetailsModalKey(null)}
        />
      )}

      {leaseDetailsModalKey && (
        <LoanDetailsModal
          kind="lease"
          loan={leaseSummary.find((l) => l.key === leaseDetailsModalKey)}
          details={leaseDetails[leaseDetailsModalKey]}
          onSave={setLeaseDetailField}
          onClose={() => setLeaseDetailsModalKey(null)}
        />
      )}

      <ConfirmBanner message={confirmMessage} onConfirm={doClearAllData} onCancel={() => setConfirmMessage(null)} />
    </div>
  );
}
