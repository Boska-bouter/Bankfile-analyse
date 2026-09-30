import ProgressGauge from "./ProgressGauge.jsx";

// Kop van het Overzicht-tabblad (fase 1 van de dashboard-restyling) — titel + subtitel links,
// een statuskaart met ringmeter + statusregels rechts. Vervangt de losse "Dossierstatus {jaar}"-
// kaart die voorheen tussen de andere dashboardCards stond: dezelfde data (yearProgress), nu
// prominenter bovenaan i.p.v. als gelijkwaardige tegel tussen de rest.
export default function DashboardHeader({
  title, subtitle, pct, gaugeLabel, statusLines, accent = "#0F766E", yearControl,
  werkelijkAangifteDone, werkelijkAangifteTotal,
}) {
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
  const dossierLines = (statusLines || []).filter((l) => l.label !== "Werkelijke aangifte");
  const werkelijkTotal = werkelijkAangifteTotal ?? 0;
  const werkelijkDone = werkelijkAangifteDone ?? 0;
  const werkelijkFrac = werkelijkTotal > 0 ? werkelijkDone / werkelijkTotal : 0;
  const werkelijkDot =
    pct == null ? null : werkelijkTotal === 0 ? "⚪" : werkelijkFrac === 0 ? "🔴" : werkelijkFrac < 0.5 ? "🟠" : werkelijkFrac < 1 ? "🟡" : "🟢";
  const werkelijkTekst =
    pct == null ? "nog geen data" : werkelijkTotal === 0 ? "Niet van toepassing" : `${werkelijkDone} van ${werkelijkTotal} gedaan`;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "inherit" }}>
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-start gap-3 shrink-0">
        {/* v272 — deze statuskaart stond volledig verborgen zolang er geen data was (pct/statusLines
            allebei leeg); op verzoek toont hij nu altijd het standaard-dashboard, met een neutrale
            leeg-status i.p.v. helemaal te verdwijnen. */}
        <div className="flex items-center gap-5 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm shrink-0">
          {pct != null ? (
            <div className="flex items-center gap-2.5">
              <ProgressGauge pct={pct} accent={accent} label={gaugeLabel ?? `${pct}%`} />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">Dossiercontrole</span>
                <span className="text-[11px] text-slate-400">{pct >= 100 ? "gegevens compleet" : "gegevens nog niet compleet"}</span>
              </div>
            </div>
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
              </div>
            </>
          ) : (
            <>
              <div className="w-px self-stretch bg-slate-200" />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 italic">Laad een bankbestand om te beginnen</span>
                </div>
              </div>
            </>
          )}
        </div>
        {/* v298 — eigen, losstaande kaart voor "Werkelijke aangifte" (is de aangifte zelf al bij de
            Belastingdienst ingediend/afgevinkt als gedaan?), bewust NIET meer samen met de
            Dossiercontrole-kaart hierboven: dat zijn twee onafhankelijke signalen (zie de toelichting
            bovenaan dit bestand) en de eerdere gecombineerde weergave (eerst één regel ernaast, later
            een waarschuwingstekst eronder) bleef volgens de gebruiker verwarrend. Een amber accent
            zodra er nog iets te doen is (en dat ook daadwerkelijk verschuldigd is dit jaar) trekt de
            aandacht zonder een aparte tekstregel nodig te hebben; verder neutraal wit/grijs. */}
        <div
          className={`flex flex-col justify-center gap-1 rounded-2xl px-5 py-3 shadow-sm shrink-0 border ${
            pct != null && werkelijkTotal > 0 && werkelijkFrac < 1 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"
          }`}
        >
          <span className="text-xs font-semibold text-slate-800">Werkelijke aangifte</span>
          <div className="flex items-center gap-2">
            {werkelijkDot && <span className="text-sm leading-none">{werkelijkDot}</span>}
            <span className="text-sm font-semibold text-slate-800">{werkelijkTekst}</span>
          </div>
        </div>
        {/* Jaar-dropdown (fase 1) — vervangt de zwevende StickyYearNav op dit tabblad, zie
            YearDropdown.jsx. Als losse slot i.p.v. hardcoded hier, zodat DashboardHeader ook zonder
            jaarcontext bruikbaar blijft (bijv. later op Controleren/Instellingen). */}
        {yearControl}
      </div>
    </div>
  );
}
