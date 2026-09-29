import ProgressGauge from "./ProgressGauge.jsx";

// Kop van het Overzicht-tabblad (fase 1 van de dashboard-restyling) — titel + subtitel links,
// een statuskaart met ringmeter + statusregels rechts. Vervangt de losse "Dossierstatus {jaar}"-
// kaart die voorheen tussen de andere dashboardCards stond: dezelfde data (yearProgress), nu
// prominenter bovenaan i.p.v. als gelijkwaardige tegel tussen de rest.
export default function DashboardHeader({ title, subtitle, pct, gaugeLabel, statusLines, accent = "#0F766E", yearControl }) {
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
                <span className="text-xs font-semibold text-slate-800">{gaugeLabel ? "Dossierstatus" : "Voortgang"}</span>
                <span className="text-[11px] text-slate-400">klaar</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <ProgressGauge pct={0} accent="#CBD5E1" label="–" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">Voortgang</span>
                <span className="text-[11px] text-slate-400">nog geen data</span>
              </div>
            </div>
          )}
          {statusLines && statusLines.length > 0 ? (
            <>
              <div className="w-px self-stretch bg-slate-200" />
              <div className="flex flex-col gap-1.5">
                {statusLines.map((line) => (
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
        {/* Jaar-dropdown (fase 1) — vervangt de zwevende StickyYearNav op dit tabblad, zie
            YearDropdown.jsx. Als losse slot i.p.v. hardcoded hier, zodat DashboardHeader ook zonder
            jaarcontext bruikbaar blijft (bijv. later op Controleren/Instellingen). */}
        {yearControl}
      </div>
    </div>
  );
}
