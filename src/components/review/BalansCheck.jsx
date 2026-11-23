import { useMemo, useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronRight } from "lucide-react";
// nieuw-V9R8 — Boska 23-11: de signalen voor de balans ("gegevens ontbreken of zijn onzeker") ook in Controleren,
// per jaar, zodat ze te herstellen zijn vóór het document wordt gemaakt. maak(jaar) geeft de lijst (HTML-teksten).
export default function BalansCheck({ jaar, maak, versie = [] }) {
  const [keuze, setOpen] = useState(null);
  const lijst = useMemo(() => { try { return maak?.(jaar) || []; } catch { return []; } }, [jaar, maak, ...versie]); // eslint-disable-line react-hooks/exhaustive-deps
  // versie: vaste lijst invoer van het rapport (boekingen, lease, leningen, bevestigingen, kwartalen, beginsaldo …)
  if (!jaar || !maak) return null;
  const n = lijst.length;
  const open = keuze ?? n > 0; // open zolang er punten zijn, tenzij zelf dichtgeklapt
  return (
    <section className={`rounded-xl border-2 ${n ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <button type="button" onClick={() => n && setOpen(!open)} className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-left">
        {n ? <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" /> : <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
        <span className={`text-sm font-semibold ${n ? "text-amber-900" : "text-emerald-900"}`}>
          Balanscheck {jaar} — {n ? `${n} ${n === 1 ? "punt" : "punten"}` : "geen bijzonderheden"}
        </span>
        <span className="flex-1" />
        {n > 0 && (open ? <ChevronDown className="h-4 w-4 text-amber-500" /> : <ChevronRight className="h-4 w-4 text-amber-500" />)}
      </button>
      {open && n > 0 && (
        <ul className="max-w-4xl list-disc space-y-1 px-4 pb-3 pl-9 text-sm text-slate-800">
          {lijst.map((m, i) => <li key={i} dangerouslySetInnerHTML={{ __html: m }} />)}
        </ul>
      )}
    </section>
  );
}
