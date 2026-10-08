// Statusbolletje in plaats van een emoji (🟢🟠🔴🟡⚪) — professioneler en overal dezelfde kleur.
// `StatusDot` tekent één bolletje; `metBolletjes(tekst)` vervangt de emoji's in een tekst door
// bolletjes (voor kaartregels die als "🟠 3 open punten" zijn opgebouwd).
import { metBegrippen } from "./Begrip.jsx";
const KLEUR = {
  groen: "#059669", oranje: "#F59E0B", rood: "#DC2626", geel: "#EAB308", grijs: "#CBD5E1",
};
const EMOJI_NAAR_KLEUR = { "🟢": "groen", "🟠": "oranje", "🔴": "rood", "🟡": "geel", "⚪": "grijs" };
const EMOJI_RE = /(🟢|🟠|🔴|🟡|⚪)/g;

export default function StatusDot({ kleur = "grijs", size = 8, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block rounded-full shrink-0 align-middle ${className}`}
      style={{ background: KLEUR[kleur] || kleur, width: size, height: size }}
    />
  );
}

export function metBolletjes(tekst) {
  if (typeof tekst !== "string" || !EMOJI_RE.test(tekst)) { EMOJI_RE.lastIndex = 0; return metBegrippen(tekst); }
  EMOJI_RE.lastIndex = 0;
  const delen = tekst.split(EMOJI_RE);
  return delen.map((deel, i) =>
    EMOJI_NAAR_KLEUR[deel]
      ? <StatusDot key={i} kleur={EMOJI_NAAR_KLEUR[deel]} className="mr-2 -mt-0.5" />
      : deel === "" ? null : <span key={i}>{metBegrippen(EMOJI_NAAR_KLEUR[delen[i - 1]] ? deel.trimStart() : deel)}</span>
  );
}

export const STATUS_KLEUR = { groen: "groen", oranje: "oranje", rood: "rood" };
