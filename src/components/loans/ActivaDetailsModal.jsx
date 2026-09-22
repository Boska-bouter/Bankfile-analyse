import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { computeAfschrijvingSchema } from "../../tax/activa.js";
import { eur } from "../../utils/amounts.js";

export default function ActivaDetailsModal({ activum, details, onSave, onClose }) {
  const [form, setForm] = useState({
    naam: details?.naam ?? activum.naam,
    aanschafwaarde: details?.aanschafwaarde ?? Math.abs(activum.tx.amount),
    aanschafdatum: details?.aanschafdatum ?? activum.tx.date.toISOString().slice(0, 10),
    afschrijvingstermijnJaren: details?.afschrijvingstermijnJaren ?? "",
    restwaarde: details?.restwaarde ?? "",
  });
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const schema = useMemo(() => computeAfschrijvingSchema(form), [form]);

  const handleSave = () => {
    const n = (v) => (v === "" ? null : Number(v));
    onSave(activum.key, {
      naam: form.naam,
      aanschafwaarde: n(form.aanschafwaarde),
      aanschafdatum: form.aanschafdatum || null,
      afschrijvingstermijnJaren: n(form.afschrijvingstermijnJaren),
      restwaarde: n(form.restwaarde),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">Bedrijfsmiddel — {activum.naam}</p>
            <p className="text-xs text-slate-500 mt-0.5">{eur(Math.abs(activum.tx.amount))} op {activum.tx.date.toLocaleDateString("nl-NL")}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500">
            Vul aan met wat de Belastingdienst nodig heeft om de jaarlijkse afschrijving te berekenen — de tool
            rekent daarna zelf de lineaire afschrijving per jaar uit, inclusief de "tijdklem" in het jaar van aanschaf.
          </p>

          <label className="text-sm block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Naam bedrijfsmiddel</span>
            <input type="text" value={form.naam} onChange={set("naam")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Aanschafwaarde</span>
              <input type="number" min="0" step="0.01" value={form.aanschafwaarde} onChange={set("aanschafwaarde")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Aanschafdatum</span>
              <input type="date" value={form.aanschafdatum} onChange={set("aanschafdatum")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Afschrijvingstermijn (jaren)</span>
              <input type="number" min="1" step="1" value={form.afschrijvingstermijnJaren} onChange={set("afschrijvingstermijnJaren")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Restwaarde</span>
              <input type="number" min="0" step="0.01" value={form.restwaarde} onChange={set("restwaarde")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
          </div>

          {schema.length > 0 && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-2">Berekend afschrijvingsschema</p>
              <table className="w-full text-sm text-emerald-900">
                <thead>
                  <tr className="text-xs text-emerald-700">
                    <th className="text-left font-medium pb-1">Jaar</th>
                    <th className="text-right font-medium pb-1">Afschrijving</th>
                    <th className="text-right font-medium pb-1">Boekwaarde eind jaar</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.map((r) => (
                    <tr key={r.jaar} className="border-t border-emerald-200/60">
                      <td className="py-1">{r.jaar}</td>
                      <td className="text-right font-mono">{eur(r.afschrijving)}</td>
                      <td className="text-right font-mono">{eur(r.boekwaardeEindJaar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {schema.length === 0 && form.aanschafwaarde && (
            <p className="text-xs text-slate-400">Vul de afschrijvingstermijn in om het schema te berekenen.</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">Later altijd aan te passen.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuleren</button>
            <button onClick={handleSave} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">Opslaan</button>
          </div>
        </div>
      </div>
    </div>
  );
}
