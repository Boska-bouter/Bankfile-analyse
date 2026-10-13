import { useState } from "react";
import { eur } from "../../utils/amounts.js";
import { leaseMatchtNaam } from "../../hooks/useLeaseWizardOpening.jsx";

// release21V6 — wizard-scherm 37 "Lease-controle": direct na het laden van bankbestanden laten zien
// welke leasebetalingen de app gevonden heeft, en dat laten bevestigen. Werkt met én zonder een in de
// wizard opgegeven leasemaatschappij:
//  - per gevonden lease: financieel / operationeel / geen lease (voorgekozen op basis van de wizard);
//  - "Horen deze bij elkaar?" voor gelijkende tegenpartijen;
//  - opgegeven lease niet gevonden: kies de juiste vaste maandbetaling, of "niet in deze bestanden";
//  - lease gevonden terwijl in de wizard "geen lease" is gekozen: expliciet benoemd.
// Alle keuzes worden pas bij "Doorgaan" vastgelegd, via dezelfde acties als op de kaart Bedrijfsmiddelen.

const KNOP = "rounded-lg px-2.5 py-1 text-xs font-medium border";
const KNOP_UIT = "border-slate-300 text-slate-600 hover:bg-slate-50";
const KNOP_AAN = "bg-teal-700 text-white border-teal-700";
const PRIMAIR = "rounded-lg px-4 py-2 text-sm font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40";

const datum = (d) => new Date(d).toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
const namenVan = (i) => [i?.naam, ...(Array.isArray(i?.aliassen) ? i.aliassen : [])].filter(Boolean);

function samenvatting(lease) {
  const betaald = (lease.transactions || []).filter((t) => t.amount < 0);
  const txs = betaald.length ? betaald : lease.transactions || [];
  if (txs.length === 0) return "";
  const gem = Math.abs(txs.reduce((a, t) => a + t.amount, 0) / txs.length);
  return `${txs.length}× · ${datum(txs[0].date)} – ${datum(txs[txs.length - 1].date)} · gem. ${eur(gem)}`;
}

export default function LeaseControleScherm({ controle, goNext }) {
  const { leases, verwachte, autoSoort, wizardZeiGeenLease, mergeGroepen, kandidaten, confirmedLeaseTypeKeys } = controle;

  // Welke opgegeven naam (uit de wizard) hoort bij deze lease?
  const opgegevenBij = (lease) => verwachte.find((v) => namenVan(v).some((n) => leaseMatchtNaam(lease, n)));
  const zonderNaam = verwachte.filter((v) => namenVan(v).length === 0);
  const nietGevonden = verwachte.filter((v) => namenVan(v).length > 0 && !v.gevonden && !leases.some((l) => namenVan(v).some((n) => leaseMatchtNaam(l, n))));
  // Opgegeven zonder naam en er is helemaal niets gevonden: ook dan de keuzelijst tonen.
  const zonderNaamNietGevonden = leases.length === 0 ? zonderNaam : [];
  const teZoeken = [...nietGevonden, ...zonderNaamNietGevonden];

  const voorkeuze = (lease) => {
    if (confirmedLeaseTypeKeys.includes(lease.key)) return lease.category === "Lease (financieel)" ? "financieel" : "operationeel";
    if (opgegevenBij(lease)) return "financieel";
    const onbevestigd = leases.filter((l) => !confirmedLeaseTypeKeys.includes(l.key));
    if (onbevestigd.length === 1 && (autoSoort === "financial" || zonderNaam.length > 0)) return "financieel";
    if (onbevestigd.length === 1 && autoSoort === "operational") return "operationeel";
    return null;
  };
  const [keuze, setKeuze] = useState(() => Object.fromEntries(leases.map((l) => [l.key, voorkeuze(l)])));
  const [samen, setSamen] = useState({}); // groepsleutel → true/false
  const [aanwijzing, setAanwijzing] = useState({}); // verwacht-sleutel → kandidaat-index | "later"
  const [nuInvullen, setNuInvullen] = useState(true);

  const groepKey = (g) => g.map((l) => l.key).join("+");
  const verwachtKey = (v) => `${v.lijst}-${v.idx}`;
  const klaar =
    leases.every((l) => keuze[l.key]) &&
    mergeGroepen.every((g) => samen[groepKey(g)] != null) &&
    teZoeken.every((v) => aanwijzing[verwachtKey(v)] != null);
  const ietsFinancieel = Object.values(keuze).includes("financieel") || Object.values(aanwijzing).some((a) => a !== "later" && a != null);

  const doorgaan = () => {
    controle.onToepassen({
      keuzes: leases.map((l) => ({ lease: l, type: keuze[l.key] })),
      samenvoegen: mergeGroepen.filter((g) => samen[groepKey(g)]).flatMap((g) => g.slice(1).map((l) => [l.key, g[0].key])),
      aanwijzingen: teZoeken
        .filter((v) => typeof aanwijzing[verwachtKey(v)] === "number")
        .map((v) => ({ verwacht: v, kandidaat: kandidaten[aanwijzing[verwachtKey(v)]] })),
      // Opgegeven zonder naam: koppel aan de eerste als financieel bevestigde lease die nog bij geen naam hoort.
      naamloosKoppelen: zonderNaam.length > 0
        ? leases.filter((l) => keuze[l.key] === "financieel" && !opgegevenBij(l)).slice(0, zonderNaam.length).map((l, i) => ({ verwacht: zonderNaam[i], lease: l }))
        : [],
      nuInvullen: nuInvullen && ietsFinancieel,
    });
    goNext();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {leases.length > 0
          ? "Dit zijn de leasebetalingen die ik in de bankbestanden vond. Klopt de indeling?"
          : "Ik heb in de bankbestanden geen leasebetalingen herkend."}
      </p>

      {wizardZeiGeenLease && leases.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Je gaf in de basisvragen aan dat er geen lease is, maar ik vond wel betalingen die op lease lijken. Geef hieronder per regel aan wat het is.
        </p>
      )}

      {leases.map((l) => {
        const opg = opgegevenBij(l);
        return (
          <div key={l.key} className="rounded-lg border border-slate-200 p-3 space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">{l.name}</p>
              <p className="text-xs text-slate-500">{samenvatting(l)}</p>
              {opg && <p className="text-xs text-emerald-700 mt-0.5">Komt overeen met je opgave: {namenVan(opg).join(" / ")}</p>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[["financieel", "Financiële lease"], ["operationeel", "Operationele lease"], ["geen", "Geen lease"]].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setKeuze((p) => ({ ...p, [l.key]: k }))} className={`${KNOP} ${keuze[l.key] === k ? KNOP_AAN : KNOP_UIT}`}>{label}</button>
              ))}
            </div>
          </div>
        );
      })}

      {mergeGroepen.map((g) => (
        <div key={groepKey(g)} className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
          <p className="text-xs text-blue-900">
            <strong>Horen deze bij elkaar?</strong> {g.map((l) => `"${l.name}"`).join(" en ")} lijken op dezelfde maatschappij te wijzen —
            mogelijk hetzelfde contract (bijv. een losse factuur naast de vaste incasso).
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setSamen((p) => ({ ...p, [groepKey(g)]: true }))} className={`${KNOP} ${samen[groepKey(g)] === true ? KNOP_AAN : KNOP_UIT}`}>Ja, samen één contract</button>
            <button type="button" onClick={() => setSamen((p) => ({ ...p, [groepKey(g)]: false }))} className={`${KNOP} ${samen[groepKey(g)] === false ? KNOP_AAN : KNOP_UIT}`}>Nee, apart</button>
          </div>
        </div>
      ))}

      {teZoeken.map((v) => {
        const k = verwachtKey(v);
        const naam = namenVan(v).join(" / ");
        return (
          <div key={k} className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
            <p className="text-xs text-amber-900">
              <strong>Niet gevonden:</strong> je gaf {v.lijst === "overig" ? "een ander leaseobject" : "een leaseauto"} op{naam ? ` bij "${naam}"` : ""}, maar ik zie daar geen betalingen voor.
              {kandidaten.length > 0 ? " Staat de lease hieronder bij de vaste maandelijkse betalingen?" : ""}
            </p>
            {kandidaten.length > 0 && (
              <ul className="max-h-48 overflow-y-auto space-y-1">
                {kandidaten.map((c, i) => (
                  <li key={c.key}>
                    <button type="button" onClick={() => setAanwijzing((p) => ({ ...p, [k]: i }))}
                      className={`w-full text-left rounded-lg border px-2.5 py-1.5 text-xs ${aanwijzing[k] === i ? "border-teal-700 bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                      <span className="font-medium text-slate-800">{c.name}</span>
                      <span className="text-slate-500"> · {c.count}× · gem. {eur(Math.abs(c.gem))} · nu: {c.category}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setAanwijzing((p) => ({ ...p, [k]: "later" }))} className={`${KNOP} ${aanwijzing[k] === "later" ? KNOP_AAN : KNOP_UIT}`}>
              Staat niet in deze bestanden — later
            </button>
          </div>
        );
      })}

      {ietsFinancieel && (
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={nuInvullen} onChange={(e) => setNuInvullen(e.target.checked)} className="mt-0.5" />
          <span>Na de wizard meteen de contractgegevens invullen (koopprijs, looptijd, maandbedrag). Anders blijft het als open punt staan bij Controleren → Bedrijfsmiddelen.</span>
        </label>
      )}

      <button type="button" disabled={!klaar} onClick={doorgaan} className={PRIMAIR}>Doorgaan</button>
    </div>
  );
}
