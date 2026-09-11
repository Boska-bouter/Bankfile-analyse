import { X } from "lucide-react";

// Eigen bevestigingsvenster in plaats van window.confirm() — die werkt onbetrouwbaar in de
// app-op-beginscherm-modus op iOS. Dit is vooralsnog de eenvoudige variant zonder
// jaar-selectie — die complexere versie (voor bulkwijzigingen over meerdere jaren) hoort bij
// de detailtabel-panelen, die nog niet zijn overgezet.
export default function ConfirmBanner({ message, onConfirm, onCancel }) {
  if (!message) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center p-3">
      <section className="w-full max-w-2xl rounded-lg border-2 border-slate-900 bg-white px-4 py-3 shadow-xl">
        <p className="text-sm text-slate-800 whitespace-pre-line">{message}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={onConfirm} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            OK
          </button>
          <button onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Annuleren
          </button>
        </div>
      </section>
    </div>
  );
}

export function CloseButton({ onClick }) {
  return (
    <button onClick={onClick} className="text-slate-400 hover:text-slate-700 shrink-0">
      <X className="h-4 w-4" />
    </button>
  );
}
