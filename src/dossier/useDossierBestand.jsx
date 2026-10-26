// beide-V7R8 — dossier opslaan, laden en nieuw dossier uit App.jsx gehaald. App geeft de dossiergegevens en de
// zetters mee (dossierCtx gaat door naar dossier/dossierLaden.jsx); de hook houdt de opslaankeuze (met/zonder wachtwoord).
import { useDossierSoort } from "../modus/useDossierSoort.jsx";
import { maakHerstelcode } from "../storage/herstelcode.js";
import { buildProjectFile, downloadProjectFile } from "../storage/projectFile.js";
import { BTW_RATES_VERSION } from "../tax/btw.js";
import { laadDossierBestand, wisDossier } from "./dossierLaden.jsx";
import { useDossierDialogen } from "./useDossierDialogen.jsx";
import { useOpslaanHerinnering } from "./useOpslaanHerinnering.jsx";
import { useSessieWaarschuwing } from "./useSessieWaarschuwing.jsx";
import { useState } from "react";
import HerstelcodeModal from "../components/shared/HerstelcodeModal.jsx";
import OpslaanModal, { BEHOUD } from "../components/shared/OpslaanModal.jsx";
import WachtwoordModal from "../components/shared/WachtwoordModal.jsx";

export function useDossierBestand({
  activeTab, activeYear, auditLog, basisvragenNietGestart, changesSinceExport, dossierGegevens, dossierHerstelcode,
  dossierOpenPoints, dossierWachtwoord, eigenNamen, lastExportAt, loadedProjectFileName, magUitgebreid,
  overgeslagenStappen, parsedFiles, projectFileInputRef, rechtenPerSoort, restoredChangesRef,
  setAangiftevoorstelPreview, setAccountTypeByFile, setActivaDetails, setActivaDetailsModalKey, setActiveTab,
  setActiveYear, setAuditLog, setAutoActivaDetails, setAutoStatusState, setAutoWizardStatus, setBankKoppelingen,
  setBevestigdeControles, setBtwVerlegd, setBusinessExpenseKeywords, setBusinessKeywords, setCategoryBtwRates,
  setCategoryRules, setCategoryZakelijkPercentageState, setChangesSinceExport, setConfirmedLeaseTypeKeys, setDialog,
  setDismissedDuplicateNotice, setDossierHerstelcode, setDossierWachtwoord, setEenvoudigGezien, setEigenNamen,
  setEigenRekeningenExtra, setEnergieZakelijkPercentageStatusState, setError, setExcludedDuplicateFingerprints,
  setExcludedManualFingerprints, setExpandedCardKeys, setFixedCategories,
  setGemeentelijkeKostenZakelijkPercentageStatusState, setHeeftHolding, setHeeftVoorraad,
  setHoldingBoekingen, setHuurZakelijkPercentageStatusState, setIbStatus, setIncomeBtwTarieven,
  setKmVergoedingDetailsState, setKorRegeling, setKwartaalStatus, setLastExportAt, setLeaseDetails,
  setLeaseDetailsModalKey, setLeaseMergedInto, setLoadedProjectFileName, setLoanDetails, setLoanDetailsModalKey,
  setManualWizardOpen, setMaxStappen, setMeerdereTarievenBevestigd, setModusKeuzeOpen, setModusNaLaden,
  setOpdrachtgeversGevraagd, setOpeningBalanceCorrections, setOvergeslagenStappen, setOverigInkomenBox1State,
  setOverridesByCounterparty, setOverridesByRow, setParsedFiles, setPeriodeQuarterOverrides, setPriveAntwoorden,
  setRechtsvorm, setReviewFileModal, setReviewedIncomeKeys, setReviewedOverigKeys, setReviewedPeriodeKeys,
  setReviewedPersonKeys, setSaveState, setSelectedAangifteYears, setShowAangifteYearPicker, setSoortDossier,
  setStartersaftrekStatusState, setTariefOverridesState, setTransactionNotes, setVerwachteAOV,
  setVerwachteAangeboden, setVerwachteLease, setVerwachteLeaseOverig, setVerwachteLening, setVerwachteMatchSuggestie,
  setVoorbelastingExcluded, setVpbStatus, setWeergave, setWerkruimteStatusState, setZaLegacyJaDefault,
  setZakelijkeSpaarRekening, setZelfstandigenaftrekStatusState, setZvwStatus, snapshotBeforeAction, soortDossier,
  startNieuwDossierWizard, suppressChangeCount, 
}) {
  const [herstelcodeToon, setHerstelcodeToon] = useState(null); // { code, nieuw }
  const [wachtwoordModal, setWachtwoordModal] = useState(null); // { modus: "vraag"|"instellen", fout, resolve }
  const vraagWachtwoord = (fout) => new Promise((resolve) => setWachtwoordModal({ modus: "vraag", fout, resolve }));
  const [resumeHint, setResumeHint] = useState(null);
  // ---- Dossier opslaan als downloadbaar bestand ----
  const saveProjectFile = async (pwOverride, codeOverride) => {
    const pwGebruik = typeof pwOverride === "string" ? pwOverride : dossierWachtwoord;
    let codeGebruik = null;
    if (pwGebruik) {
      codeGebruik = typeof codeOverride === "string" ? codeOverride : dossierHerstelcode;
      if (!codeGebruik) {
        // Eerst de herstelcode tonen en laten bevestigen; pas daarna wordt het bestand opgeslagen.
        const nieuweCode = maakHerstelcode();
        setHerstelcodeToon({ code: nieuweCode, nieuw: true, daarna: () => { setDossierHerstelcode(nieuweCode); saveProjectFile(pwGebruik, nieuweCode); } });
        return;
      }
    } else if (dossierHerstelcode) setDossierHerstelcode(null);
    const project = buildProjectFile({
      auditLog,
      ...dossierGegevens, dossierSoort: soortDossier, btwRatesVersion: BTW_RATES_VERSION,
      resumePositie: { tab: activeTab, jaar: activeYear, openPunten: dossierOpenPoints },
      overgeslagenStappen,
    });
    let filename;
    try {
      filename = await downloadProjectFile(project, loadedProjectFileName, eigenNamen?.ondernemer, pwGebruik, codeGebruik);
    } catch (e) {
      setError(e.message || "Opslaan mislukt.");
      return;
    }
    setLoadedProjectFileName(filename);
    restoredChangesRef.current = 0;
    setChangesSinceExport(0);
    setLastExportAt(new Date());
  };

  // Sidebar-knop: bij een nieuw (onbeveiligd) dossier eerst kiezen met/zonder wachtwoord; daarna direct opslaan.
  const [opslaanModal, setOpslaanModal] = useState(false);
  const [opslaanKeuzeGemaakt, setOpslaanKeuzeGemaakt] = useState(false);
  // V7R4 — met wachtwoord: één keer per (geladen of nieuw) wachtwoord vragen of het erop blijft.
  const [wachtwoordBevestigd, setWachtwoordBevestigd] = useState(null);
  const startOpslaan = () => {
    if (dossierWachtwoord ? wachtwoordBevestigd === dossierWachtwoord : opslaanKeuzeGemaakt) saveProjectFile();
    else setOpslaanModal(true);
  };

  // ---- Dossier laden vanaf een bestand ----
  const dossierCtx = {
    setSoortDossier, suppressChangeCount, snapshotBeforeAction, vraagWachtwoord, setDossierHerstelcode,
    setAuditLog, setBevestigdeControles,
    setDossierWachtwoord: (pw) => { setWachtwoordBevestigd(null); setDossierWachtwoord(pw); }, // V7R4 — na laden opnieuw vragen
    setAangiftevoorstelPreview, setAccountTypeByFile, setActivaDetails, setActivaDetailsModalKey,
    setActiveTab, setActiveYear, setAutoActivaDetails, setAutoStatusState,
    setAutoWizardStatus, setBtwVerlegd, setBusinessExpenseKeywords, setBusinessKeywords,
    setCategoryBtwRates, setCategoryRules, setCategoryZakelijkPercentageState, setConfirmedLeaseTypeKeys,
    setDialog, setDismissedDuplicateNotice, setEigenNamen, setEigenRekeningenExtra, setBankKoppelingen,
    setEnergieZakelijkPercentageStatusState, setError, setExcludedDuplicateFingerprints, setExcludedManualFingerprints,
    setExpandedCardKeys, setFixedCategories, setGemeentelijkeKostenZakelijkPercentageStatusState, setHeeftHolding,
    setHeeftVoorraad, setHoldingBoekingen, setHuurZakelijkPercentageStatusState, setIbStatus,
    setIncomeBtwTarieven, setKmVergoedingDetailsState, setKorRegeling, setKwartaalStatus,
    setLastExportAt, setLeaseDetails, setLeaseDetailsModalKey, setLeaseMergedInto,
    setLoadedProjectFileName, setLoanDetails, setLoanDetailsModalKey, setManualWizardOpen,
    setMaxStappen, setMeerdereTarievenBevestigd, setOpdrachtgeversGevraagd, setOpeningBalanceCorrections,
    setOvergeslagenStappen, setOverridesByCounterparty, setOverridesByRow, setParsedFiles,
    setPeriodeQuarterOverrides, setRechtsvorm, setResumeHint, setReviewFileModal,
    setReviewedIncomeKeys, setReviewedOverigKeys, setReviewedPeriodeKeys, setReviewedPersonKeys,
    setSaveState, setSelectedAangifteYears, setShowAangifteYearPicker, setStartersaftrekStatusState, setWerkruimteStatusState, setWeergave, setEenvoudigGezien, startNieuwDossierWizard, naDossierLaden: (w) => { setModusKeuzeOpen(false); if (magUitgebreid && w === "eenvoudig") setModusNaLaden(w); }, setTariefOverridesState, setOverigInkomenBox1State, setPriveAntwoorden,
    setTransactionNotes, setVerwachteAOV, setVerwachteAangeboden, setVerwachteLease,
    setVerwachteLeaseOverig, setVerwachteLening, setVerwachteMatchSuggestie, setVoorbelastingExcluded,
    setVpbStatus, setZaLegacyJaDefault, setZakelijkeSpaarRekening, setZelfstandigenaftrekStatusState,
    setZvwStatus,
  };
  const loadProjectFile = (file) => laadDossierBestand(file, dossierCtx);
  const doClearAllData = (askWizard = false) => wisDossier(dossierCtx, askWizard);
  const dossierSoortKeuze = useDossierSoort({
    soorten: rechtenPerSoort, soortDossier, setSoortDossier, heeftDossier: parsedFiles.length > 0 || !!loadedProjectFileName,
    setDialog, onNieuwDossier: () => { setDialog(null); doClearAllData(true); },
  });

  // ---- Dossier laden: vraagt eerst bevestiging als er al een dossier openstaat (v304) ----
  // loadProjectFile vervangt het hele huidige dossier; voorheen zonder enige waarschuwing en zonder
  // ongedaan maken. Nu: keuzevenster mét namen van beide dossiers, optioneel eerst opslaan, en een
  // momentopname zodat "Ongedaan maken" het vorige dossier terugzet.
  // V52 — volgorde omgedraaid: eerst de vraag of het HUIDIGE dossier moet worden opgeslagen, pas daarna
  // het kiezen van het te laden dossier (voorheen eerst kiezen, dan pas vragen).
  const openProjectPicker = () => projectFileInputRef.current?.click();
  const requestLoadProject = (file) => {
    if (parsedFiles.length > 0) snapshotBeforeAction("Dossier geladen");
    loadProjectFile(file);
  };

  // ---- Nieuw dossier (voorheen "Wis alles") ----
  // v304 — zelfde handeling als voorheen (alles leegmaken, met momentopname voor "Ongedaan maken"),
  // maar benoemd zoals een professional ernaar kijkt (klaar met cliënt A, nu cliënt B) en met de
  // kans om eerst een dossierbestand te bewaren. De oude tekst "kan niet ongedaan worden gemaakt"
  // klopte al niet meer: er wordt wel degelijk een momentopname gemaakt.
  // V33 — de opslagvraag komt alleen nog als er sinds de laatste opslag/het laden iets is gewijzigd.
  const opslaanHerinnering = useOpslaanHerinnering({ changesSinceExport, hasData: parsedFiles.length > 0 });
  const sessie = useSessieWaarschuwing(); // release32V1 — einde Cloudflare-inlogsessie
  const { startLoadProject, clearAllData } = useDossierDialogen({
    parsedFilesCount: parsedFiles.length, changesSinceExport, eigenNamen, lastExportAt, loadedProjectFileName,
    setDialog, saveProjectFile, openProjectPicker, doClearAllData, setActiveTab, setManualWizardOpen: (v) => (v ? startNieuwDossierWizard() : setManualWizardOpen(false)),
    heeftAntwoorden: !basisvragenNietGestart,
  });


  // Vensters voor opslaan (met/zonder wachtwoord), herstelcode en wachtwoord (vragen bij laden of instellen).
  const dossierVensters = (
    <>
    {opslaanModal && (
      <OpslaanModal
        heeftWachtwoord={!!dossierWachtwoord}
        onAnnuleer={() => setOpslaanModal(false)}
        onOpslaan={(pw) => {
          setOpslaanModal(false);
          setOpslaanKeuzeGemaakt(true);
          if (pw === BEHOUD) { setWachtwoordBevestigd(dossierWachtwoord); saveProjectFile(); return; }
          if (!pw && dossierWachtwoord) { setDossierWachtwoord(null); setDossierHerstelcode(null); }
          if (pw) { setDossierWachtwoord(pw); setWachtwoordBevestigd(pw); }
          saveProjectFile(pw || "");
        }}
      />
    )}
    {herstelcodeToon && <HerstelcodeModal code={herstelcodeToon.code} nieuw={herstelcodeToon.nieuw} onSluit={() => setHerstelcodeToon(null)} onBevestig={herstelcodeToon.daarna ? () => { const f = herstelcodeToon.daarna; setHerstelcodeToon(null); f(); } : null} />}
    {wachtwoordModal && (
      <WachtwoordModal
        modus={wachtwoordModal.modus}
        fout={wachtwoordModal.fout}
        heeftWachtwoord={!!dossierWachtwoord}
        onOK={(pw) => {
          if (wachtwoordModal.modus === "vraag") wachtwoordModal.resolve(pw);
          else { setDossierWachtwoord(pw); setWachtwoordBevestigd(pw); setChangesSinceExport((n) => Math.max(n, 1)); }
          setWachtwoordModal(null);
        }}
        onAnnuleer={() => { if (wachtwoordModal.modus === "vraag") wachtwoordModal.resolve(null); setWachtwoordModal(null); }}
        onVerwijder={() => { setOpslaanKeuzeGemaakt(true); setDossierWachtwoord(null); setDossierHerstelcode(null); setChangesSinceExport((n) => Math.max(n, 1)); setWachtwoordModal(null); }}
      />
    )}
    </>
  );
  return {
    dossierVensters, setHerstelcodeToon, setWachtwoordModal,
    clearAllData, dossierSoortKeuze, opslaanHerinnering, requestLoadProject, resumeHint,
    sessie, setResumeHint,
    startLoadProject, startOpslaan,
  };
}
