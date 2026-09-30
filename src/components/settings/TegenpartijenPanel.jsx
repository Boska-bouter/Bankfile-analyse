import KeywordManager from "./KeywordManager.jsx";

// Fase 3 — was inline JSX in App.jsx (twee KeywordManager-secties, "Zakelijke tegenpartijen
// (inkomsten)" en "Zakelijke inkoop/uitgaven (leveranciers)"), nu een zelfstandig onderdeel zodat
// dit ook binnen de SectionCard "Tegenpartijen" (Instellingen) kan worden uitgeklapt zonder de
// oorspronkelijke plek nogmaals te tonen. De twee secties delen hun "volledige lijst tonen"-stand
// (isExpanded/onToggleExpand hieronder, per lijst) — dat blijft ongewijzigd werken zolang dit
// onderdeel maar op precies één plek tegelijk gemount is (zie App.jsx: `!expandedCardKeys.tegenpartijen`
// verbergt de oorspronkelijke plek zodra de kaart is uitgeklapt).
export default function TegenpartijenPanel({
  incomeBtwTarieven,
  meerdereTarievenBevestigd,
  onConfirmMeerdereTarieven,
  businessKeywords,
  onAddBusinessKeyword,
  onRemoveBusinessKeyword,
  businessIncomeEntries,
  onReclassifyBusinessEntry,
  onSetCounterpartyBtwVerlegd,
  btwVerlegd,
  onSetIncomeRate,
  expandedBusinessIncomeList,
  onToggleExpandBusinessIncomeList,
  businessExpenseKeywords,
  onAddBusinessExpenseKeyword,
  onRemoveBusinessExpenseKeyword,
  businessExpenseEntries,
  expandedBusinessExpenseList,
  onToggleExpandBusinessExpenseList,
}) {
  return (
    <div
      className={expandedBusinessIncomeList || expandedBusinessExpenseList ? "grid grid-cols-1 gap-4" : "grid md:grid-cols-2 gap-4"}
    >
      {!expandedBusinessExpenseList && (
        <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-1">Zakelijke tegenpartijen (inkomsten)</h2>
          <p className="text-xs text-slate-500 mb-3">
            Namen van klanten/opdrachtgevers waarvan binnenkomende betalingen als zakelijke inkomsten gelden.
          </p>
          {(incomeBtwTarieven?.length || 0) > 1 && !meerdereTarievenBevestigd && (
            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <p>
                Je gaf in de wizard aan dat je omzet onder meerdere BTW-tarieven valt ({incomeBtwTarieven.map((t) => `${t}%`).join(", ")}).
                Ken hieronder per klant het juiste tarief toe (kolom "BTW-tarief") — klanten die je nog niet apart hebt ingesteld
                vallen op het standaardtarief.
              </p>
              <button
                onClick={onConfirmMeerdereTarieven}
                className="mt-2 rounded-md border border-amber-400 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100"
              >
                Nagelopen, verberg deze melding
              </button>
            </div>
          )}
          <KeywordManager
            keywords={businessKeywords}
            onAdd={onAddBusinessKeyword}
            onRemove={onRemoveBusinessKeyword}
            placeholder="Naam tegenpartij…"
            chipClass="bg-emerald-100 text-emerald-800"
            addButtonClass="bg-emerald-600 hover:bg-emerald-700"
            entries={businessIncomeEntries}
            entriesLabel="Nu herkend als Zakelijke inkomsten"
            onReclassify={onReclassifyBusinessEntry}
            onSetBtwVerlegd={onSetCounterpartyBtwVerlegd}
            btwVerlegdDefault={btwVerlegd}
            onSetIncomeRate={onSetIncomeRate}
            isExpanded={expandedBusinessIncomeList}
            onToggleExpand={onToggleExpandBusinessIncomeList}
          />
        </section>
      )}
      {!expandedBusinessIncomeList && (
        <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-1">Zakelijke inkoop/uitgaven (leveranciers)</h2>
          <p className="text-xs text-slate-500 mb-3">
            Leveranciers die altijd als zakelijke kosten worden herkend — elke transactie die hierop matcht krijgt
            automatisch het label Zakelijk.
          </p>
          <KeywordManager
            keywords={businessExpenseKeywords}
            onAdd={onAddBusinessExpenseKeyword}
            onRemove={onRemoveBusinessExpenseKeyword}
            placeholder="bijv. LeasePlan, boekhouder-naam…"
            chipClass="bg-teal-100 text-teal-800"
            addButtonClass="bg-teal-600 hover:bg-teal-700"
            entries={businessExpenseEntries}
            entriesLabel="Nu herkend als Zakelijke inkoop/uitgaven"
            onReclassify={onReclassifyBusinessEntry}
            isExpanded={expandedBusinessExpenseList}
            onToggleExpand={onToggleExpandBusinessExpenseList}
          />
        </section>
      )}
    </div>
  );
}
