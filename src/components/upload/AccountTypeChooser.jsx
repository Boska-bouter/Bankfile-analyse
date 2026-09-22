import { Building2, Home, FileSpreadsheet } from "lucide-react";

// Vraagt per geüpload bestand: is dit een zakelijke rekening of een privérekening? Dat bepaalt
// het standaard-label voor alle transacties uit dat bestand (later nog per transactie of
// tegenpartij te corrigeren).
export default function AccountTypeChooser({ pendingFileNames, onChoose }) {
  if (pendingFileNames.length === 0) return null;
  return (
    <section className="rounded-lg border-2 border-slate-900 bg-white overflow-hidden">
      <div className="bg-slate-900 text-white px-5 py-3">
        <h2 className="text-sm font-semibold">Is dit een zakelijke rekening of een privérekening?</h2>
        <p className="text-xs text-slate-300 mt-1">
          Bepaalt het standaard-label voor alle transacties uit dat bestand — dit kan later altijd nog per
          transactie of tegenpartij gecorrigeerd worden.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {pendingFileNames.map((fileName) => (
          <div key={fileName} className="flex flex-wrap items-center gap-3 p-4">
            <FileSpreadsheet className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="flex-1 min-w-[10rem] text-sm font-medium truncate">{fileName}</span>
            <button
              onClick={() => onChoose(fileName, "Zakelijk")}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-100"
            >
              <Building2 className="h-3.5 w-3.5" /> Zakelijke rekening
            </button>
            <button
              onClick={() => onChoose(fileName, "Prive")}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-600 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
            >
              <Home className="h-3.5 w-3.5" /> Privérekening
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
