import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { computeLoanAmortization } from "../../tax/loanAmortization.js";
import { eur } from "../../utils/amounts.js";

export default function LoanDetailsModal({ loan, details, onSave, onClose, kind = "lening" }) {
  const isLease = kind === "lease";
  const bedragVeld = isLease ? "leasebedrag" : "leningbedrag";
  const [form, setForm] = useState({
    [bedragVeld]: details?.[bedragVeld] ?? "",
    startdatum: details?.startdatum ?? "",
    rente: details?.rente ?? "",
    einddatum: details?.einddatum ?? "",
    alAfgelost: details?.alAfgelost ?? "",
    totaleRenteBetaald: details?.totaleRenteBetaald ?? "",
  });
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const amortization = useMemo(() => {
    const previewDetails = { [bedragVeld]: form[bedragVeld], startdatum: form.startdatum, rente: form.rente };
    return computeLoanAmortization(loan.transactions, previewDetails);
  }, [loan, form, bedragVeld]);

  const handleSave = () => {
    onSave(loan.key, {
      [bedragVeld]: form[bedragVeld] === "" ? null : Number(form[bedragVeld]),
      startdatum: form.startdatum || null,
      rente: form.rente === "" ? null : Number(form.rente),
      einddatum: form.einddatum || null,
      alAfgelost: form.alAfgelost === "" ? null : Number(form.alAfgelost),
      totaleRenteBetaald: form.totaleRenteBetaald === "" ? null : Number(form.totaleRenteBetaald),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">{isLease ? "Leasegegevens" : "Leninggegevens"} — {loan.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{loan.count}x, totaal {eur(loan.total)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500">
            Met {isLease ? "leasebedrag" : "leningbedrag"}, startdatum en rentepercentage kan de tool voor elke
            betaling terugrekenen hoeveel rente was (aftrekbaar) en hoeveel aflossing (niet aftrekbaar). De overige
            velden zijn optioneel, puur ter controle.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">{isLease ? "Leasebedrag" : "Leningbedrag"} (oorspronkelijk) *</span>
              <input type="number" min="0" step="0.01" value={form[bedragVeld]} onChange={set(bedragVeld)} placeholder="bijv. 25000" className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Startdatum *</span>
              <input type="date" value={form.startdatum} onChange={set("startdatum")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Rentepercentage per jaar *</span>
              <input type="number" min="0" step="0.01" value={form.rente} onChange={set("rente")} placeholder="bijv. 4.5" className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Einddatum (optioneel)</span>
              <input type="date" value={form.einddatum} onChange={set("einddatum")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Al afgelost tot nu (optioneel)</span>
              <input type="number" min="0" step="0.01" value={form.alAfgelost} onChange={set("alAfgelost")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Totale rente al betaald (optioneel)</span>
              <input type="number" min="0" step="0.01" value={form.totaleRenteBetaald} onChange={set("totaleRenteBetaald")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
          </div>
          <p className="text-xs text-slate-400">* Verplicht om de splitsing te kunnen berekenen.</p>

          {amortization && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-1">Berekende splitsing</p>
              <p className="text-sm text-emerald-900">
                Rente: <strong>{eur(amortization.totaalRente)}</strong> · Aflossing: <strong>{eur(amortization.totaalAflossing)}</strong> · Nog openstaand: <strong>{eur(amortization.saldoNu)}</strong>
              </p>
              {form.totaleRenteBetaald !== "" && Math.abs(Number(form.totaleRenteBetaald) - amortization.totaalRente) > 25 && (
                <p className="mt-1 text-xs text-amber-700">
                  ⚠ Dit wijkt meer dan €25 af van het door jou opgegeven bedrag — controleer de gegevens.
                </p>
              )}
            </div>
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
