// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import BtwRatesPanel from "../components/btw/BtwRatesPanel.jsx";
import CardIcon from "../components/shared/CardIcon.jsx";
import CategoryRulesPanel from "../components/settings/CategoryRulesPanel.jsx";
import CounterpartyRulesPanel from "../components/settings/CounterpartyRulesPanel.jsx";
import DossierProfielLijst from "../components/shared/DossierProfielLijst.jsx";
import EigenRekeningenPanel from "../components/settings/EigenRekeningenPanel.jsx";
import FixedCategoriesPanel from "../components/settings/FixedCategoriesPanel.jsx";
import RecurringPaymentsPanel from "../components/overview/RecurringPaymentsPanel.jsx";
import { Settings } from "lucide-react";
import TegenpartijenPanel from "../components/settings/TegenpartijenPanel.jsx";

export function useInstellingenCardGroups(p) {
  const {
    dossierProfiel, activaDetails, activaSummary, activeYear, addBusinessExpenseKeyword, addBusinessKeyword,
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
  } = p;

  return useMemo(() => {
    if (transactions.length === 0) return [];
    const g = (key, title, icon, memberKeys, extra, helpChapter) => {
      const built = groupCards(instellingenCardsByKey, memberKeys, extra);
      if (!built) return null;
      return { key, title, icon, tone: built.tone, lines: built.lines, onClick: built.onClick, hint: built.hint, actionLabel: "Bekijken", helpChapter };
    };
    const nogOpen = (dossierProfiel || []).reduce((n, b) => n + b.regels.filter((r) => /nog niet opgegeven/.test(r)).length, 0);
    return [
      withExpand(
        {
          key: "dossierProfiel",
          title: "Dossierprofiel",
          icon: <CardIcon name="user" />,
          tone: nogOpen > 0 ? "attention" : "neutral",
          lines: [
            { label: "Onderneming", value: dossierProfiel?.[0]?.regels?.[0] || "—" },
            { label: "Rekeningen", value: `${eigenRekeningenGeladen.length} geladen · ${(eigenRekeningenExtra || []).length} extra` },
            { label: "Nog niet opgegeven", value: String(nogOpen) },
          ],
          hint: "Overzicht van je antwoorden en eigen rekeningen — klopt dit?",
          actionLabel: "Bekijken",
        },
        "dossierProfiel",
        <div className="px-1 pb-1">
          <p className="text-xs text-slate-500 mb-3">Klopt dit? Dit is wat de app uit je antwoorden en instellingen heeft opgebouwd. Wijzigen kan bij de betreffende kaarten of via de wizard.</p>
          <DossierProfielLijst blokken={dossierProfiel} />
          <div className="mt-5">
            <EigenRekeningenPanel
              loadedAccounts={eigenRekeningenGeladen}
              eigenRekeningenExtra={eigenRekeningenExtra}
              onChange={(v) => { snapshotBeforeAction("Eigen rekeningen aangepast"); setEigenRekeningenExtra(v); }}
              classified={classified}
            />
          </div>
        </div>
      ),
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
    dossierProfiel,
    transactions.length,
    eigenRekeningenGeladen,
    eigenRekeningenExtra,
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
}
