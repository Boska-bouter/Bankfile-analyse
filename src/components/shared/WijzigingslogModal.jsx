import { X } from "lucide-react";

// Overzicht van de handmatige keuzes en ingrepen in dit dossier (nieuwste bovenaan).
export default function WijzigingslogModal({ log, kanLaatsteTerugdraaien, laatsteLabel, onTerugdraaien, onClose }) {
  const regels = [...(log || [])].reverse();
  const fmt = (t) => new Date(t).toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[85dvh] flex flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="font-bold text-slate-900">Wijzigingslog</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <p className="px-5 text-xs text-slate-500">Eigen keuzes en ingrepen in dit dossier, met datum en tijd. Wordt meegeslagen in het dossierbestand. Alleen de laatste actie kan ongedaan worden gemaakt.</p>
        {kanLaatsteTerugdraaien && (
          <div className="mx-5 mt-3 flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            <span>Laatste actie: <strong>{laatsteLabel}</strong></span>
            <button onClick={onTerugdraaien} className="rounded-md bg-teal-700 px-2.5 py-1 font-semibold text-white hover:bg-teal-800">Ongedaan maken</button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-3">
          {regels.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen wijzigingen vastgelegd.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {regels.map((r, i) => (
                <li key={i} className="py-1.5 flex gap-3"><span className="shrink-0 text-xs text-slate-400 w-32">{fmt(r.t)}</span><span className="text-slate-800">{r.label}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
