import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

// v305 (V27) — tijdelijke "Ongedaan maken"-melding voor kleine acties (een categorie, een status, een
// toelichting…). Voorheen stond voor élke actie een opvallende witte kaart permanent in de zijbalk;
// dat is alleen gepast voor grote, ingrijpende acties (Nieuw dossier, Project geladen, duplicaten
// verwijderen e.d. — die houden die kaart, zie isBigUndoLabel in App.jsx).
//
// De melding verdwijnt na `duration` ms (en daarmee ook de mogelijkheid om die ene actie ongedaan te
// maken). Muisaanwijzer erop pauzeert de timer. Staat onderin het midden: rechtsboven zit de
// jaarkeuze, en links/rechtsonder de zwevende knoppen ("Terug", "Categorieën").
export default function UndoToast({ snapshot, onUndo, onDismiss, duration = 10000 }) {
  const timer = useRef(null);
  const stop = () => clearTimeout(timer.current);
  const start = () => {
    stop();
    timer.current = setTimeout(onDismiss, duration);
  };

  // Elke nieuwe actie (nieuw snapshot-object) start de timer opnieuw.
  useEffect(() => {
    if (!snapshot) return undefined;
    start();
    return stop;
  }, [snapshot]);

  if (!snapshot) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={stop}
      onMouseLeave={start}
      className="fixed z-50 flex items-center gap-3 rounded-xl bg-slate-900 text-white shadow-lg px-4 py-2.5 text-sm"
      style={{ left: "50%", transform: "translateX(-50%)", bottom: "1.5rem", maxWidth: "calc(100vw - 2rem)" }}
    >
      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
      <span className="truncate">{snapshot.label}</span>
      <button onClick={onUndo} className="shrink-0 font-semibold text-amber-300 hover:text-amber-200 underline decoration-dotted">
        Ongedaan maken
      </button>
      <button onClick={onDismiss} className="shrink-0 text-slate-400 hover:text-white" aria-label="Melding sluiten">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
