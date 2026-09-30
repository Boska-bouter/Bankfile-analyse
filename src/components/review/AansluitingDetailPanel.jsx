import { Check, AlertCircle } from "lucide-react";
import { DetailTable } from "../overview/GroupView.jsx";
import { eur } from "../../utils/amounts.js";

// Fase 3 — was inline JSX in App.jsx (de "Controle overboeking zakelijk ↔ privé"-banner plus de
// sleep-detailtabellen Zakelijk/Prive), nu een zelfstandig onderdeel zodat dit ook binnen de
// SectionCard "Aansluiting & detail" (Controleren) kan worden uitgeklapt zonder de oorspronkelijke
// plek nogmaals te tonen (zie App.jsx: `!expandedCardKeys.aansluitingDetail` verbergt de
// oorspronkelijke plek zodra de kaart is uitgeklapt).
export default function AansluitingDetailPanel({
  detailsRef,
  zakGroupForYear,
  priGroupForYear,
  priveRekeningGeladen,
  zakelijkRekeningGeladen,
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
  // Sinds v213 heet dezelfde overboeking aan elke kant anders (zie classify.js): de zakelijke
  // rekening gebruikt "Prive opnames" (geld weg) / "Terugboeking van prive" (geld terug), de
  // privérekening gebruikt daarvoor "Ontvangen van zakelijk" / "Terugboeking naar zakelijk" — dus
  // deze controle mag NIET meer op dezelfde categorienaam aan beide kanten filteren (dat leverde
  // priSum altijd 0 op, en dus een valse mismatch-melding zodra de privérekening zelf ook geladen
  // was). In plaats daarvan wordt per kant op de eigen categorienamen gefilterd — de bedragen (met
  // hun eigen teken) moeten samen nog steeds op nul uitkomen.
  const isZakTransferCat = (c) => c === "Prive opnames" || c === "Terugboeking van prive";
  const isPriTransferCat = (c) => c === "Ontvangen van zakelijk" || c === "Terugboeking naar zakelijk";
  const zakSum = zakGroupForYear.items.filter((t) => isZakTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
  const priSum = priGroupForYear.items.filter((t) => isPriTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
  const diff = Math.round((zakSum + priSum) * 100) / 100;
  // v224/v233: als er in dit DOSSIER helemaal geen rekening van één van beide types geladen is
  // (bijv. een dossier dat alleen de zakelijke rekening bevat), is deze controle sowieso niet uit
  // te voeren — er is dan simpelweg niets om de zakelijke kant tegen af te zetten. Dat is geen
  // fout/inconsistentie (de zakelijke boekingen kunnen prima kloppen), dus dan een neutrale melding
  // tonen in plaats van de amber "komt niet overeen"-waarschuwing, die anders ten onrechte een
  // probleem suggereert.
  const zijdeOntbreekt = !priveRekeningGeladen ? "Prive" : !zakelijkRekeningGeladen ? "Zakelijk" : null;

  let banner = null;
  if (zijdeOntbreekt) {
    if (!(zakSum === 0 && priSum === 0)) {
      banner = (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-900">
            <strong>Controle overboeking zakelijk ↔ privé</strong>: geen {zijdeOntbreekt === "Prive" ? "privé" : "zakelijke"}-
            rekening geladen in dit dossier, dus niet te verifiëren — dat is geen fout. De {zijdeOntbreekt === "Prive" ? "zakelijke" : "privé"}-
            kant toont hier {eur(zijdeOntbreekt === "Prive" ? zakSum : priSum)} aan overboekingen, zonder dat daar iets tegenover kan staan.
          </p>
        </div>
      );
    }
  } else if (!(zakSum === 0 && priSum === 0)) {
    const ok = Math.abs(diff) < 0.01;
    banner = (
      <div className={`rounded-xl border-2 px-4 py-3 flex items-start gap-3 ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
        {ok ? <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
        <p className={`text-sm ${ok ? "text-emerald-900" : "text-amber-900"}`}>
          <strong>Controle overboeking zakelijk ↔ privé</strong>: Zakelijk ("Prive opnames"/"Terugboeking van prive") {eur(zakSum)} tegenover Prive ("Ontvangen van zakelijk"/"Terugboeking naar zakelijk") {eur(priSum)}
          {ok ? " — komt overeen (samen nul, zoals het hoort)." : <> — komt <strong>niet</strong> overeen (verschil {eur(diff)}). Mogelijk staat er aan de privékant een aparte, niet-gekoppelde transactie, of ontbreekt er iets.</>}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {banner}

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
