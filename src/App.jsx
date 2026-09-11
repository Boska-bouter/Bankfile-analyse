import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Check, Download, Trash2, Loader2 } from "lucide-react";

import { parseFile } from "./importers/detector.js";
import { buildTransactions, checkBalanceConsistency } from "./importers/transactions.js";
import { resolveClassification } from "./classification/classify.js";
import { DEFAULT_RULES, mergeCategoryRules, migrateLegacyCategoryName } from "./classification/categories.js";
import { DEFAULT_BTW_RATES, EMPTY_BTW_RATES, mergeBtwRates, BTW_RATES_VERSION, DEFAULT_VOORBELASTING_EXCLUDED, computeQuarterlyBtwForYear } from "./tax/btw.js";
import { computeYearlySummary, computeYearlyOpenOB } from "./tax/yearlySummary.js";
import { estimateIncomeTax } from "./tax/incomeTax.js";
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
import AccountTypeChooser from "./components/upload/AccountTypeChooser.jsx";
import GroupView from "./components/overview/GroupView.jsx";
import BtwRatesPanel from "./components/btw/BtwRatesPanel.jsx";
import IncomeReviewStep from "./components/review/IncomeReviewStep.jsx";
import ReviewStep from "./components/review/ReviewStep.jsx";
import QuarterlyBtwPanel from "./components/btw/QuarterlyBtwPanel.jsx";
import YearSummaryCard from "./components/overview/YearSummaryCard.jsx";
import MultiYearOverview from "./components/overview/MultiYearOverview.jsx";
import TodoPanel from "./components/dashboard/TodoPanel.jsx";

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
  const [businessKeywords, setBusinessKeywords] = useState([]);
  const [businessExpenseKeywords, setBusinessExpenseKeywords] = useState([]);
  const [reviewedIncomeKeys, setReviewedIncomeKeys] = useState([]);
  const [reviewedPersonKeys, setReviewedPersonKeys] = useState([]);
  const [reviewedOverigKeys, setReviewedOverigKeys] = useState([]);
  const [kwartaalStatus, setKwartaalStatus] = useState({});
  const [voorbelastingExcluded, setVoorbelastingExcluded] = useState(DEFAULT_VOORBELASTING_EXCLUDED);
  const [incomeSearch, setIncomeSearch] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [overigSearch, setOverigSearch] = useState("");
  const [activeYear, setActiveYear] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [loadedProjectFileName, setLoadedProjectFileName] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState(null);
  const projectFileInputRef = useRef(null);
  const skipNextPersistRef = useRef(false);
  const duplicatesSectionRef = useRef(null);
  const personReviewSectionRef = useRef(null);
  const overigReviewSectionRef = useRef(null);
  const quarterlyBtwSectionRef = useRef(null);
  const multiYearSectionRef = useRef(null);
  const btwSettingsSectionRef = useRef(null);

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
    setBusinessKeywords(Array.isArray(settings.businessKeywords) ? settings.businessKeywords : []);
    setBusinessExpenseKeywords(Array.isArray(settings.businessExpenseKeywords) ? settings.businessExpenseKeywords : []);
    setReviewedIncomeKeys(Array.isArray(settings.reviewedIncomeKeys) ? settings.reviewedIncomeKeys : []);
    setReviewedPersonKeys(Array.isArray(settings.reviewedPersonKeys) ? settings.reviewedPersonKeys : []);
    setReviewedOverigKeys(Array.isArray(settings.reviewedOverigKeys) ? settings.reviewedOverigKeys : []);
    setKwartaalStatus(settings.kwartaalStatus && typeof settings.kwartaalStatus === "object" ? settings.kwartaalStatus : {});
    setVoorbelastingExcluded(Array.isArray(settings.voorbelastingExcluded) ? settings.voorbelastingExcluded : DEFAULT_VOORBELASTING_EXCLUDED);
  };
  const setKwartaalStatusField = (key, field, value) => {
    setKwartaalStatus((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  // ---- Eerder opgeslagen project laden bij openen ----
  useEffect(() => {
    (async () => {
      const pendingData = await loadPersistedParsedFiles();
      const pendingSettings = await loadPersistedSettings();
      skipNextPersistRef.current = true;
      if (pendingData) setParsedFiles(pendingData);
      if (pendingSettings) applySettingsToState(pendingSettings);
      setLoaded(true);
    })();
  }, []);

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
        kwartaalStatus, voorbelastingExcluded,
      });
      setSaveState(ok1 && ok2 ? "saved" : "error");
    })();
  }, [
    parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
    categoryBtwRates, btwVerlegd, korRegeling, excludedDuplicateFingerprints,
    businessKeywords, businessExpenseKeywords, reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
    kwartaalStatus, voorbelastingExcluded,
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
    if (excludedDuplicateFingerprints.length === 0) return allTransactions;
    const excludedSet = new Set(excludedDuplicateFingerprints);
    return allTransactions.filter((tx) => !excludedSet.has(fingerprintByTxId[tx.id]));
  }, [allTransactions, excludedDuplicateFingerprints, fingerprintByTxId]);
  const removeDuplicates = () => {
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

  const classified = useMemo(
    () =>
      transactions.map((tx) => ({
        ...tx,
        ...resolveClassification(tx, categoryRules, businessKeywords, businessExpenseKeywords, accountTypeByFile[tx.source], overridesByCounterparty, overridesByRow),
      })),
    [transactions, categoryRules, businessKeywords, businessExpenseKeywords, accountTypeByFile, overridesByCounterparty, overridesByRow]
  );

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
  const zakGroupForYear = groups.find((g) => g.year === activeYear && g.type === "Zakelijk") || { label: `Zakelijk ${activeYear}`, type: "Zakelijk", year: activeYear, items: [] };
  const priGroupForYear = groups.find((g) => g.year === activeYear && g.type === "Prive") || { label: `Prive ${activeYear}`, type: "Prive", year: activeYear, items: [] };

  const quarterlyBtwData = useMemo(
    () => (activeYear ? computeQuarterlyBtwForYear(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded) : []),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded]
  );
  const yearlySummary = useMemo(
    () => (activeYear ? computeYearlySummary(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd) : null),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd]
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
    for (const y of years) map[y] = computeYearlySummary(classified, y, effectiveCategoryBtwRates, btwVerlegd);
    return map;
  }, [years, classified, effectiveCategoryBtwRates, btwVerlegd]);

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
  ]);

  // ---- Project opslaan als downloadbaar bestand ----
  const saveProjectFile = () => {
    const project = buildProjectFile({
      parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
      categoryBtwRates, btwVerlegd, korRegeling, btwRatesVersion: BTW_RATES_VERSION,
      excludedDuplicateFingerprints, businessKeywords, businessExpenseKeywords,
      reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
      kwartaalStatus, voorbelastingExcluded,
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
    setBusinessKeywords([]);
    setBusinessExpenseKeywords([]);
    setReviewedIncomeKeys([]);
    setReviewedPersonKeys([]);
    setReviewedOverigKeys([]);
    setKwartaalStatus({});
    setVoorbelastingExcluded(DEFAULT_VOORBELASTING_EXCLUDED);
    setActiveYear(null);
    setLoadedProjectFileName(null);
    setError(null);
    await clearPersistedData();
    await clearPersistedSettings();
    setSaveState("idle");
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-slate-900 text-stone-50">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Bankoverzicht — Zakelijk &amp; Privé (v2, in migratie)</h1>
            <p className="text-xs text-slate-400 mt-1">
              Vite/React-versie — logicalagen volledig gemigreerd, UI-panelen worden stapsgewijs overgezet.
            </p>
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

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

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
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800">
                        <AlertCircle className="h-2.5 w-2.5" /> saldo klopt niet ({eur(balanceCheck.diff)})
                      </span>
                    ))}
                </span>
              );
            })}
          </section>
        )}

        <AccountTypeChooser pendingFileNames={pendingAccountFiles} onChoose={setAccountType} />

        <TodoPanel items={todoItems} />

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
            />
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

            {years.length > 0 && activeYear && (
              <>
                {years.length > 1 && (
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
                )}

                {yearlySummary && (
                  <YearSummaryCard
                    year={activeYear}
                    summary={yearlySummary}
                    openOB={yearlyOpenOB[activeYear] || 0}
                    ibEstimate={ibEstimate}
                    korRegeling={korRegeling}
                  />
                )}

                <div ref={multiYearSectionRef}>
                  <MultiYearOverview
                    years={years}
                    yearlySummaries={yearlySummaries}
                    yearlyOpenOB={yearlyOpenOB}
                    korRegeling={korRegeling}
                    onYearClick={setActiveYear}
                  />
                </div>

                <div ref={quarterlyBtwSectionRef}>
                  {!korRegeling && (
                    <QuarterlyBtwPanel
                      quarters={quarterlyBtwData}
                      kwartaalStatus={kwartaalStatus}
                      setKwartaalStatusField={setKwartaalStatusField}
                      activeYear={activeYear}
                    />
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4 items-start">
                  <GroupView
                    group={zakGroupForYear}
                    onCounterpartyOverride={setCounterpartyOverride}
                    onRowOverride={setRowOverride}
                    categoryBtwRates={effectiveCategoryBtwRates}
                    btwVerlegd={btwVerlegd}
                  />
                  <GroupView
                    group={priGroupForYear}
                    onCounterpartyOverride={setCounterpartyOverride}
                    onRowOverride={setRowOverride}
                    categoryBtwRates={effectiveCategoryBtwRates}
                    btwVerlegd={btwVerlegd}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>

      <ConfirmBanner message={confirmMessage} onConfirm={doClearAllData} onCancel={() => setConfirmMessage(null)} />
    </div>
  );
}
