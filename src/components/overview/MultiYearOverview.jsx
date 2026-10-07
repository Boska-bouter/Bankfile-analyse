import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { eurTight } from "../../utils/amounts.js";
import { estimateIncomeTax, estimateZvw } from "../../tax/incomeTax.js";
import HelpHint from "../shared/HelpHint.jsx";
import KwartaalUitgavenModal from "../btw/KwartaalUitgavenModal.jsx";
import { metBolletjes } from "../shared/StatusDot.jsx";

// Kolomvolgorde volgt bewust dezelfde opbouw/logica als het Aangiftevoorstel (zie
// src/reports/aangiftevoorstel.js): eerst het bruto zakelijk inkomen, dan de BTW eraf naar netto
// omzet, dan de zakelijke kosten (ook netto), dan voorbelasting, dan de resulterende winst (WUO,
// netto) — en pas daarna wat er naar privé is gegaan, wat er nog aan BTW/IB/Zvw openstaat, en het
// resultaat (Tekort/Over). Zo is elke kolom een stap in dezelfde optelsom terug te vinden in het
// Aangiftevoorstel, in plaats van een los verzameld cijfer.
export default function MultiYearOverview({
  years, yearlySummaries, yearlyOpenOB, korRegeling, onYearClick, ibStatus, setIbGedaan,
  zvwStatus, setZvwGedaan, volledigeJaren, businessAdvies, activeYear, onOpenHelp, costBreakdownByYear,
  kostenTotaalByYear, yearlyProgress,
}) {
  // v273 — dit paneel toont nu alleen nog in de Meerjarenoverzicht-pop-up (het permanente inline
  // blok is in v270 verwijderd); de gebruiker hoeft de inhoud dan niet nog eens apart open te
  // klikken, dus standaard uitgeklapt i.p.v. dichtgeklapt.
  const [open, setOpen] = useState(true);
  const [voorbelastingModalYear, setVoorbelastingModalYear] = useState(null);
  if (years.length === 0) return null;

  // v258 — punt 10 uit de ChatGPT-aanbevelingen: het meerjarenoverzicht toonde per jaar cijfers
  // zonder te laten zien hoe zeker die zijn. Hergebruikt bewust dezelfde yearlyProgress-status als
  // de "Dossierstatus"-kaart (v255) — dus dit bolletje gaat over dossiercontrole, niet over of de
  // aangifte al is ingediend: een jaar met een ingediende maar niet-gecontroleerde aangifte is 🟠.
  const statusDotFor = (year) => {
    const p = yearlyProgress?.[year];
    if (!p) return { dot: "⚪", title: "Geen controle-informatie beschikbaar voor dit jaar" };
    const parts = [];
    if (p.gatDitJaar) parts.push("gat in bestandscontinuïteit");
    if (p.openPunten) parts.push(`${p.openPunten} open controlepunt${p.openPunten === 1 ? "" : "en"}`);
    if (p.onzekerDitJaar) parts.push(`${p.onzekerDitJaar} onzekere transactie${p.onzekerDitJaar === 1 ? "" : "s"}`);
    if (p.aannamesCount) parts.push(`${p.aannamesCount} aanname${p.aannamesCount === 1 ? "" : "n"} in de indicatieve aangifte`);
    const dot = p.status === "rood" ? "🔴" : p.status === "groen" ? "🟢" : "🟠";
    const title = parts.length ? `Dossiercontrole: ${parts.join(", ")}` : "Dossiercontrole compleet, geen onzekerheden";
    return { dot, title };
  };

  const effectiefFor = (year) => {
    const summary = yearlySummaries[year];
    if (!summary) return null;
    const openOB = yearlyOpenOB[year] || 0;
    const ibEstimate = estimateIncomeTax(summary.winst, year);
    const zvwEstimate = estimateZvw(summary.winst, year);
    const ibGedaan = !!ibStatus[year]?.gedaan;
    const zvwGedaan = !!zvwStatus[year]?.gedaan;
    const ibBelastingEffectief = ibEstimate.belasting + zvwEstimate.bijdrage;
    const priUitgegevenIsAanname = summary.priUitgegeven === 0 && summary.uitkeringenAanPrive > 0;
    // v249 — persoonlijkVanZakelijkeRekening (opnames voor "Persoonlijk & vertrouwelijk" vanaf de
    // zakelijke rekening — zie yearlySummary.js) telt hier altijd extra mee, ongeacht welke van de
    // twee (priUitgegeven/uitkeringenAanPrive) als basis dient — zelfde correctie als in
    // computeBusinessAdvies, anders verdwijnt dit bedrag zodra priUitgegeven > 0 is.
    const effectievePriveUitgegeven =
      (summary.priUitgegeven > 0 ? summary.priUitgegeven : summary.uitkeringenAanPrive) + (summary.persoonlijkVanZakelijkeRekening || 0);
    const verschil = summary.winst - effectievePriveUitgegeven - (korRegeling ? 0 : openOB) - ibBelastingEffectief;
    return { summary, openOB, ibEstimate, zvwEstimate, ibGedaan, zvwGedaan, priUitgegevenIsAanname, effectievePriveUitgegeven, verschil };
  };

  return (
    <section className="rounded-xl border-2 border-slate-200 bg-white shadow-sm">
      {/* v253 — <div role="button"> i.p.v. <button>: HelpHint hieronder is zelf ook een button. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        className="w-full flex items-center justify-between p-4 text-sm font-semibold cursor-pointer"
      >
        <span className="flex items-center gap-2">
          {years.length > 1 ? `Meerjarenoverzicht (${years.length} jaar)` : "Jaaroverzicht — is dit rendabel?"}
          {onOpenHelp && <HelpHint chapter="jaaroverzicht" onOpen={onOpenHelp} />}
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </div>
      {businessAdvies && (
        <div
          className={`mx-4 mb-3 rounded-lg border px-3 py-2 text-xs ${
            businessAdvies.niveau === "negatief" ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {businessAdvies.tekst} <span className="opacity-70">(indicatief, {activeYear} — geen financieel advies)</span>
        </div>
      )}
      {open && (
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="text-center font-medium py-2 pr-2" title="Dossiercontrole voor dit jaar — zelfde status als de 'Dossierstatus'-kaart">Status</th>
                <th className="text-left font-medium py-2 pr-3">Jaar</th>
                <th className="text-right font-medium py-2 px-3" title="Bruto, zoals op de bank binnengekomen (incl. BTW)">Zakelijk inkomen</th>
                <th className="text-right font-medium py-2 px-3">BTW-afdracht</th>
                <th className="text-right font-medium py-2 px-3" title="Zakelijk inkomen minus BTW-afdracht — zelfde bedrag als 'Opbrengsten' in de indicatieve aangifteberekening">Netto omzet</th>
                <th className="text-right font-medium py-2 px-3" title="Zakelijke kosten, netto (excl. BTW) — zelfde bedrag als in de indicatieve aangifteberekening">Zakelijke kosten</th>
                <th className="text-right font-medium py-2 px-3">Voorbelasting</th>
                <th className="text-right font-medium py-2 px-3" title="Netto omzet min zakelijke kosten min aftrekbare rente — zelfde bedrag als 'Resultaat uit onderneming' in de indicatieve aangifteberekening">WUO (netto)</th>
                <th className="text-right font-medium py-2 px-3">Overboeking naar privé</th>
                <th className="text-right font-medium py-2 px-3">Privé uitgaven</th>
                {!korRegeling && <th className="text-right font-medium py-2 px-3">Te betalen BTW</th>}
                <th
                  className="text-right font-medium py-2 px-3"
                  title="Grove basisindicatie over de winst — zonder zelfstandigenaftrek, startersaftrek of heffingskortingen. Zie de Indicatieve aangifteberekening voor de uitgebreidere berekening met de persoonlijke fiscale aannames."
                >
                  Basisindicatie IB/IH*
                </th>
                <th
                  className="text-right font-medium py-2 px-3"
                  title="Grove basisindicatie over de winst — zonder zelfstandigenaftrek of startersaftrek. Zie de Indicatieve aangifteberekening voor de uitgebreidere berekening met de persoonlijke fiscale aannames."
                >
                  Basisindicatie Zvw*
                </th>
                <th className="text-right font-medium py-2 px-3" title="Wat daadwerkelijk vanaf de zakelijke rekening is afgedragen aan IB/IH en Zvw dit jaar">Al betaald ZVW/IH</th>
                <th className="text-left font-medium py-2 px-3" title="Alleen een statusherinnering — heeft geen invloed op het getoonde bedrag">Status IB/IH</th>
                <th className="text-left font-medium py-2 px-3" title="Alleen een statusherinnering — heeft geen invloed op het getoonde bedrag">Status Zvw</th>
                <th className="text-right font-medium py-2 pl-3">Tekort / Over</th>
                <th className="text-right font-medium py-2 pl-3">Trend t.o.v. vorig jaar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {years.map((year) => {
                const d = effectiefFor(year);
                if (!d) return null;
                const { summary, openOB, ibEstimate, zvwEstimate, ibGedaan, zvwGedaan, priUitgegevenIsAanname, effectievePriveUitgegeven, verschil } = d;
                const isTekort = verschil < 0;
                const prev = effectiefFor(year - 1);
                const beideJarenVolledig = volledigeJaren.has(year) && volledigeJaren.has(year - 1);
                let trendDelta = null;
                if (prev && beideJarenVolledig) trendDelta = verschil - prev.verschil;

                const { dot, title } = statusDotFor(year);

                return (
                  <tr key={year} className="hover:bg-slate-50 cursor-pointer" onClick={() => onYearClick(year)}>
                    <td className="py-2 pr-2 text-center" title={title}>{metBolletjes(dot)}</td>
                    <td className="py-2 pr-3 font-medium">{year}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">{eurTight(summary.zakelijkeInkomsten)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">-{eurTight(summary.verschuldigdBtw)}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{eurTight(summary.zakelijkeInkomstenNetto)}</td>
                    <td className="py-2 px-3 text-right font-mono text-rose-700 whitespace-nowrap">-{eurTight(kostenTotaalByYear?.[year] ?? summary.zakelijkeKostenNetto)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); setVoorbelastingModalYear(year); }}
                        className="underline decoration-dotted hover:decoration-solid hover:text-slate-700"
                        title="Klik voor de uitsplitsing naar categorie"
                      >
                        {eurTight(summary.voorbelasting)}
                      </button>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{eurTight(summary.winst)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{eurTight(summary.uitkeringenAanPrive)}</td>
                    <td className="py-2 px-3 text-right font-mono text-rose-700 whitespace-nowrap">
                      {eurTight(effectievePriveUitgegeven)}{priUitgegevenIsAanname ? "*" : ""}
                    </td>
                    {!korRegeling && (
                      <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{openOB >= 0 ? "-" : "+"}{eurTight(Math.abs(openOB))}</td>
                    )}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span className="font-mono text-slate-500">-{eurTight(ibEstimate.belasting)}{ibEstimate.geëxtrapoleerd ? "*" : ""}</span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span className="font-mono text-slate-500" title={zvwEstimate.gemaximeerd ? "Bijdrage-inkomen is gemaximeerd op het wettelijk maximum voor dit jaar" : undefined}>
                        -{eurTight(zvwEstimate.bijdrage)}{zvwEstimate.geëxtrapoleerd ? "*" : ""}{zvwEstimate.gemaximeerd ? " (max.)" : ""}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">{eurTight(summary.alBetaaldeZvwIh)}</td>
                    <td className="py-2 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600" title="Alleen een statusherinnering voor jezelf/de cliënt — verandert het getoonde bedrag niet">
                        <input type="checkbox" checked={ibGedaan} onChange={(e) => setIbGedaan(year, e.target.checked)} />
                        Al gedaan
                      </label>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600" title="Alleen een statusherinnering voor jezelf/de cliënt — verandert het getoonde bedrag niet">
                        <input type="checkbox" checked={zvwGedaan} onChange={(e) => setZvwGedaan(year, e.target.checked)} />
                        Al gedaan
                      </label>
                    </td>
                    <td className={`py-2 pl-3 text-right font-mono font-medium whitespace-nowrap ${isTekort ? "text-rose-700" : "text-emerald-700"}`}>
                      {isTekort ? "Tekort: " : "Over: "}{eurTight(Math.abs(verschil))}
                    </td>
                    <td className="py-2 pl-3 text-right whitespace-nowrap">
                      {!prev ? (
                        <span className="text-slate-300">—</span>
                      ) : !beideJarenVolledig ? (
                        <span className="text-slate-400 text-[10px]">— (jaar niet compleet)</span>
                      ) : Math.abs(trendDelta) < 1 ? (
                        <span className="text-slate-500">≈ gelijk aan vorig jaar</span>
                      ) : trendDelta > 0 ? (
                        <span className="text-emerald-700">▲ {eurTight(trendDelta)} beter</span>
                      ) : (
                        <span className="text-rose-700">▼ {eurTight(Math.abs(trendDelta))} slechter</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">Klik op een jaar om ernaartoe te springen.</p>
          <p className="mt-1 text-xs text-slate-400">
            * Grove <strong>basisindicaties</strong> van de inkomstenbelasting en de inkomensafhankelijke bijdrage
            Zorgverzekeringswet (Zvw) over de winst — zonder zelfstandigenaftrek, startersaftrek, heffingskortingen of
            overig inkomen. Geen belastingadvies. Zie de "Indicatieve aangifteberekening" verderop voor de
            uitgebreidere berekening mét deze persoonlijke fiscale aannames — die kan hierdoor een ander bedrag laten
            zien dan deze basisindicatie. WUO sluit onttrekkingen (privé-overmakingen, ZVW/IH) bewust uit — vergelijk
            de geschatte bedragen met de kolom "Al betaald ZVW/IH" hiernaast voor wat daadwerkelijk al is afgedragen.
          </p>
        </div>
      )}
      {voorbelastingModalYear && (
        <KwartaalUitgavenModal
          titel={`Voorbelasting — ${voorbelastingModalYear}`}
          categorieen={costBreakdownByYear?.[voorbelastingModalYear] || []}
          veld="btw"
          onClose={() => setVoorbelastingModalYear(null)}
        />
      )}
    </section>
  );
}
