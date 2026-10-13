import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";
import KwartaalUitgavenModal from "./KwartaalUitgavenModal.jsx";

export default function QuarterlyBtwPanel({ quarters, kwartaalStatus, setKwartaalStatusField, activeYear, costBreakdownByQuarter, onOpenHelp, obIbSectionRef }) {
  // v273 — dit paneel toont nu alleen nog in de BTW-per-kwartaal-pop-up, dus standaard uitgeklapt
  // i.p.v. dichtgeklapt (zelfde reden als MultiYearOverview.jsx).
  const [breakdownModal, setBreakdownModal] = useState(null); // { key: "2023-Q2", veld: "netto" | "btw" }
  const openCount = quarters.filter((q) => {
    const s = kwartaalStatus[`${q.year}-Q${q.kwartaal}`] || {};
    return !s.aangegeven || !s.betaald;
  }).length;

  const heeftPriveAuto = quarters.some((q) => (q.btwPrivegebruikAuto || 0) > 0.004);

  if (quarters.length === 0) return null;

  return (
    <section ref={obIbSectionRef}>
      {/* Staat alleen nog in de BTW-per-kwartaal-pop-up, dus geen in-/uitklapbare kop meer (release19V3). */}
      {openCount > 0 && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {openCount} {openCount === 1 ? "kwartaal" : "kwartalen"} nog niet aangegeven/betaald
        </p>
      )}
      <div>
          <p className="text-xs text-slate-500 mb-3">
            De omzet- en kostenbedragen staan hier <strong>netto</strong> (excl. BTW), met het bruto bankbedrag er klein
            tussen haakjes onder.{" "}
            {onOpenHelp && <HelpHint chapter="btw-aangifte-kwartaal" onOpen={onOpenHelp} />}
          </p>
          <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 mb-3">
            Vergelijk het saldo per kwartaal gerust met wat er daadwerkelijk is aangegeven en betaald — een verschil
            betekent niet automatisch een fout (een eerdere aangifte kan op andere gegevens gebaseerd zijn); het is
            vooral een signaal om na te gaan waar het vandaan komt. "Aangegeven"/"betaald" hieronder is alleen een
            statusherinnering voor jezelf en verandert de getoonde bedragen niet.
          </p>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="text-left font-medium py-2 pr-4">Kwartaal</th>
                <th className="text-right font-medium py-2 px-2">Omzet 21%</th>
                <th className="text-right font-medium py-2 px-2">BTW 21% (1a)</th>
                <th className="text-right font-medium py-2 px-2">Omzet 9%</th>
                <th className="text-right font-medium py-2 px-2">BTW 9% (1b)</th>
                <th className="text-right font-medium py-2 px-2">Omzet verlegd (1e)</th>
                <th className="text-right font-medium py-2 px-2">Omzet 0%/vrijgesteld</th>
                <th className="text-right font-medium py-2 px-2">Uitgaven (netto)</th>
                <th className="text-right font-medium py-2 px-2">Voorbelasting (5b)</th>
                {heeftPriveAuto && <th className="text-right font-medium py-2 px-2">Privégebruik auto (1d)</th>}
                <th className="text-right font-medium py-2 pl-3">Saldo</th>
                <th className="text-left font-medium py-2 pl-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {quarters.map((q) => {
                const saldo = q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0);
                const statusKey = `${q.year}-Q${q.kwartaal}`;
                const status = kwartaalStatus[statusKey] || {};
                return (
                  <tr key={statusKey}>
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">{q.year} — Q{q.kwartaal}</td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                      {eur(q.omzetBruto21 - q.verschuldigdBtw21)}
                      <div className="text-xs text-slate-400 font-normal">({eur(q.omzetBruto21)} bruto)</div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap">{eur(q.verschuldigdBtw21)}</td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                      {eur(q.omzetBruto9 - q.verschuldigdBtw9)}
                      <div className="text-xs text-slate-400 font-normal">({eur(q.omzetBruto9)} bruto)</div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap">{eur(q.verschuldigdBtw9)}</td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap text-amber-700">{eur(q.omzetBrutoVerlegd)}</td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap text-slate-500">{eur(q.omzetBruto0)}</td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap text-slate-500">
                      <button
                        onClick={() => setBreakdownModal({ key: statusKey, veld: "netto" })}
                        className="underline decoration-dotted hover:decoration-solid hover:text-slate-700"
                        title="Klik voor de uitsplitsing naar categorie"
                      >
                        {eur(q.kostenBruto - q.voorbelasting)}
                      </button>
                      <div className="text-xs text-slate-400 font-normal">({eur(q.kostenBruto)} bruto)</div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap text-slate-500">
                      <button
                        onClick={() => setBreakdownModal({ key: statusKey, veld: "btw" })}
                        className="underline decoration-dotted hover:decoration-solid hover:text-slate-700"
                        title="Klik voor de uitsplitsing naar categorie"
                      >
                        {eur(q.voorbelasting)}
                      </button>
                      {q.voorbelasting < 0 && (
                        <div className="flex items-center justify-end gap-1 text-[11px] font-normal text-rose-700 normal-case whitespace-normal max-w-[9rem]">
                          <AlertCircle className="h-3 w-3 shrink-0" /> Kan niet negatief zijn — klik voor de uitsplitsing
                        </div>
                      )}
                    </td>
                    {heeftPriveAuto && (
                      <td className="py-2 px-2 text-right font-mono whitespace-nowrap text-amber-800">
                        {q.btwPrivegebruikAuto > 0.004 ? `+ ${eur(q.btwPrivegebruikAuto)}` : ""}
                      </td>
                    )}
                    <td className={`py-2 pl-3 text-right font-mono whitespace-nowrap font-semibold ${saldo >= 0 ? "text-slate-900" : "text-emerald-700"}`}>
                      {eur(Math.abs(saldo))} {saldo >= 0 ? "te betalen" : "terug"}
                    </td>
                    <td className="py-2 pl-3 whitespace-nowrap">
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input type="checkbox" checked={!!status.aangegeven} onChange={(e) => setKwartaalStatusField(statusKey, "aangegeven", e.target.checked)} />
                        Aangegeven
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input type="checkbox" checked={!!status.betaald} onChange={(e) => setKwartaalStatusField(statusKey, "betaald", e.target.checked)} />
                        Betaald
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {(() => {
            const details = quarters.map((q) => q.btwPrivegebruikAutoDetail).filter(Boolean);
            if (details.length === 0) return null;
            return details.map((d) => (
              <div key={d.year} className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-semibold">{d.bedrag > 0.004 ? `Btw privégebruik auto: ${eur(d.bedrag)} in het saldo van ${d.year} — Q4 (rubriek 1d)` : `Btw privégebruik auto ${d.year}: nog niet berekend — gegevens ontbreken`}</p>
                {d.items.map((i, n) => (
                  <p key={n} className="mt-0.5">
                    {i.naam}: {i.methode === "forfait"
                      ? `forfait ${String(i.pct).replace(".", ",")}%${i.fractie < 1 ? ` × ${Math.round(i.fractie * 12)}/12` : ""} van catalogusprijs ${eur(i.catalogus)}${i.afgetopt ? `, afgetopt op het maximum van ${eur(i.maximum)}` : ""}`
                      : `werkelijk privégebruik ${i.pct}%`} = {eur(i.bedrag)}
                    {i.meldingen.length > 0 && <span className="text-amber-700"> — {i.meldingen.join(" ")}</span>}
                  </p>
                ))}
                <p className="mt-1 text-amber-700">Instellen of uitzetten: Persoonlijke aannames → Auto op de zaak instellen → Btw privégebruik.</p>
              </div>
            ));
          })()}
      </div>
      {breakdownModal && (
        <KwartaalUitgavenModal
          titel={`${breakdownModal.veld === "btw" ? "Voorbelasting" : "Uitgaven (netto)"} — ${breakdownModal.key.replace("-Q", " — Q")}`}
          categorieen={costBreakdownByQuarter?.[breakdownModal.key] || []}
          veld={breakdownModal.veld}
          onClose={() => setBreakdownModal(null)}
        />
      )}
    </section>
  );
}
