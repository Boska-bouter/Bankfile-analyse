import HelpHint from "../shared/HelpHint.jsx";

// Fase 1, dashboard-restyling (Stijl F) — de 4 samenvattende categorie-kaarten bovenaan het
// Overzicht-tabblad ("Nog te controleren"/"Nog in te stellen"/"Resultaten"/"Automatische
// herkenning" in het mockup-canvas). Dit zijn ROLLUPS: ze tellen/lijsten dingen op die verderop al
// op Controleren/Instellingen bestaan (badges, dashboardCards) — geen nieuwe databron, alleen een
// samenvattend overzicht met doorklik-links. Zie het bouwvoorstel, sectie "Ruimte voor meer detail
// later": deze kaart toont per item alvast een klikbare regel i.p.v. alleen een totaalcijfer.
const TONE = {
  risk: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-600", cta: "bg-red-50 text-red-700 hover:bg-red-100" },
  attention: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-500", cta: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  ok: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-600", cta: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  info: { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-600", cta: "bg-violet-50 text-violet-700 hover:bg-violet-100" },
};

export default function RollupCard({ title, icon, tone = "info", count, items, ctaLabel, onCta, helpChapter, onOpenHelp }) {
  const t = TONE[tone] || TONE.info;
  return (
    <div className={`rounded-[20px] border ${t.border} bg-white p-4 flex flex-col gap-3 shadow-sm`}>
      {/* v301 — "? uitleg" toegevoegd op verzoek. De titelregel hier is (anders dan bij SectionCard)
          gewoon een <div>, geen <button> — alleen de losse item-regels en de CTA eronder zijn dat —
          dus dit kan gewoon inline in de titelregel, geen aparte absolute positionering nodig. */}
      <div className="flex items-center gap-2">
        <div className={`rounded-full ${t.bg} flex items-center justify-center shrink-0`} style={{ width: 26, height: 26 }}>
          {icon}
        </div>
        <span className="flex-grow text-[13px] font-bold text-slate-900">{title}</span>
        {helpChapter && onOpenHelp && <HelpHint chapter={helpChapter} onOpen={onOpenHelp} label="" />}
        {count != null && (
          <span className={`text-xs font-bold rounded-full px-2 py-0.5 text-white ${t.badge}`}>{count}</span>
        )}
      </div>

      {items && items.length > 0 ? (
        <div className="flex flex-col">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              disabled={!item.onClick}
              className="flex items-center justify-between gap-2 py-1.5 text-left text-[12.5px] border-b border-slate-100 last:border-0 disabled:cursor-default"
            >
              <span className="text-slate-600 truncate">{item.label}</span>
              <span className="flex items-center gap-1 text-slate-500 font-semibold shrink-0">
                {item.count} {item.onClick && <span className="text-slate-300">→</span>}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-slate-400">Niets openstaand</p>
      )}

      {ctaLabel && (
        <button
          type="button"
          onClick={onCta}
          className={`mt-auto text-center rounded-full py-1.5 text-[11.5px] font-bold ${t.cta}`}
        >
          {ctaLabel} →
        </button>
      )}
    </div>
  );
}
