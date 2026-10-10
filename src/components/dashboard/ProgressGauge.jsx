// Herbruikbare ringmeter (fase 1, dashboard-restyling) — pure SVG, geen library nodig.
// Gebruikt in DashboardHeader.jsx voor de dossierstatus-ringmeter op het Overzicht-tabblad.
// Zie ook het bouwvoorstel-document: dit component is bewust generiek (pct/label/accent) zodat
// het later ook voor Controleren/Instellingen ("Controlevoortgang"/"Instellingen ingevuld") kan
// worden hergebruikt zonder aanpassingen.
export default function ProgressGauge({ pct = 0, size = 46, strokeWidth = 6, accent = "#0F766E", label }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circ * (1 - clamped / 100);
  const center = size / 2;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="#EAECF5" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900">
        {label ?? `${clamped}%`}
      </div>
    </div>
  );
}
