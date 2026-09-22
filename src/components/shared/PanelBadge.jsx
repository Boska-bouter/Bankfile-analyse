// Kleine gekleurde badge in een paneeltitel — laat zien of iets aandacht nodig heeft zonder het
// paneel open te klappen. tone "attention" (amber, met bolletje) = actie nodig; "neutral" (grijs)
// = puur een aantal; "done" (groen) = alles afgehandeld.
export default function PanelBadge({ count, tone = "neutral" }) {
  if (count === 0 || count == null) return null;
  const toneClasses =
    tone === "attention"
      ? "bg-amber-100 text-amber-800"
      : tone === "done"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${toneClasses}`}>
      {tone === "attention" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      {count}
    </span>
  );
}
