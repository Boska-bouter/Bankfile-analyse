import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { computeFinancialLeaseAmortizationMultiSegment, suggestLeaseMerges } from "../../tax/loanAmortization.js";
import { detecteerNieuwContract, detecteerAfgelopenZonderBesluit } from "./FinancialLeaseWizard.jsx";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, isCompleteFinancialLeaseDetails, getLeaseSegments } from "../../tax/financialLease.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";
import { useOpenOnJump } from "../shared/useOpenOnJump.js";

function computeFinancialLeaseAmortization(lease, details) {
  if (!isCompleteFinancialLeaseDetails(details)) return null;
  return computeFinancialLeaseAmortizationMultiSegment(lease.transactions, details, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
}


// Tijdlijn van de contracten van één financial lease: per contract een balk op een gezamenlijke
// tijdas (start → einde, of beëindigingsdatum), met klik om het contract in de wizard te openen.
function ContractTijdlijn({ segments, onOpen }) {
  const rijen = segments.map((sg, i) => {
    if (!sg || !sg.startdatum) return { i, sg, leeg: true };
    const start = new Date(sg.startdatum);
    let eind;
    if (sg.contractBeeindigd && sg.einddatumContract) eind = new Date(sg.einddatumContract);
    else { eind = new Date(sg.startdatum); eind.setMonth(eind.getMonth() + (Number(sg.looptijd) || 0)); }
    return { i, sg, start, eind, beeindigd: !!sg.contractBeeindigd };
  });
  const geldig = rijen.filter((r) => !r.leeg && !isNaN(r.start) && !isNaN(r.eind) && r.eind > r.start);
  if (geldig.length === 0) return null;
  const nu = new Date();
  const min = Math.min(...geldig.map((r) => +r.start));
  const max = Math.max(nu > new Date(Math.max(...geldig.map((r) => +r.eind))) ? +nu : 0, ...geldig.map((r) => +r.eind));
  const span = Math.max(max - min, 1);
  const pct = (d) => ((+d - min) / span) * 100;
  const fmt = (d) => d.toLocaleDateString("nl-NL", { month: "2-digit", year: "numeric" });
  const status = (r) => (r.beeindigd ? "vroegtijdig gestopt" : r.eind < nu ? "afgelopen" : r.start > nu ? "nog niet gestart" : "loopt");
  return (
    <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <p className="text-[11px] font-medium text-slate-500 mb-1.5">Contracten in volgorde</p>
      <div className="space-y-1.5">
        {geldig.map((r) => (
          <button key={r.i} type="button" onClick={() => onOpen(r.i)} className="w-full text-left group" title="Dit contract openen in de stappen">
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
              <span className="truncate">
                <strong>Contract {r.i + 1}</strong> · {fmt(r.start)} → {fmt(r.eind)}
                {r.sg.maandbedrag ? ` · ${eur(Number(r.sg.maandbedrag))}/mnd` : ""}
                {r.sg.kenteken ? ` · ${r.sg.kenteken}` : ""}
              </span>
              <span className={`shrink-0 ${r.beeindigd ? "text-amber-700" : r.eind < nu ? "text-slate-400" : "text-emerald-700"}`}>{status(r)}</span>
            </div>
            <div className="relative h-1.5 mt-0.5 rounded-full bg-slate-200">
              <div
                className={`absolute h-1.5 rounded-full ${r.beeindigd ? "bg-amber-400" : r.eind < nu ? "bg-slate-400" : "bg-teal-600"} group-hover:opacity-80`}
                style={{ left: `${pct(r.start)}%`, width: `${Math.max(pct(r.eind) - pct(r.start), 1.5)}%`, backgroundColor: r.beeindigd ? "#fbbf24" : r.eind < nu ? "#94a3b8" : "#0d9488" }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LeaseInterestPanel({
  defaultOpen = false, leaseSummary, leaseDetails, confirmedLeaseTypeKeys, onConfirmType, onOpenModal, onOpenWizard, onMarkUnknown, onUnmarkUnknown,
  onMergeInto, onUndoMerge, leaseMerges, onOpenHelp,
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const sectionRef = useOpenOnJump(setOpen);
  // Per samengevoegde lease: zijn de bijbehorende benamingen uitgeklapt? (standaard dicht)
  const [toonBenamingen, setToonBenamingen] = useState({});
  if (leaseSummary.length === 0) return null;

  const incompleteCount = leaseSummary.filter((l) => {
    if (!confirmedLeaseTypeKeys.includes(l.key)) return true;
    if (leaseDetails[l.key]?.onbekend) return false;
    return l.category === "Lease (financieel)" && !isCompleteFinancialLeaseDetails(leaseDetails[l.key]);
  }).length;

  return (
    <section ref={sectionRef} className="rounded-xl border-2 border-slate-200 bg-white shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>Lease (operationeel/financieel)</span>
        <span className="text-xs font-normal text-slate-400">({leaseSummary.length})</span>
        {incompleteCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {incompleteCount}
          </span>
        )}
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-500 mb-3">
            Bij <strong>operationele</strong> lease is de hele termijn aftrekbaar, geen verdere actie nodig. Bij{" "}
            <strong>financiële</strong> lease is alleen de rente in de termijn aftrekbaar — net als bij een lening.{" "}
            {onOpenHelp && <HelpHint chapter="lease-financieel" onOpen={onOpenHelp} />}
          </p>
          {onMergeInto && suggestLeaseMerges(leaseSummary).map((group) => (
            <div key={group.map((l) => l.key).join("+")} className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-3 text-xs text-blue-900">
              <p>
                <strong>Horen deze bij elkaar?</strong> {group.map((l) => `"${l.name}"`).join(" en ")} lijken op dezelfde
                tegenpartij te wijzen — mogelijk hetzelfde leasecontract, bijvoorbeeld met een deel van de betalingen
                via een losse factuur in plaats van de vaste incasso.
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {group.slice(1).map((l) => (
                  <button
                    key={l.key}
                    onClick={() => onMergeInto(l.key, group[0].key)}
                    className="rounded-lg border border-blue-300 bg-white px-2 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-100"
                  >
                    Ja, "{l.name}" samenvoegen met "{group[0].name}"
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="space-y-3">
            {leaseSummary.map((lease) => {
              const typeConfirmed = confirmedLeaseTypeKeys.includes(lease.key);
              const isFinancieel = lease.category === "Lease (financieel)";
              const details = leaseDetails[lease.key];
              const isOnbekend = isFinancieel && !!details?.onbekend;
              const amortization = isFinancieel ? computeFinancialLeaseAmortization(lease, details) : null;
              // Bij meerdere opeenvolgende contracten (zie financialLease.js) telt alleen of het
              // LAATSTE (huidige) contract is beëindigd — een eerder, al opgevolgd contract "stopt"
              // altijd, dat is juist de bedoeling en geen signaal dat de hele lease voorbij is.
              const segments = isFinancieel ? getLeaseSegments(details) : [];
              const isBeeindigd = segments.length > 0 && !!segments[segments.length - 1]?.contractBeeindigd;
              // Samengevoegde benamingen van déze lease (bron → doel = deze lease).
              const benamingen = (leaseMerges || []).filter((m) => m.targetKey === lease.key);
              return (
                <div key={lease.key} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="flex-1 min-w-[8rem] truncate font-medium">{lease.name}</span>
                    {isBeeindigd && (
                      <span className="inline-flex items-center rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-medium">beëindigd</span>
                    )}
                    {segments.length > 1 && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-medium">{segments.length} contracten</span>
                    )}
                    {benamingen.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setToonBenamingen((v) => ({ ...v, [lease.key]: !v[lease.key] }))}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-medium hover:bg-slate-200"
                        title="Deze lease bestaat uit meerdere tegenpartij-benamingen die samen één contract vormen"
                      >
                        {benamingen.length + 1} benamingen {toonBenamingen[lease.key] ? "▴" : "▾"}
                      </button>
                    )}
                    <span className="text-xs text-slate-400 font-mono">{lease.count}x, totaal {eur(lease.total)}</span>
                    {!typeConfirmed ? (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => onConfirmType(lease, "operationeel")} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Operationeel
                        </button>
                        <button onClick={() => onConfirmType(lease, "financieel")} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Financieel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => onConfirmType(lease, "operationeel")}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${!isFinancieel ? "bg-teal-700 text-white border-teal-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                          >
                            Operationeel
                          </button>
                          <button
                            onClick={() => onConfirmType(lease, "financieel")}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${isFinancieel ? "bg-teal-700 text-white border-teal-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                          >
                            Financieel
                          </button>
                        </div>
                        {isFinancieel && (
                          isOnbekend ? (
                            <button onClick={() => onUnmarkUnknown(lease.key)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                              Toch invullen
                            </button>
                          ) : (
                            <>
                              <button onClick={() => (onOpenWizard || onOpenModal)(lease.key)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                {isCompleteFinancialLeaseDetails(details) ? "Gegevens bewerken" : segments.length > 0 ? "Verder invullen" : "Gegevens invullen"}
                              </button>
                              {isCompleteFinancialLeaseDetails(details) && onOpenWizard && (
                                <button onClick={() => onOpenWizard(lease.key, { nieuw: true })} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                  + Nieuw contract
                                </button>
                              )}
                              {onOpenWizard && (
                                <button onClick={() => onOpenModal(lease.key)} className="text-[11px] text-slate-400 underline decoration-dotted hover:text-slate-600">
                                  Alles op één scherm
                                </button>
                              )}
                              {!isCompleteFinancialLeaseDetails(details) && (
                                <button onClick={() => onMarkUnknown(lease.key)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50">
                                  Gegevens onbekend
                                </button>
                              )}
                            </>
                          )
                        )}
                      </>
                    )}
                  </div>
                  {onUndoMerge && benamingen.length > 0 && toonBenamingen[lease.key] && (
                    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-600 space-y-1.5">
                      <p className="font-semibold text-slate-700">Samengevoegde benamingen</p>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span>"{benamingen[0].targetName}" <span className="text-slate-400">(hoofdnaam)</span></span>
                      </div>
                      {benamingen.map((m) => (
                        <div key={m.sourceKey} className="flex items-center justify-between gap-2 flex-wrap">
                          <span>"{m.sourceName}"</span>
                          <button
                            onClick={() => onUndoMerge(m.sourceKey)}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Loskoppelen
                          </button>
                        </div>
                      ))}
                      <p className="text-slate-400">
                        Loskoppelen zet een benaming weer terug als losse, eigen lease in de lijst — eventueel al
                        ingevulde leasegegevens bij de hoofdnaam blijven ongewijzigd.
                      </p>
                    </div>
                  )}
                  {onMergeInto && leaseSummary.length > 1 && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-slate-400">Is dit eigenlijk hetzelfde contract als een andere lease hierboven?</label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) onMergeInto(lease.key, e.target.value);
                          e.target.value = "";
                        }}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="">Samenvoegen met…</option>
                        {[...leaseSummary.filter((l) => l.key !== lease.key)].sort((a, b) => String(a.name).localeCompare(String(b.name), "nl", { sensitivity: "base" })).map((l) => (
                          <option key={l.key} value={l.key}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {typeConfirmed && isFinancieel && !isOnbekend && onOpenWizard && (() => {
                    const afgelopen = detecteerAfgelopenZonderBesluit(lease, details);
                    return afgelopen ? (
                      <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                        Het laatste contract liep af op {afgelopen.eind} en er zijn geen nieuwe betalingen. Blijft het object in het bedrijf, of is het ingeleverd/verkocht?
                        <button onClick={() => onOpenWizard(lease.key, { contract: afgelopen.contract, stap: "verloop" })} className="rounded-lg bg-teal-700 text-white px-2 py-0.5 text-[11px] font-medium">Beantwoorden</button>
                      </p>
                    ) : null;
                  })()}
                  {typeConfirmed && isFinancieel && !isOnbekend && onOpenWizard && segments.length > 0 && (
                    <ContractTijdlijn segments={segments} onOpen={(idx) => onOpenWizard(lease.key, { contract: idx })} />
                  )}
                  {typeConfirmed && isFinancieel && !isOnbekend && onOpenWizard && (() => {
                    const nieuw = detecteerNieuwContract(lease, details);
                    return nieuw ? (
                      <p className="mt-2 text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                        Sinds {nieuw.vanaf} {nieuw.aantal} betalingen buiten het ingevulde contract — lijkt een nieuw contract.
                        <button onClick={() => onOpenWizard(lease.key, { nieuw: true })} className="rounded-lg bg-teal-700 text-white px-2 py-0.5 text-[11px] font-medium">Invullen</button>
                      </p>
                    ) : null;
                  })()}
                  {typeConfirmed && isFinancieel && (
                    isOnbekend ? (
                      <p className="mt-2 text-xs text-slate-400">Gegevens onbekend — deze lease wordt niet gesplitst.</p>
                    ) : amortization ? (
                      <>
                        <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                          Totaal tot nu toe: rente <strong>{eur(amortization.totaalRente)}</strong> · aflossing <strong>{eur(amortization.totaalAflossing)}</strong> · nog openstaand <strong>{eur(amortization.saldoNu)}</strong> — voor de aangifte: zie de uitsplitsing per jaar bij "Gegevens bewerken".
                        </p>
                        {amortization.renteNietBerekenbaar && (
                          <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                            ⚠ Voor (een deel van) dit contract kon het rentepercentage niet berekend worden — de ingevulde bedragen sluiten niet op elkaar aan. Het totaal hierboven is hierdoor onvolledig. Controleer de invoer bij "Gegevens bewerken".
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">Nog niet gesplitst — vul de aankoop- en leasestructuur in.</p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
