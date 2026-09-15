import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, computeTotaleLeaseBetalingen } from "../../tax/financialLease.js";
import { computeLoanAmortization } from "../../tax/loanAmortization.js";
import { eur } from "../../utils/amounts.js";

const FIELDS_AANKOOP = [
  ["koopprijs", "Koopprijs"],
  ["teBetalenBtw", "Te betalen BTW"],
  ["aanbetaling", "Aanbetaling"],
  ["inruilwaarde", "Inruilwaarde"],
  ["inlossingLopendeLening", "Inlossing lopende lening"],
];
const FIELDS_LEASE = [
  ["leaseVergoeding", "Lease vergoeding (financieringskosten, bovenop het koopbedrag)"],
  ["looptijd", "Looptijd (maanden)"],
  ["maandbedrag", "Maandbedrag"],
  ["eindbetaling", "Eindbetaling (indien van toepassing)"],
  ["extraBedrag1eTermijn", "Extra bedrag 1e termijn"],
];

export default function FinancialLeaseDetailsModal({ lease, details, onSave, onClose }) {
  const [form, setForm] = useState({
    koopprijs: details?.koopprijs ?? "",
    teBetalenBtw: details?.teBetalenBtw ?? "",
    aanbetaling: details?.aanbetaling ?? "",
    inruilwaarde: details?.inruilwaarde ?? "",
    inlossingLopendeLening: details?.inlossingLopendeLening ?? "",
    leaseVergoeding: details?.leaseVergoeding ?? "",
    looptijd: details?.looptijd ?? "",
    maandbedrag: details?.maandbedrag ?? "",
    eindbetaling: details?.eindbetaling ?? "",
    extraBedrag1eTermijn: details?.extraBedrag1eTermijn ?? "",
    startdatum: details?.startdatum ?? "",
  });
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const onbetaaldGedeelteKoop = useMemo(() => computeOnbetaaldGedeelteKoop(form), [form]);
  const renteJaarlijks = useMemo(() => computeFinancialLeaseRate(form), [form]);
  const totaleLeaseBetalingen = useMemo(() => computeTotaleLeaseBetalingen(form), [form]);
  const amortization = useMemo(() => {
    if (renteJaarlijks == null || !form.startdatum) return null;
    return computeLoanAmortization(lease.transactions, { leasebedrag: onbetaaldGedeelteKoop, startdatum: form.startdatum, rente: renteJaarlijks });
  }, [lease, form, onbetaaldGedeelteKoop, renteJaarlijks]);

  const leaseVergoedingWijktAf =
    form.leaseVergoeding !== "" && totaleLeaseBetalingen != null &&
    Math.abs(onbetaaldGedeelteKoop + Number(form.leaseVergoeding) - totaleLeaseBetalingen) > 25;

  const handleSave = () => {
    const n = (v) => (v === "" ? null : Number(v));
    onSave(lease.key, {
      koopprijs: n(form.koopprijs), teBetalenBtw: n(form.teBetalenBtw), aanbetaling: n(form.aanbetaling),
      inruilwaarde: n(form.inruilwaarde), inlossingLopendeLening: n(form.inlossingLopendeLening),
      leaseVergoeding: n(form.leaseVergoeding), looptijd: n(form.looptijd), maandbedrag: n(form.maandbedrag),
      eindbetaling: n(form.eindbetaling), extraBedrag1eTermijn: n(form.extraBedrag1eTermijn),
      startdatum: form.startdatum || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">Financiële lease — {lease.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{lease.count}x, totaal {eur(lease.total)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-5">
          <p className="text-xs text-slate-500">
            Vul de aankoop- en leasestructuur in zoals die op het leasecontract staat — het jaarlijkse
            rentepercentage berekent de tool daaruit vanzelf, in plaats van dat je dat zelf moet opzoeken.
            De lease vergoeding is de financieringskost bovenop het onbetaalde koopbedrag: samen vormen ze
            het totaal dat je terugbetaalt via de maandbedragen en de eventuele eindbetaling.
          </p>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Aankoop</p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS_AANKOOP.map(([field, label]) => (
                <label key={field} className="text-sm">
                  <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
                  <input type="number" min="0" step="0.01" value={form[field]} onChange={set(field)} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Onbetaald gedeelte koop</span>
            <span className="text-sm font-mono font-semibold text-slate-900">{eur(onbetaaldGedeelteKoop)}</span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Leasestructuur</p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS_LEASE.map(([field, label]) => (
                <label key={field} className="text-sm">
                  <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
                  <input type="number" min="0" step="0.01" value={form[field]} onChange={set(field)} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
                </label>
              ))}
              <label className="text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Startdatum *</span>
                <input type="date" value={form.startdatum} onChange={set("startdatum")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-1">* Nodig om de betalingen uit de bank aan het schema te koppelen.</p>
          </div>

          {leaseVergoedingWijktAf && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
              ⚠ Onbetaald gedeelte koop + lease vergoeding ({eur(onbetaaldGedeelteKoop + Number(form.leaseVergoeding))}) wijkt meer dan
              €25 af van maandbedrag × looptijd + eindbetaling + extra ({eur(totaleLeaseBetalingen)}) — controleer de invoer.
            </p>
          )}

          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Berekend rentepercentage per jaar</span>
            <span className="text-sm font-mono font-semibold text-slate-900">
              {renteJaarlijks != null ? `${renteJaarlijks.toFixed(2)}%` : "—"}
            </span>
          </div>

          {amortization && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-1">Berekende splitsing van de bankbetalingen</p>
              <p className="text-sm text-emerald-900">
                Rente: <strong>{eur(amortization.totaalRente)}</strong> (aftrekbaar) · Aflossing: <strong>{eur(amortization.totaalAflossing)}</strong> (niet aftrekbaar) · Nog openstaand: <strong>{eur(amortization.saldoNu)}</strong>
              </p>
            </div>
          )}
          {!amortization && renteJaarlijks == null && (form.koopprijs || form.maandbedrag) && (
            <p className="text-xs text-slate-400">
              Nog niet genoeg ingevuld om het rentepercentage te kunnen berekenen (in elk geval koopprijs, looptijd en maandbedrag nodig).
            </p>
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
