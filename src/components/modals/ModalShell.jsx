import { X } from "lucide-react";

// Gedeelde pop-up-schil (donkere achtergrond, witte kaart, titelbalk met sluitknop) voor de grotere
// vensters van de app. Klik naast het venster of op het kruisje sluit het.
export default function ModalShell({ title, onClose, maxWidth = "max-w-4xl", children }) {
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} max-h-[85dvh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
