import HelpHint from "../shared/HelpHint.jsx";

// V89 — vervangt de vier RollupCards op Overzicht ("Nog te controleren", "Nog in te stellen",
// "Resultaten", "Automatische herkenning") door één compacte kaart:
//  - links: de eerstvolgende stap (één knop),
//  - rechts: alle open punten in één compacte lijst (controle + instelling), elk klikbaar,
//  - onderaan: één regel snelkoppelingen naar resultaten en herkenningsregels.
// Geen nieuwe databron: dezelfde items als voorheen (teControlerenItems/inTeStellenItems/...).
export default function NextStepCard({ stappen, overgeslagen = [], onAlsnogDoen, volgende: volgendeIn, onOverslaan, controleCount, instellingCount, snelkoppelingen, onOpenHelp, hervat }) {
  const alle = stappen.map((i) => ({ ...i, soort: i.key === "aannames" || i.key === "btwSettings" ? "Instellingen" : "Controleren" }));
  const volgende = volgendeIn ? { ...volgendeIn, soort: alle.find((x) => x.key === volgendeIn.key)?.soort } : alle[0];
  const totaal = (controleCount || 0) + (instellingCount || 0);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3">
      {hervat && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-[12.5px] text-sky-900">
          <span className="min-w-0 truncate">{hervat.tekst}</span>
          <button type="button" onClick={hervat.onClick} className="shrink-0 rounded-full bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1 text-[11.5px]">
            Ga verder →
          </button>
        </div>
      )}

      {alle.length === 0 ? (
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs px-2.5 py-1">Alles afgehandeld</span>
          <span className="text-[12.5px] text-slate-500">Er staan geen open punten meer. Bekijk de resultaten hieronder.</span>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <div className="md:w-[38%] flex flex-col gap-1.5 justify-center">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Eerstvolgende stap</span>
            <span className="text-[15px] font-bold text-slate-900 leading-snug">{volgende.label}</span>
            <span className="text-[12px] text-slate-500">
              {volgende.soort} · {volgende.count != null ? `${volgende.count} open` : "open"} · nog {totaal} open punt{totaal === 1 ? "" : "en"} in totaal
            </span>
            <div className="mt-1 flex items-center gap-3">
              {volgende.onClick && (
                <button type="button" onClick={volgende.onClick} className="rounded-full bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-1.5 text-[12.5px]">
                  Ga naar deze stap →
                </button>
              )}
              {onOverslaan && <button type="button" onClick={onOverslaan} className="text-[12px] text-slate-500 underline">Overslaan</button>}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="grid sm:grid-cols-2 gap-x-6">
              {alle.slice(0, 8).map((item) => (
                <button
                  key={item.soort + item.label}
                  type="button"
                  onClick={item.onClick}
                  disabled={!item.onClick}
                  className="flex items-center justify-between gap-2 py-1.5 text-left text-[12.5px] border-b border-slate-100 disabled:cursor-default"
                >
                  <span className="min-w-0 truncate text-slate-700">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${item.soort === "Controleren" ? "bg-red-500" : "bg-amber-500"}`} />
                    {item.label}{overgeslagen.includes(item.key) && <span className="ml-1.5 text-[10px] font-semibold text-amber-700">overgeslagen</span>}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-500">
                    {item.count} {item.onClick && <span className="text-slate-300">→</span>}
                  </span>
                </button>
              ))}
            </div>
            {alle.length > 8 && <span className="block pt-1.5 text-[11px] font-medium text-slate-400">+ {alle.length - 8} meer — zie Controleren en Instellingen</span>}
          </div>
        </div>
      )}

      {alle.some((i) => overgeslagen.includes(i.key)) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Overgeslagen — nog niet afgerond</p>
          {alle.filter((i) => overgeslagen.includes(i.key)).map((i) => (
            <div key={i.key} className="flex items-center justify-between gap-2 py-1 text-[12.5px] text-amber-900">
              <span className="truncate">⚠ {i.label}{i.count != null ? ` (${i.count})` : ""}</span>
              <button type="button" onClick={() => { onAlsnogDoen?.(i.key); i.onClick?.(); }} className="shrink-0 rounded-full border border-amber-400 bg-white px-2.5 py-0.5 font-semibold text-amber-900 hover:bg-amber-100">Alsnog doen →</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2.5 text-[12px]">
        {snelkoppelingen.map((s) => (
          <button key={s.label} type="button" onClick={s.onClick} className="font-semibold text-teal-700 hover:underline">
            {s.label}
          </button>
        ))}
        {onOpenHelp && <HelpHint chapter="tegenpartijregels" onOpen={onOpenHelp} label="" />}
      </div>
    </div>
  );
}
