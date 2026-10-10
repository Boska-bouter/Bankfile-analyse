// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import ActivaPanel from "../components/loans/ActivaPanel.jsx";
import CategoryPercentagePanel from "../components/overview/CategoryPercentagePanel.jsx";
import ClassificationConfidencePanel from "../components/dashboard/ClassificationConfidencePanel.jsx";
import { FileSpreadsheet, Users } from "lucide-react";
import HerkomstVanGeldPanel from "../components/review/HerkomstVanGeldPanel.jsx";
import AanvullendeControles from "../components/review/AanvullendeControles.jsx";
import ImportControlPanel from "../components/upload/ImportControlPanel.jsx";
import LeaseInterestPanel from "../components/loans/LeaseInterestPanel.jsx";
import LoanInterestPanel from "../components/loans/LoanInterestPanel.jsx";
import OpschonenPanel from "../components/review/OpschonenPanel.jsx";
import PersoonlijkeAannamesPanel from "../components/overview/PersoonlijkeAannamesPanel.jsx";

export function useControlerenCardGroups(p) {
  const {
    aanvullendeControles, bevestigControle, bevestigControles, herroepControle, bevestigdeControles, toepassenTerugkerend,
    PRIVE_ONLY_HUISVESTING_STANDAARD_NUL, aannamesSectionRef, aansluitControleInfo, accountTypeByFile, activaDetails,
    activaSectionRef, activaSummary, activeYear, autoStatus, autoWizardStatus,
    btwVerlegd, bulkMarkOverigAsPriveOpname, bulkMarkOverigAsWinkelsDivers, categorieTotalenActiveYear, categoryPercentageSectionRef,
    categoryZakelijkPercentage, classified, confidenceSectionRef, confirmClassificationCorrect, confirmLeaseType,
    confirmOverigAsIs, confirmPersonAsIs, confirmedLeaseTypeKeys, confirmedSeparateGroups, controlerenCardsByKey,
    detailsSectionRef, duplicateGroups, duplicatePendingBreakdown, duplicatesSectionRef, effectiveCategoryBtwRates,
    energieZakelijkPercentageStatus, expandedCardKeys, expandedTable, fileContinuity, fingerprintByTxId,
    gedeeldeEnergieForActiveYear, gedeeldeGemeentelijkeKostenForActiveYear, gedeeldeHuurForActiveYear, gemeentelijkeKostenZakelijkPercentageStatus, groupCards,
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
    zelfstandigenaftrekStatus, rechtsvorm,
  } = p;

  return useMemo(() => {
    if (transactions.length === 0) return [];
    const g = (key, title, icon, memberKeys, extra) => {
      const built = groupCards(controlerenCardsByKey, memberKeys, extra);
      if (!built) return null;
      return { key, title, icon, tone: built.tone, lines: built.lines, onClick: built.onClick, hint: built.hint, actionLabel: "Bekijken" };
    };
    // Staat er maar één van de drie panelen (activa/lease/lening) in de kaart, dan meteen openklappen
    // i.p.v. de gebruiker nóg een klik te laten doen.
    const bedrijfsmiddelenEnkelPaneel = [activaSummary?.length, leaseSummary?.length, (loanSummary?.length || 0) + (privateLoanSummary?.length || 0)].filter((n) => n > 0).length === 1;
    return [
      withExpand(
        (() => {
          let basis = g("importKwaliteit", "Import & kwaliteit", <FileSpreadsheet className="h-3.5 w-3.5" />, ["importControle", "confidence"]);
          const nCtl = aanvullendeControles ? (aanvullendeControles.dekking.aantalVerdacht > 0 ? 1 : 0) + aanvullendeControles.terugkerend.length : 0;
          if (basis && nCtl > 0) basis = { ...basis, lines: [...basis.lines, { label: "Aanvullende controles", value: `🟠 ${nCtl} om te bekijken` }] };
          if (!basis || !aansluitControleInfo.heeftData) return basis;
          const toneRank = { risk: 3, attention: 2, neutral: 1, ok: 0 };
          const bol = aansluitControleInfo.tone === "ok" ? "🟢 " : aansluitControleInfo.tone === "attention" ? "🟠 " : aansluitControleInfo.tone === "risk" ? "🔴 " : "";
          return {
            ...basis,
            tone: toneRank[aansluitControleInfo.tone] > toneRank[basis.tone] ? aansluitControleInfo.tone : basis.tone,
            lines: [...basis.lines, { label: "Zakelijk ↔ privé", value: `${bol}${aansluitControleInfo.tone === "ok" ? (aansluitControleInfo.toegelicht?.length > 0 ? `Klopt (${aansluitControleInfo.toegelicht.length} toegelicht)` : "Klopt") : aansluitControleInfo.tone === "attention" ? `${aansluitControleInfo.onverklaard.length} niet gekoppeld` : "Controleren"}` }],
          };
        })(),
        "importKwaliteit",
        <div className="space-y-3">
          {aansluitControleInfo.heeftData && (
            <div className={`rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2 ${aansluitControleInfo.tone === "attention" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
              <span><strong>Controle zakelijk ↔ privé:</strong> {aansluitControleInfo.subtitle}</span>
              {aansluitControleInfo.tone === "attention" && aansluitControleInfo.onverklaard.length > 0 ? (
                <button type="button" onClick={() => setShowOnverklaard(true)} className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold">Bekijk de {aansluitControleInfo.onverklaard.length} niet-gekoppelde boeking{aansluitControleInfo.onverklaard.length === 1 ? "" : "en"}</button>
              ) : (
                <>
                  {aansluitControleInfo.toegelicht?.length > 0 && (
                    <button type="button" onClick={() => setShowOnverklaard(true)} className="rounded-full border border-emerald-400 bg-white px-3 py-1 text-xs font-semibold">Bekijk de {aansluitControleInfo.toegelicht.length} toegelichte boeking{aansluitControleInfo.toegelicht.length === 1 ? "" : "en"}</button>
                  )}
                  <button type="button" onClick={() => jumpToSection(detailsSectionRef)} className="text-xs underline">Naar de detailtabellen</button>
                </>
              )}
            </div>
          )}
          <div ref={importControleSectionRef}>
            <ImportControlPanel diagnostics={importDiagnostics} onReviewFile={setReviewFileModal} continuity={fileContinuity} onRemoveFile={removeFile} accountTypeByFile={accountTypeByFile} bevestigd={bevestigdeControles || {}} onBevestig={bevestigControle} onHerroep={herroepControle} />
          </div>
          <AanvullendeControles data={aanvullendeControles} onBevestig={bevestigControle} onBevestigAlles={bevestigControles} onToepassenTerugkerend={toepassenTerugkerend} />
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
        g("herkomstOpschonen", "Herkomst & opschonen", <Users className="h-3.5 w-3.5" />, ["incomeReview", "personReview", "overigReview", "duplicates"]),
        "herkomstOpschonen",
        <div className="space-y-3">
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
          personBulkAction={personBulkAction}
        />
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
          onBulkMarkOverigAsWinkelsDivers={bulkMarkOverigAsWinkelsDivers}
          overigZakelijkCount={overigZakelijkPending.length}
          overigPriveCount={overigPrivePending.length}
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
          onOpenHelp={setHelpPopupChapter}
        />
        </div>
      ),
      // V86 — de kaarten "Categorieën" en "Aansluiting & detail" zijn vervallen: hun inhoud (categorie-
      // overzichten + detailtabellen) staat al standaard zichtbaar onder deze kaarten.
      // v283 — de "Controle overboeking zakelijk ↔ privé"-banner stond voorheen alleen ín de
      // uitgeklapte "Aansluiting & detail"-kaart hierboven; op verzoek nu ook als eigen, altijd
      // zichtbare "box" ernaast — zelfde berekening als voorheen in AansluitingDetailPanel.jsx (nu
      // verwijderd, om dubbele content te voorkomen), hier alleen samengevat i.p.v. als volledige
      // banner-tekst. v286 — die berekening staat nu in de gedeelde aansluitControleInfo hierboven.
      withExpand(
        (() => {
          const bb = groupCards(instellingenCardsByKey, ["loans", "leases", "activa"]);
          if (!bb) return null;
          return { key: "bedrijfsmiddelen", title: "Bedrijfsmiddelen", icon: <span>🏷️</span>, tone: bb.tone, lines: bb.lines, onClick: bb.onClick, hint: bb.hint, actionLabel: "Bekijken" };
        })(),
        "bedrijfsmiddelen",
        <div className="space-y-3">
          <div ref={activaSectionRef}>
            <ActivaPanel
              defaultOpen={bedrijfsmiddelenEnkelPaneel}
              activaSummary={activaSummary}
              activaDetails={activaDetails}
              activeYear={activeYear}
              onOpenModal={setActivaDetailsModalKey}
              onMarkUnknown={markActivaUnknown}
              onUnmarkUnknown={unmarkActivaUnknown}
              onAddManual={addManualActiva}
              onRemove={removeActivum}
              onOpenHelp={setHelpPopupChapter}
            />
          </div>
          <div ref={leasesSectionRef}>
            <LeaseInterestPanel
              defaultOpen={bedrijfsmiddelenEnkelPaneel}
              leaseSummary={leaseSummary}
              leaseDetails={leaseDetails}
              confirmedLeaseTypeKeys={confirmedLeaseTypeKeys}
              onConfirmType={confirmLeaseType}
              onOpenModal={setLeaseDetailsModalKey}
              onOpenWizard={openLeaseWizard}
              onAddManualLease={addManualLease}
              onRemoveManualLease={removeManualLease}
              onKoppelBetalingen={koppelBetalingen}
              onWijsKandidatenAf={wijsKandidatenAf}
              onBehandelAlsLease={behandelAlsLease}
              onWijsZoekAf={wijsZoekAf}
              overigeLeaseNamen={(verwachteLeaseOverig || []).flatMap((i) => [i?.naam, ...(i?.aliassen || [])]).filter(Boolean)}
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
              defaultOpen={bedrijfsmiddelenEnkelPaneel}
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
        (() => {
          const aan = instellingenCardsByKey.aannames;
          const pc = instellingenCardsByKey.categoryPercentages;
          if (!aan && !pc) return null;
          const aanOpen = aan && typeof aan.openCount === "number" ? aan.openCount : 0;
          const lines = [
            ...(aan ? aan.lines : []),
            ...(pc ? [{ label: "% zakelijk/privé splitsing", value: pc.value != null ? `${pc.value} aangepast` : "" }] : []),
          ];
          const tone = aan ? aan.tone : "ok";
          const primary = aan || pc;
          return { key: "aannamesPercentages", title: "Aannames & percentages", icon: <span>⚖️</span>, tone, lines, onClick: primary.onClick, hint: primary.hint, actionLabel: "Bekijken" };
        })(),
        "aannamesPercentages",
        <div className="space-y-3">
          <div ref={aannamesSectionRef}>
            <PersoonlijkeAannamesPanel
              rechtsvorm={rechtsvorm}
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
          <div ref={categoryPercentageSectionRef}>
            <CategoryPercentagePanel
              activeYear={activeYear}
              categorieTotalen={categorieTotalenActiveYear}
              categoryZakelijkPercentage={categoryZakelijkPercentage}
              huisvestingStandaardNul={priveOnlyDossier ? PRIVE_ONLY_HUISVESTING_STANDAARD_NUL : []}
              onSetCategoryZakelijkPercentage={requestSetCategoryZakelijkPercentage}
              autoOpDeZaakDitJaar={!!activeYear && (autoStatus?.[activeYear] === "zaak")}
              onOpenHelp={setHelpPopupChapter}
              gedeeldeRijen={[
                { label: "Huur (deels zakelijk)", gedeelde: gedeeldeHuurForActiveYear, raw: huurZakelijkPercentageStatus?.[activeYear], onSet: setHuurZakelijkPercentageStatus },
                { label: "Energie-water (deels zakelijk)", gedeelde: gedeeldeEnergieForActiveYear, raw: energieZakelijkPercentageStatus?.[activeYear], onSet: setEnergieZakelijkPercentageStatus },
                { label: "Gemeentelijke kosten (deels zakelijk)", gedeelde: gedeeldeGemeentelijkeKostenForActiveYear, raw: gemeentelijkeKostenZakelijkPercentageStatus?.[activeYear], onSet: setGemeentelijkeKostenZakelijkPercentageStatus },
              ]}
            />
          </div>
        </div>
      ),
    ].filter(Boolean);
  }, [
    transactions.length,
    controlerenCardsByKey,
    instellingenCardsByKey,
    activaSummary, activaDetails, activeYear, leaseSummary, leaseDetails, confirmedLeaseTypeKeys, leaseMerges, verwachteLeaseOverig, loanSummary, privateLoanSummary, loanDetails,
    rechtsvorm, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus, autoStatus, autoWizardStatus, kmVergoedingDetails, gedeeldeHuurForActiveYear, huurZakelijkPercentageStatus, gedeeldeEnergieForActiveYear, energieZakelijkPercentageStatus, gedeeldeGemeentelijkeKostenForActiveYear, gemeentelijkeKostenZakelijkPercentageStatus, yearlySummary,
    expandedCardKeys,
    importDiagnostics, bevestigdeControles,
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
    priveRekeningGeladen,
    zakelijkRekeningGeladen,
    aansluitControleInfo,
    expandedTable,
    fingerprintByTxId,
    transactionNotes,
    aanvullendeControles,
  ]);
}
