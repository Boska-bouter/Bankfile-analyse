// huishoudboekje-V1R0 — budgetten per categorie instellen (bedrag per maand). Leeg = geen budget.
import { useState } from "react";
import { X } from "lucide-react";
import { schoonBudgetten } from "../../calc/huishoudboekje/budget.js";

// huishoudboekje-V1R1 — ook het spaardoel per maand; standaard staan de categorieën uit de wizard erbij.
import { HUISHOUD_BUDGET_VELDEN } from "../../modus/huishoudboekje/wizard.js";

export default function BudgetModal({ budgetten, spaardoel = 0, categorieen: gevonden, gemiddeld, label = (c) => c, onOpslaan, onClose }) {
  const categorieen = [...new Set([...gevonden, ...HUISHOUD_BUDGET_VELDEN.map((v) => v.key)])];
  const [waarden, setWaarden] = useState(() => Object.fromEntries(categorieen.map((c) => [c, budgetten?.[c] != null ? String(budgetten[c]).replace(".", ",") : ""])));
  const [doel, setDoel] = useState(spaardoel ? String(spaardoel).replace(".", ",") : "");
  const gesorteerd = [...categorieen].sort((a, b) => (gemiddeld?.get(b) || 0) - (gemiddeld?.get(a) || 0));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /> Sluiten</button>
        <h2 className="text-lg font-bold">Budgetten per maand</h2>
        <p className="mb-3 text-sm text-slate-600">Vul in hoeveel je per maand wilt uitgeven. Ga je erover, dan waarschuwt de app. Laat leeg voor geen budget.</p>
        <div className="flex-1 overflow-y-auto pr-1">
          <table className="w-full text-sm"><tbody>{gesorteerd.map((c) => (
            <tr key={c} className="border-t border-slate-100">
              <td className="py-1.5">{label(c)}{gemiddeld?.get(c) ? <div className="text-xs text-slate-400">gemiddeld € {Math.round(gemiddeld.get(c)).toLocaleString("nl-NL")} per maand</div> : null}</td>
              <td className="w-32 py-1.5"><div className="flex items-center gap-1"><span className="text-slate-400">€</span><input inputMode="decimal" aria-label={`Budget ${label(c)}`} value={waarden[c] ?? ""} onChange={(e) => setWaarden((w) => ({ ...w, [c]: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-right" /></div></td>
            </tr>
          ))}</tbody></table>
          <label className="mt-3 flex items-center justify-between gap-2 border-t-2 border-slate-200 pt-3 text-sm font-semibold">
            <span>Spaardoel per maand</span>
            <span className="flex w-32 items-center gap-1"><span className="font-normal text-slate-400">€</span><input inputMode="decimal" aria-label="Spaardoel per maand" value={doel} onChange={(e) => setDoel(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1 text-right font-normal" /></span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Annuleren</button>
          <button type="button" onClick={() => onOpslaan(schoonBudgetten(waarden), schoonBudgetten({ d: doel }).d || null)} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">Opslaan</button>
        </div>
      </div>
    </div>
  );
}
