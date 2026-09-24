import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { computeAfschrijvingSchema } from "../../tax/activa.js";
import { MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN } from "../../tax/autoBijtelling.js";
import { eur } from "../../utils/amounts.js";

// Vult opgeslagen (of nog lege) gegevens aan tot het volledige formuliershape — zelfde aanpak als
// formFromSegment in FinancialLeaseDetailsModal.jsx, maar dan voor een gekochte of
// operational-leaseauto op de zaak (geen leningschema om aan op te hangen, dus geen
// aankoop/leasestructuur-velden zoals daar).
function formFromDetails(details) {
  const d = details || {};
  return {
    aanschafwaarde: d.aanschafwaarde ?? "",
    aanschafdatum: d.aanschafdatum ?? "",
    restwaarde: d.restwaarde ?? "",
    afschrijvingstermijnJaren: d.afschrijvingstermijnJaren ?? "",
    cataloguswaarde: d.cataloguswaarde ?? "",
    bijtellingspercentage: d.bijtellingspercentage ?? "",
    privegebruikMeerDan500kmPerJaar: d.privegebruikMeerDan500kmPerJaar ?? {},
  };
}

function cleanDetails(form, soort) {
  const n = (v) => (v === "" ? null : Number(v));
  return {
    aanschafwaarde: soort === "koop" ? n(form.aanschafwaarde) : null,
    aanschafdatum: soort === "koop" ? (form.aanschafdatum || null) : null,
    restwaarde: soort === "koop" ? n(form.restwaarde) : null,
    afschrijvingstermijnJaren: soort === "koop" ? n(form.afschrijvingstermijnJaren) : null,
    cataloguswaarde: n(form.cataloguswaarde),
    bijtellingspercentage: n(form.bijtellingspercentage),
    privegebruikMeerDan500kmPerJaar: form.privegebruikMeerDan500kmPerJaar || {},
  };
}

// `soort`: "koop" of "operational" — bepaalt of de aanschaf/afschrijvingsvelden getoond worden. Bij
// "operational" is de maandelijkse lease-vergoeding zelf al een gewone, volledig aftrekbare kostenpost
// (categorie "Lease (operationeel)") — er is dan niets te kapitaliseren/af te schrijven, alleen de
// bijtelling/onttrekking bij privégebruik is relevant.
export default function AutoOpDeZaakDetailsModal({ soort, details, years, onSave, onClose }) {
  const [form, setForm] = useState(() => formFromDetails(details));
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const afschrijvingSchema = useMemo(() => {
    if (soort !== "koop" || !form.aanschafwaarde || !form.aanschafdatum) return [];
    return computeAfschrijvingSchema({
      aanschafwaarde: form.aanschafwaarde,
      restwaarde: form.restwaarde,
      afschrijvingstermijnJaren: Math.max(Number(form.afschrijvingstermijnJaren) || 0, MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN),
      aanschafdatum: form.aanschafdatum,
    });
  }, [soort, form.aanschafwaarde, form.aanschafdatum, form.restwaarde, form.afschrijvingstermijnJaren]);

  const jarenVoorPrivegebruik = useMemo(() => {
    const set = new Set(years || []);
    set.add(String(new Date().getFullYear()));
    return [...set].sort();
  }, [years]);

  const handleSave = () => {
    onSave(cleanDetails(form, soort));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Auto op de zaak — {soort === "koop" ? "eigendom (gekocht)" : "operational lease"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {soort === "koop"
                ? "Voor afschrijving en (bij privégebruik) de bijtelling/onttrekking."
                : "De lease-termijnen zelf lopen al gewoon mee als kosten — dit is alleen voor de bijtelling/onttrekking bij privégebruik."}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-5">
          {soort === "koop" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Aanschaf &amp; afschrijving</p>
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
                  <span className="block text-xs font-medium text-slate-600 mb-1">Restwaarde (optioneel)</span>
                  <input type="number" min="0" step="0.01" value={form.restwaarde} onChange={set("restwaarde")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
                </label>
                <label className="text-sm">
                  <span className="block text-xs font-medium text-slate-600 mb-1">
                    Afschrijvingstermijn (jaren) — minimaal {MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN}
                  </span>
                  <input
                    type="number" min="1" step="1" value={form.afschrijvingstermijnJaren} onChange={set("afschrijvingstermijnJaren")}
                    placeholder={String(MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                  />
                </label>
              </div>
              {afschrijvingSchema.length > 0 && (
                <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Berekende afschrijving per jaar</p>
                  <table className="w-full text-sm text-slate-800">
                    <thead>
                      <tr className="text-xs text-slate-500">
                        <th className="text-left font-medium pb-1">Jaar</th>
                        <th className="text-right font-medium pb-1">Afschrijving</th>
                      </tr>
                    </thead>
                    <tbody>
                      {afschrijvingSchema.map((r) => (
                        <tr key={r.jaar} className="border-t border-slate-200/60">
                          <td className="py-1">{r.jaar}</td>
                          <td className="text-right font-mono">{eur(r.afschrijving)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Bijtelling privégebruik (optioneel)</p>
            <p className="text-xs text-slate-400 mb-2">
              Alleen relevant bij meer dan 500 km privégebruik per jaar — laat leeg als dat niet van toepassing is,
              dan blijven de volledige autokosten gewoon aftrekbaar.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Cataloguswaarde</span>
                <input type="number" min="0" step="0.01" value={form.cataloguswaarde} onChange={set("cataloguswaarde")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Bijtellingspercentage (%)</span>
                <input type="number" min="0" step="0.1" value={form.bijtellingspercentage} onChange={set("bijtellingspercentage")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
              </label>
            </div>
            {jarenVoorPrivegebruik.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-600 mb-1">Privégebruik meer dan 500 km per jaar?</p>
                <div className="flex flex-wrap gap-3">
                  {jarenVoorPrivegebruik.map((jaar) => (
                    <label key={jaar} className="flex items-center gap-1.5 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!form.privegebruikMeerDan500kmPerJaar?.[jaar]}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            privegebruikMeerDan500kmPerJaar: { ...(f.privegebruikMeerDan500kmPerJaar || {}), [jaar]: e.target.checked },
                          }))
                        }
                      />
                      {jaar}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
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
