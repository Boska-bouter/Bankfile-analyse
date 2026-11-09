// Instellingen: dossierinstellingen toepassen en de zetters voor status, aftrek, auto en zakelijke percentages (met ongedaan maken).
// nieuw-V1R0 — uit App.jsx gehaald (opruimronde 9-11). Alle invoer komt binnen via `appInvoer`; namen die App pas later maakt via appInvoer.appLaat.
import { DEFAULT_FIXED_CATEGORIES, mergeCategoryRules, migrateLegacyCategoryName } from "../classification/categories.js";
import { DEFAULT_VOORBELASTING_EXCLUDED, mergeBtwRates } from "../tax/btw.js";
import { migrateOverridesCategories, migreerCategorieLijst, migreerGedeeldeHuisvesting, migreerPercentageSplitsing, normalizeAutoStatus, normalizeAutoWizard, resolveDossierSoort, resolveHeeftHolding, resolveRechtsvorm } from "../dossier/dossierMigraties.js";
import { useRef, useState } from "react";

export function useInstellingenActies(appInvoer) {
  const { activeYear, setAccountTypeByFile, setActivaDetails, setAutoActivaDetails, setAutoStatusState, setAutoWizardStatus, setBankKoppelingen, setBevestigdeControles, setBtwVerlegd, setBusinessExpenseKeywords, setBusinessKeywords, setCategoryBtwRates, setCategoryRules, setCategoryZakelijkPercentageState, setConfirmedLeaseTypeKeys, setDismissedDuplicateNotice, setEenvoudigGezien, setEigenNamen, setEigenRekeningenExtra, setEnergieZakelijkPercentageStatusState, setExcludedDuplicateFingerprints, setExcludedManualFingerprints, setFixedCategories, setGemeentelijkeKostenZakelijkPercentageStatusState, setHeeftHolding, setHeeftVoorraad, setHoldingBoekingen, setHuurZakelijkPercentageStatusState, setIbStatus, setIncomeBtwTarieven, setKleinBedragInstelling, setKmVergoedingDetailsState, setKorRegeling, setKwartaalStatus, setLeaseDetails, setLeaseMergedInto, setLoadedProjectFileName, setLoanDetails, setMeerdereTarievenBevestigd, setOpdrachtgeversGevraagd, setOpeningBalanceCorrections, setOverigInkomenBox1State, setOverridesByCounterparty, setOverridesByRow, setPeriodeQuarterOverrides, setPriveAntwoorden, setRechtsvorm, setReviewedIncomeKeys, setReviewedOverigKeys, setReviewedPeriodeKeys, setReviewedPersonKeys, setSoortDossier, setStartersaftrekStatusState, setTariefOverridesState, setTransactionNotes, setVerwachteAOV, setVerwachteAangeboden, setVerwachteLease, setVerwachteLeaseOverig, setVerwachteLening, setVoorbelastingExcluded, setVpbStatus, setWeergave, setWerkruimteStatusState, setZaLegacyJaDefault, setZakelijkeSpaarRekening, setZelfstandigenaftrekStatusState, setZvwStatus } = appInvoer;
  const snapshotBeforeAction = (...args) => appInvoer.appLaat.snapshotBeforeAction(...args);
  const applySettingsToState = (settings) => {
    // De bestandsnaam van het laatst opgeslagen/geladen dossierbestand hoort hier ook bij hersteld
    // te worden — anders "vergeet" de app die naam zodra de sessie hervat wordt vanuit de
    // automatische browseropslag (bijv. na een app-update of het herstarten van de browser), en
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
    setSoortDossier(resolveDossierSoort(settings));
    setPriveAntwoorden(settings.priveAntwoorden && typeof settings.priveAntwoorden === "object" ? settings.priveAntwoorden : {});
    setHeeftHolding(resolveHeeftHolding(settings));
    setHoldingBoekingen(settings.holdingBoekingen && typeof settings.holdingBoekingen === "object" ? settings.holdingBoekingen : {});
    setExcludedDuplicateFingerprints(Array.isArray(settings.excludedDuplicateFingerprints) ? settings.excludedDuplicateFingerprints : []);
    setBevestigdeControles(settings.bevestigdeControles && typeof settings.bevestigdeControles === "object" ? settings.bevestigdeControles : {});
    setDismissedDuplicateNotice(!!settings.dismissedDuplicateNotice);
    setExcludedManualFingerprints(Array.isArray(settings.excludedManualFingerprints) ? settings.excludedManualFingerprints : []);
    setTransactionNotes(settings.transactionNotes && typeof settings.transactionNotes === "object" ? settings.transactionNotes : {});
    setBusinessKeywords(Array.isArray(settings.businessKeywords) ? settings.businessKeywords : []);
    setBusinessExpenseKeywords(Array.isArray(settings.businessExpenseKeywords) ? settings.businessExpenseKeywords : []);
    setReviewedIncomeKeys(Array.isArray(settings.reviewedIncomeKeys) ? settings.reviewedIncomeKeys : []);
    setReviewedPersonKeys(Array.isArray(settings.reviewedPersonKeys) ? settings.reviewedPersonKeys : []);
    setReviewedOverigKeys(Array.isArray(settings.reviewedOverigKeys) ? settings.reviewedOverigKeys : []);
    setKwartaalStatus(settings.kwartaalStatus && typeof settings.kwartaalStatus === "object" ? settings.kwartaalStatus : {});
    setVoorbelastingExcluded(Array.isArray(settings.voorbelastingExcluded) ? migreerCategorieLijst(settings.voorbelastingExcluded) : DEFAULT_VOORBELASTING_EXCLUDED);
    setFixedCategories(Array.isArray(settings.fixedCategories) ? migreerCategorieLijst(settings.fixedCategories) : DEFAULT_FIXED_CATEGORIES);
    setPeriodeQuarterOverrides(settings.periodeQuarterOverrides && typeof settings.periodeQuarterOverrides === "object" ? settings.periodeQuarterOverrides : {});
    setReviewedPeriodeKeys(Array.isArray(settings.reviewedPeriodeKeys) ? settings.reviewedPeriodeKeys : []);
    setLoanDetails(settings.loanDetails && typeof settings.loanDetails === "object" ? settings.loanDetails : {});
    setLeaseDetails(settings.leaseDetails && typeof settings.leaseDetails === "object" ? settings.leaseDetails : {});
    setActivaDetails(settings.activaDetails && typeof settings.activaDetails === "object" ? settings.activaDetails : {});
    setVerwachteLease(settings.verwachteLease ?? null);
    setVerwachteLeaseOverig(settings.verwachteLeaseOverig ?? null);
    setVerwachteLening(settings.verwachteLening ?? null);
    setVerwachteAOV(settings.verwachteAOV ?? null);
    setAutoWizardStatus(normalizeAutoWizard(settings.autoWizardStatus));
    setAutoActivaDetails(settings.autoActivaDetails && typeof settings.autoActivaDetails === "object" ? settings.autoActivaDetails : {});
    setKmVergoedingDetailsState(settings.kmVergoedingDetails && typeof settings.kmVergoedingDetails === "object" ? settings.kmVergoedingDetails : {});
    setHeeftVoorraad(settings.heeftVoorraad ?? null);
    setEigenNamen(settings.eigenNamen ?? null);
    setEigenRekeningenExtra(settings.eigenRekeningenExtra ?? null);
    setBankKoppelingen(Array.isArray(settings.bankKoppelingen) ? settings.bankKoppelingen : []);
    setZakelijkeSpaarRekening(settings.zakelijkeSpaarRekening ?? null);
    setOpdrachtgeversGevraagd(settings.opdrachtgeversGevraagd ?? null);
    setIncomeBtwTarieven(settings.incomeBtwTarieven ?? null);
    setMeerdereTarievenBevestigd(settings.meerdereTarievenBevestigd ?? false);
    setVerwachteAangeboden(settings.verwachteAangeboden && typeof settings.verwachteAangeboden === "object" ? settings.verwachteAangeboden : {});
    setKleinBedragInstelling(settings.kleinBedragInstelling && typeof settings.kleinBedragInstelling === "object" ? settings.kleinBedragInstelling : null);
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
    setWerkruimteStatusState(settings.werkruimteStatus && typeof settings.werkruimteStatus === "object" ? settings.werkruimteStatus : {});
    setWeergave(settings.weergave === "eenvoudig" ? "eenvoudig" : "uitgebreid");
    setEenvoudigGezien(settings.eenvoudigGezien && typeof settings.eenvoudigGezien === "object" ? settings.eenvoudigGezien : {});
    setTariefOverridesState(settings.tariefOverrides && typeof settings.tariefOverrides === "object" ? settings.tariefOverrides : {});
    setOverigInkomenBox1State(settings.overigInkomenBox1 && typeof settings.overigInkomenBox1 === "object" ? settings.overigInkomenBox1 : {});
    setAutoStatusState(normalizeAutoStatus(settings.autoStatus));
    const gedeeldeMig = migreerGedeeldeHuisvesting(settings.categoryZakelijkPercentage, {
      huur: settings.huurZakelijkPercentageStatus, energie: settings.energieZakelijkPercentageStatus, gemeentelijk: settings.gemeentelijkeKostenZakelijkPercentageStatus,
    });
    setHuurZakelijkPercentageStatusState({});
    setEnergieZakelijkPercentageStatusState({});
    setGemeentelijkeKostenZakelijkPercentageStatusState({});
    setCategoryZakelijkPercentageState(migreerPercentageSplitsing(gedeeldeMig.categoryZakelijkPercentage));
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
    const fp = appInvoer.appLaat.fingerprintByTxId[tx.id];
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
  // V58 — wizardvraag: de aangevinkte jaren krijgen "ja", alle andere jaren "nee" (zodat de vraag niet
  // opnieuw komt en "Persoonlijke aannames" geen "nog niet opgegeven" toont).
  // beide-V8R1 — eerdereJaren: jaren vóór het dossier waarin de startersaftrek al is gebruikt. Die staan als "ja" in
  // dezelfde lijst, zodat de toets (tax/startersaftrekToets.js) ze meetelt voor "maximaal 3 keer binnen 5 jaar".
  const seedStartersaftrekStatus = (yearsList, jaYears, eerdereJaren = []) => {
    if (!yearsList || yearsList.length === 0) return;
    snapshotBeforeAction("Startersaftrek ingesteld (wizard)");
    const eerste = Math.min(...yearsList.map(Number));
    setStartersaftrekStatusState((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (Number(k) < eerste) delete next[k];
      for (const y of eerdereJaren) next[y] = "ja";
      for (const y of yearsList) next[y] = (jaYears || []).includes(y) ? "ja" : "nee";
      return next;
    });
  };
  // V65 — urencriterium per jaar in één keer (wizard: "Per jaar verschillend"): { [jaar]: "ja"|"nee"|"onbekend" }.
  const seedZelfstandigenaftrekMap = (map) => {
    if (!map || Object.keys(map).length === 0) return;
    snapshotBeforeAction("Zelfstandigenaftrek-status ingesteld (wizard)");
    setZelfstandigenaftrekStatusState((prev) => ({ ...prev, ...map }));
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
    snapshotBeforeAction("Kilometervergoeding aangepast", { samenvoegen: true });
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
  // Overig inkomen box 1: met "Ongedaan maken"; typen binnen 2 seconden telt als één wijziging.
  const setOverigInkomenBox1Met = (next) => {
    snapshotBeforeAction("Overig inkomen box 1 aangepast", { samenvoegen: true });
    setOverigInkomenBox1State(next);
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
  // release19V4 — wachtrij i.p.v. één plek. Tikte je (terwijl de "voor welke jaren?"-vraag openstond of net opkwam)
  // meteen in een volgend veld, dan verliet het eerste veld focus → tweede vraag verving de eerste, en de
  // ingevulde % van het voorgaande veld ging verloren. Nu komen de vragen na elkaar, in volgorde.
  const pendingQueueRef = useRef([]);
  const pendingHuidigRef = useRef(null);
  const toonPending = (item) => { pendingHuidigRef.current = item; setPendingCategoryPercentage(item); };
  const volgendePending = () => toonPending(pendingQueueRef.current.shift() || null);
  const requestSetCategoryZakelijkPercentage = (category, year, percentage) => {
    if (percentage == null || percentage === "" || appInvoer.appLaat.years.length <= 1) {
      setCategoryZakelijkPercentage(category, year, percentage);
      return;
    }
    const item = { category, percentage: Number(percentage), activeYear: year, years: appInvoer.appLaat.years };
    if (pendingHuidigRef.current) {
      // Zelfde categorie + jaar nog niet beantwoord: de nieuwste waarde vervangt de oude in de wachtrij.
      const q = pendingQueueRef.current.filter((p) => !(p.category === category && p.activeYear === year));
      q.push(item);
      pendingQueueRef.current = q;
    } else {
      toonPending(item);
    }
  };
  // beide-V10R4 — dezelfde jarenvraag voor percentages die niet als één categorie/jaar worden opgeslagen (percentage per rekening
  // in Uitgebreid, deel van de woning in Eenvoudig): `apply(jaren)` voert de wijziging uit (wens Boska 28-10).
  const requestPercentageScope = ({ category, percentage, activeYear: jaar, apply }) => {
    if (percentage == null || percentage === "" || appInvoer.appLaat.years.length <= 1) { apply([jaar]); return; }
    const item = { category, percentage: Number(percentage), activeYear: jaar, years: appInvoer.appLaat.years, apply };
    if (pendingHuidigRef.current) {
      pendingQueueRef.current = [...pendingQueueRef.current.filter((p) => !(p.category === category && p.activeYear === jaar)), item];
    } else toonPending(item);
  };
  const zetRekeningPercentageVoorJaren = (categorieen, reks, jaren, percentage) => {
    setCategoryZakelijkPercentageState((prev) => {
      const next = { ...prev };
      for (const c of categorieen) {
        const perJaar = { ...(next[c] || {}) };
        for (const y of jaren) for (const rek of reks) { if (percentage == null || percentage === "") delete perJaar[`${y}:${rek}`]; else perJaar[`${y}:${rek}`] = Number(percentage); }
        if (Object.keys(perJaar).length) next[c] = perJaar; else delete next[c];
      }
      return next;
    });
  };
  const requestSetRekeningPercentage = (categorie, rekening, percentage) => requestPercentageScope({
    category: `${categorie} (${rekening === "prive" ? "privérekening" : "zakelijke rekening"})`, percentage, activeYear,
    apply: (jaren) => { snapshotBeforeAction("Percentage zakelijk per rekening aangepast"); zetRekeningPercentageVoorJaren([categorie], [rekening], jaren, percentage); },
  });
  const applyCategoryPercentageToYears = (yearsToApply) => {
    if (!pendingCategoryPercentage || yearsToApply.length === 0) return;
    if (pendingCategoryPercentage.apply) { pendingCategoryPercentage.apply(yearsToApply); volgendePending(); return; }
    const { category, percentage } = pendingCategoryPercentage;
    snapshotBeforeAction("Percentage zakelijk per categorie aangepast (meerdere jaren)");
    setCategoryZakelijkPercentageState((prev) => {
      const next = { ...prev };
      const forCategory = { ...(next[category] || {}) };
      for (const y of yearsToApply) forCategory[y] = percentage;
      next[category] = forCategory;
      return next;
    });
    volgendePending();
  };
  return { applyCategoryPercentageToYears, applySettingsToState, pendingCategoryPercentage, requestPercentageScope, requestSetCategoryZakelijkPercentage, requestSetRekeningPercentage, seedAutoStatusForAllYears, seedStartersaftrekStatus, seedZelfstandigenaftrekMap, seedZelfstandigenaftrekStatusForAllYears, setAutoActivaDetailsField, setAutoStatus, setCategoryZakelijkPercentage, setEnergieZakelijkPercentageStatus, setGemeentelijkeKostenZakelijkPercentageStatus, setHoldingBoekingField, setHuurZakelijkPercentageStatus, setIbGedaan, setKmVergoedingField, setKwartaalStatusField, setOverigInkomenBox1Met, setStartersaftrekStatus, setTransactionNote, setVpbGedaan, setZelfstandigenaftrekStatus, setZvwGedaan, volgendePending, zetRekeningPercentageVoorJaren };
}
