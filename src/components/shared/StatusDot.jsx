// Statusbolletje in plaats van een emoji (🟢🟠🔴🟡⚪) — professioneler en overal dezelfde kleur.
// `StatusDot` tekent één bolletje; `metBolletjes(tekst)` vervangt de emoji's in een tekst door
// bolletjes (voor kaartregels die als "🟠 3 open punten" zijn opgebouwd).
import { metBegrippen } from "./Begrip.jsx";
const KLEUR = {
  groen: "#059669", oranje: "#D97706", rood: "#DC2626", geel: "#EAB308", grijs: "#94A3B8",
};
// Teken in het bolletje, zodat de status ook zonder kleur te lezen is (✓ akkoord, ! aandacht, × fout, ? controleren, – n.v.t.).
const TEKEN = { groen: "M4.2 7.4 6.2 9.3 9.9 5", oranje: null, rood: "M4.8 4.8 9.2 9.2M9.2 4.8 4.8 9.2", geel: null, grijs: "M4.6 7h4.8" };
const TEKEN_KLEUR = { geel: "#422006" };
const EMOJI_NAAR_KLEUR = { "🟢": "groen", "🟠": "oranje", "🔴": "rood", "🟡": "geel", "⚪": "grijs" };
const EMOJI_RE = /(🟢|🟠|🔴|🟡|⚪)/g;

export default function StatusDot({ kleur = "grijs", size = 14, className = "" }) {
  const vulling = KLEUR[kleur] || kleur;
  const lijn = TEKEN_KLEUR[kleur] || "#fff";
  return (
    <svg aria-hidden="true" viewBox="0 0 14 14" width={size} height={size} className={`inline-block shrink-0 align-middle ${className}`}>
      <circle cx="7" cy="7" r="7" fill={vulling} />
      {kleur === "oranje" && (<><path d="M7 3.6v4" stroke={lijn} strokeWidth="1.7" strokeLinecap="round" /><circle cx="7" cy="10.2" r="1" fill={lijn} /></>)}
      {kleur === "geel" && (<><path d="M5.3 5.6a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.9.7-.9 1.4" fill="none" stroke={lijn} strokeWidth="1.5" strokeLinecap="round" /><circle cx="7" cy="10.4" r="0.95" fill={lijn} /></>)}
      {TEKEN[kleur] && <path d={TEKEN[kleur]} fill="none" stroke={lijn} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export function metBolletjes(tekst) {
  if (typeof tekst !== "string" || !EMOJI_RE.test(tekst)) { EMOJI_RE.lastIndex = 0; return metBegrippen(tekst); }
  EMOJI_RE.lastIndex = 0;
  const delen = tekst.split(EMOJI_RE);
  return delen.map((deel, i) =>
    EMOJI_NAAR_KLEUR[deel]
      ? <StatusDot key={i} kleur={EMOJI_NAAR_KLEUR[deel]} className="mr-1.5 -mt-0.5" />
      : deel === "" ? null : <span key={i}>{metBegrippen(EMOJI_NAAR_KLEUR[delen[i - 1]] ? deel.trimStart() : deel)}</span>
  );
}

export const STATUS_KLEUR = { groen: "groen", oranje: "oranje", rood: "rood" };
