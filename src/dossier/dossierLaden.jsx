// Dossier laden en wissen (uit App.jsx gehaald, stap 5 van de opsplitsing).
// Beide functies zetten de state van App terug via de setters in `c` (zie `dossierCtx` in App.jsx).
import { readProjectFile } from "../storage/projectFile.js";
import { clearPersistedData, clearPersistedSettings } from "../storage/projectStorage.js";
import { DEFAULT_RULES, mergeCategoryRules, migrateLegacyCategoryName, DEFAULT_FIXED_CATEGORIES } from "../classification/categories.js";
import { DEFAULT_BTW_RATES, mergeBtwRates, DEFAULT_VOORBELASTING_EXCLUDED } from "../tax/btw.js";
import { migrateOverridesCategories, resolveRechtsvorm, resolveHeeftHolding, normalizeAutoStatus, normalizeAutoWizard, migreerGedeeldeHuisvesting, migreerCategorieLijst } from "./dossierMigraties.js";

export async function laadDossierBestand(file, c) {
  const { setAccountTypeByFile, setActivaDetails, setActiveTab, setAutoActivaDetails, setAutoStatusState, setAutoWizardStatus, setBtwVerlegd, setBusinessExpenseKeywords, setBusinessKeywords, setCategoryBtwRates, setCategoryRules, setCategoryZakelijkPercentageState, setConfirmedLeaseTypeKeys, setDismissedDuplicateNotice, setEigenNamen, setEigenRekeningenExtra, setEnergieZakelijkPercentageStatusState, setError, setExcludedDuplicateFingerprints, setExcludedManualFingerprints, setExpandedCardKeys, setFixedCategories, setGemeentelijkeKostenZakelijkPercentageStatusState, setHeeftHolding, setHeeftVoorraad, setHoldingBoekingen, setHuurZakelijkPercentageStatusState, setIbStatus, setIncomeBtwTarieven, setKmVergoedingDetailsState, setKorRegeling, setKwartaalStatus, setLastExportAt, setLeaseDetails, setLeaseMergedInto, setLoadedProjectFileName, setLoanDetails, setMaxStappen, setMeerdereTarievenBevestigd, setOpdrachtgeversGevraagd, setOpeningBalanceCorrections, setOvergeslagenStappen, setOverridesByCounterparty, setOverridesByRow, setParsedFiles, setPeriodeQuarterOverrides, setRechtsvorm, setResumeHint, setReviewedIncomeKeys, setReviewedOverigKeys, setReviewedPeriodeKeys, setReviewedPersonKeys, setStartersaftrekStatusState, setTransactionNotes, setVerwachteAOV, setVerwachteAangeboden, setVerwachteLease, setVerwachteLeaseOverig, setVerwachteLening, setVoorbelastingExcluded, setVpbStatus, setZaLegacyJaDefault, setZakelijkeSpaarRekening, setZelfstandigenaftrekStatusState, setZvwStatus, suppressChangeCount } = c;
  try {
    const project = await readProjectFile(file, c.vraagWachtwoord);
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
    setVoorbelastingExcluded(Array.isArray(project.voorbelastingExcluded) ? migreerCategorieLijst(project.voorbelastingExcluded) : DEFAULT_VOORBELASTING_EXCLUDED);
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
    setAutoWizardStatus(normalizeAutoWizard(project.autoWizardStatus));
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
    setFixedCategories(Array.isArray(project.fixedCategories) ? migreerCategorieLijst(project.fixedCategories) : DEFAULT_FIXED_CATEGORIES);
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
    setAutoStatusState(normalizeAutoStatus(project.autoStatus));
    // 14V9 — de aparte "(deels zakelijk)"-percentages gaan naar het generieke percentage per categorie.
    const gedeeldeMig = migreerGedeeldeHuisvesting(project.categoryZakelijkPercentage, {
      huur: project.huurZakelijkPercentageStatus, energie: project.energieZakelijkPercentageStatus, gemeentelijk: project.gemeentelijkeKostenZakelijkPercentageStatus,
    });
    setHuurZakelijkPercentageStatusState({});
    setEnergieZakelijkPercentageStatusState({});
    setGemeentelijkeKostenZakelijkPercentageStatusState({});
    setCategoryZakelijkPercentageState(gedeeldeMig.categoryZakelijkPercentage);
    setOpeningBalanceCorrections(project.openingBalanceCorrections && typeof project.openingBalanceCorrections === "object" ? project.openingBalanceCorrections : {});
    setLoadedProjectFileName(file.name);
    c.setDossierHerstelcode?.(project.__herstelcode || null);
    c.setDossierWachtwoord?.(project.__wachtwoord || null); // een beveiligd dossier blijft bij opslaan beveiligd
    c.setBevestigdeControles?.(project.bevestigdeControles && typeof project.bevestigdeControles === "object" ? project.bevestigdeControles : {});
    c.setAuditLog?.([...(Array.isArray(project.auditLog) ? project.auditLog.slice(-290) : []), ...gedeeldeMig.meldingen.map((label) => ({ t: Date.now(), label: `Migratie: ${label}` }))]);
    // v286 — zie ook handleFiles hierboven: alle uitklapbare kaarten beginnen ingeklapt bij het
    // laden van een (ander) project, i.p.v. een kaart die van een vorig dossier in deze sessie nog
    // openstond gewoon open te laten staan.
    setExpandedCardKeys({});
    setActiveTab("overzicht"); // V52 — na laden altijd beginnen op Overzicht
    // V89 — "ga verder waar je was": positie bij het laatste opslaan, alleen als die niet gewoon Overzicht was
    const rp = project.resumePositie;
    setResumeHint(rp && typeof rp === "object" && (rp.tab === "controleren" || rp.tab === "instellingen") && rp.openPunten !== 0 ? rp : null);
    setOvergeslagenStappen(Array.isArray(project.overgeslagenStappen) ? project.overgeslagenStappen : []);
    setMaxStappen(0);
  } catch (e) {
    if (e.code === "GEANNULEERD") return;
    setError(e.message || String(e));
  }
}

export async function wisDossier(c, askWizard = false) {
  const { setAangiftevoorstelPreview, setAccountTypeByFile, setActivaDetails, setActivaDetailsModalKey, setActiveTab, setActiveYear, setAutoActivaDetails, setAutoStatusState, setAutoWizardStatus, setBtwVerlegd, setBusinessExpenseKeywords, setBusinessKeywords, setCategoryBtwRates, setCategoryRules, setCategoryZakelijkPercentageState, setConfirmedLeaseTypeKeys, setDialog, setDismissedDuplicateNotice, setEigenNamen, setEigenRekeningenExtra, setError, setExcludedDuplicateFingerprints, setExcludedManualFingerprints, setExpandedCardKeys, setFixedCategories, setHeeftHolding, setHeeftVoorraad, setHoldingBoekingen, setHuurZakelijkPercentageStatusState, setIbStatus, setIncomeBtwTarieven, setKmVergoedingDetailsState, setKorRegeling, setKwartaalStatus, setLastExportAt, setLeaseDetails, setLeaseDetailsModalKey, setLeaseMergedInto, setLoadedProjectFileName, setLoanDetails, setLoanDetailsModalKey, setManualWizardOpen, setMeerdereTarievenBevestigd, setOpdrachtgeversGevraagd, setOpeningBalanceCorrections, setOverridesByCounterparty, setOverridesByRow, setParsedFiles, setPeriodeQuarterOverrides, setRechtsvorm, setReviewFileModal, setReviewedIncomeKeys, setReviewedOverigKeys, setReviewedPeriodeKeys, setReviewedPersonKeys, setSaveState, setSelectedAangifteYears, setShowAangifteYearPicker, setStartersaftrekStatusState, setTransactionNotes, setVerwachteAOV, setVerwachteAangeboden, setVerwachteLease, setVerwachteLeaseOverig, setVerwachteLening, setVerwachteMatchSuggestie, setVoorbelastingExcluded, setVpbStatus, setZakelijkeSpaarRekening, setZelfstandigenaftrekStatusState, setZvwStatus, snapshotBeforeAction, suppressChangeCount } = c;
  snapshotBeforeAction("Nieuw dossier");
  c.setDossierWachtwoord?.(null);
  c.setAuditLog?.([]);
  c.setBevestigdeControles?.({});
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
}
