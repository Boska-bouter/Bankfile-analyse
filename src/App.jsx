import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Check, Download, Trash2, Loader2 } from "lucide-react";

import { parseFile } from "./importers/detector.js";
import { buildTransactions, checkBalanceConsistency } from "./importers/transactions.js";
import { resolveClassification } from "./classification/classify.js";
import { DEFAULT_RULES, mergeCategoryRules } from "./classification/categories.js";
import { DEFAULT_BTW_RATES } from "./tax/btw.js";
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
  const [activeYear, setActiveYear] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [loadedProjectFileName, setLoadedProjectFileName] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState(null);
  const projectFileInputRef = useRef(null);
  const skipNextPersistRef = useRef(false);

  const applySettingsToState = (settings) => {
    setAccountTypeByFile(settings.accountTypeByFile || {});
    setOverridesByCounterparty(settings.overridesByCounterparty || {});
    setOverridesByRow(settings.overridesByRow || {});
    if (Array.isArray(settings.categoryRules)) setCategoryRules(mergeCategoryRules(settings.categoryRules));
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
      const ok2 = await persistSettings({ accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules });
      setSaveState(ok1 && ok2 ? "saved" : "error");
    })();
  }, [parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules, loaded]);

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

  const pendingAccountFiles = useMemo(
    () => parsedFiles.map((f) => f.fileName).filter((name) => !(name in accountTypeByFile)),
    [parsedFiles, accountTypeByFile]
  );
  const setAccountType = (fileName, type) => {
    setAccountTypeByFile((prev) => ({ ...prev, [fileName]: type }));
  };

  const classified = useMemo(
    () =>
      allTransactions.map((tx) => ({
        ...tx,
        ...resolveClassification(tx, categoryRules, [], [], accountTypeByFile[tx.source], overridesByCounterparty, overridesByRow),
      })),
    [allTransactions, categoryRules, accountTypeByFile, overridesByCounterparty, overridesByRow]
  );

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

  // ---- Project opslaan als downloadbaar bestand ----
  const saveProjectFile = () => {
    const project = buildProjectFile({ parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules });
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
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <GroupView
                group={zakGroupForYear}
                onCounterpartyOverride={setCounterpartyOverride}
                onRowOverride={setRowOverride}
                categoryBtwRates={DEFAULT_BTW_RATES}
                btwVerlegd={false}
              />
              <GroupView
                group={priGroupForYear}
                onCounterpartyOverride={setCounterpartyOverride}
                onRowOverride={setRowOverride}
                categoryBtwRates={DEFAULT_BTW_RATES}
                btwVerlegd={false}
              />
            </div>
          </>
        )}
      </main>

      <ConfirmBanner message={confirmMessage} onConfirm={doClearAllData} onCancel={() => setConfirmMessage(null)} />
    </div>
  );
}
