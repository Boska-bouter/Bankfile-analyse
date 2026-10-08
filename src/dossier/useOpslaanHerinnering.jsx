// Herinnering om het dossier op te slaan als bestand: na 30 minuten met niet-opgeslagen wijzigingen verschijnt
// een balk bovenaan, die je kunt uitstellen. De tijd loopt vanaf het eerste niet-opgeslagen moment (klok), dus
// ook als de iPad de pagina tussendoor op de achtergrond pauzeert, komt de melding direct terug na je terugkeer.
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

export const HERINNERING_NA_MS = 30 * 60 * 1000;
export const HERINNERING_NA_WIJZIGINGEN = 40;
const UITSTEL_KORT_MS = 15 * 60 * 1000;
const UITSTEL_LANG_MS = 60 * 60 * 1000;

export function useOpslaanHerinnering({ changesSinceExport, hasData }) {
  const [eersteWijzigingOp, setEersteWijzigingOp] = useState(null);
  const [uitgesteldTot, setUitgesteldTot] = useState(0);
  const [nu, setNu] = useState(() => Date.now());

  const heeftOpenWijzigingen = hasData && changesSinceExport > 0;
  useEffect(() => {
    if (heeftOpenWijzigingen) setEersteWijzigingOp((v) => v ?? Date.now());
    else { setEersteWijzigingOp(null); setUitgesteldTot(0); }
  }, [heeftOpenWijzigingen]);

  // Elke 20 seconden en zodra de pagina weer zichtbaar wordt de klok bijwerken.
  useEffect(() => {
    if (!heeftOpenWijzigingen) return undefined;
    const bijwerken = () => setNu(Date.now());
    const id = setInterval(bijwerken, 20000);
    document.addEventListener("visibilitychange", bijwerken);
    bijwerken();
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", bijwerken); };
  }, [heeftOpenWijzigingen]);

  const minuten = eersteWijzigingOp ? Math.floor((nu - eersteWijzigingOp) / 60000) : 0;
  const tonen = heeftOpenWijzigingen && eersteWijzigingOp != null && (nu - eersteWijzigingOp >= HERINNERING_NA_MS || changesSinceExport >= HERINNERING_NA_WIJZIGINGEN) && nu >= uitgesteldTot;
  return {
    tonen, minuten, wijzigingen: changesSinceExport,
    uitstellen: (lang) => setUitgesteldTot(Date.now() + (lang ? UITSTEL_LANG_MS : UITSTEL_KORT_MS)),
  };
}

export function OpslaanHerinneringBalk({ herinnering, onOpslaan }) {
  if (!herinnering.tonen) return null;
  const { minuten, wijzigingen, uitstellen } = herinnering;
  return (
    <div role="alert" className="sticky top-2 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-md">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-[16rem]">
        {minuten >= 30
          ? `Je werkt al ${minuten} minuten aan dit dossier zonder het op te slaan (${wijzigingen} wijziging${wijzigingen === 1 ? "" : "en"}).`
          : `Je hebt ${wijzigingen} wijzigingen gemaakt sinds het laatste dossierbestand.`}
        De automatische browseropslag is geen dossierbestand.
      </span>
      <button type="button" onClick={onOpslaan} className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700">Nu opslaan</button>
      <button type="button" onClick={() => uitstellen(false)} className="rounded-lg border border-amber-400 px-3 py-1.5 hover:bg-amber-100">Over 15 min</button>
      <button type="button" onClick={() => uitstellen(true)} className="rounded-lg border border-amber-400 px-3 py-1.5 hover:bg-amber-100">Over 1 uur</button>
    </div>
  );
}
