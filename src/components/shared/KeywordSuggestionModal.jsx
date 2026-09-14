import { X } from "lucide-react";
import { eur } from "../../utils/amounts.js";

export default function KeywordSuggestionModal({ suggestion, onAccept, onDismiss }) {
  const { keyword, category, type, matches, sourceName } = suggestion;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-3" onClick={onDismiss}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <p className="text-sm font-semibold text-slate-800">Ook deze zo indelen?</p>
          <button onClick={onDismiss} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 text-sm text-slate-600 space-y-3">
          <p>
            {matches.length === 1 ? "Deze transactie lijkt" : `Deze ${matches.length} transacties lijken`} op{" "}
            <strong>"{sourceName}"</strong>, dat je net naar <strong>{category}</strong> ({type}) hebt gezet:
          </p>
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
            {matches.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center gap-2 p-2 text-xs">
                <span className="flex-1 truncate">{t.counterparty || t.description || "(geen omschrijving)"}</span>
                <span className="shrink-0 font-mono text-slate-400">{eur(t.amount)}</span>
              </div>
            ))}
            {matches.length > 10 && <p className="p-2 text-[10px] text-slate-400">en {matches.length - 10} andere...</p>}
          </div>
          <p>
            Sla <strong>"{keyword}"</strong> op als trefwoord bij <strong>{category}</strong>? Dan worden deze en
            toekomstige transacties met dit woord voortaan automatisch zo ingedeeld.
          </p>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onDismiss} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            Nee, dank je
          </button>
          <button onClick={onAccept} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
            Ja, trefwoord toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}
