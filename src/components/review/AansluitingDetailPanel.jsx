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
export default function AansluitingDetailPanel({
  detailsRef,
  zakGroupForYear,
  priGroupForYear,
  dragState,
  expandedTable,
  onToggleExpandTable,
  onRequestCategoryChange,
  onConfirmCorrect,
  onRowDragStart,
  fingerprintByTxId,
  transactionNotes,
  onSetNote,
  onOpenHelp,
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Sleep een transactie (aan het handvat <span className="inline-block align-middle">⠿</span>) naar de andere tabel om 'm van Zakelijk naar Prive te verplaatsen, of andersom.
      </p>
      <div ref={detailsRef} className={expandedTable ? "grid grid-cols-1 gap-4" : "grid md:grid-cols-2 gap-4 items-start"}>
        {(!expandedTable || expandedTable === "Zakelijk") && (
          <div
            data-dropzone="Zakelijk"
            className={`rounded-xl transition-colors ${dragState && dragState.overZone === "Zakelijk" && dragState.tx.type !== "Zakelijk" ? "ring-2 ring-emerald-400" : ""}`}
          >
            <DetailTable
              group={zakGroupForYear}
              onRequestChange={onRequestCategoryChange}
              onConfirmCorrect={onConfirmCorrect}
              enableDrag
              onRowDragStart={onRowDragStart}
              draggingTxId={dragState ? dragState.tx.id : null}
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
          <div
            data-dropzone="Prive"
            className={`rounded-xl transition-colors ${dragState && dragState.overZone === "Prive" && dragState.tx.type !== "Prive" ? "ring-2 ring-slate-400" : ""}`}
          >
            <DetailTable
              group={priGroupForYear}
              onRequestChange={onRequestCategoryChange}
              onConfirmCorrect={onConfirmCorrect}
              enableDrag
              onRowDragStart={onRowDragStart}
              draggingTxId={dragState ? dragState.tx.id : null}
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
