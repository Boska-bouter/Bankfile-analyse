import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, computeTotaleLeaseBetalingen, generateProjectedLeasePayments, matchLeasePaymentsToSchedule } from "../../tax/financialLease.js";
import { computeLoanAmortization, groupAmortizationByYear } from "../../tax/loanAmortization.js";
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
    contractBeeindigd: details?.contractBeeindigd ?? false,
    einddatumContract: details?.einddatumContract ?? "",
    verkoopsom: details?.verkoopsom ?? "",
    restschuld: details?.restschuld ?? "",
  });
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setChecked = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.checked }));

  const onbetaaldGedeelteKoop = useMemo(() => computeOnbetaaldGedeelteKoop(form), [form]);
  const renteJaarlijks = useMemo(() => computeFinancialLeaseRate(form), [form]);
  const totaleLeaseBetalingen = useMemo(() => computeTotaleLeaseBetalingen(form), [form]);
  const amortization = useMemo(() => {
    if (renteJaarlijks == null || !form.startdatum) return null;
    const projectedPayments = generateProjectedLeasePayments(form);
    if (projectedPayments.length === 0) return null;
    return computeLoanAmortization(projectedPayments, { leasebedrag: onbetaaldGedeelteKoop, startdatum: form.startdatum, rente: renteJaarlijks });
  }, [form, onbetaaldGedeelteKoop, renteJaarlijks]);
  const perJaar = useMemo(() => groupAmortizationByYear(amortization), [amortization]);
  const paymentCheck = useMemo(() => {
    const projectedPayments = generateProjectedLeasePayments(form);
    if (projectedPayments.length === 0) return null;
    return matchLeasePaymentsToSchedule(projectedPayments, lease.transactions, Number(form.maandbedrag) || 0);
  }, [lease, form]);

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
      contractBeeindigd: form.contractBeeindigd,
      einddatumContract: form.contractBeeindigd ? (form.einddatumContract || null) : null,
      verkoopsom: form.contractBeeindigd ? n(form.verkoopsom) : null,
      restschuld: form.contractBeeindigd ? n(form.restschuld) : null,
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
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-2">
                Volledig schema over de{form.contractBeeindigd ? " (afgebroken)" : ""} looptijd — voor de belastingaangifte
                telt per jaar wat er aan rente/aflossing is betaald, niet het totaal ineens
              </p>
              <table className="w-full text-sm text-emerald-900">
                <thead>
                  <tr className="text-xs text-emerald-700">
                    <th className="text-left font-medium pb-1">Jaar</th>
                    <th className="text-right font-medium pb-1">Rente (aftrekbaar)</th>
                    <th className="text-right font-medium pb-1">Aflossing</th>
                    <th className="text-right font-medium pb-1">Saldo eind jaar</th>
                  </tr>
                </thead>
                <tbody>
                  {perJaar.map((j) => (
                    <tr key={j.year} className="border-t border-emerald-200/60">
                      <td className="py-1">{j.year}</td>
                      <td className="text-right font-mono">{eur(j.rente)}</td>
                      <td className="text-right font-mono">{eur(j.aflossing)}</td>
                      <td className="text-right font-mono">{eur(j.saldoEindJaar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-emerald-700 mt-2 pt-2 border-t border-emerald-200">
                Totaal over de volledige{form.contractBeeindigd ? ", afgebroken" : ""} looptijd ({amortization.rows.length}{" "}
                termijnen): rente {eur(amortization.totaalRente)}, aflossing {eur(amortization.totaalAflossing)}.
                {form.contractBeeindigd
                  ? " Dit schema stopt bij de opgegeven einddatum — de restschuld hieronder is de werkelijke afkoopsom, die kan afwijken van dit theoretische schema."
                  : " Dit is de volledige looptijd zoals ingevuld, ongeacht hoeveel er al daadwerkelijk via de bank is betaald."}
              </p>
            </div>
          )}

          {paymentCheck && (() => {
            const counts = { gevonden: 0, "gevonden-afwijkend": 0, "gevonden-samen": 0, ontbrekend: 0, "nog-niet-in-beeld": 0 };
            for (const r of paymentCheck.results) counts[r.status]++;
            const aandacht = paymentCheck.results.filter((r) => r.status === "ontbrekend" || r.status === "gevonden-afwijkend");
            const inBeeldTotaal = paymentCheck.results.length - counts["nog-niet-in-beeld"];
            return (
              <div className="rounded-md border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                  Controle: zijn alle termijnen ook echt betaald?
                </p>
                <p className="text-sm text-slate-700">
                  <strong>{counts.gevonden + counts["gevonden-afwijkend"] + counts["gevonden-samen"]}</strong> van{" "}
                  <strong>{inBeeldTotaal}</strong> verwachte termijnen gevonden in de geïmporteerde bestanden
                  {counts.ontbrekend > 0 && <> — <strong className="text-red-700">{counts.ontbrekend} ontbrekend</strong></>}
                  {counts["gevonden-afwijkend"] > 0 && <> — <strong className="text-amber-700">{counts["gevonden-afwijkend"]} met een afwijkend bedrag</strong></>}
                  {counts["nog-niet-in-beeld"] > 0 && <span className="text-slate-400"> ({counts["nog-niet-in-beeld"]} termijnen liggen na de laatst geïmporteerde datum, nog niet te controleren)</span>}
                  .
                </p>
                {aandacht.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {aandacht.map((r, i) => (
                      <li key={i} className={r.status === "ontbrekend" ? "text-red-700" : "text-amber-700"}>
                        {r.status === "ontbrekend" ? "⚠ Ontbrekend: " : "⚠ Afwijkend bedrag: "}
                        verwacht {eur(Math.abs(r.projected.amount))} rond {new Date(r.projected.date).toLocaleDateString("nl-NL")}
                        {r.status === "gevonden-afwijkend" && r.matchedTx && (
                          <> — gevonden: {eur(Math.abs(r.matchedTx.amount))} op {new Date(r.matchedTx.date).toLocaleDateString("nl-NL")} (verschil {eur(r.bedragVerschil)})</>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {paymentCheck.onverwachteBetalingen.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Daarnaast {paymentCheck.onverwachteBetalingen.length} betaling(en) bij deze lease die niet bij een
                    verwachte termijn passen — mogelijk een extra aflossing.
                  </p>
                )}
              </div>
            );
          })()}

          <div className="border-t border-slate-200 pt-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.contractBeeindigd} onChange={setChecked("contractBeeindigd")} />
              Contract vroegtijdig beëindigd
            </label>
            {form.contractBeeindigd && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Einddatum contract</span>
                    <input type="date" value={form.einddatumContract} onChange={set("einddatumContract")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
                  </label>
                  <label className="text-sm">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Verkoopsom</span>
                    <input type="number" min="0" step="0.01" value={form.verkoopsom} onChange={set("verkoopsom")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
                  </label>
                  <label className="text-sm">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Restschuld</span>
                    <input type="number" min="0" step="0.01" value={form.restschuld} onChange={set("restschuld")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
                  </label>
                </div>
                {form.verkoopsom !== "" && form.restschuld !== "" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Resultaat bij beëindiging (verkoopsom − restschuld)</span>
                    <span className={`text-sm font-mono font-semibold ${Number(form.verkoopsom) - Number(form.restschuld) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {eur(Number(form.verkoopsom) - Number(form.restschuld))}
                    </span>
                  </div>
                )}
                {form.restschuld !== "" && amortization && Math.abs(Number(form.restschuld) - amortization.saldoNu) > 25 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                    ⚠ De opgegeven restschuld ({eur(Number(form.restschuld))}) wijkt meer dan €25 af van het op basis van de
                    bankbetalingen berekende openstaande saldo ({eur(amortization.saldoNu)}) — controleer de invoer, of dit
                    verschil kan kloppen (bijv. bij afwijkende voorwaarden bij vroegtijdige beëindiging).
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Een positief resultaat is winst bij beëindiging, een negatief resultaat is verlies — beide kunnen van
                  belang zijn voor de belastingaangifte.
                </p>
              </div>
            )}
          </div>

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
