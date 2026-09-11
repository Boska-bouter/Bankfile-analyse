import { X } from "lucide-react";
import { HELP_CHAPTERS } from "../../content/helpChapters.jsx";

export default function HelpPopupModal({ chapterKey, onClose, onViewAll }) {
  const chapter = HELP_CHAPTERS.find((c) => c.key === chapterKey);
  if (!chapter) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <p className="text-sm font-semibold text-slate-800">{chapter.titel}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto text-sm text-slate-700">{chapter.inhoud}</div>
        <div className="px-4 py-3 border-t border-slate-200 shrink-0">
          <button onClick={onViewAll} className="text-xs text-slate-500 hover:text-slate-800 underline">
            Bekijk alle hoofdstukken in Help en uitleg
          </button>
        </div>
      </div>
    </div>
  );
}
