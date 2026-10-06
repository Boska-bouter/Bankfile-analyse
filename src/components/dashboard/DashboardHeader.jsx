import { useState } from "react";
import ProgressGauge from "./ProgressGauge.jsx";
import ConcentricGauge from "./ConcentricGauge.jsx";

// Kop van het Overzicht-tabblad (fase 1 van de dashboard-restyling) — titel + subtitel links,
// een statuskaart met ringmeter + statusregels rechts. Vervangt de losse "Dossierstatus {jaar}"-
// kaart die voorheen tussen de andere dashboardCards stond: dezelfde data (yearProgress), nu
// prominenter bovenaan i.p.v. als gelijkwaardige tegel tussen de rest.
export default function DashboardHeader({
  title, subtitle, pct: pctIn, gaugeLabel, statusLines, accent = "#0F766E", yearControl,
  werkelijkAangifteDone, werkelijkAangifteTotal, werkelijkAangifteItems: werkelijkItems, onOpenAangifteItem, openPoints, openBreakdown, yearRing,
}) {
  const [toonAangiftes, setToonAangiftes] = useState(false);
  // V59 — 100% mag nooit getoond worden zolang er open punten zijn (afronding of een andere telbron dan de badges).
  const pct = pctIn != null && openPoints != null && openPoints > 0 ? Math.min(pctIn, 99) : pctIn;
  // v305 (V27) — "Dossiercontrole" toont als hoofdinformatie het aantal CONCRETE open punten (zie
  // openPointsOf in App.jsx), het percentage is secundair: "87%" zegt een professional niet wát er
  // nog moet gebeuren, "4 open punten · 3 controle · 1 instelling" wel. De losse statusregel
  // "Dossiercontrole: Compleet/Nog niet compleet" rechts is daarom vervallen: naast "25 open punten"
  // zou "Compleet" elkaar tegenspreken.
  // v298 — op verzoek: de eerdere waarschuwingsregel ("Dossiercontrole ≠ aangifte gedaan") stond
  // ónder dezelfde kaart als de ring, en voegde daardoor volgens de gebruiker zelf niet genoeg toe
  // ("erg onduidelijk"). In plaats van een tekstregel toe te voegen die uitlegt dat de twee dingen
  // los staan, staan ze nu ook visueel volledig los: twee aparte kaarten naast elkaar. De linker
  // kaart ("Dossiercontrole") bevat alleen nog de ring + de administratieve regels (Dossiercontrole/
  // Indicatieve aangifte); "Werkelijke aangifte" — is de aangifte zelf al gedaan? — heeft nu zijn
  // eigen kaart ernaast, met een eigen kop en een gekleurde stip die direct laat zien of dat nog
  // moet gebeuren, los van hoe vol de ring links staat. statusLines wordt hier gefilterd zodat een
  // eventuele "Werkelijke aangifte"-regel daarin (uit dashboardCards "yearStatus") niet dubbel
  // verschijnt naast de nieuwe rechterkaart.
  const dossierLines = (statusLines || []).filter(
    (l) => l.label !== "Werkelijke aangifte" && !(openPoints != null && l.label === "Dossiercontrole")
  );
  const heeftOpenPunten = openPoints != null && openPoints > 0;
  const werkelijkTotal = werkelijkAangifteTotal ?? 0;
  const werkelijkDone = werkelijkAangifteDone ?? 0;
  const werkelijkFrac = werkelijkTotal > 0 ? werkelijkDone / werkelijkTotal : 0;
  const werkelijkDot =
    pct == null ? null : werkelijkTotal === 0 ? "⚪" : werkelijkFrac === 0 ? "🔴" : werkelijkFrac < 0.5 ? "🟠" : werkelijkFrac < 1 ? "🟡" : "🟢";
  const werkelijkTekst =
    pct == null ? "nog geen data" : werkelijkTotal === 0 ? "Niet van toepassing" : `${werkelijkDone} van ${werkelijkTotal} gedaan`;
  return (
    <div className="flex flex-col 2xl:flex-row 2xl:items-start 2xl:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "inherit" }}>
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {/* v272 — deze statuskaart stond volledig verborgen zolang er geen data was (pct/statusLines
            allebei leeg); op verzoek toont hij nu altijd het standaard-dashboard, met een neutrale
            leeg-status i.p.v. helemaal te verdwijnen. */}
        <div className="flex items-center gap-5 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm shrink-0">
          {pct != null ? (
            yearRing ? (
              <div className="flex items-center gap-3">
                <ConcentricGauge outerPct={pct} innerPct={yearRing.pct} outerColor={accent} />
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">Dossiercontrole</span>
                  <div className="flex items-start gap-1.5">
                    <span className="mt-1 rounded-full shrink-0" style={{ background: accent, width: 8, height: 8 }} />
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs text-slate-500">Hele dossier · <strong className="text-slate-800">{pct}%</strong></span>
                      <span className={`text-sm font-bold ${heeftOpenPunten ? "text-slate-900" : "text-emerald-700"}`}>
                        {heeftOpenPunten ? `${openPoints} open punt${openPoints === 1 ? "" : "en"}` : "Alles afgehandeld"}
                      </span>
                      {heeftOpenPunten && openBreakdown && <span className="text-[10.5px] text-slate-400">{openBreakdown}</span>}
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="mt-1 rounded-full shrink-0" style={{ background: "#2563EB", width: 8, height: 8 }} />
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs text-slate-500">{yearRing.jaar} · <strong className="text-slate-800">{yearRing.pct}%</strong></span>
                      <span className={`text-sm font-bold ${yearRing.open > 0 ? "text-slate-900" : "text-emerald-700"}`}>
                        {yearRing.open > 0 ? `${yearRing.open} open punt${yearRing.open === 1 ? "" : "en"}` : "Dit jaar afgehandeld"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
            <div className="flex items-center gap-2.5">
              <ProgressGauge pct={pct} accent={accent} label={gaugeLabel ?? `${pct}%`} />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">Dossiercontrole <span className="font-normal text-slate-400">· hele dossier</span></span>
                {openPoints != null ? (
                  <>
                    <span className={`text-sm font-bold ${heeftOpenPunten ? "text-slate-900" : "text-emerald-700"}`}>
                      {heeftOpenPunten ? `${openPoints} open punt${openPoints === 1 ? "" : "en"}` : "Alles afgehandeld"}
                    </span>
                    <span className="text-[10.5px] text-slate-400">{heeftOpenPunten && openBreakdown ? openBreakdown : `${pct}% verwerkt`}</span>
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400">{pct >= 100 ? "gegevens compleet" : "gegevens nog niet compleet"}</span>
                )}
              </div>
            </div>
            )
          ) : (
            <div className="flex items-center gap-2.5">
              <ProgressGauge pct={0} accent="#CBD5E1" label="–" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">Dossiercontrole</span>
                <span className="text-[11px] text-slate-400">nog geen data</span>
              </div>
            </div>
          )}
          {dossierLines.length > 0 ? (
            <>
              <div className="w-px self-stretch bg-slate-200" />
              <div className="flex flex-col gap-1.5">
                {dossierLines.map((line) => (
                  <div key={line.label} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 w-[120px] shrink-0">{line.label}</span>
                    <span className="font-semibold text-slate-800">{line.value}</span>
                  </div>
                ))}
                {yearControl && <div className="mt-2">{yearControl}</div>}
              </div>
            </>
          ) : (
            <>
              <div className="w-px self-stretch bg-slate-200" />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 italic">Start een nieuw dossier (links) om te beginnen</span>
                </div>
                {yearControl}
              </div>
            </>
          )}
          {/* V81 — "Werkelijke aangifte" staat als derde kolom in dezelfde kaart (zelfde kleurstelling als de rest),
              blijft inhoudelijk los van de Dossiercontrole: eigen kop, eigen stip. */}
          <div className="w-px self-stretch bg-slate-200" />
          <div className="relative flex flex-col justify-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => (werkelijkItems?.length ? setToonAangiftes((v) => !v) : null)}
              className={`flex flex-col items-start gap-1 text-left ${werkelijkItems?.length ? "cursor-pointer" : "cursor-default"}`}
              title={werkelijkItems?.length ? "Klik om te zien welke aangiftes nog open staan" : undefined}
            >
              <span className="text-xs font-semibold text-slate-800">Werkelijke aangifte</span>
              <span className="flex items-center gap-2">
                {werkelijkDot && <span className="text-sm leading-none">{werkelijkDot}</span>}
                <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">{werkelijkTekst}</span>
                {werkelijkItems?.length > 0 && <span className="text-[11px] text-teal-700 underline">welke?</span>}
              </span>
            </button>
            {toonAangiftes && werkelijkItems?.length > 0 && (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Aangiftes dit jaar</p>
                <ul className="space-y-1">
                  {[...werkelijkItems].sort((a, b) => Number(a.done) - Number(b.done)).map((it, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => { setToonAangiftes(false); onOpenAangifteItem?.(it.doel); }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-[12.5px] hover:bg-slate-50"
                      >
                        <span className={it.done ? "text-slate-500" : "font-semibold text-slate-900"}>
                          {it.done ? "✓" : "○"} {it.label}
                        </span>
                        <span className={`text-[11.5px] ${it.done ? "text-emerald-700" : "text-slate-500"}`}>{it.detail} →</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
