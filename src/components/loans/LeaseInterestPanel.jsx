import { useEffect, useState } from "react";
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
function ContractTijdlijn({ segments, onOpen, indices }) {
  const rijen = segments.map((sg, i) => {
    if (indices && !indices.includes(i)) return { i, sg, leeg: true };
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

// Welke groep ("auto" of "overig") hoort bij elk contract (index) van een lease? Een contract zonder soort
// volgt het vorige contract.
export function contractGroepen(segments) {
  const eersteMetSoort = segments.find((sg) => sg && sg.soort);
  let vorige = eersteMetSoort ? (eersteMetSoort.soort === "machine" ? "overig" : "auto") : "auto";
  return segments.map((sg) => {
    if (sg && sg.soort) vorige = sg.soort === "machine" ? "overig" : "auto";
    return vorige;
  });
}

function LeaseGroepPanel({
  titel, uitleg, defaultOpen = false, leaseSummary, leaseDetails, confirmedLeaseTypeKeys, onConfirmType, onOpenModal, onOpenWizard, onMarkUnknown, onUnmarkUnknown,
  onMergeInto, onUndoMerge, leaseMerges, onOpenHelp, onJump, openSignal, legeTekst, soort, alleLeases = [], groep = null, onAddManualLease, onRemoveManualLease,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [kiesLease, setKiesLease] = useState("");
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [open, setOpen] = useState(!!defaultOpen);
  const sectionRef = useOpenOnJump((v) => { setOpen(v); onJump?.(); });
  useEffect(() => { if (openSignal) setOpen(true); }, [openSignal]);
  // Per samengevoegde lease: zijn de bijbehorende benamingen uitgeklapt? (standaard dicht)
  const [toonBenamingen, setToonBenamingen] = useState({});
  const leeg = leaseSummary.length === 0;

  const incompleteCount = leaseSummary.filter((l) => {
    if (!confirmedLeaseTypeKeys.includes(l.key)) return true;
    if (leaseDetails[l.key]?.onbekend) return false;
    return l.category === "Lease (financieel)" && !isCompleteFinancialLeaseDetails(leaseDetails[l.key]);
  }).length;

  return (
    <section ref={sectionRef} className="rounded-xl border-2 border-slate-200 bg-white shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>{titel}</span>
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
          {onOpenWizard && (() => {
            const kandidaten = (alleLeases || []).filter((l) => l.category === "Lease (financieel)" || confirmedLeaseTypeKeys.includes(l.key));
            const ANDERS = "__anders__";
            const naam = kiesLease === ANDERS ? nieuweNaam.trim() : "";
            const kanDoorgaan = kiesLease && (kiesLease !== ANDERS || naam.length >= 2);
            const doorgaan = () => {
              let key = kiesLease;
              if (kiesLease === ANDERS) key = onAddManualLease?.(naam, groep);
              if (!key) return;
              onOpenWizard(key, { nieuw: true, soort });
              setFormOpen(false); setKiesLease(""); setNieuweNaam("");
            };
            const soortTekst = soort === "machine" ? "machine/ander middel" : "auto";
            return (
              <div className="mb-3 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs">
                {!formOpen ? (
                  <button onClick={() => setFormOpen(true)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
                    + Nieuw contract ({soortTekst})
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium text-slate-700">Bij welke leasemaatschappij hoort dit nieuwe contract?</p>
                    <select value={kiesLease} onChange={(e) => setKiesLease(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs max-w-full">
                      <option value="">Kies leasemaatschappij…</option>
                      {kandidaten.map((l) => <option key={l.key} value={l.key}>{l.name}{l.count ? "" : " (handmatig)"}</option>)}
                      <option value={ANDERS}>Andere leasemaatschappij (niet in de bankgegevens)…</option>
                    </select>
                    {kiesLease === ANDERS && (
                      <div>
                        <input value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} placeholder="Naam leasemaatschappij" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs w-64 max-w-full" />
                        <p className="mt-1 text-slate-500">Er zijn geen betalingen aan deze maatschappij gevonden in de geladen bankbestanden — mogelijk heeft de client die niet aangeleverd. Je kunt het contract wel invullen; de rente-uitsplitsing per betaling is dan niet mogelijk.</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button disabled={!kanDoorgaan} onClick={doorgaan} className="rounded-lg bg-teal-700 text-white px-2.5 py-1 text-xs font-medium disabled:opacity-40">Doorgaan</button>
                      <button onClick={() => { setFormOpen(false); setKiesLease(""); }} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600">Annuleren</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {leeg ? (
            <p className="text-xs text-slate-500">{legeTekst}</p>
          ) : (<>
          <p className="text-xs text-slate-500 mb-3">
            {uitleg}{" "}
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
              const groepVanContract = contractGroepen(segments);
              const gemengd = groep && new Set(groepVanContract).size > 1 && segments.some((sg) => sg?.soort);
              const idxHier = segments.map((_, i) => i).filter((i) => !gemengd || groepVanContract[i] === groep);
              const aantalHier = idxHier.length;
              const laatsteHier = segments[idxHier[idxHier.length - 1]];
              const isBeeindigd = segments.length > 0 && !!laatsteHier?.contractBeeindigd;
              // Samengevoegde benamingen van déze lease (bron → doel = deze lease).
              const benamingen = (leaseMerges || []).filter((m) => m.targetKey === lease.key);
              return (
                <div key={lease.key} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="flex-1 min-w-[8rem] truncate font-medium">{lease.name}</span>
                    {isBeeindigd && (
                      <span className="inline-flex items-center rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-medium">beëindigd</span>
                    )}
                    {(aantalHier > 1 || gemengd) && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-medium">{aantalHier} {aantalHier === 1 ? "contract" : "contracten"}{gemengd ? " in deze groep" : ""}</span>
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
                    {lease.handmatig ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium" title="Geen betalingen in de bankgegevens — handmatig toegevoegd">handmatig</span>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">{lease.count}x, totaal {eur(lease.total)}</span>
                    )}
                    {lease.handmatig && onRemoveManualLease && segments.length === 0 && (
                      <button onClick={() => onRemoveManualLease(lease.key)} className="text-[11px] text-slate-400 underline decoration-dotted hover:text-red-600">Verwijderen</button>
                    )}
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
                                <button onClick={() => onOpenWizard(lease.key, { nieuw: true, soort: groep === "overig" ? "machine" : "auto" })} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
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
                    <ContractTijdlijn segments={segments} indices={gemengd ? idxHier : null} onOpen={(idx) => onOpenWizard(lease.key, { contract: idx })} />
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
                          {gemengd ? "Hele lease (alle contracten): " : ""}Totaal tot nu toe: rente <strong>{eur(amortization.totaalRente)}</strong> · aflossing <strong>{eur(amortization.totaalAflossing)}</strong> · nog openstaand <strong>{eur(amortization.saldoNu)}</strong> — voor de aangifte: zie de uitsplitsing per jaar bij "Gegevens bewerken".
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
          </>)}
        </div>
      )}
    </section>
  );
}

// Splitst de leases in twee panelen: lease van een auto, en lease van machines/andere bedrijfsmiddelen.
// Een lease hoort bij "andere bedrijfsmiddelen" als zijn (laatste) contract als machine is ingevuld, of — zolang
// er nog niets is ingevuld — als de naam overeenkomt met een "ander leaseobject" uit de nieuw-dossier-wizard.
export function leaseGroepenVan(lease, details, overigeNamen = []) {
  const segs = getLeaseSegments(details).filter((sg) => sg && sg.soort);
  if (segs.length === 0 && lease.handmatig) return [lease.handmatigeGroep || "auto"];
  if (segs.length > 0) return [...new Set(segs.map((sg) => (sg.soort === "machine" ? "overig" : "auto")))];
  const tekst = (lease.transactions || []).map((t) => `${t.counterparty} ${t.description}`).join(" ").toLowerCase();
  const treft = overigeNamen.some((n) => { const k = String(n).trim().toLowerCase(); return k.length >= 3 && tekst.includes(k); });
  return [treft ? "overig" : "auto"];
}

const UITLEG = {
  auto: <>Lease van een <strong>auto</strong>. Bij <strong>operationele</strong> lease is de hele termijn aftrekbaar, geen verdere actie nodig. Bij <strong>financiële</strong> lease is alleen de rente in de termijn aftrekbaar; de auto wordt afgeschreven en kan bijtelling geven.</>,
  overig: <>Lease van <strong>machines of andere bedrijfsmiddelen</strong> (geen auto). Bij <strong>operationele</strong> lease is de hele termijn aftrekbaar. Bij <strong>financiële</strong> lease is alleen de rente aftrekbaar en wordt het object afgeschreven.</>,
};

export default function LeaseInterestPanel(props) {
  const { leaseSummary, leaseDetails, overigeLeaseNamen = [] } = props;
  const [openSignal, setOpenSignal] = useState(0);
  const auto = leaseSummary.filter((l) => leaseGroepenVan(l, leaseDetails[l.key], overigeLeaseNamen).includes("auto"));
  const overig = leaseSummary.filter((l) => leaseGroepenVan(l, leaseDetails[l.key], overigeLeaseNamen).includes("overig"));
  const gemeenschappelijk = { ...props, alleLeases: leaseSummary, onJump: () => setOpenSignal((n) => n + 1), openSignal };
  // Eén van de twee leeg: alleen het andere paneel tonen; defaultOpen blijft zoals de kaart het bepaalt.
  return (
    <div className="space-y-3">
      <LeaseGroepPanel {...gemeenschappelijk} soort="auto" groep="auto" titel="Lease (financieel) — auto" uitleg={UITLEG.auto} leaseSummary={auto} legeTekst="Geen autolease gevonden in de bankgegevens." />
      <LeaseGroepPanel {...gemeenschappelijk} soort="machine" groep="overig" titel="Lease (financieel) — andere middelen (machines)" uitleg={UITLEG.overig} leaseSummary={overig} legeTekst="Geen lease van machines of andere bedrijfsmiddelen gevonden. Leases komen uit je bankgegevens: zodra betalingen aan de leasemaatschappij in de bankbestanden staan verschijnt de lease hier (bij een nieuw dossier helpt de naam uit de basisvragen om hem hier te plaatsen). Gebruikt de lease een andere maatschappij dan bij de auto, laad dan ook die bankbetalingen." />
    </div>
  );
}
