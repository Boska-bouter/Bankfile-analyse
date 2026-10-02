import { DetailTable } from "../overview/GroupView.jsx";

// Fase 3 — was inline JSX in App.jsx (de "Controle overboeking zakelijk ↔ privé"-banner plus de
// sleep-detailtabellen Zakelijk/Prive), nu een zelfstandig onderdeel zodat dit ook binnen de
// SectionCard "Aansluiting & detail" (Controleren) kan worden uitgeklapt zonder de oorspronkelijke
// plek nogmaals te tonen (zie App.jsx: `!expandedCardKeys.aansluitingDetail` verbergt de
// oorspronkelijke plek zodra de kaart is uitgeklapt).
// v283 — de "Controle overboeking zakelijk ↔ privé"-banner is verhuisd naar een eigen, losse
// SectionCard ("aansluitControle") naast "Aansluiting & detail" op het Controleren-dashboard (zie
// computeAansluitControleCard/App.jsx) — dit paneel toont 'm daarom niet meer zelf, om dubbele
// content te voorkomen.
// v303 — op verzoek: het type (Zakelijk/Prive) van een transactie is niet meer handmatig aan te
// passen (ook niet door te slepen), want dat is precies wat zichtbaar moet blijven als "verkeerde
// rekening gebruikt". De sleep-functionaliteit (dragState/onRowDragStart/dropzones) is daarom
// volledig verwijderd; alleen categorie blijft bewerkbaar via DetailTable.
export default function AansluitingDetailPanel({
  detailsRef,
  zakGroupForYear,
  priGroupForYear,
  expandedTable,
  onToggleExpandTable,
  onRequestCategoryChange,
  onConfirmCorrect,
  fingerprintByTxId,
  transactionNotes,
  onSetNote,
  onOpenHelp,
}) {
  return (
    <div className="space-y-3">
      <div ref={detailsRef} className={expandedTable ? "grid grid-cols-1 gap-4" : "grid md:grid-cols-2 gap-4 items-start"}>
        {(!expandedTable || expandedTable === "Zakelijk") && (
          <div>
            <DetailTable
              group={zakGroupForYear}
              onRequestChange={onRequestCategoryChange}
              onConfirmCorrect={onConfirmCorrect}
              isExpanded={expandedTable === "Zakelijk"}
              onToggleExpand={() => onToggleExpandTable("Zakelijk")}
              onOpenHelp={onOpenHelp}
              fingerprintByTxId={fingerprintByTxId}
              transactionNotes={transactionNotes}
              onSetNote={onSetNote}
            />
          </div>
        )}
        {(!expandedTable || expandedTable === "Prive") && (
          <div>
            <DetailTable
              group={priGroupForYear}
              onRequestChange={onRequestCategoryChange}
              onConfirmCorrect={onConfirmCorrect}
              isExpanded={expandedTable === "Prive"}
              onToggleExpand={() => onToggleExpandTable("Prive")}
              fingerprintByTxId={fingerprintByTxId}
              transactionNotes={transactionNotes}
              onSetNote={onSetNote}
            />
          </div>
        )}
      </div>
    </div>
  );
}
