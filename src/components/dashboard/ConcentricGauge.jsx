// V75 — twee ringen in elkaar: buitenste = hele dossier, binnenste = gekozen jaar.
function Ring({ cx, r, sw, pct, color }) {
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#EAECF5" strokeWidth={sw} />
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - clamped / 100)}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
    </>
  );
}

export default function ConcentricGauge({ outerPct, innerPct, outerColor = "#0F766E", innerColor = "#F59E0B", size = 78 }) {
  const sw = 7, gap = 3, cx = size / 2;
  const rOuter = (size - sw) / 2;
  const rInner = rOuter - sw - gap;
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Hele dossier ${outerPct}%, gekozen jaar ${innerPct}%`}>
        <Ring cx={cx} r={rOuter} sw={sw} pct={outerPct} color={outerColor} />
        <Ring cx={cx} r={rInner} sw={sw} pct={innerPct} color={innerColor} />
      </svg>
    </div>
  );
}
