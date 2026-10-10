import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Check, Download, Trash2, Loader2, Printer, X, Lock, ChevronDown, ChevronRight, ListTree, MessageSquare, Settings, AlertTriangle, Users, HelpCircle, Copy, ArrowLeft } from "lucide-react";

import { parseFile } from "./importers/detector.js";
import { buildTransactions, computeImportDiagnostics, computeFileContinuity, computeOwnAccountByFile, INTRA_FILE_BALANCE_THRESHOLD, classifyContinuityGap, saldoControleSleutel, aansluitingControleSleutel } from "./importers/transactions.js";
import TabPijlen from "./components/shared/TabPijlen.jsx";
import ImportControlPanel from "./components/upload/ImportControlPanel.jsx";
import { resolveClassification, detectOwnAccountTransfer } from "./classification/classify.js";
import OnverklaardeOverboekingenModal from "./components/dashboard/OnverklaardeOverboekingenModal.jsx";
import { koppelDoorsluisOverboekingen } from "./classification/doorsluis.js";
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
import { useDashboardCards } from "./cards/useDashboardCards.jsx";
import { useControlerenDashboardCards } from "./cards/useControlerenDashboardCards.jsx";
import { useInstellingenDashboardCards } from "./cards/useInstellingenDashboardCards.jsx";
import { useControlerenCardGroups } from "./cards/useControlerenCardGroups.jsx";
import { useInstellingenCardGroups } from "./cards/useInstellingenCardGroups.jsx";
import { bouwDossierProfiel } from "./dossier/dossierProfiel.js";
import { useYearlyProgress } from "./calc/useYearlyProgress.jsx";
import { useClassified } from "./calc/useClassified.jsx";
import { useYearlySummaries } from "./calc/useYearlySummaries.jsx";
import { useDashboardAangifteIndicatie } from "./calc/useDashboardAangifteIndicatie.jsx";
import { useKostenTotaalByYear } from "./calc/useKostenTotaalByYear.jsx";
import { useBelastingTotaalJaar } from "./calc/useBelastingTotaalJaar.jsx";
import { useHoldingSummaryCard } from "./calc/useHoldingSummaryCard.jsx";
import { useAansluitControleInfo } from "./calc/useAansluitControleInfo.jsx";
import { useAutomatischeHerkenningItems } from "./calc/useAutomatischeHerkenningItems.jsx";
import { useAangifteOpenPunten } from "./calc/useAangifteOpenPunten.jsx";
import { useWorkflowSteps } from "./calc/useWorkflowSteps.jsx";
import { useAlleStappen } from "./calc/useAlleStappen.jsx";
import { useOwnAccountsElsewhereByFile } from "./calc/useOwnAccountsElsewhereByFile.jsx";
import { useDashboardVpbBreakdown } from "./calc/useDashboardVpbBreakdown.jsx";
import { useOndernemersaftrekPerJaar } from "./calc/useOndernemersaftrekPerJaar.jsx";
import { laadDossierBestand, wisDossier } from "./dossier/dossierLaden.jsx";
import { migrateOverridesCategories, resolveRechtsvorm, resolveHeeftHolding, normalizeAutoStatus, normalizeAutoWizard, migreerGedeeldeHuisvesting, migreerCategorieLijst } from "./dossier/dossierMigraties.js";
import { useOpslaanHerinnering, OpslaanHerinneringBalk } from "./dossier/useOpslaanHerinnering.jsx";
import { useTodoItems } from "./dossier/useTodoItems.jsx";
import { useDossierDialogen } from "./dossier/useDossierDialogen.jsx";
import { buildProjectFile, downloadProjectFile, readProjectFile } from "./storage/projectFile.js";
import ConfirmDialog from "./components/shared/ConfirmDialog.jsx";
import UndoToast from "./components/shared/UndoToast.jsx";
import { berekenDekking, vindTerugkerendeInconsistenties, vindJaarSprongen } from "./tax/controleSuggesties.js";
import { berekenJaarPeriodes } from "./utils/periode.js";
import OpslaanModal from "./components/shared/OpslaanModal.jsx";
import HerstelcodeModal from "./components/shared/HerstelcodeModal.jsx";
import { maakHerstelcode } from "./storage/herstelcode.js";
import WachtwoordModal from "./components/shared/WachtwoordModal.jsx";
import ZoekAllesModal from "./components/shared/ZoekAllesModal.jsx";
import BegrippenModal from "./components/shared/BegrippenModal.jsx";
import RouteBalk from "./components/dashboard/RouteBalk.jsx";
import WijzigingslogModal from "./components/shared/WijzigingslogModal.jsx";
import HelpPanel from "./components/shared/HelpPanel.jsx";
import FeedbackModal from "./components/shared/FeedbackModal.jsx";
import VoorwaardenScherm from "./components/shared/VoorwaardenScherm.jsx";
import { VOORWAARDEN_VERSIE, VOORWAARDEN_SLEUTEL } from "./content/voorwaarden.jsx";
import { APP_RELEASE } from "./version.js";
import HelpPopupModal from "./components/shared/HelpPopupModal.jsx";
import CategoryChangeScopeModal from "./components/shared/CategoryChangeScopeModal.jsx";
import CategoryPercentageScopeModal from "./components/shared/CategoryPercentageScopeModal.jsx";
import SetupWizardModal from "./components/upload/SetupWizardModal.jsx";
import { computeWizardSuggesties } from "./utils/wizardSuggesties.js";
import RekeninghouderModal from "./components/shared/RekeninghouderModal.jsx";
import { CategorySummaryCard, DetailTable } from "./components/overview/GroupView.jsx";
import BtwRatesPanel from "./components/btw/BtwRatesPanel.jsx";
import IncomeReviewStep from "./components/review/IncomeReviewStep.jsx";
import ReviewStep from "./components/review/ReviewStep.jsx";
import HerkomstVanGeldPanel from "./components/review/HerkomstVanGeldPanel.jsx";
import { computePeriodeMismatches } from "./tax/periodDetection.js";
import { computeChecklistLikeDataForYear } from "./tax/checklist.js";
import OnzekerhedenPanel from "./components/overview/OnzekerhedenPanel.jsx";
import RecurringPaymentsPanel from "./components/overview/RecurringPaymentsPanel.jsx";
import AangifteYearPickerModal from "./components/modals/AangifteYearPickerModal.jsx";
import AangifteVoorstelPreviewModal from "./components/modals/AangifteVoorstelPreviewModal.jsx";
import MultiYearModal from "./components/modals/MultiYearModal.jsx";
import QuarterlyBtwModal from "./components/modals/QuarterlyBtwModal.jsx";
import { computeRekeningCourantVerloop, computeEigenVermogenVerloop, computeBvSignalering } from "./tax/bv.js";
import BvSignaleringPanel from "./components/overview/BvSignaleringPanel.jsx";
import HoldingBoekingenPanel from "./components/overview/HoldingBoekingenPanel.jsx";
import { estimateVpb } from "./tax/vpb.js";
import SectionCardGrid from "./components/dashboard/SectionCard.jsx";
import AppSidebar from "./components/dashboard/AppSidebar.jsx";
import { useToonFijn } from "./utils/useToonFijn.js";
import DashboardHeader from "./components/dashboard/DashboardHeader.jsx";
import CardIcon from "./components/shared/CardIcon.jsx";
import NextStepCard from "./components/dashboard/NextStepCard.jsx";
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
import OpschonenPanel from "./components/review/OpschonenPanel.jsx";
import { effectieveStartersaftrekStatus } from "./tax/startersaftrekToets.js";
import AansluitingDetailPanel from "./components/review/AansluitingDetailPanel.jsx";
import LoanInterestPanel from "./components/loans/LoanInterestPanel.jsx";
import LeaseInterestPanel from "./components/loans/LeaseInterestPanel.jsx";
import LoanDetailsModal from "./components/loans/LoanDetailsModal.jsx";
import { useLeaseWizardOpening } from "./hooks/useLeaseWizardOpening.jsx";
import FinancialLeaseDetailsModal from "./components/loans/FinancialLeaseDetailsModal.jsx";
import AutoOpDeZaakDetailsModal from "./components/loans/AutoOpDeZaakDetailsModal.jsx";
import ActivaPanel from "./components/loans/ActivaPanel.jsx";
import PersoonlijkeAannamesPanel from "./components/overview/PersoonlijkeAannamesPanel.jsx";
import EigenRekeningenPanel from "./components/settings/EigenRekeningenPanel.jsx";
import CategoryPercentagePanel from "./components/overview/CategoryPercentagePanel.jsx";
import ActivaDetailsModal from "./components/loans/ActivaDetailsModal.jsx";
import { computeActivaSummary, computeActivaAfschrijvingForYear, computeAfschrijvingPerJaar, computeInvesteringenForYear } from "./tax/activa.js";
import { computeIbBoxMapping } from "./tax/boxMapping.js";
import RawFileReviewModal from "./components/upload/RawFileReviewModal.jsx";
import { exportExcel, exportCsv } from "./reports/excelExport.js";
import { buildAangiftevoorstelHtml, downloadAangiftevoorstel, stripBronHtml, zonderUitlegHtml } from "./reports/aangiftevoorstel.js";
import { buildAangiftevoorstelBvHtml, downloadAangiftevoorstelBv, computeBvWinstInvoer } from "./reports/aangiftevoorstel-bv.js";
import { bepaalAandachtspunten, aandachtspuntenHtml } from "./reports/aandachtspunten.js";
import { jarenBereik } from "./dossier/dossierProfiel.js";
import { buildOnderbouwingHtml, downloadOnderbouwing } from "./reports/onderbouwing.js";
import KlantJaarKeuzeModal from "./components/modals/KlantJaarKeuzeModal.jsx";
import { buildKlantSamenvattingHtml, downloadKlantSamenvatting } from "./reports/klantSamenvatting.js";
import { printReport, printHtmlDocument } from "./reports/printReport.js";
import { computeLoanRenteForYear, computeLeaseRenteForYear } from "./tax/loanAmortization.js";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, isCompleteFinancialLeaseDetails, getLeaseSegments } from "./tax/financialLease.js";
import { computeLeaseAutoKostenVoorJaar } from "./tax/autoBijtelling.js";
import { computeBtwPrivegebruikAuto } from "./tax/btwPrivegebruikAuto.js";
import { computeAutoActivaKostenVoorJaar, combineAutoKosten } from "./tax/autoActiva.js";
import { computeKmVergoedingVoorJaar } from "./tax/kmVergoeding.js";

// ---------------------------------------------------------------------------
// Dit is de functionele schil (upload, tabbladen, dashboard, alle panelen) rond de
// logicalagen: importers/ (inlezen en aansluiting tussen bestanden), classification/
// (categoriseren van transacties), tax/ (BTW/IB/Vpb-berekeningen), storage/
// (project opslaan/laden), utils/. De reports/-map bouwt de downloadbare/printbare
// Indicatieve aangifteberekening (zzp en BV) uit diezelfde tax/-berekeningen.
// ---------------------------------------------------------------------------

// V46 — zie `classified`: categorieën die in een privé-only dossier aan de zakelijke kant gespiegeld worden.
// Alle %-splitsbare kostencategorieën behalve de auto-categorieën (die volgen de wizard).
const PRIVE_ONLY_HUISVESTING_STANDAARD_NUL = [
  "Huur", "Energie-water", "Gemeentelijke kosten", "Zakelijk mobiel/internet", "Reiskosten (OV)", "Streaming diensten",
  "Software & Online diensten", "Boekhouder, accountant & administratie",
];
const ZAKELIJKE_SPIEGEL_CATEGORIEEN = ["Zakelijke inkomsten", "Zakelijke inkomsten 0%", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%", "Zakelijke inkoop/uitgaven"];

export default function App() {
  useToonFijn(); // V82 — herrender bij de schakelaar "fijne categorieën"
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
  // Wat de berekening gebruikt: startersaftrek alleen in jaren waarin ze mag (max. 3x, binnen 5 jaar, met zelfstandigenaftrek).
  // De keuze zelf (startersaftrekStatus) blijft ongewijzigd in het dossier staan.
  const startersaftrekEff = useMemo(() => effectieveStartersaftrekStatus(startersaftrekStatus, zelfstandigenaftrekStatus), [startersaftrekStatus, zelfstandigenaftrekStatus]);
  // { "2025": "zaak" | "prive" } — of de auto van de zaak is (koop/operational/financial
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
  // "Correctie privé-uitgaven" is verwijderd (overbodig geworden na Route B: de app signaleert nu
  // zelf al wanneer zakelijke kosten vanaf de privérekening zijn betaald).
  const [aangiftevoorstelPreview, setAangiftevoorstelPreview] = useState(null); // HTML-string of null
  const [showAangifteYearPicker, setShowAangifteYearPicker] = useState(false);
  // Fase 3 (bouwvoorstel) — per kaart onthouden of 'ie is uitgeklapt naar het volledige
  // onderliggende paneel, i.p.v. ernaartoe te springen. Alleen voor kaarten die dat aankunnen
  // (zie toggleCardExpand hieronder) — de rest blijft in fase 3 v1 gewoon "Bekijken" (springen).
  const [expandedCardKeys, setExpandedCardKeys] = useState({});
  const wizardWasOpenRef = useRef(false);
  const geenAutoInklapRef = useRef(0); // tijdstip tot wanneer kaarten niet vanzelf inklappen (bijv. na het verwijderen van een nieuw contract)
  const toggleCardExpand = (key) => {
    if (key === "bedrijfsmiddelen" && !expandedLiveRef.current?.[key]) autoOpenLeaseWizard();
    setExpandedCardKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [showAangifteMeerdereJaren, setShowAangifteMeerdereJaren] = useState(false); // "Ander jaar/meerdere jaren kiezen" binnen het Aangiftevoorstel-blok
  const [selectedAangifteYears, setSelectedAangifteYears] = useState([]);
  const [periodeQuarterOverrides, setPeriodeQuarterOverrides] = useState({});
  const [reviewedPeriodeKeys, setReviewedPeriodeKeys] = useState([]);
  const [loanDetails, setLoanDetails] = useState({});
  const [loanDetailsModalKey, setLoanDetailsModalKey] = useState(null);
  const [leaseDetails, setLeaseDetails] = useState({});
  const [leaseMergedInto, setLeaseMergedInto] = useState({}); // { bronKey: doelKey }
  const [leaseDetailsModalKey, setLeaseDetailsModalKey] = useState(null);
  const { openLeaseWizard, autoOpenLeaseWizard, registreer: registreerLeaseWizard, renderLeaseWizard, leaseWizardOpen } = useLeaseWizardOpening();
  // Tijdens en kort na een lease-wizard klapt het overzicht niet vanzelf in: je wilt het resultaat kunnen controleren.
  const [activaDetails, setActivaDetails] = useState({});
  const [activaDetailsModalKey, setActivaDetailsModalKey] = useState(null);
  // Ook tijdens/na een gegevensvenster (lease, lening, activa) klapt het overzicht niet vanzelf in.
  const gegevensVensterOpen = leaseWizardOpen || !!activaDetailsModalKey || !!leaseDetailsModalKey || !!loanDetailsModalKey;
  if (gegevensVensterOpen || wizardWasOpenRef.current) geenAutoInklapRef.current = Date.now() + 5000;
  wizardWasOpenRef.current = gegevensVensterOpen;
  const [verwachteLease, setVerwachteLease] = useState(null); // null=nog niet gevraagd | [{naam, gevonden}, ...] (leeg = geen)
  // v275 — los van verwachteLease (die alleen nog gevraagd wordt als de auto-vraag daar aanleiding
  // toe geeft, zie SetupWizardModal): een aparte, altijd gestelde vraag voor overige financiële
  // leaseobjecten (machines, apparatuur — geen auto). Zelfde vorm/gebruik als verwachteLease, apart
  // gehouden zodat de twee wizardvragen elkaar niet overschrijven; bij classificatie/matching tellen
  // beide lijsten gewoon mee voor categorie "Lease (financieel)".
  const [verwachteLeaseOverig, setVerwachteLeaseOverig] = useState(null);
  const [verwachteLening, setVerwachteLening] = useState(null); // zelfde vorm als verwachteLease
  const [verwachteAOV, setVerwachteAOV] = useState(null);
  // null=nog niet gevraagd (wizard toont de vraag) | { status: "geen"|"zaak"|"prive",
  // soort: "koop"|"operational"|"financial"|null }. Eén keer gevraagd bij het opstarten van een
  // dossier (net als verwachteLease/verwachteAOV hierboven), zet bij "zaak"/"prive" de
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
  // "prive") — zie tax/kmVergoeding.js. { [jaar]: { zakelijkeKilometers, vergoedingPerKm } }.
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
  const [showOnverklaard, setShowOnverklaard] = useState(false);
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
  // Aantal niet-geëxporteerde wijzigingen dat uit de browseropslag is hersteld (bijv. nadat iOS de app
  // uit het geheugen haalde). Binnen het "laadvenster" blijft de teller op deze waarde i.p.v. op 0.
  const restoredChangesRef = useRef(0);
  const suppressChangeCount = () => {
    restoredChangesRef.current = 0;
    // Laden/leegmaken/hervatten verandert veel state tegelijk — dat is geen "wijziging" van de
    // gebruiker. Een tijdvenster (i.p.v. een vlag) zodat het niet blijft hangen als er toevallig
    // niets daadwerkelijk verandert (bijv. hetzelfde dossierbestand twee keer laden).
    suppressChangeCountUntilRef.current = Date.now() + 2500;
  };
  const [lastSavedAt, setLastSavedAt] = useState(null); // Date — wanneer de automatische browseropslag voor het laatst is gelukt
  const [loadedProjectFileName, setLoadedProjectFileName] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpPopupChapter, setHelpPopupChapter] = useState(null);
  const [dialog, setDialog] = useState(null); // v304 — keuzevenster, zie ConfirmDialog.jsx
  const [lastActionSnapshot, setLastActionSnapshot] = useState(null); // { label, state }
  // B4 — wijzigingslog (label + tijdstip van elke vastgelegde actie), B5 — optioneel wachtwoord op het dossierbestand
  const [auditLog, setAuditLog] = useState([]);
  const [bevestigdeControles, setBevestigdeControles] = useState({}); // C — { sleutel: true } voor 'klopt zo' bij aanvullende controles
  const [showLog, setShowLog] = useState(false);
  const [showZoek, setShowZoek] = useState(false);
  const [showBegrippen, setShowBegrippen] = useState(false);
  // D2 — Ctrl/Cmd+K opent het zoekveld over alle transacties.
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setShowZoek(true); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const [dossierWachtwoord, setDossierWachtwoord] = useState(null);
  const [dossierHerstelcode, setDossierHerstelcode] = useState(null);
  const [herstelcodeToon, setHerstelcodeToon] = useState(null); // { code, nieuw }
  const [wachtwoordModal, setWachtwoordModal] = useState(null); // { modus: "vraag"|"instellen", fout, resolve }
  const vraagWachtwoord = (fout) => new Promise((resolve) => setWachtwoordModal({ modus: "vraag", fout, resolve }));
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
  const [previousTab, setPreviousTab] = useState("overzicht"); // V84 — state, zodat de navigatiebalk direct klopt
  useEffect(() => {
    previousTabRef.current = activeTabTrackerRef.current;
    setPreviousTab(activeTabTrackerRef.current);
    activeTabTrackerRef.current = activeTab;
  }, [activeTab]);
  // Eén bron van waarheid voor "welke sectie-ref hoort bij welk tabblad" — gebruikt door
  // jumpToSection hieronder om bij een kruis-tabblad-sprong eerst het juiste tabblad te activeren
  // en dan pas te scrollen (de sectie stond tot dat moment op display:none).
  const REF_TAB_ENTRIES = [
    [importControleSectionRef, "controleren"],
    [confidenceSectionRef, "controleren"],
    [incomeReviewSectionRef, "controleren"], // V90 — ontbrak: "Ga naar deze stap" bij Herkomst van inkomsten deed daardoor niets
    [personReviewSectionRef, "controleren"],
    [overigReviewSectionRef, "controleren"],
    [duplicatesSectionRef, "controleren"],
    [checklistSectionRef, "overzicht"],
    [multiYearSectionRef, "overzicht"],
    [quarterlyBtwSectionRef, "overzicht"],
    [obIbSectionRef, "overzicht"],
    [bvSignaleringSectionRef, "overzicht"],
    [loansSectionRef, "controleren"],
    [leasesSectionRef, "controleren"],
    [activaSectionRef, "controleren"],
    [aannamesSectionRef, "controleren"],
    [btwSettingsSectionRef, "instellingen"],
    [incomeRatesSectionRef, "instellingen"],
    [categoryPercentageSectionRef, "controleren"],
    [automatiseringSectionRef, "instellingen"],
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
    [incomeReviewSectionRef, "herkomstOpschonen", true],
    [personReviewSectionRef, "herkomstOpschonen", true],
    [categorySectionRef, "categorieen", false],
    [activaSectionRef, "bedrijfsmiddelen", true],
    [leasesSectionRef, "bedrijfsmiddelen", true],
    [loansSectionRef, "bedrijfsmiddelen", true],
    [aannamesSectionRef, "aannamesPercentages", true],
    [categoryPercentageSectionRef, "aannamesPercentages", true],
    [btwSettingsSectionRef, "btw", true],
    [automatiseringSectionRef, "automatisering", true],
    [incomeRatesSectionRef, "tegenpartijen", true],
    [overigReviewSectionRef, "herkomstOpschonen", true],
    [duplicatesSectionRef, "herkomstOpschonen", true],
    [detailsSectionRef, "detailTabellen", true],
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
    setAutoStatusState(normalizeAutoStatus(settings.autoStatus));
    const gedeeldeMig = migreerGedeeldeHuisvesting(settings.categoryZakelijkPercentage, {
      huur: settings.huurZakelijkPercentageStatus, energie: settings.energieZakelijkPercentageStatus, gemeentelijk: settings.gemeentelijkeKostenZakelijkPercentageStatus,
    });
    setHuurZakelijkPercentageStatusState({});
    setEnergieZakelijkPercentageStatusState({});
    setGemeentelijkeKostenZakelijkPercentageStatusState({});
    setCategoryZakelijkPercentageState(gedeeldeMig.categoryZakelijkPercentage);
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
  // V58 — wizardvraag: de aangevinkte jaren krijgen "ja", alle andere jaren "nee" (zodat de vraag niet
  // opnieuw komt en "Persoonlijke aannames" geen "nog niet opgegeven" toont).
  const seedStartersaftrekStatus = (yearsList, jaYears) => {
    if (!yearsList || yearsList.length === 0) return;
    snapshotBeforeAction("Startersaftrek ingesteld (wizard)");
    setStartersaftrekStatusState((prev) => {
      const next = { ...prev };
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
  const [bevestigNieuwStart, setBevestigNieuwStart] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const pendingProjectRef = useRef(null);
  // Gebruiksvoorwaarden: één keer per apparaat/browser (en opnieuw bij een nieuwe versie van de tekst).
  const [voorwaardenOk, setVoorwaardenOk] = useState(() => {
    try { return localStorage.getItem(VOORWAARDEN_SLEUTEL) === VOORWAARDEN_VERSIE; } catch { return false; }
  });
  const akkoordVoorwaarden = () => {
    try { localStorage.setItem(VOORWAARDEN_SLEUTEL, VOORWAARDEN_VERSIE); } catch { /* geen opslag: scherm komt dan opnieuw */ }
    setVoorwaardenOk(true);
  };
  // Startscherm (verder / nieuw / laden): één keer per tabblad. Een herlading in hetzelfde tabblad
  // (bijv. na de nieuwe inlog bij Cloudflare) gaat direct verder.
  const STARTGEZIEN_SLEUTEL = "bankoverzicht-start";
  const startGezien = () => { try { return sessionStorage.getItem(STARTGEZIEN_SLEUTEL) === "1"; } catch { return false; } };
  const markeerStartGezien = () => { try { sessionStorage.setItem(STARTGEZIEN_SLEUTEL, "1"); } catch { /* ignore */ } };
  useEffect(() => {
    (async () => {
      const pendingData = await loadPersistedParsedFiles();
      const pendingSettings = await loadPersistedSettings();
      if (pendingData && pendingData.length > 0) {
        // Er is een eerder project met geüploade bestanden — laat de gebruiker kiezen (of ga direct
        // verder als het startscherm in dit tabblad al is geweest).
        pendingProjectRef.current = { parsedFiles: pendingData, settings: pendingSettings };
        if (startGezien()) resumeLastProjectRef.current?.(); else setShowStartupChoice(true);
      } else {
        // Geen bewaard dossier — eventuele losse instellingen (zonder bestanden) alsnog inladen.
        skipNextPersistRef.current = true;
        suppressChangeCount();
        if (pendingSettings) applySettingsToState(pendingSettings);
        if (startGezien()) setLoaded(true); else setShowStartupChoice(true);
      }
    })();
  }, []);
  const resumeLastProjectRef = useRef(null);
  const resumeLastProject = () => {
    markeerStartGezien();
    const pending = pendingProjectRef.current;
    skipNextPersistRef.current = true;
    suppressChangeCount();
    if (pending) {
      setParsedFiles(pending.parsedFiles);
      if (pending.settings) applySettingsToState(pending.settings);
      // Niet-geëxporteerde wijzigingen blijven onthouden over een herstart heen.
      const n = Number(pending.settings?.changesSinceExport) || 0;
      restoredChangesRef.current = n;
      setChangesSinceExport(n);
      if (pending.settings?.lastExportAtMs) setLastExportAt(new Date(pending.settings.lastExportAtMs));
    }
    setShowStartupChoice(false);
    setLoaded(true);
  };
  resumeLastProjectRef.current = resumeLastProject;
  const startEmpty = () => {
    markeerStartGezien();
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
        ibStatus, zvwStatus, vpbStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, dismissedDuplicateNotice, bevestigdeControles,
        verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
        incomeBtwTarieven, meerdereTarievenBevestigd, verwachteAangeboden, loadedProjectFileName,
        changesSinceExport, lastExportAtMs: lastExportAt ? +lastExportAt : null,
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
    ibStatus, zvwStatus, vpbStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, dismissedDuplicateNotice, bevestigdeControles,
    verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
    incomeBtwTarieven, meerdereTarievenBevestigd, verwachteAangeboden, loadedProjectFileName,
    changesSinceExport, lastExportAt,
    loaded,
  ]);

  // v305 (V27) — telt wijzigingen sinds de laatste export. Zelfde afhankelijkheden als de autosave
  // hierboven, maar bewust zonder loadedProjectFileName (die verandert bij het exporteren zelf).
  useEffect(() => {
    if (!loaded) return;
    // Binnen het venster na laden/nieuw dossier telt niets mee. Het venster wordt bewust NIET na de eerste
    // keer gesloten: na het laden kunnen er nog meer afgeleide waarden bijkomen (een tweede render), en die
    // gaven anders een schijnbare "1 wijziging" bij een dossier waar je nog niets aan had gedaan.
    if (Date.now() < suppressChangeCountUntilRef.current) {
      setChangesSinceExport(restoredChangesRef.current);
      return;
    }
    setChangesSinceExport((n) => n + 1);
  }, [
    parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
    categoryBtwRates, btwVerlegd, korRegeling, rechtsvorm, heeftHolding, holdingBoekingen, excludedDuplicateFingerprints,
    businessKeywords, businessExpenseKeywords, reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
    kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
    leaseDetails, leaseMergedInto, activaDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints, transactionNotes,
    ibStatus, zvwStatus, vpbStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, dismissedDuplicateNotice, bevestigdeControles,
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
  // te bepalen of het bijv. "Terugboeking van privé" of "Uitbetaling aan prive" zou moeten zijn).
  const ownAccountsElsewhereByFile = useOwnAccountsElsewhereByFile({
    accountTypeByFile, eigenRekeningenExtra, ownAccountByFile, parsedFiles,
  });
  const eigenRekeningenGeladen = useMemo(() => {
    const seen = new Set();
    const res = [];
    for (const [fileName, iban] of Object.entries(ownAccountByFile)) {
      if (!iban || !accountTypeByFile[fileName] || seen.has(normKey(iban))) continue;
      seen.add(normKey(iban));
      res.push({ iban, accountType: accountTypeByFile[fileName] });
    }
    return res;
  }, [ownAccountByFile, accountTypeByFile]);
  const importDiagnostics = useMemo(
    () => computeImportDiagnostics(parsedFiles, allTransactions, openingBalanceCorrections),
    [parsedFiles, allTransactions, openingBalanceCorrections]
  );
  const fileContinuityRuw = useMemo(() => computeFileContinuity(importDiagnostics, accountTypeByFile), [importDiagnostics, accountTypeByFile]);
  // Een door jou als akkoord aangemerkt verschil tussen twee bestanden telt overal (controles, voortgang, rapport)
  // als aansluitend. Verandert het verschil later, dan hoort de sleutel er niet meer bij en komt het punt terug.
  const fileContinuity = useMemo(
    () => fileContinuityRuw.map((c) => {
      const sleutel = aansluitingControleSleutel(c);
      return !c.ok && bevestigdeControles?.[sleutel] ? { ...c, ok: true, bevestigd: true, sleutel } : { ...c, sleutel };
    }),
    [fileContinuityRuw, bevestigdeControles]
  );

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
    setAuditLog((prev) => {
      const laatste = prev[prev.length - 1];
      if (laatste && laatste.label === label && Date.now() - laatste.t < 2000) return prev;
      return [...prev, { t: Date.now(), label }].slice(-300);
    });
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
    setAutoWizardStatus(normalizeAutoWizard(s.autoWizardStatus));
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
    setAutoStatusState(normalizeAutoStatus(s.autoStatus));
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
    const priveNaam = zakelijkeSpaarRekening?.priveNaam;
    return [naam ? naam.toLowerCase() : null, priveNaam ? `prive:${priveNaam.toLowerCase()}` : null].filter(Boolean);
  }, [zakelijkeSpaarRekening]);

  const classified = useClassified({
    ZAKELIJKE_SPIEGEL_CATEGORIEEN, accountTypeByFile, businessExpenseKeywords, businessKeywords, categoryRules,
    eigenNamenKeywords, overridesByCounterparty, overridesByRow, ownAccountsElsewhereByFile, parsedFiles,
    transactions, zakelijkeSpaarKeywords, categoryZakelijkPercentage,
  });

  // Zoekt, na een "ja" op de lease/lening/AOV-vraag in de wizard (met een naam erbij), of die naam
  // al voorkomt in de geladen transacties — zowel meteen na het invullen als steeds opnieuw
  // wanneer er later nog een bestand bijkomt (classified.length verandert dan). Ná een keer
  // aanbieden/afwijzen voor de HUIDIGE dataset niet opnieuw hetzelfde voorstel doen — pas weer als
  // er méér transacties bijkomen (een nieuw bestand), niet bij elke herclassificatie op zich.
  useEffect(() => {
    if (verwachteMatchSuggestie) return;
    const proberen = [];
    (verwachteLease || []).forEach((item, idx) => proberen.push({ type: "lease", idx, naam: item.naam, aliassen: item.aliassen, gevonden: item.gevonden, targetCategory: "Lease (financieel)" }));
    // v275 — losse lijst voor overige leaseobjecten (machines, apparatuur), zie verwachteLeaseOverig
    // hierboven; eigen "type" (i.p.v. "lease") zodat de idx-gebaseerde verwachteAangeboden-sleutel
    // niet botst met die van verwachteLease.
    (verwachteLeaseOverig || []).forEach((item, idx) => proberen.push({ type: "lease-overig", idx, naam: item.naam, aliassen: item.aliassen, gevonden: item.gevonden, targetCategory: "Lease (financieel)" }));
    (verwachteLening || []).forEach((item, idx) => proberen.push({ type: "lening", idx, naam: item.naam, gevonden: item.gevonden, targetCategory: "Leningen" }));
    if (verwachteAOV?.status === "ja") {
      proberen.push({ type: "aov", idx: null, naam: verwachteAOV.naam, gevonden: verwachteAOV.gevonden, targetCategory: "AOV (arbeidsongeschiktheidsverzekering)" });
    }
    for (const { type, idx, naam, aliassen, gevonden, targetCategory } of proberen) {
      if (!naam || gevonden) continue;
      const aangebodenKey = `${type}${idx ?? ""}`;
      if (verwachteAangeboden[aangebodenKey] === classified.length) continue;
      // V58 — ook een kort woord ("Pon") telt als zoekwoord (als heel woord), en een naam waarvan alle
      // transacties al op de doelcategorie staan ("Volkswagen Pon Financial Services" zat al via een
      // ander woord bij lease) geldt als gevonden i.p.v. voor altijd als "nog niet gevonden" open te blijven.
      // Een contract kan meerdere namen hebben (aliassen): een transactie hoort erbij als één ervan past.
      const zoek = [naam, ...(aliassen || [])].map((nm) => {
        const naamTrim = String(nm).trim().toLowerCase();
        const keyword = extractKeywordCandidate(nm) || (naamTrim.length >= 3 ? naamTrim : "");
        if (!keyword) return null;
        const kortRe = keyword.length < 4 ? new RegExp(`(^|[^a-z0-9])${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`) : null;
        return { keyword, kortRe };
      }).filter(Boolean);
      if (zoek.length === 0) continue;
      const hits = classified.filter((t) => {
        if (t.isMirror) return false;
        const text = `${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase();
        return zoek.some(({ keyword, kortRe }) => (kortRe ? kortRe.test(text) : text.includes(keyword)));
      });
      const matches = hits.filter((t) => t.category !== targetCategory);
      if (matches.length === 0 && hits.length > 0) {
        if (type === "lease") setVerwachteLease((prev) => prev.map((item, i) => (i === idx ? { ...item, gevonden: true } : item)));
        if (type === "lease-overig") setVerwachteLeaseOverig((prev) => prev.map((item, i) => (i === idx ? { ...item, gevonden: true } : item)));
        if (type === "lening") setVerwachteLening((prev) => prev.map((item, i) => (i === idx ? { ...item, gevonden: true } : item)));
        if (type === "aov") setVerwachteAOV((prev) => ({ ...prev, gevonden: true }));
        continue;
      }
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
  // V58 — geteld per GROEP (zelfde tegenpartij + teken + categorie) in plaats van per transactie: 30
  // maandelijkse incasso's van dezelfde partij zijn één beslissing, niet dertig. Het aantal
  // transacties staat er apart bij (needsReviewTx) voor wie dat wil weten.
  const bevestigdInBulkVenster = (tx) => {
    if (tx.category !== "Overig" && tx.category !== "Overboekingen aan personen") return false;
    const k = counterpartyKey(tx.counterparty || tx.description, tx.amount);
    return !!k && (tx.category === "Overig" ? reviewedOverigKeys : reviewedPersonKeys).includes(k);
  };
  const confidenceSummary = useMemo(() => {
    let approved = 0, reviewTx = 0, unclearTx = 0;
    const reviewGroups = new Set(), unclearGroups = new Set(), allGroups = new Set(), unclearExBulk = new Set();
    for (const tx of classified) {
      if (tx.isMirror) continue;
      // V70 — losse pinbetalingen zonder herkend zoekwoord (categorie "Winkels divers", geschat) zijn
      // geen beslissingen per winkel: ze vormen samen ÉÉN controlepunt (de transacties zelf blijven
      // in de lijst "Classificatie zekerheid" staan).
      const losseWinkel = tx.category === "Winkels divers" && tx.confidence.level === "heuristic" && /losse pinbetaling/i.test(tx.confidence.label || "");
      const gk = losseWinkel ? "__losse-pinbetalingen__|Winkels divers" : `${counterpartyKey(tx.counterparty || tx.description, tx.amount) || tx.id}|${tx.category}`;
      allGroups.add(gk);
      if (tx.confidence.level === "override" || tx.confidence.level === "keyword") { approved++; continue; }
      // V90 — "Klopt zo" in het Overig-/Personen-venster telt als beoordeeld (anders blijft het onduidelijk tellen)
      if (bevestigdInBulkVenster(tx)) { approved++; continue; }
      if (tx.confidence.level === "heuristic") { reviewTx++; reviewGroups.add(gk); }
      else { unclearTx++; unclearGroups.add(gk); if (tx.category !== "Overig" && tx.category !== "Overboekingen aan personen") unclearExBulk.add(gk); }
    }
    const review = reviewGroups.size, unclear = unclearGroups.size;
    return { groupsTotal: allGroups.size, approved, review, unclear, unclearExBulk: unclearExBulk.size, reviewTx, unclearTx, needsReview: review + unclear, needsReviewTx: reviewTx + unclearTx, total: approved + reviewTx + unclearTx };
  }, [classified, reviewedOverigKeys, reviewedPersonKeys]);

  // ---- Data voor de 🟡/🔴-pop-up: "Overig" en "Overboekingen aan personen" horen daar altijd al
  // bij (die twee categorieën leveren per definitie nooit 🟢 op), dus die tellen we apart en
  // wijzen we liever naar de daarvoor bedoelde review-vensters dan dat we ze hier dupliceren. ----
  const uncertainModalData = useMemo(() => {
    if (!openConfidenceLevel) return null;
    const all = classified.filter((tx) => !tx.isMirror && tx.confidence.level === openConfidenceLevel && !bevestigdInBulkVenster(tx));
    const overigCount = all.filter((tx) => tx.category === "Overig").length;
    const personenCount = all.filter((tx) => tx.category === "Overboekingen aan personen").length;
    const rest = all.filter((tx) => tx.category !== "Overig" && tx.category !== "Overboekingen aan personen");
    return { transactions: rest, bulkCounts: { overig: overigCount, personen: personenCount } };
  }, [classified, openConfidenceLevel, reviewedOverigKeys, reviewedPersonKeys]);
  // V90 — een venster dat "0 open" meldt is overbodig: sluit automatisch zodra er niets (meer) te beoordelen is
  useEffect(() => {
    if (!openConfidenceLevel || !uncertainModalData) return;
    const b = uncertainModalData.bulkCounts;
    if (uncertainModalData.transactions.length === 0 && (b.overig || 0) + (b.personen || 0) === 0) setOpenConfidenceLevel(null);
  }, [openConfidenceLevel, uncertainModalData]);
  const jumpToOverigFromModal = () => {
    setOpenConfidenceLevel(null);
    setShowOverigReview(true);
    jumpToSection(overigReviewSectionRef);
  };
  const jumpToPersonenFromModal = () => {
    setOpenConfidenceLevel(null);
    if (pendingIncomeReview.length > 0) { jumpToSection(incomeReviewSectionRef); return; }
    setShowPersonReview(true);
    jumpToSection(personReviewSectionRef);
  };

  // ---- Inkomstenbronnen-review ----
  const incomeSummary = useMemo(() => computeIncomeSummary(classified, accountTypeByFile, businessKeywords), [classified, accountTypeByFile, businessKeywords]);
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
  // V90 — de bulkknoppen werken per TYPE: alleen de tegenpartijen die nu als Zakelijk (resp. Privé) staan.
  const overigZakelijkPending = pendingOverigReview.filter((i) => i.type === "Zakelijk");
  const overigPrivePending = pendingOverigReview.filter((i) => i.type !== "Zakelijk");
  const bulkMarkOverigAsPriveOpname = () => {
    for (const item of overigZakelijkPending) markOverigItem(item, "Privé opnames", "Zakelijk");
  };
  const bulkMarkOverigAsWinkelsDivers = () => {
    for (const item of overigPrivePending) markOverigItem(item, "Winkels divers", "Prive");
  };
  // V90 — "Overboekingen aan personen": alles in één keer bevestigen, of alles naar Overig
  const personBulkAction = [
    {
      label: `Alles is aan personen: ja (${pendingPersonReview.length})`,
      confirmText: `${pendingPersonReview.length} tegenpartij(en) allemaal bevestigen als "Overboeking aan personen"?`,
      onApply: () => {
        snapshotBeforeAction('"Klopt zo" bevestigd (alles)');
        const keys = pendingPersonReview.map((i) => i.key);
        setReviewedPersonKeys((prev) => [...new Set([...prev, ...keys])]);
      },
    },
    {
      label: `Alles is aan personen: nee (${pendingPersonReview.length})`,
      confirmText: `${pendingPersonReview.length} tegenpartij(en) allemaal NIET als overboeking aan personen zien? Ze komen dan bij "Overig" te staan, waar je ze verder kunt indelen.`,
      onApply: () => { for (const item of pendingPersonReview) markPersonSource(item, "Overig", item.type); },
    },
  ];
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
    const aandachtspuntenBlok = aandachtspuntenHtml(bepaalAandachtspunten({
      years: targetYears, yearPeriod, classified, incompleteLeases: incompleteLeasesCount, incompleteLoans: incompleteLoansCount,
      zelfstandigenaftrekStatus, startersaftrekStatus, autoStatus, priveRekeningGeladen, heeftVoorraad, rechtsvorm,
    }));
    const html = rechtsvorm === "bv"
      ? buildAangiftevoorstelBvHtml(targetYears, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, heeftHolding, { categoryZakelijkPercentage: categoryZakelijkPercentageEff, autoStatus, heeftLeaseAuto: heeftLeaseAutoDossierBreed, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, aandachtspuntenBlok })
      : buildAangiftevoorstelHtml(targetYears, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, startersaftrekEff, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, zaLegacyJaDefault, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, aandachtspuntenBlok);
    setAangiftevoorstelPreview(html);
    setShowAangifteYearPicker(false);
    setShowAangifteMeerdereJaren(false);
  };
  // E2 — samenvatting voor de klant (één pagina, zelfde cijfers als het Overzicht).
  const [klantSamenvattingHtml, setKlantSamenvattingHtml] = useState(null);
  const [klantJaarKeuze, setKlantJaarKeuze] = useState(null); // null = picker dicht, anders gekozen jaren
  const [klantSamenvattingJaren, setKlantSamenvattingJaren] = useState([]);
  const klantJaarData = (y) => {
    const s = yearlySummaries[y];
    if (!s) return { jaar: y, periode: yearPeriod[y]?.label, omzetNetto: null, winst: null, belasting: null };
    let delen = [];
    if (!korRegeling) {
      const q = computeQuarterlyBtwForYear(classified, y, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, computeBtwPrivegebruikAuto(y, { leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates: effectiveCategoryBtwRates, btwVerlegd, rechtsvorm }));
      delen.push({ label: "BTW", bedrag: [1, 2, 3, 4].reduce((acc, k) => { const r = q.find((i) => i.kwartaal === k); return acc + (r ? r.verschuldigdBtw21 + r.verschuldigdBtw9 - r.voorbelasting + (r.btwPrivegebruikAuto || 0) : 0); }, 0) });
    } else delen.push({ label: "BTW", bedrag: 0 });
    if (rechtsvorm === "bv") {
      delen.push({ label: "Vpb", bedrag: estimateVpb(s.winst, y).belasting || 0 });
    } else {
      const aftrek = ondernemersaftrekPerJaar[y];
      const starters = startersaftrekEff?.[y] === "ja";
      const bedragAftrek = aftrek ? aftrek.zelfstandigenaftrekBedrag + aftrek.startersaftrekBedrag : 0;
      const ib = estimateIncomeTaxMetOndernemersaftrek(s.winst, y, bedragAftrek, starters);
      const hk = estimateHeffingskortingenMetOndernemersaftrek(s.winst, y, bedragAftrek, starters)?.totaal || 0;
      const zvw = estimateZvwMetOndernemersaftrek(s.winst, y, bedragAftrek, starters);
      delen.push({ label: "IB (na heffingskorting)", bedrag: Math.max(0, (ib?.belasting || 0) - hk) });
      delen.push({ label: "Zvw", bedrag: zvw?.bijdrage || 0 });
    }
    return { jaar: y, periode: yearPeriod[y]?.label, omzetNetto: s.zakelijkeInkomstenNetto, winst: s.winst, belasting: { delen, totaal: delen.reduce((a, d) => a + d.bedrag, 0) } };
  };
  const [onderbouwingKeuze, setOnderbouwingKeuze] = useState(null);
  const [onderbouwingHtml, setOnderbouwingHtml] = useState(null);
  const [onderbouwingJaren, setOnderbouwingJaren] = useState([]);
  const openOnderbouwing = (gekozen) => {
    const jaren = [...gekozen].sort();
    if (jaren.length === 0) return;
    setOnderbouwingKeuze(null);
    setOnderbouwingJaren(jaren);
    setOnderbouwingHtml(buildOnderbouwingHtml({ klantNaam: eigenNamen?.ondernemer, jaren, classified }));
  };
  const startOnderbouwing = () => {
    if (!activeYear) return;
    if ((years || []).length > 1) setOnderbouwingKeuze([activeYear]);
    else openOnderbouwing([activeYear]);
  };
  const startKlantSamenvatting = () => {
    if (!activeYear) return;
    if ((years || []).length > 1) setKlantJaarKeuze([activeYear]);
    else openKlantSamenvatting([activeYear]);
  };
  const openKlantSamenvatting = (gekozen) => {
    const jaren = [...gekozen].sort();
    if (jaren.length === 0) return;
    setKlantJaarKeuze(null);
    setKlantSamenvattingJaren(jaren);
    setKlantSamenvattingHtml(buildKlantSamenvattingHtml({
      klantNaam: eigenNamen?.ondernemer, rechtsvorm,
      jaren: jaren.map(klantJaarData),
      profiel: dossierProfiel,
      openPunten: alleStappen.map((s) => ({ label: s.label, count: s.count })),
      meegenomen: (() => {
        const m = [];
        const act = activaSummary.map((a) => activaDetails[a.key]?.naam || a.naam).filter(Boolean);
        if (act.length) m.push({ label: "Bedrijfsmiddelen (activa)", items: act });
        const len = loanSummary.map((l) => l.name).filter(Boolean);
        if (len.length) m.push({ label: "Leningen", items: len });
        const fin = leaseSummary.filter((l) => l.category === "Lease (financieel)").map((l) => l.name);
        const op = leaseSummary.filter((l) => l.category !== "Lease (financieel)").map((l) => l.name);
        if (fin.length) m.push({ label: "Financiële lease", items: fin });
        if (op.length) m.push({ label: "Operationele lease", items: op });
        const soortTxt = autoWizardStatus?.soort === "financial" ? " (financiële lease)" : autoWizardStatus?.soort === "koop" ? " (gekocht)" : autoWizardStatus?.soort === "operational" ? " (operationele lease)" : "";
        const metJaren = (txt, js) => (jaren.length > 1 ? `${txt} (${jarenBereik(js)})` : txt);
        const priveJ = jaren.filter((j) => autoStatus?.[j] === "prive");
        const zaakJ = jaren.filter((j) => autoStatus?.[j] === "zaak");
        const autoItems = [];
        if (priveJ.length) autoItems.push(metJaren("privéauto zakelijk gebruikt", priveJ));
        if (zaakJ.length) autoItems.push(metJaren(`auto op de zaak${soortTxt}`, zaakJ));
        if (autoItems.length) m.push({ label: "Auto", items: autoItems });
        if (heeftVoorraad === true) m.push({ label: "Voorraad", items: ["aanwezig"] });
        return m;
      })(),
    }));
  };
  const [uitlegMeenemen, setUitlegMeenemen] = useState(false);
  const voorstelHtmlWeergave = uitlegMeenemen ? aangiftevoorstelPreview : zonderUitlegHtml(aangiftevoorstelPreview);
  const printAangiftevoorstelPreview = () => printHtmlDocument(stripBronHtml(voorstelHtmlWeergave));
  const downloadAangiftevoorstelPreview = () => (rechtsvorm === "bv" ? downloadAangiftevoorstelBv : downloadAangiftevoorstel)(stripBronHtml(voorstelHtmlWeergave), selectedAangifteYears);

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
    setLeaseDetailField, markLeaseUnknown, unmarkLeaseUnknown, confirmLeaseType, mergeLeaseInto, undoMergeLease, addManualLease, removeManualLease: removeManualLeaseRaw, koppelBetalingen, wijsKandidatenAf, behandelAlsLease, wijsZoekAf,
  } = useLoansAndLease({
    classified, setLoanDetails, setLeaseDetails, setConfirmedLeaseTypeKeys, setLeaseDetailsModalKey, openLeaseWizard,
    snapshotBeforeAction, setCounterpartyOverride, leaseMergedInto, setLeaseMergedInto, leaseDetails,
    setRowOverridesBulk: (ids, patch) => setOverridesByRow((prev) => { const next = { ...prev }; for (const id of ids) next[id] = { ...(prev[id] || {}), ...patch }; return next; }),
    onHerbeoordeelOverig: (lijst) => {
      const keys = new Set(lijst.flatMap((o) => [counterpartyKey(o.counterparty, o.amount), o.iban && exclusiveIbanKey(o.iban, o.amount)]).filter(Boolean));
      setReviewedOverigKeys((prev) => prev.filter((k) => !keys.has(k)));
    },
  });
  const removeManualLease = (key) => { geenAutoInklapRef.current = Date.now() + 2000; removeManualLeaseRaw(key); };
  registreerLeaseWizard({ leaseSummary, confirmedLeaseTypeKeys, leaseDetails, autoWizardStatus, verwachteLease, verwachteLeaseOverig, confirmLeaseType });

  // ---- Activa (bedrijfsmiddelen) — eenvoudiger dan Leningen/Lease: geen type-bevestiging nodig,
  // gegroepeerd per transactie (elke aanschaf is meestal eenmalig, niet per tegenpartij).
  const activaSummary = useMemo(() => computeActivaSummary(classified, activaDetails), [classified, activaDetails]);
  const setActivaDetailField = (key, newDetails) => {
    snapshotBeforeAction("Activagegevens aangepast");
    setActivaDetails((prev) => ({ ...prev, [key]: { ...(prev[key]?.handmatig ? { handmatig: true } : {}), ...newDetails } }));
  };
  // Bedrijfsmiddel handmatig toevoegen (zonder bankbetaling), vanuit de wizard (namen) of het Activa-paneel.
  const maakActivaSleutel = (i = 0) => `handmatig::${Date.now().toString(36)}${i}`;
  const voegActivaToe = (namen) => {
    const lijst = (namen || []).map((n) => String(n).trim()).filter(Boolean);
    if (lijst.length === 0) return;
    snapshotBeforeAction("Bedrijfsmiddelen toegevoegd");
    setActivaDetails((prev) => { const next = { ...prev }; lijst.forEach((naam, i) => { next[maakActivaSleutel(i)] = { handmatig: true, naam }; }); return next; });
  };
  const addManualActiva = () => {
    const key = maakActivaSleutel();
    snapshotBeforeAction("Bedrijfsmiddel toegevoegd");
    setActivaDetails((prev) => ({ ...prev, [key]: { handmatig: true, nieuw: true, naam: "Nieuw bedrijfsmiddel" } }));
    setActivaDetailsModalKey(key);
  };
  const removeActivum = (key) => {
    snapshotBeforeAction("Bedrijfsmiddel verwijderd");
    setActivaDetails((prev) => { const next = { ...prev }; delete next[key]; return next; });
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
  // meerdere vergelijkbare transacties vraagt de app of dit voor alle jaren moet gelden, of voor
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
      if (!map[key]) map[key] = { label: `${vt === "Zakelijk" ? "Zakelijk" : "Privé"} ${tx.year}`, type: vt, year: tx.year, items: [] };
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
  // V65 — suggesties uit de al ingelezen bankdata voor de wizard (lease, lening, AOV, klanten, leveranciers).
  const wizardSuggesties = useMemo(() => ((showSetupWizard || manualWizardOpen) ? computeWizardSuggesties(classified) : {}), [showSetupWizard, manualWizardOpen, classified]);
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
  const yearCoverage = useMemo(() => {
    const c = {};
    for (const g of groups) {
      if (!g.items || g.items.length === 0) continue;
      const e = (c[g.year] ||= { zakelijk: false, prive: false, zakelijkBestanden: 0, priveBestanden: 0 });
      if (g.type === "Zakelijk") e.zakelijk = true; else e.prive = true;
    }
    // Aantal bestanden per type dat het jaar overlapt (op basis van de periode van elk bestand).
    for (const [jaar, e] of Object.entries(c)) {
      const start = new Date(Number(jaar), 0, 1), eind = new Date(Number(jaar), 11, 31, 23, 59, 59);
      for (const d of importDiagnostics || []) {
        if (!d.from || !d.to || d.from > eind || d.to < start) continue;
        if (accountTypeByFile[d.fileName] === "Prive") e.priveBestanden++; else e.zakelijkBestanden++;
      }
      // De bestanden zelf bepalen wat er geladen is: een privé-boeking op een zakelijke rekening maakt
      // wel een "Prive"-groep, maar is geen privé-bestand.
      if (e.zakelijkBestanden + e.priveBestanden > 0) { e.zakelijk = e.zakelijkBestanden > 0; e.prive = e.priveBestanden > 0; }
      if (e.zakelijk && !e.zakelijkBestanden) e.zakelijkBestanden = 1;
      if (e.prive && !e.priveBestanden) e.priveBestanden = 1;
    }
    return c;
  }, [groups, importDiagnostics, accountTypeByFile]);
  const zakGroupForYear = groups.find((g) => g.year === activeYear && g.type === "Zakelijk") || { label: `Zakelijk ${activeYear}`, type: "Zakelijk", year: activeYear, items: [] };
  const priGroupForYear = groups.find((g) => g.year === activeYear && g.type === "Prive") || { label: `Privé ${activeYear}`, type: "Prive", year: activeYear, items: [] };
  // V46 — privé-only dossier: de privékant toont álle transacties van de rekening (ook die met een
  // zakelijke categorie, die aan de zakelijke kant gespiegeld staan). Alleen voor weergave; controles
  // en checklists blijven op `priGroupForYear` rekenen zodat niets dubbel geteld wordt.
  const priGroupShown = useMemo(() => {
    if (Object.values(accountTypeByFile).includes("Zakelijk")) return priGroupForYear;
    const extra = zakGroupForYear.items.filter((t) => !t.isMirror);
    return extra.length ? { ...priGroupForYear, items: [...priGroupForYear.items, ...extra].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) } : priGroupForYear;
  }, [priGroupForYear, zakGroupForYear, accountTypeByFile]);
  // V28 — in de detailtabellen telt een "Overig"/personen-transactie die je in het opschoonvenster met
  // "Klopt zo" hebt bevestigd als 🟢 (zoals de controlekaart dat al deed); anders bleef hij daar 🟡
  // staan en klopte "Controleren (N)" niet met "Classificatie zekerheid 0".
  const metBevestiging = (g) => {
    if (!g.items.some(bevestigdInBulkVenster)) return g;
    return { ...g, items: g.items.map((t) => (bevestigdInBulkVenster(t) ? { ...t, confidence: { ...t.confidence, level: "override", label: "Bevestigd in het opschoonvenster (Klopt zo)" } } : t)) };
  };
  const zakGroupWeergave = useMemo(() => metBevestiging(zakGroupForYear), [zakGroupForYear, reviewedOverigKeys, reviewedPersonKeys]);
  const priGroupWeergave = useMemo(() => metBevestiging(priGroupShown), [priGroupShown, reviewedOverigKeys, reviewedPersonKeys]);

  // Zodra er ÉÉN auto-op-de-zaak geregistreerd staat — financiële lease (soort "auto"), koop, of
  // operationele lease — tellen computeLeaseAutoKostenVoorJaar (autoBijtelling.js) resp.
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
  // V15 — lichte periode-melding in het BTW-per-kwartaal-venster (alleen het actieve jaar).
  const periodeSignalenActiefJaar = useMemo(
    () => (activeYear ? computePeriodeMismatches(classified, reviewedPeriodeKeys, periodeQuarterOverrides).filter((m) => m.boekingKwartaal.startsWith(`${activeYear}-`) || m.voorgesteldKwartaal.startsWith(`${activeYear}-`)) : []),
    [classified, reviewedPeriodeKeys, periodeQuarterOverrides, activeYear]
  );
  const confirmPeriodeAsIs = (tx) => {
    snapshotBeforeAction("Periode laten staan");
    setReviewedPeriodeKeys((prev) => (prev.includes(tx.id) ? prev : [...prev, tx.id]));
  };
  const movePeriodeToQuarter = (tx, quarterKey) => {
    snapshotBeforeAction("Periode verplaatst");
    setPeriodeQuarterOverrides((prev) => ({ ...prev, [tx.id]: quarterKey }));
  };
  // Btw-correctie privégebruik auto (alleen zzp) — zie tax/btwPrivegebruikAuto.js.
  const btwPrivegebruikAutoActiefJaar = useMemo(
    () => (activeYear ? computeBtwPrivegebruikAuto(activeYear, { leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates: effectiveCategoryBtwRates, btwVerlegd, rechtsvorm }) : null),
    [activeYear, leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus, autoStatus, classified, effectiveCategoryBtwRates, btwVerlegd, rechtsvorm]
  );
  const quarterlyBtwData = useMemo(
    () => (activeYear ? computeQuarterlyBtwForYear(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, btwPrivegebruikAutoActiefJaar) : []),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, btwPrivegebruikAutoActiefJaar]
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
  // andere bijtellingssystematiek (via de loonheffing), die deze app niet nabootst.
  const leaseAutoKostenForActiveYear = useMemo(
    () =>
      activeYear && rechtsvorm !== "bv"
        ? combineAutoKosten(
            computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, activeYear, classified, effectiveCategoryBtwRates, btwVerlegd),
            computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, activeYear, classified, effectiveCategoryBtwRates, btwVerlegd),
            autoStatus, activeYear
          )
        : null,
    [leaseSummary, leaseDetails, activeYear, classified, rechtsvorm, effectiveCategoryBtwRates, btwVerlegd, autoActivaDetails, autoWizardStatus, autoStatus]
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
  // Kilometervergoeding voor een privéauto die zakelijk gebruikt wordt (autoStatus "prive")
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
  // V23 — BV: afschrijving (en boekresultaat bij beëindiging) van een financiële-lease-auto/machine telt ook op de
  // kaart mee in de winst — zelfde bedrag als in het BV-rapport (computeBvWinstInvoer in aangiftevoorstel-bv.js).
  const bvLeaseAutoWinstCorrectieActiveYear = useMemo(
    () => (activeYear && rechtsvorm === "bv" ? computeBvWinstInvoer(activeYear, classified, effectiveCategoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, {}).leaseAutoWinstCorrectie : 0),
    [activeYear, rechtsvorm, classified, effectiveCategoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails]
  );
  const winstCorrectieActiveYear =
    (leaseAutoKostenForActiveYear?.winstCorrectie || 0) - (gedeeldeHuurForActiveYear?.nietAftrekbaarBedrag || 0) -
    (gedeeldeEnergieForActiveYear?.nietAftrekbaarBedrag || 0) - (gedeeldeGemeentelijkeKostenForActiveYear?.nietAftrekbaarBedrag || 0) +
    (kmVergoedingForActiveYear?.bedrag || 0) + (activaAfschrijvingForYear?.totaalAfschrijving || 0) +
    (bvLeaseAutoWinstCorrectieActiveYear || 0);
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
  const yearlySummaries = useYearlySummaries({
    activaDetails, activaSummary, autoActivaDetails, autoStatus, autoWizardStatus,
    btwVerlegd, categoryZakelijkPercentageEff, classified, effectiveCategoryBtwRates, energieZakelijkPercentageStatus,
    fixedCategories, gemeentelijkeKostenZakelijkPercentageStatus, heeftLeaseAutoDossierBreed, huurZakelijkPercentageStatus, kmVergoedingDetails,
    leaseDetails, leaseSummary, loanDetails, loanSummary, rechtsvorm,
    voorbelastingExcluded, years,
  });
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
  const ondernemersaftrekPerJaar = useOndernemersaftrekPerJaar({
    rechtsvorm, startersaftrekStatus: startersaftrekEff, yearlySummaries, years, zaLegacyJaDefault,
    zelfstandigenaftrekStatus,
  });
  const dashboardAangifteIndicatie = useDashboardAangifteIndicatie({
    activeYear, ondernemersaftrekPerJaar, rechtsvorm, startersaftrekStatus: startersaftrekEff, yearlySummary,
  });
  // "Zakelijke kosten" per jaar, exact dezelfde optelsom als "Zakelijke kosten" in het
  // Aangiftevoorstel (zie buildYearSection/kostenTotaal in aangiftevoorstel.js): inkoopkosten +
  // afschrijving (berekend als Activa is ingevuld, anders het bruto aanschafbedrag ter herkenning)
  // + overige bedrijfskosten + aftrekbare rente. Bewust NIET zelf opnieuw berekend vanuit
  // computeYearlySummary — dat zou de kans op verschil met het Aangiftevoorstel juist vergroten.
  const kostenTotaalByYear = useKostenTotaalByYear({
    activaDetails, activaSummary, autoActivaDetails, autoStatus, autoWizardStatus,
    btwVerlegd, categoryZakelijkPercentageEff, classified, effectiveCategoryBtwRates, kmVergoedingDetails,
    leaseDetails, leaseSummary, loanDetails, loanSummary, rechtsvorm,
    years, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus,
  });
  // BV-specifiek: alleen berekend/gebruikt als rechtsvorm === "bv" (zie Meerjarenoverzicht BV en het
  // BV-Aangiftevoorstel), maar hier al altijd bijgehouden — dezelfde Route B-redenering als de rest
  // van de app: deze categorieën bestaan niet in een zzp-dossier, dus deze waarden zijn dan gewoon
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
  // V16 — optelling onderaan "Details en overzichten": BTW (4 kwartalen) + IB na heffingskorting + Zvw
  // (zzp) of Vpb (BV). Positief = te betalen, negatief = terug te krijgen.
  const belastingTotaalJaar = useBelastingTotaalJaar({
    activeYear, dashboardAangifteIndicatie, dashboardVpbIndicatie, korRegeling, quarterlyBtwData,
    rechtsvorm,
  });
  // v283 — zelfde drieluik (Omzet incl. BTW / Omzet excl. BTW / Zakelijke kosten) als de
  // "kerncijfers"-kaart in het BV-Aangiftevoorstel (reports/aangiftevoorstel-bv.js), nu ook als korte
  // toelichting onder "Indicatieve vennootschapsbelasting" op het Jaaroverzicht. Geen nieuwe
  // berekening: omzetExclBtw = yearlySummary.zakelijkeInkomstenNetto (zelfde definitie als "1.
  // Opbrengsten" in het Aangiftevoorstel), omzetInclBtw = daar de over dit jaar verschuldigde BTW op
  // de omzet (som van box 1a/1b per kwartaal, uit quarterlyBtwData) bovenop, en zakelijkeKosten wordt
  // afgeleid uit winst = omzetExclBtw - kosten (dezelfde identiteit als het Aangiftevoorstel, dat
  // hetzelfde totaal via een andere optelling — inkoop/afschrijving/overig/rente — uitrekent), zodat
  // dit bedrag hier altijd exact aansluit bij "Resultaat vóór Vpb" hierboven.
  const dashboardVpbBreakdown = useDashboardVpbBreakdown({
    activeYear, quarterlyBtwData, rechtsvorm, yearlySummary,
  });
  // v282 — samenvatting van de holding-boekingen voor het actieve jaar, als compacte kaart (zelfde
  // vorm als aannamesCard) voor diezelfde Jaaroverzicht-sub-tab. Herhaalt bewust dezelfde
  // verschil-berekening als de rij voor dit jaar in HoldingBoekingenPanel.jsx — puur een
  // samenvatting/link daarnaartoe, geen nieuwe databron.
  const holdingSummaryCard = useHoldingSummaryCard({
    activeYear, evVerloop, heeftHolding, holdingBoekingen, holdingBoekingenSectionRef,
    jumpToSection: (...a) => jumpToSection(...a), rechtsvorm, setShowHoldingBoekingen,
  });
  const volledigeJaren = useMemo(() => computeVolledigeJaren(classified), [classified]);
  // Is er daadwerkelijk een privérekening-BESTAND geladen in dit dossier? Zie de toelichting bij
  // `priveRekeningGeladen` in tax/checklist.js — bepaalt of de spiegelboeking-check daar nog
  // betekenis heeft, of dat de echte privétransacties zelf al hun eigen tegenboeking zijn.
  const rekeningTypeTekst = (() => {
    const t = parsedFiles.map((f) => accountTypeByFile[f.fileName]).filter(Boolean);
    const z = t.filter((x) => x === "Zakelijk").length, p = t.filter((x) => x === "Prive").length;
    if (z + p === 0) return "";
    if (p === 0) return " — alleen zakelijk geladen";
    if (z === 0) return " — alleen privé geladen";
    return ` (${z} zakelijk, ${p} privé)`;
  })();
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
  const aansluitControleInfo = useAansluitControleInfo({
    priGroupForYear, priveRekeningGeladen, zakGroupForYear, zakelijkRekeningGeladen,
  });
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
  const yearlyProgress = useYearlyProgress({
    autoStatus, bevestigdInBulkVenster, btwVerlegd, categoryZakelijkPercentageEff, classified,
    effectiveCategoryBtwRates, energieZakelijkPercentageStatus, fileContinuity, gemeentelijkeKostenZakelijkPercentageStatus, groups,
    heeftLeaseAutoDossierBreed, huurZakelijkPercentageStatus, ibStatus, incompleteActivaCount, incompleteLeasesCount,
    incompleteLoansCount, korRegeling, kwartaalStatus, periodeQuarterOverrides, priveRekeningGeladen,
    rechtsvorm, reviewedOverigKeys, reviewedPersonKeys, voorbelastingExcluded, vpbStatus,
    years, zelfstandigenaftrekStatus, zvwStatus,
  });

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
  // V90 — jumpToSection wordt aangeroepen vanuit onClick-handlers die in useMemo-kaarten zijn vastgelegd
  // (controlerenDashboardCards e.d.); die zagen daardoor een verouderde activeTab/expandedCardKeys en
  // deden soms niets (bijv. na "Terug naar Overzicht" of een zelf ingeklapte kaart). Lezen via refs = altijd actueel.
  const expandedLiveRef = useRef(expandedCardKeys);
  expandedLiveRef.current = expandedCardKeys;
  const activeTabLiveRef = useRef(activeTab);
  activeTabLiveRef.current = activeTab;
  // Klapt het inklapbare paneel in de doelsectie open (zie components/shared/useOpenOnJump.js).
  const openPaneelIn = (el) => { el?.querySelector?.("section")?.dispatchEvent(new Event("bankoverzicht-open")); };
  const jumpToSection = (ref) => {
    if (ref === leasesSectionRef) autoOpenLeaseWizard();
    // v281 — als deze ref bij een kaart hoort waarvan de zichtbaarheid afhangt van de
    // uitgeklapt/ingeklapt-stand (zie REF_COLLAPSE_KEYS hierboven), en de kaart staat nu niet in de
    // daarvoor benodigde stand, is de sectie op dit moment niet gemount — eerst de kaart in de juiste
    // stand zetten, dan pas (na een extra render) scrollen, anders gebeurt er niets (ref.current is
    // null).
    const visibilityEntry = REF_COLLAPSE_KEYS.find(([r]) => r === ref);
    const visibilityKey = visibilityEntry ? visibilityEntry[1] : null;
    const requiredExpanded = visibilityEntry ? visibilityEntry[2] : null;
    const needsToggle = !!(visibilityKey && !!expandedLiveRef.current[visibilityKey] !== requiredExpanded);
    if (needsToggle) {
      setExpandedCardKeys((prev) => ({ ...prev, [visibilityKey]: requiredExpanded }));
    }
    const entry = REF_TAB_ENTRIES.find(([r]) => r === ref);
    const targetTab = entry ? entry[1] : null;
    if (targetTab && targetTab !== activeTabLiveRef.current) {
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
    if (!ref.current) { setPendingScrollRef(ref); return; }
    openPaneelIn(ref.current);
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  // Voert de scroll pas uit nadat het doel-tabblad daadwerkelijk actief (en dus zichtbaar) is
  // geworden — requestAnimationFrame wacht op de eerstvolgende render/paint na de tabwissel. Ook
  // opnieuw triggeren op expandedCardKeys (Fase 3): na het automatisch inklappen van een kaart
  // (zie jumpToSection hierboven) moet er ook zonder tabwissel een extra render/paint afgewacht
  // worden vóórdat de doel-sectie weer gemount is.
  useEffect(() => {
    if (!pendingScrollRef) return;
    // V90 — wacht tot de sectie echt gemount is (max ~40 frames) i.p.v. na één frame op te geven
    let raf, pogingen = 0, gestopt = false;
    const probeer = () => {
      if (gestopt) return;
      const el = pendingScrollRef.current;
      if (el) {
        openPaneelIn(el);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setPendingScrollRef(null);
      } else if (pogingen++ < 40) {
        raf = requestAnimationFrame(probeer);
      } else {
        setPendingScrollRef(null);
      }
    };
    raf = requestAnimationFrame(probeer);
    return () => { gestopt = true; cancelAnimationFrame(raf); };
  }, [activeTab, expandedCardKeys, pendingScrollRef]);
  const dashboardCards = useDashboardCards({
    aansluitControleInfo, accountTypeByFile, activeYear, btwSettingsSectionRef, btwVerlegd,
    businessAdvies, bvSignalering, bvSignaleringSectionRef, checklistData, checklistSectionRef,
    confidenceSectionRef, confidenceSummary, confirmedLeaseTypeKeys, dashboardAangifteIndicatie, detailsSectionRef,
    duplicatePendingBreakdown, duplicatesSectionRef, ibStatus, incomeReviewSectionRef, incompleteLeasesCount,
    incompleteLoansCount, jumpToSection, korRegeling, leaseDetails, leaseSummary,
    leasesSectionRef, loanDetails, loanSummary, loansSectionRef, overigReviewSectionRef,
    pendingDuplicateCount, pendingIncomeReview, pendingOverigReview, pendingPersonReview, personReviewSectionRef,
    quarterlyBtwData, rechtsvorm, setDismissedDuplicateNotice, setOpenConfidenceLevel, setShowAangifteYearPicker,
    setShowMultiYearModal, setShowOverigReview, setShowPersonReview, setShowQuarterlyBtwModal, transactions,
    vpbStatus, yearlyProgress, yearlySummary, zvwStatus,
  });

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
      (d) => d.balanceCheck && !d.balanceCheck.ok && Math.abs(d.balanceCheck.diff) >= INTRA_FILE_BALANCE_THRESHOLD && !bevestigdeControles[saldoControleSleutel(d)]
    ).length;
    const aansluitProblemen = fileContinuity.filter((c) => !c.ok && classifyContinuityGap(c.diff) === "rood").length;
    return balansProblemen + aansluitProblemen;
  }, [importDiagnostics, fileContinuity, bevestigdeControles]);

  // v240 — Mini-dashboard voor tabblad "Controleren": dezelfde kaartstijl als Overzicht, maar dan
  // precies de items die je tijdens het daadwerkelijk controleren van een dossier afloopt (import,
  // classificatie, openstaande overboekingen/tegenpartijen, duplicaten, factuurperiode) — bij elkaar
  // op de plek waar je toch al aan het controleren bent, i.p.v. terug te moeten naar Overzicht.
  // "Factuurperiode" stond eerder op Overzicht en is hiernaartoe verhuisd (zie dashboardCards
  // hierboven, waar die kaart is weggehaald).
  const yearPeriod = useMemo(() => berekenJaarPeriodes(allTransactions), [allTransactions]);
  // Aanvullende controles (C1 dekking, C2 terugkerende betalingen, C3 jaarvergelijking)
  const aanvullendeControles = useMemo(() => {
    if (!allTransactions.length) return null;
    return {
      dekking: berekenDekking({ allTransactions, importDiagnostics, fileContinuity, accountTypeByFile, ownAccountByFile, bevestigd: bevestigdeControles }),
      terugkerend: vindTerugkerendeInconsistenties({ classified, overridesByRow, bevestigd: bevestigdeControles }),
      sprongen: vindJaarSprongen({ classified, bevestigd: bevestigdeControles }),
    };
  }, [allTransactions, importDiagnostics, fileContinuity, accountTypeByFile, ownAccountByFile, classified, overridesByRow, bevestigdeControles]);
  const bevestigControle = (sleutel) => setBevestigdeControles((prev) => ({ ...prev, [sleutel]: true }));
  const bevestigControles = (sleutels) => setBevestigdeControles((prev) => { const next = { ...prev }; for (const k of sleutels) next[k] = true; return next; });
  const herroepControle = (sleutel) => setBevestigdeControles((prev) => { const next = { ...prev }; delete next[sleutel]; return next; });
  const toepassenTerugkerend = (t) => {
    snapshotBeforeAction(`Terugkerende betalingen ${t.naam} → ${t.hoofdCategorie}`);
    setOverridesByRow((prev) => { const next = { ...prev }; for (const a of t.afwijkend) next[a.id] = { ...(prev[a.id] || {}), category: t.hoofdCategorie, type: t.hoofdType }; return next; });
  };
  const controlerenDashboardCards = useControlerenDashboardCards({
    confidenceSectionRef, confidenceSummary, controlerenImportProblemCount, duplicatePendingBreakdown, duplicatesSectionRef,
    importControleSectionRef, incomeReviewSectionRef, jumpToSection, overigReviewSectionRef, pendingDuplicateCount,
    pendingIncomeReview, pendingOverigReview, pendingPersonReview, personReviewSectionRef, setDismissedDuplicateNotice,
    setOpenConfidenceLevel, setShowOverigReview, setShowPersonReview, transactions,
  });

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
  const instellingenDashboardCards = useInstellingenDashboardCards({
    aannamesSectionRef, activaSectionRef, activaSummary, activeYear, autoStatus,
    btwRateCounts, btwSettingsSectionRef, btwVerlegd, businessExpenseEntries, businessIncomeEntries,
    categorieTotalenActiveYear, categoryPercentageSectionRef, categoryZakelijkPercentage, energieZakelijkPercentageStatus, gedeeldeEnergieForActiveYear,
    gedeeldeGemeentelijkeKostenForActiveYear, gedeeldeHuurForActiveYear, gemeentelijkeKostenZakelijkPercentageStatus, huurZakelijkPercentageStatus, incomeRatesSectionRef,
    incompleteActivaCount, incompleteLeasesCount, incompleteLoansCount, jumpToSection, korRegeling,
    leaseSummary, leasesSectionRef, loanSummary, loansSectionRef, parsedFiles,
    rechtsvorm, setExpandedBusinessExpenseList, setExpandedBusinessIncomeList, startersaftrekStatus, startersaftrekEff, transactions,
    zaLegacyJaDefault, zelfstandigenaftrekStatus,
  });

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
  const controlerenCardGroups = useControlerenCardGroups({
    rechtsvorm,
    PRIVE_ONLY_HUISVESTING_STANDAARD_NUL, aannamesSectionRef, aansluitControleInfo, accountTypeByFile, activaDetails,
    activaSectionRef, activaSummary, activeYear, autoStatus, autoWizardStatus,
    btwVerlegd, bulkMarkOverigAsPriveOpname, bulkMarkOverigAsWinkelsDivers, categorieTotalenActiveYear, categoryPercentageSectionRef,
    categoryZakelijkPercentage, classified, confidenceSectionRef, confirmClassificationCorrect, confirmLeaseType,
    confirmOverigAsIs, confirmPersonAsIs, confirmedLeaseTypeKeys, confirmedSeparateGroups, controlerenCardsByKey,
    detailsSectionRef, duplicateGroups, duplicatePendingBreakdown, duplicatesSectionRef, effectiveCategoryBtwRates,
    energieZakelijkPercentageStatus, expandedCardKeys, expandedTable, fileContinuity, fingerprintByTxId,
    gedeeldeEnergieForActiveYear, gedeeldeGemeentelijkeKostenForActiveYear, gedeeldeHuurForActiveYear, gemeentelijkeKostenZakelijkPercentageStatus, groupCards,
    aanvullendeControles, bevestigControle, bevestigControles, herroepControle, bevestigdeControles, toepassenTerugkerend,
    huurZakelijkPercentageStatus, importControleSectionRef, importDiagnostics, incomeReviewSectionRef, incomeSearch,
    incomeSummary, instellingenCardsByKey, isDuplicateGroupRemoved, jumpToSection, kmVergoedingDetails,
    leaseDetails, leaseMerges, leaseSummary, leasesSectionRef, loanDetails,
    loanSummary, loansSectionRef, markActivaUnknown, addManualActiva, removeActivum, markIncomeSource, markLeaseUnknown,
    markLoanAsPrive, markLoanAsZakelijk, markLoanNotALoan, markLoanUnknown, markOverigItem,
    markPersonSource, mergeLeaseInto, overigPrivePending, overigReviewSectionRef, overigSearch,
    overigSummary, overigZakelijkPending, pendingDuplicateCount, pendingIncomeReview, pendingOverigReview,
    pendingPersonReview, personBulkAction, personReviewSectionRef, personSearch, personSummary,
    priGroupForYear, priGroupShown, privateLoanSummary, priveOnlyDossier, priveRekeningGeladen,
    removeDuplicateGroup, removeDuplicates, removeFile, requestSetCategoryZakelijkPercentage, restoreDuplicateGroup,
    setActivaDetailsModalKey, setAutoStatus, setDismissedDuplicateNotice, setDuplicateDetailGroup, setEnergieZakelijkPercentageStatus,
    setGemeentelijkeKostenZakelijkPercentageStatus, setHelpPopupChapter, setHuurZakelijkPercentageStatus, setIncomeSearch, setKmVergoedingField,
    setLeaseDetailsModalKey, openLeaseWizard, addManualLease, removeManualLease, koppelBetalingen, wijsKandidatenAf, behandelAlsLease, wijsZoekAf, verwachteLeaseOverig, setLoanDetailsModalKey, setOpenConfidenceLevel, setOverigSearch, setPersonSearch,
    setReviewFileModal, setShowAutoActivaModal, setShowConfirmedSeparateDuplicates, setShowDuplicateDetails, setShowOnverklaard,
    setShowOverigReview, setShowPersonReview, setStartersaftrekStatus, setZelfstandigenaftrekStatus, showConfirmedSeparateDuplicates,
    showDuplicateDetails, showOverigReview, showPersonReview, startersaftrekStatus, transactionNotes,
    transactions, undoMergeLease, unmarkActivaUnknown, unmarkLeaseUnknown, unmarkLoanUnknown,
    withExpand, yearlySummary, zaLegacyJaDefault, zakGroupForYear, zakelijkRekeningGeladen,
    zelfstandigenaftrekStatus,
  });
  const dossierProfiel = useMemo(
    () => bouwDossierProfiel({
      parsedFiles, accountTypeByFile, years, rechtsvorm, heeftHolding, korRegeling, btwVerlegd, kwartaalStatus,
      autoWizardStatus, verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad,
      zelfstandigenaftrekStatus, startersaftrekStatus, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening,
      leaseSummary, leaseMerges, confirmedLeaseTypeKeys, leaseDetails, autoStatus,
    }),
    [parsedFiles, accountTypeByFile, years, rechtsvorm, heeftHolding, korRegeling, btwVerlegd, kwartaalStatus,
      autoWizardStatus, verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad,
      zelfstandigenaftrekStatus, startersaftrekStatus, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening,
      leaseSummary, leaseMerges, confirmedLeaseTypeKeys, leaseDetails, autoStatus]
  );
  const instellingenCardGroups = useInstellingenCardGroups({
    dossierProfiel,
    activaDetails, activaSummary, activeYear, addBusinessExpenseKeyword, addBusinessKeyword,
    autoStatus, autoWizardStatus, automatiseringSectionRef, btwSettingsSectionRef, btwVerlegd,
    businessExpenseEntries, businessExpenseKeywords, businessIncomeEntries, businessKeywords, categorieTotalenActiveYear,
    categoryBtwRates, categoryRules, categoryZakelijkPercentage, classified, confirmedLeaseTypeKeys,
    effectiveCategoryBtwRates, eigenRekeningenExtra, eigenRekeningenGeladen, energieZakelijkPercentageStatus, expandedBusinessExpenseList,
    expandedBusinessIncomeList, expandedCardKeys, fixedCategories, gedeeldeEnergieForActiveYear, gedeeldeGemeentelijkeKostenForActiveYear,
    gedeeldeHuurForActiveYear, gemeentelijkeKostenZakelijkPercentageStatus, groupCards, huurZakelijkPercentageStatus, incomeBtwTarieven,
    incomeRatesSectionRef, instellingenCardsByKey, kmVergoedingDetails, korRegeling, leaseDetails,
    leaseMerges, leaseSummary, loanDetails, loanSummary, meerdereTarievenBevestigd,
    overridesByCounterparty, privateLoanSummary, reclassifyBusinessEntry, removeBusinessExpenseKeyword, removeBusinessKeyword,
    setBtwVerlegdWithUndo, setCategoryBtwRatesWithUndo, setCategoryRulesWithUndo, setCounterpartyBtwVerlegd, setEigenRekeningenExtra,
    setExpandedBusinessExpenseList, setExpandedBusinessIncomeList, setFixedCategoriesWithUndo, setHelpPopupChapter, setIncomeRate,
    setKorRegelingWithUndo, setMeerdereTarievenBevestigd, setOverridesByCounterpartyWithUndo, snapshotBeforeAction, startersaftrekStatus,
    transactions, withExpand, yearlySummary, zaLegacyJaDefault, zelfstandigenaftrekStatus,
  });

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
  // V90 — Lease/Leningen/Activa zijn te controleren data (BTW/aftrek/kosten), geen instellingen: tellen bij Controleren
  const VERPLAATST_NAAR_CONTROLEREN = ["loans", "leases", "activa", "aannames"];
  const controlerenBadge = useMemo(
    () => controlerenDashboardCards.reduce((a, c) => a + openPointsOf(c), 0) + instellingenDashboardCards.filter((c) => VERPLAATST_NAAR_CONTROLEREN.includes(c.key)).reduce((a, c) => a + openPointsOf(c), 0),
    [controlerenDashboardCards, instellingenDashboardCards]
  );
  const instellingenBadge = useMemo(
    () => instellingenDashboardCards.filter((c) => !VERPLAATST_NAAR_CONTROLEREN.includes(c.key)).reduce((a, c) => a + openPointsOf(c), 0),
    [instellingenDashboardCards]
  );

  const dossierOpenPoints = controlerenBadge + instellingenBadge;
  // V68 — het percentage in de ring volgt nu dezelfde telling als de "open punten": het deel van alle
  // te beoordelen groepen (tegenpartij + categorie) dat al zeker is ingedeeld. Overige open punten
  // (instellingen, duplicaten, enz.) tellen als open én als deel van het totaal. Nooit 100% zolang er
  // iets openstaat; voorheen was dit een gemiddelde van enkele losse checks (bijv. % transacties buiten
  // "Overig") en kon het 99% tonen bij honderden open punten.
  const dossierPct = useMemo(() => {
    if (!classified.length) return null;
    const classOpen = confidenceSummary.needsReview;
    const overige = Math.max(0, dossierOpenPoints - classOpen);
    const totaal = Math.max(confidenceSummary.groupsTotal + overige, dossierOpenPoints, 1);
    if (dossierOpenPoints === 0) return 100;
    return Math.min(99, Math.floor((100 * (totaal - dossierOpenPoints)) / totaal));
  }, [classified, confidenceSummary, dossierOpenPoints]);
  // V74 — tweede ring: dezelfde berekening, maar alleen voor het gekozen jaar. Open = groepen met een
  // onzekere indeling in dat jaar + de administratieve jaarchecks die nog openstaan (KOR, BTW-verlegd,
  // personen/Overig beoordeeld, enz.); totaal = alle groepen van dat jaar + het aantal jaarchecks.
  const yearRing = useMemo(() => {
    if (!activeYear || !yearlyProgress[activeYear] || !classified.length) return null;
    const alle = new Set(), open = new Set();
    for (const tx of classified) {
      if (tx.isMirror || Number(tx.year) !== Number(activeYear)) continue;
      const gk = (tx.category === "Winkels divers" && tx.confidence.level === "heuristic" && /losse pinbetaling/i.test(tx.confidence.label || ""))
        ? "__losse-pinbetalingen__|Winkels divers"
        : `${counterpartyKey(tx.counterparty || tx.description, tx.amount) || tx.id}|${tx.category}`;
      alle.add(gk);
      if ((tx.confidence.level === "heuristic" || tx.confidence.level === "fallback") && !bevestigdInBulkVenster(tx)) open.add(gk);
    }
    const adminOpen = yearlyProgress[activeYear].openPunten || 0;
    const openN = open.size + adminOpen;
    const totaal = Math.max(alle.size + 5, openN, 1);
    const pct = openN === 0 ? 100 : Math.min(99, Math.floor((100 * (totaal - openN)) / totaal));
    return { pct, open: openN, jaar: activeYear };
  }, [classified, activeYear, yearlyProgress, reviewedOverigKeys, reviewedPersonKeys]);
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
  const stapItem = (c) => ({ key: c.key, label: c.title, count: typeof c.openCount === "number" ? c.openCount : c.value, onClick: c.onClick });
  const teControlerenItems = useMemo(
    () => [
      ...controlerenDashboardCards.filter((c) => c.tone === "attention" || c.tone === "risk").map(stapItem),
      ...instellingenDashboardCards.filter((c) => VERPLAATST_NAAR_CONTROLEREN.includes(c.key) && (c.tone === "attention" || c.tone === "risk")).map(stapItem),
    ],
    [controlerenDashboardCards, instellingenDashboardCards]
  );
  const inTeStellenItems = useMemo(
    () => instellingenDashboardCards.filter((c) => !VERPLAATST_NAAR_CONTROLEREN.includes(c.key) && (c.tone === "attention" || c.tone === "risk")).map(stapItem),
    [instellingenDashboardCards]
  );
  const resultatenItems = useMemo(
    () => [
      { label: "Meerjarenoverzicht", onClick: () => setShowMultiYearModal(true) },
      { label: "BTW-aangifte per kwartaal", onClick: () => setShowQuarterlyBtwModal(true) },
    ],
    []
  );
  // V90 — vaste volgorde voor "eerstvolgende stap": eerst de importcontrole (klopt de data?), dan lease,
  // leningen en activa (die bepalen of andere open punten, zoals Overig/Overboekingen, nog nodig zijn),
  // daarna de rest. Een stap die je overslaat blijft in de lijst maar wordt niet meer als "volgende" getoond.
  const [overgeslagenStappen, setOvergeslagenStappen] = useState([]);
  const stapVolgorde = ["importControle", "leases", "loans", "activa", "aannames", "duplicates", "incomeReview", "personReview", "overigReview", "confidence"];
  const alleStappen = useAlleStappen({
    inTeStellenItems, stapVolgorde, teControlerenItems,
  });
  const volgendeStap = alleStappen.find((i) => i.onClick && !overgeslagenStappen.includes(i.key)) || null;
  // V22 — een uitgeklapte Controleren-kaart klapt vanzelf in zodra de LAATSTE open stap erin is afgerond
  // (bijv. Overig opruimen → 0 open en de rest van "Herkomst & opschonen" ook klaar). Alleen bij de overgang
  // "had open punten → geen open punten meer"; bij het laden van een dossier of een al-groene kaart gebeurt niets.
  const STAP_GROEPEN = {
    importKwaliteit: ["importControle", "confidence"],
    herkomstOpschonen: ["incomeReview", "personReview", "overigReview", "duplicates"],
    bedrijfsmiddelen: ["loans", "leases", "activa"],
    aannamesPercentages: ["aannames"],
  };
  const vorigeOpenGroepenRef = useRef(null);
  useEffect(() => {
    const open = new Set(Object.entries(STAP_GROEPEN).filter(([, keys]) => alleStappen.some((st) => keys.includes(st.key))).map(([g]) => g));
    const vorige = vorigeOpenGroepenRef.current;
    vorigeOpenGroepenRef.current = open;
    if (!vorige) return;
    const klaar = [...vorige].filter((g) => !open.has(g));
    if (klaar.length === 0) return;
    if (Date.now() < geenAutoInklapRef.current) return; // een zojuist verwijderd nieuw contract is geen 'klaar'
    setExpandedCardKeys((prev) => {
      if (!klaar.some((g) => prev[g])) return prev;
      const next = { ...prev };
      for (const g of klaar) if (next[g]) next[g] = false;
      return next;
    });
  }, [alleStappen]);
  // D1 — route Import → Controleren → Bedrijfsmiddelen → Aannames → Advies, afgeleid van dezelfde open stappen.
  const routeStappen = (() => {
    const som = (keys) => alleStappen.filter((st) => keys.includes(st.key)).reduce((n, st) => n + (st.count ?? 1), 0);
    const eerste = (keys) => alleStappen.find((st) => keys.includes(st.key) && st.onClick);
    const maak = (key, label, keys, klaarTekst, fallbackTab) => {
      const open = som(keys);
      return { key, label, open, geenData: parsedFiles.length === 0, sub: parsedFiles.length === 0 ? "nog geen input" : open > 0 ? `${open} open` : klaarTekst, eerste: eerste(keys), fallbackTab };
    };
    const lijst = [
      maak("import", "Import", ["importControle"], parsedFiles.length === 1 ? "1 bestand, klopt" : `${parsedFiles.length} bestanden, klopt`, "controleren"),
      maak("controleren", "Controleren", ["confidence", "incomeReview", "personReview", "overigReview", "duplicates"], "afgehandeld", "controleren"),
      maak("bedrijfsmiddelen", "Bedrijfsmiddelen", ["loans", "leases", "activa"], "afgehandeld", "controleren"),
      maak("aannames", "Instellingen", ["aannames"], "afgehandeld", "instellingen"),
    ];
    const vorigOpen = lijst.reduce((n, s) => n + s.open, 0);
    lijst.push({ key: "advies", label: "Advies", open: vorigOpen > 0 ? 1 : 0, geenData: parsedFiles.length === 0, sub: parsedFiles.length === 0 ? "nog geen input" : vorigOpen > 0 ? "na bovenstaande stappen" : "klaar om te bekijken", advies: true });
    return lijst;
  })();
  const kiesRouteStap = (s) => {
    if (parsedFiles.length === 0) { if (s.key === "import") clearAllData(); return; } // zonder dossier: Import start een nieuw dossier, de rest wacht
    if (s.advies) {
      setActiveTab("overzicht");
      window.dispatchEvent(new Event("bankoverzicht-toon-advies"));
      const zoek = (n) => {
        const el = document.getElementById("advies-sectie");
        if (!el || el.offsetParent === null) { if (n < 10) setTimeout(() => zoek(n + 1), 150); return; }
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-4", "ring-teal-500", "transition-shadow");
        setTimeout(() => el.classList.remove("ring-4", "ring-teal-500"), 2000);
      };
      setTimeout(() => zoek(0), 150);
    } else if (s.eerste?.onClick) s.eerste.onClick();
    else setActiveTab(s.fallbackTab || "controleren");
  };
  const stapOverslaan = () => volgendeStap && setOvergeslagenStappen((prev) => [...prev, volgendeStap.key]);
  // V90 — alleen overgeslagen stappen die nog echt openstaan tellen als "overgeslagen"
  const openOvergeslagen = alleStappen.filter((i) => overgeslagenStappen.includes(i.key));
  // voortgang: "stap X van N" — N = het hoogste aantal open stappen dat we in deze sessie/dit dossier zagen
  const [maxStappen, setMaxStappen] = useState(0);
  useEffect(() => { if (alleStappen.length > maxStappen) setMaxStappen(alleStappen.length); }, [alleStappen.length, maxStappen]);
  const stappenKlaar = Math.max(0, maxStappen - alleStappen.length);

  const automatischeHerkenningItems = useAutomatischeHerkenningItems({
    categoryRules, instellingenDashboardCards,
  });

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
      case "meerjaren":
        setShowMultiYearModal(true);
        break;
      case "herkenningsregels":
        setActiveTab("instellingen");
        break;
      case "csv":
        exportCsv(groups, effectiveCategoryBtwRates, btwVerlegd);
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
  const aangifteOpenPunten = useAangifteOpenPunten({
    activeYear, ibStatus, rechtsvorm, vpbStatus, yearlyProgress,
    zvwStatus,
  });

  // Simpele 5-stappen workflow-indicator boven het actieve jaar — puur afgeleid uit bestaande
  // state (geen nieuwe reliability-engine): Bankbestanden → Transacties → BTW → Jaarcontrole →
  // Aangiftevoorstel. "Jaarcontrole" hergebruikt letterlijk yearlyProgress[activeYear].status.
  const workflowSteps = useWorkflowSteps({
    activeYear, btwVerlegd, checklistData, korRegeling, parsedFiles,
    yearlyProgress,
  });

  // ---- "Werk te doen" — bundelt de belangrijkste openstaande signalen ----
  const todoItems = useTodoItems({
    pendingDuplicateCount, dismissedDuplicateNotice, duplicatesSectionRef, pendingPersonReview, personReviewSectionRef,
    pendingOverigReview, overigReviewSectionRef, loanSummary, loanDetails, loansSectionRef, leaseSummary, leaseDetails,
    confirmedLeaseTypeKeys, leasesSectionRef, verwachteLease, setVerwachteLease, verwachteLeaseOverig, setVerwachteLeaseOverig,
    verwachteLening, setVerwachteLening, verwachteAOV, setVerwachteAOV, transactions, korRegeling, btwSettingsSectionRef,
    btwVerlegd, incomeBtwTarieven, meerdereTarievenBevestigd, incomeRatesSectionRef, confidenceSummary, confidenceSectionRef,
    activeYear, quarterlyBtwData, kwartaalStatus,
  });

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
      parsedFiles, accountTypeByFile, overridesByCounterparty, overridesByRow, categoryRules,
      categoryBtwRates, btwVerlegd, korRegeling, rechtsvorm, heeftHolding, holdingBoekingen, btwRatesVersion: BTW_RATES_VERSION,
      excludedDuplicateFingerprints, dismissedDuplicateNotice, bevestigdeControles, businessKeywords, businessExpenseKeywords,
      reviewedIncomeKeys, reviewedPersonKeys, reviewedOverigKeys,
      kwartaalStatus, voorbelastingExcluded, periodeQuarterOverrides, reviewedPeriodeKeys, loanDetails,
      leaseDetails, leaseMergedInto, activaDetails, confirmedLeaseTypeKeys, fixedCategories, excludedManualFingerprints, transactionNotes,
      verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad, eigenNamen, eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
      ibStatus, zvwStatus, vpbStatus, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentage, openingBalanceCorrections, incomeBtwTarieven, meerdereTarievenBevestigd, verwachteAangeboden,
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
  const startOpslaan = () => {
    if (dossierWachtwoord || opslaanKeuzeGemaakt) saveProjectFile();
    else setOpslaanModal(true);
  };

  // ---- Dossier laden vanaf een bestand ----
  const dossierCtx = {
    suppressChangeCount, snapshotBeforeAction, vraagWachtwoord, setDossierWachtwoord, setDossierHerstelcode, setAuditLog, setBevestigdeControles,
    setAangiftevoorstelPreview, setAccountTypeByFile, setActivaDetails, setActivaDetailsModalKey,
    setActiveTab, setActiveYear, setAutoActivaDetails, setAutoStatusState,
    setAutoWizardStatus, setBtwVerlegd, setBusinessExpenseKeywords, setBusinessKeywords,
    setCategoryBtwRates, setCategoryRules, setCategoryZakelijkPercentageState, setConfirmedLeaseTypeKeys,
    setDialog, setDismissedDuplicateNotice, setEigenNamen, setEigenRekeningenExtra,
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
    setSaveState, setSelectedAangifteYears, setShowAangifteYearPicker, setStartersaftrekStatusState,
    setTransactionNotes, setVerwachteAOV, setVerwachteAangeboden, setVerwachteLease,
    setVerwachteLeaseOverig, setVerwachteLening, setVerwachteMatchSuggestie, setVoorbelastingExcluded,
    setVpbStatus, setZaLegacyJaDefault, setZakelijkeSpaarRekening, setZelfstandigenaftrekStatusState,
    setZvwStatus,
  };
  const loadProjectFile = (file) => laadDossierBestand(file, dossierCtx);
  const doClearAllData = (askWizard = false) => wisDossier(dossierCtx, askWizard);

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
  const { startLoadProject, clearAllData } = useDossierDialogen({
    parsedFilesCount: parsedFiles.length, changesSinceExport, eigenNamen, lastExportAt, loadedProjectFileName,
    setDialog, saveProjectFile, openProjectPicker, doClearAllData, setActiveTab, setManualWizardOpen,
  });

  if (!voorwaardenOk) return <VoorwaardenScherm onAkkoord={akkoordVoorwaarden} />;

  if (showStartupChoice) {
    const pending = pendingProjectRef.current;
    const heeftBewaard = !!pending;
    const fileCount = pending ? pending.parsedFiles.length : 0;
    const pendingFileNames = pending ? pending.parsedFiles.map((f) => f.fileName).filter(Boolean) : [];
    const ondernemer = pending?.settings?.eigenNamen?.ondernemer;
    const nietGeexporteerd = Number(pending?.settings?.changesSinceExport) || 0;
    const nieuwStarten = () => { startEmpty(); setActiveTab("overzicht"); setManualWizardOpen(true); };
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border-2 border-slate-200 bg-white p-6 shadow-lg">
          <h1 className="text-lg font-semibold mb-1">{heeftBewaard ? "Vorig dossier gevonden" : "Bankoverzicht"}</h1>
          <p className="text-sm text-slate-500 mb-3">
            {heeftBewaard
              ? "Er staat op dit apparaat nog een eerder dossier klaar. Wil je daarmee verdergaan, of een nieuw dossier starten?"
              : "Start een nieuw dossier, of laad een dossierbestand dat je eerder hebt opgeslagen."}
          </p>
          {heeftBewaard && (
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
          )}
          {heeftBewaard && nietGeexporteerd > 0 && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 mb-4 text-xs text-amber-900">
              Let op: dit dossier heeft <strong>{nietGeexporteerd} wijziging{nietGeexporteerd === 1 ? "" : "en"}</strong> die nog niet als dossierbestand zijn opgeslagen.
              Ze staan wel in de browseropslag van dit apparaat. Kies "Verder met dit dossier" en gebruik daarna "Dossier opslaan" om ze veilig te stellen.
            </p>
          )}
          <div className="space-y-2">
            {heeftBewaard && (
              <button
                onClick={resumeLastProject}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-800"
              >
                Verder met dit dossier
              </button>
            )}
            <button
              onClick={() => (heeftBewaard && nietGeexporteerd > 0 && !bevestigNieuwStart ? setBevestigNieuwStart(true) : nieuwStarten())}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
                bevestigNieuwStart ? "border-red-400 text-red-700 bg-red-50 hover:bg-red-100"
                : heeftBewaard ? "border-slate-300 text-slate-600 hover:bg-slate-50"
                : "bg-teal-700 border-teal-700 text-white hover:bg-teal-800"}`}
            >
              {bevestigNieuwStart ? "Toch nieuw dossier — wijzigingen niet opgeslagen" : "Nieuw dossier"}
            </button>
            <label className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 text-slate-600 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 cursor-pointer">
              Dossier laden
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  startEmpty();
                  setTimeout(() => requestLoadProject(f), 0);
                }}
              />
            </label>
          </div>
          {heeftBewaard && (
            <p className="text-xs text-slate-400 mt-4">
              "Nieuw dossier" verwijdert niets: het vorige dossier blijft in deze browser bewaard en dit keuzescherm
              verschijnt de volgende keer weer, totdat je zelf een nieuw bestand toevoegt — pas dán wordt het
              oude dossier in deze browser overschreven.
            </p>
          )}
          <p className="text-xs text-slate-400 mt-5 pt-3 border-t border-slate-100 text-center">
            © {new Date().getFullYear()} Paul Gerits — alle rechten voorbehouden · {APP_RELEASE}
            <br />
            <button type="button" className="underline" onClick={() => setShowFeedback(true)}>Vraag of opmerking? Stuur een bericht</button>
          </p>
          {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
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
        onSaveProject={startOpslaan}
        heeftWachtwoord={!!dossierWachtwoord}
        onWachtwoord={() => setWachtwoordModal({ modus: "instellen" })}
        onHerstelcode={dossierHerstelcode ? () => setHerstelcodeToon({ code: dossierHerstelcode, nieuw: false }) : null}
        onOpenLog={() => setShowLog(true)}
        onZoek={() => setShowZoek(true)}
        onBegrippen={() => setShowBegrippen(true)}
        logAantal={auditLog.length}
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
        onKlantSamenvatting={activeYear ? startKlantSamenvatting : null}
        onOnderbouwing={activeYear ? startOnderbouwing : null}
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

      <div className="flex-1 min-w-0" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>

      {updateAvailable && <UpdateAvailableBanner />}

      {/* v268 — "Laatste actie / Ongedaan maken" stond hier als zwevend paneel rechts; is verplaatst
          naar de linker zijbalk (AppSidebar.jsx) zodat het niet meer over de inhoud heen hangt. */}

      {showCategoryOverview && <CategoryOverviewModal rechtsvorm={rechtsvorm} onClose={() => setShowCategoryOverview(false)} />}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {/* v270 — Meerjarenoverzicht als pop-up i.p.v. permanent uitgeklapt onder de kaarten. */}
      {showMultiYearModal && (
        <MultiYearModal
          onClose={() => setShowMultiYearModal(false)}
          rechtsvorm={rechtsvorm}
          years={years}
          yearlySummaries={yearlySummaries}
          yearlyOpenOB={yearlyOpenOB}
          korRegeling={korRegeling}
          activeYear={activeYear}
          setActiveYear={setActiveYear}
          kostenTotaalByYear={kostenTotaalByYear}
          costBreakdownByYear={costBreakdownByYear}
          volledigeJaren={volledigeJaren}
          businessAdvies={businessAdvies}
          dgaSalarisByYear={dgaSalarisByYear}
          rcVerloop={rcVerloop}
          evVerloop={evVerloop}
          yearlyProgress={yearlyProgress}
          vpbStatus={vpbStatus}
          setVpbGedaan={setVpbGedaan}
          ibStatus={ibStatus}
          setIbGedaan={setIbGedaan}
          zvwStatus={zvwStatus}
          setZvwGedaan={setZvwGedaan}
          onOpenHelp={setHelpPopupChapter}
        />
      )}

      {/* v270 — BTW-aangifte per kwartaal als pop-up i.p.v. permanent uitgeklapt onder de kaarten. */}
      {showQuarterlyBtwModal && (
        <QuarterlyBtwModal
          onClose={() => setShowQuarterlyBtwModal(false)}
          activeYear={activeYear}
          korRegeling={korRegeling}
          periodeSignalenActiefJaar={periodeSignalenActiefJaar}
          confirmPeriodeAsIs={confirmPeriodeAsIs}
          movePeriodeToQuarter={movePeriodeToQuarter}
          quarterlyBtwData={quarterlyBtwData}
          kwartaalStatus={kwartaalStatus}
          setKwartaalStatusField={setKwartaalStatusField}
          costBreakdownByQuarter={costBreakdownByQuarter}
          onOpenHelp={setHelpPopupChapter}
          obIbSectionRef={obIbSectionRef}
        />
      )}

      {/* Tabblad-pijlen in de marge naast de inhoud (alleen waar die marge breed genoeg is): één tik naar het
          vorige/volgende hoofdtabblad. Blijft op halve schermhoogte staan terwijl je scrolt. */}
      {tabsVisible && <TabPijlen activeTab={activeTab} onSelect={setActiveTab} />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 py-8 space-y-6" style={{ flex: "1 0 auto", width: "100%" }}>
        <OpslaanHerinneringBalk herinnering={opslaanHerinnering} onOpslaan={saveProjectFile} />
        {/* V18 — de losse TabNavBar (Terug/Volgende) is vervallen: dubbel met de voortgangsbalk hieronder
            (Terug naar Overzicht) en de stap-kaart op Overzicht (Ga naar deze stap). */}
        {/* V90 — op Controleren/Instellingen blijft de eerstvolgende open stap zichtbaar, zodat je nooit vastloopt */}
        {activeTab !== "overzicht" && (() => {
          const volgende = volgendeStap;
          const totaal = (controlerenBadge || 0) + (instellingenBadge || 0);
          const pct = maxStappen > 0 ? Math.round((100 * stappenKlaar) / maxStappen) : 0;
          return alleStappen.length > 0 ? (
            <div className="sticky top-2 z-30 overflow-hidden rounded-2xl border-2 border-teal-600 bg-teal-700 text-white shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-teal-100">
                    {volgende ? `Stap ${Math.min(stappenKlaar + 1, maxStappen)} van ${maxStappen}` : "Alle resterende stappen overgeslagen"} · nog {totaal} open punt{totaal === 1 ? "" : "en"}
                  </div>
                  <div className="truncate text-base font-bold">
                    {volgende ? <>{volgende.label}{volgende.count != null ? ` (${volgende.count} open)` : ""}</> : `${openOvergeslagen.length} overgeslagen — nog niet afgerond`}
                  </div>
                </div>
                <span className="shrink-0 flex items-center gap-3">
                  {overgeslagenStappen.length > 0 && <button type="button" onClick={() => setOvergeslagenStappen([])} className="text-xs text-teal-100 underline">Overgeslagen terugzetten</button>}
                  {!volgende && <button type="button" onClick={() => setActiveTab("overzicht")} className="rounded-full bg-white text-teal-800 font-bold px-5 py-1.5 text-sm hover:bg-teal-50">Naar Overzicht →</button>}
                  {volgende && <button type="button" onClick={() => setActiveTab("overzicht")} className="text-xs text-teal-100 underline">Terug naar Overzicht</button>}
                  {volgende && <button type="button" onClick={stapOverslaan} className="rounded-full border border-teal-200 text-white font-semibold px-3.5 py-1.5 text-sm hover:bg-teal-600">Overslaan</button>}
                  {volgende && <button type="button" onClick={volgende.onClick} className="rounded-full bg-white text-teal-800 font-bold px-5 py-1.5 text-sm hover:bg-teal-50">Ga →</button>}
                </span>
              </div>
              <div className="h-1.5 bg-teal-900/40"><div className="h-full bg-emerald-300 transition-all" style={{ width: `${pct}%` }} /></div>
            </div>
          ) : null; // V25 — alles afgehandeld: geen balk meer; hij komt vanzelf terug zodra er weer open punten zijn
        })()}
        {/* Fase 1, dashboard-restyling (Stijl F, volledige mockup-indeling) — vervangt de eerdere
            platte kaartjes-lijst: DashboardHeader (titel + ringmeter + jaar-dropdown) bovenaan, dan
            de info-banner + Jaaroverzicht-kaart naast elkaar, dan de 4 rollup-categoriekaarten, dan
            het "Details en overzichten"-paneel met sub-tabs. Alle data hier is dezelfde die al
            bestond (dashboardCards/controlerenDashboardCards/instellingenDashboardCards/
            yearlySummaries) — alleen anders gegroepeerd, zie RollupCard.jsx/DetailsPanel.jsx. */}
        <div style={sectionTabStyle("overzicht")} className="space-y-5">
          <DashboardHeader
            title="Overzicht"
            subtitle={activeYear ? `Dossierstatus voor boekjaar ${activeYear}${yearPeriod[activeYear] ? ` · ${yearPeriod[activeYear].label}` : ""}` : "Start een nieuw dossier (links) om te beginnen"}
            dossierInfo={years.length > 0 ? `${years.length} jaar in dossier · ${parsedFiles.length} bankbestand${parsedFiles.length === 1 ? "" : "en"}${rekeningTypeTekst}` : null}
            pct={activeYear && yearlyProgress[activeYear] ? dossierPct : null}
            yearRing={yearRing}
            openPoints={activeYear ? dossierOpenPoints : null}
            openBreakdown={dossierOpenBreakdown}
            statusLines={dashboardCards.find((c) => c.key === "yearStatus")?.lines}
            werkelijkAangifteDone={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteDone : null}
            werkelijkAangifteTotal={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteTotal : null}
            werkelijkAangifteItems={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteItems : null}
            onOpenAangifteItem={(doel) => (doel === "btw" ? setShowQuarterlyBtwModal(true) : setShowMultiYearModal(true))}
            yearControl={
              years.length > 1 && (
                <YearDropdown yearPeriod={yearPeriod} years={years} activeYear={activeYear} onSelectYear={setActiveYear} yearlyProgress={yearlyProgress} zakelijkYears={zakelijkYearsCount} priveYears={priveYearsCount} showBreakdown={priveRekeningGeladen} yearCoverage={yearCoverage} />
              )
            }
          />

          {/* v273 — deze rij stond volledig verborgen zolang er geen jaren/project geladen waren;
              op verzoek toont het standaard-dashboard nu altijd deze sectie, met JaaroverzichtCard
              in een neutrale nul-stand i.p.v. helemaal te verdwijnen. */}
          <OnzekerhedenPanel heeftVoorraad={heeftVoorraad} />

          <RouteBalk stappen={routeStappen} onKies={kiesRouteStap} />
          {!activeYear && <p className="px-1 text-sm italic text-slate-500">Start een nieuw dossier of laad een eerder opgeslagen dossier (links bij "Dossier") om te beginnen.</p>}
          {/* V89 — vier rollupkaarten vervangen door één "Eerstvolgende stap"-kaart */}
          <NextStepCard
            stappen={alleStappen}
            overgeslagen={overgeslagenStappen}
            onAlsnogDoen={(k) => setOvergeslagenStappen((prev) => prev.filter((x) => x !== k))}
            volgende={volgendeStap}
            onOverslaan={stapOverslaan}
            controleCount={controlerenBadge}
            instellingCount={instellingenBadge}
            hervat={
              resumeHint && activeYear && resumeHint.openPunten !== 0
                ? {
                    tekst: `Je was gebleven bij ${resumeHint.tab === "controleren" ? "Controleren" : "Instellingen"}${resumeHint.jaar ? `, jaar ${resumeHint.jaar}` : ""}${resumeHint.openPunten != null ? ` · toen ${resumeHint.openPunten} open punt${resumeHint.openPunten === 1 ? "" : "en"}` : ""}`,
                    onClick: () => {
                      if (resumeHint.jaar && years.includes(resumeHint.jaar)) setActiveYear(resumeHint.jaar);
                      setActiveTab(resumeHint.tab);
                      setResumeHint(null);
                    },
                  }
                : null
            }
          />

          {/* checklistSectionRef zat voorheen op de (inmiddels verwijderde) "Aangifte {jaar}"-balk —
              nu hier, zodat bestaande kaarten die ernaartoe springen (dashboardCards "yearStatus"/
              "bvSignalering", RollupCard "Naar resultaten") een zinvolle, nog bestaande sectie
              raken i.p.v. een dode scroll-target. */}
          {/* v273 — ook dit paneel toont nu altijd, met DetailsPanel zelf een lege-staat renderend
              wanneer er nog geen activeYear is. */}
          <div ref={checklistSectionRef}>
            {activeYear && <DetailsPanel
              year={activeYear}
              years={years}
              onSelectYear={setActiveYear}
              cardsByKey={dashboardCardsByKey}
              aannamesCard={instellingenDashboardCards.find((c) => c.key === "aannames")}
              dashboardAangifteIndicatie={dashboardAangifteIndicatie}
              rechtsvorm={rechtsvorm}
              vpbIndicatie={dashboardVpbIndicatie}
              vpbBreakdown={dashboardVpbBreakdown}
              omzetBreakdown={dashboardVpbBreakdown}
              holdingCard={holdingSummaryCard}
              belastingTotaal={belastingTotaalJaar}
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
              herkenningsregelsCount={categoryRules.length}
            />}
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

        {showOnverklaard && (
          <OnverklaardeOverboekingenModal
            items={aansluitControleInfo.onverklaard}
            diff={aansluitControleInfo.diff}
            jaar={activeYear}
            onRequestChange={requestCategoryChange}
            onClose={() => setShowOnverklaard(false)}
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
            subtitle={activeYear ? `Dossierstatus voor boekjaar ${activeYear}${yearPeriod[activeYear] ? ` · ${yearPeriod[activeYear].label}` : ""}` : "Start een nieuw dossier (links) om te beginnen"}
            compact
            pct={activeYear && yearlyProgress[activeYear] ? dossierPct : null}
            yearRing={yearRing}
            openPoints={activeYear ? dossierOpenPoints : null}
            openBreakdown={dossierOpenBreakdown}
            statusLines={dashboardCards.find((c) => c.key === "yearStatus")?.lines}
            werkelijkAangifteDone={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteDone : null}
            werkelijkAangifteTotal={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteTotal : null}
            werkelijkAangifteItems={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteItems : null}
            onOpenAangifteItem={(doel) => (doel === "btw" ? setShowQuarterlyBtwModal(true) : setShowMultiYearModal(true))}
            yearControl={
              years.length > 1 && (
                <YearDropdown yearPeriod={yearPeriod} years={years} activeYear={activeYear} onSelectYear={setActiveYear} yearlyProgress={yearlyProgress} zakelijkYears={zakelijkYearsCount} priveYears={priveYearsCount} showBreakdown={priveRekeningGeladen} yearCoverage={yearCoverage} />
              )
            }
          />
        </div>

        {/* Fase 2 (bouwvoorstel) — Controleren in kaartstijl: dezelfde onderliggende kaarten als
            v240, nu gegroepeerd in precies de 5 categorieën uit het bouwvoorstel en getekend met
            SectionCard (dezelfde stijl als Overzicht) i.p.v. de oudere DashboardOverview-tegel. */}
        <div style={sectionTabStyle("controleren")}>
          <SectionCardGrid cards={controlerenCardGroups} onOpenHelp={setHelpPopupChapter} swipe={{ years, year: activeYear, onSelectYear: setActiveYear }} />
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
            onSeedZelfstandigenaftrekMap={seedZelfstandigenaftrekMap}
            suggesties={wizardSuggesties}
            startersaftrekStatus={startersaftrekStatus}
            onSeedStartersaftrekStatus={seedStartersaftrekStatus}
            activaGevraagd={!!bevestigdeControles.activaWizard}
            activaAantalBank={activaSummary.filter((a) => !a.handmatig).length}
            onActivaBeantwoord={(namen) => { setBevestigdeControles((p) => ({ ...p, activaWizard: true })); voegActivaToe(namen); }}
            heeftVoorraad={heeftVoorraad}
            setHeeftVoorraad={(v) => { snapshotBeforeAction("Voorraadvraag beantwoord"); setHeeftVoorraad(v); }}
            eigenNamen={eigenNamen}
            setEigenNamen={(v) => { snapshotBeforeAction("Eigen naam ingevuld"); setEigenNamen(v); }}
            eigenRekeningenExtra={eigenRekeningenExtra}
            setEigenRekeningenExtra={(v) => { snapshotBeforeAction("Andere eigen rekening ingevuld"); setEigenRekeningenExtra(v); }}
            zakelijkeSpaarRekening={zakelijkeSpaarRekening}
            setZakelijkeSpaarRekening={(v) => { snapshotBeforeAction("Zakelijke spaarrekening ingevuld"); setZakelijkeSpaarRekening(v); }}
            opdrachtgeversGevraagd={opdrachtgeversGevraagd}
            dossierProfiel={dossierProfiel}
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
            subtitle={activeYear ? `Dossierstatus voor boekjaar ${activeYear}${yearPeriod[activeYear] ? ` · ${yearPeriod[activeYear].label}` : ""}` : "Start een nieuw dossier (links) om te beginnen"}
            compact
            pct={activeYear && yearlyProgress[activeYear] ? dossierPct : null}
            yearRing={yearRing}
            openPoints={activeYear ? dossierOpenPoints : null}
            openBreakdown={dossierOpenBreakdown}
            statusLines={dashboardCards.find((c) => c.key === "yearStatus")?.lines}
            werkelijkAangifteDone={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteDone : null}
            werkelijkAangifteTotal={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteTotal : null}
            werkelijkAangifteItems={activeYear ? yearlyProgress[activeYear]?.werkelijkAangifteItems : null}
            onOpenAangifteItem={(doel) => (doel === "btw" ? setShowQuarterlyBtwModal(true) : setShowMultiYearModal(true))}
            yearControl={
              years.length > 1 && (
                <YearDropdown yearPeriod={yearPeriod} years={years} activeYear={activeYear} onSelectYear={setActiveYear} yearlyProgress={yearlyProgress} zakelijkYears={zakelijkYearsCount} priveYears={priveYearsCount} showBreakdown={priveRekeningGeladen} yearCoverage={yearCoverage} />
              )
            }
          />
        </div>

        {/* Fase 2 (bouwvoorstel) — Instellingen in kaartstijl: dezelfde onderliggende kaarten als
            v246, nu gegroepeerd in precies de 5 categorieën uit het bouwvoorstel en getekend met
            SectionCard (dezelfde stijl als Overzicht) i.p.v. de oudere DashboardOverview-tegel. */}
        <div style={sectionTabStyle("instellingen")}>
          <SectionCardGrid cards={instellingenCardGroups} onOpenHelp={setHelpPopupChapter} swipe={{ years, year: activeYear, onSelectYear: setActiveYear }} />
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
                {/* V87 — de detailtabellen staan standaard ingeklapt (openen met de balk hieronder); links die naar
                    de tabellen springen (jumpToSection) klappen ze automatisch open. */}
                <div style={sectionTabStyle("controleren")}>
                  <button
                    type="button"
                    onClick={() => toggleCardExpand("detailTabellen")}
                    aria-expanded={!!expandedCardKeys.detailTabellen}
                    className="w-full flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-slate-50"
                  >
                    {expandedCardKeys.detailTabellen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    <span className="text-sm font-semibold text-slate-800">Detailtabellen</span>
                    <span className="text-xs text-slate-400">
                      {zakGroupForYear?.items?.length ?? 0} zakelijke en {priGroupShown?.items?.length ?? 0} privé-transacties · {expandedCardKeys.detailTabellen ? "klik om in te klappen" : "klik om te openen"}
                    </span>
                  </button>
                </div>
                {expandedCardKeys.detailTabellen && (
                  <div style={sectionTabStyle("controleren")}>
                    <AansluitingDetailPanel
                      detailsRef={detailsSectionRef}
                      zakGroupForYear={zakGroupWeergave}
                      priGroupForYear={priGroupWeergave}
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
                  <AangifteYearPickerModal
                    onClose={() => setShowAangifteYearPicker(false)}
                    activeYear={activeYear}
                    years={years}
                    yearProgress={yearlyProgress[activeYear]}
                    aangifteOpenPunten={aangifteOpenPunten}
                    meerdereJaren={showAangifteMeerdereJaren}
                    setMeerdereJaren={setShowAangifteMeerdereJaren}
                    selectedYears={selectedAangifteYears}
                    setSelectedYears={setSelectedAangifteYears}
                    onExport={exportAangiftevoorstel}
                  />
                )}

        {onderbouwingKeuze && (
          <KlantJaarKeuzeModal years={years} selected={onderbouwingKeuze} setSelected={setOnderbouwingKeuze} onOpen={openOnderbouwing} onClose={() => setOnderbouwingKeuze(null)}
            vraag="Voor welke jaren wil je het onderbouwingsoverzicht?" knop="Onderbouwing tonen" />
        )}
        {onderbouwingHtml && (
          <AangifteVoorstelPreviewModal html={onderbouwingHtml} years={onderbouwingJaren} titel={`Onderbouwing ${jarenBereik(onderbouwingJaren)}`}
            onDownload={() => downloadOnderbouwing(onderbouwingHtml, onderbouwingJaren)} onPrint={() => printHtmlDocument(onderbouwingHtml)} onClose={() => setOnderbouwingHtml(null)} />
        )}
        {klantJaarKeuze && (
          <KlantJaarKeuzeModal years={years} selected={klantJaarKeuze} setSelected={setKlantJaarKeuze} onOpen={openKlantSamenvatting} onClose={() => setKlantJaarKeuze(null)} />
        )}
        {klantSamenvattingHtml && (
          <AangifteVoorstelPreviewModal
            html={klantSamenvattingHtml}
            years={klantSamenvattingJaren}
            titel={`Samenvatting voor klant ${jarenBereik(klantSamenvattingJaren)}`}
            onDownload={() => downloadKlantSamenvatting(klantSamenvattingHtml, jarenBereik(klantSamenvattingJaren))}
            onPrint={() => printHtmlDocument(klantSamenvattingHtml)}
            onClose={() => setKlantSamenvattingHtml(null)}
          />
        )}
        {aangiftevoorstelPreview && (
          <AangifteVoorstelPreviewModal
            html={voorstelHtmlWeergave}
            years={selectedAangifteYears}
            uitleg={uitlegMeenemen}
            setUitleg={setUitlegMeenemen}
            onDownload={downloadAangiftevoorstelPreview}
            onPrint={printAangiftevoorstelPreview}
            onClose={() => setAangiftevoorstelPreview(null)}
          />
        )}
      </main>

      {/* Vaste onderbalk (neemt zelf ruimte in): de knoppen "Hulpvraag of feedback" en "Categorieën" komen
          daardoor nooit over de tekst heen te hangen. */}
      <div
        className="onderbalk sticky bottom-0 z-[70] flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-stone-50/95 px-3 sm:px-5 py-1"
        style={{ bottom: 0, paddingTop: 8, paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={() => setShowFeedback(true)}
          className="inline-flex items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span>Hulpvraag of feedback</span>
        </button>
        {activeTab === "controleren" && (
          <button
            onClick={() => setShowCategoryOverview(true)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-teal-700 bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800"
            title="Snel opzoeken: alle categorieën en subtypes"
          >
            <ListTree className="h-4 w-4 shrink-0" />
            <span>Categorieën</span>
          </button>
        )}
      </div>

      {loanDetailsModalKey && loanSummary.find((l) => l.key === loanDetailsModalKey) && (
        <LoanDetailsModal
          loan={loanSummary.find((l) => l.key === loanDetailsModalKey)}
          details={loanDetails[loanDetailsModalKey]}
          onSave={setLoanDetailField}
          onClose={() => setLoanDetailsModalKey(null)}
        />
      )}

      {renderLeaseWizard({ leaseSummary, leaseDetails, confirmedLeaseTypeKeys, confirmLeaseType, setLeaseDetailField, setLeaseDetailsModalKey, removeManualLease })}

      {leaseDetailsModalKey && leaseSummary.find((l) => l.key === leaseDetailsModalKey) && (
        <FinancialLeaseDetailsModal
          lease={leaseSummary.find((l) => l.key === leaseDetailsModalKey)}
          details={leaseDetails[leaseDetailsModalKey]}
          onSave={setLeaseDetailField}
          onClose={() => setLeaseDetailsModalKey(null)}
          onOpenWizard={openLeaseWizard}
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
          onClose={() => { const k = activaDetailsModalKey; setActivaDetailsModalKey(null); setActivaDetails((prev) => { if (!prev[k]?.nieuw) return prev; const next = { ...prev }; delete next[k]; return next; }); }}
        />
      )}

      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />
      {opslaanModal && (
        <OpslaanModal
          onAnnuleer={() => setOpslaanModal(false)}
          onOpslaan={(pw) => {
            setOpslaanModal(false);
            setOpslaanKeuzeGemaakt(true);
            if (pw) setDossierWachtwoord(pw);
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
            else { setDossierWachtwoord(pw); setChangesSinceExport((n) => Math.max(n, 1)); }
            setWachtwoordModal(null);
          }}
          onAnnuleer={() => { if (wachtwoordModal.modus === "vraag") wachtwoordModal.resolve(null); setWachtwoordModal(null); }}
          onVerwijder={() => { setDossierWachtwoord(null); setDossierHerstelcode(null); setChangesSinceExport((n) => Math.max(n, 1)); setWachtwoordModal(null); }}
        />
      )}
      {showZoek && <ZoekAllesModal transacties={classified} jaren={years} onClose={() => setShowZoek(false)} onGaNaarJaar={(j) => { setActiveYear(j); setShowZoek(false); }} />}
      {showBegrippen && <BegrippenModal onClose={() => setShowBegrippen(false)} />}
      {showLog && (
        <WijzigingslogModal
          log={auditLog}
          kanLaatsteTerugdraaien={!!lastActionSnapshot}
          laatsteLabel={lastActionSnapshot?.label}
          onTerugdraaien={() => { undoLastAction(); setShowLog(false); }}
          onClose={() => setShowLog(false)}
        />
      )}
      <UndoToast
        snapshot={lastActionSnapshot && !isBigUndoLabel(lastActionSnapshot.label) ? lastActionSnapshot : null}
        onUndo={undoLastAction}
        onDismiss={() => setLastActionSnapshot(null)}
      />
      </div>
    </div>
  );
}
