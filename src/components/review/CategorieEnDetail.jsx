// beide-V7R8 — uit App.jsx gehaald: tabblad Controleren, categorieën per jaar (zakelijk/privé of één privétabel) en de
// inklapbare detailtabellen. Alleen weergave; alle gegevens en handelingen komen als props uit App.
import { ChevronDown, ChevronRight } from "lucide-react";
import { CategorySummaryCard } from "../overview/GroupView.jsx";
import { PriveGegevensKaart } from "../prive/PriveKaarten.jsx";
import AansluitingDetailPanel from "./AansluitingDetailPanel.jsx";

export default function CategorieEnDetail({
  activeYear, btwVerlegd, categorySectionRef, confirmClassificationCorrect, detailsSectionRef,
  effectiveCategoryBtwRates, eigenPriveIbans, expandedCardKeys, expandedTable, fingerprintByTxId, modus,
  priGroupShown, priGroupWeergave, priveOverzicht, priveRekeningGeladen, rekeningenVoorGroep, requestCategoryChange,
  sectionTabStyle, setExpandedTable, setHelpPopupChapter, setManualWizardOpen, setTransactionNote, soortDossier,
  toggleCardExpand, transactionNotes, years, zakGroupForYear, zakGroupWeergave, zakelijkRekeningGeladen,
}) {
  if (!years.length || !activeYear) return null;
  return (
    <>
      {/* v245 — "Categorieën Zakelijk"/"Categorieën Privé" hiernaartoe verplaatst vanuit het
          vervallen tabblad "Resultaten", nu boven de detailtabellen ("Details", hieronder
          via detailsSectionRef) binnen tabblad "Controleren", zoals gevraagd.
          Fase 3 — verborgen zodra de kaart "Categorieën" is uitgeklapt (toont dit dan zelf). */}
      {priveOverzicht && activeYear && priveOverzicht.perJaar[activeYear] && (
        <div style={sectionTabStyle("controleren")}>
          <PriveGegevensKaart jaar={activeYear} aannames={priveOverzicht.perJaar[activeYear].aannames} onAanvullen={() => setManualWizardOpen(true)} />
        </div>
      )}
      {!expandedCardKeys.categorieen && (
      <div ref={categorySectionRef} className="grid md:grid-cols-2 gap-4" style={sectionTabStyle("controleren")}>
        {modus.onderdelen.btw === false ? (
          // beide-V1R8 — privédossier: één tabel met alle boekingen van het jaar, zonder BTW
          <div className="md:col-span-2"><CategorySummaryCard group={{ ...priGroupShown, items: [...(zakGroupForYear?.items || []), ...(priGroupShown?.items || [])] }} titel={`Categorieën ${activeYear}`} zonderBtw categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} onOpenHelp={setHelpPopupChapter} /></div>
        ) : (<>
        <CategorySummaryCard group={zakGroupForYear} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} onOpenHelp={setHelpPopupChapter} rekeningen={rekeningenVoorGroep(zakGroupForYear, "Zakelijk")} eigenPriveIbans={eigenPriveIbans} />
        <CategorySummaryCard group={priGroupShown} categoryBtwRates={effectiveCategoryBtwRates} btwVerlegd={btwVerlegd} rekeningen={rekeningenVoorGroep(priGroupShown, "Prive")} />
        </>)}
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
            {soortDossier === "prive" && !(zakGroupForYear?.items?.length) ? `${priGroupShown?.items?.length ?? 0} transacties` : `${zakGroupForYear?.items?.length ?? 0} zakelijke en ${priGroupShown?.items?.length ?? 0} privé-transacties`} · {expandedCardKeys.detailTabellen ? "klik om in te klappen" : "klik om te openen"}
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
            onToggleExpandTable={(zone) => setExpandedTable((v) => (v === zone ? null : zone))} /* release30V10 — direct i.p.v. startTransition */
            onRequestCategoryChange={requestCategoryChange}
            onConfirmCorrect={confirmClassificationCorrect}
            fingerprintByTxId={fingerprintByTxId}
            transactionNotes={transactionNotes}
            onSetNote={setTransactionNote}
            onOpenHelp={setHelpPopupChapter}
            zonderZakelijk={soortDossier === "prive" && !(zakGroupWeergave?.items?.length)}
          />
        </div>
      )}
    </>
  );
}
