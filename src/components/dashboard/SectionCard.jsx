import HelpHint from "../shared/HelpHint.jsx";
import { metBolletjes } from "../shared/StatusDot.jsx";

// Restyling (fase 1) van de dashboardtegel: zelfde databron/contract als DashboardOverview.jsx
// ({key,title,value|lines,subtitle,tone,actionLabel,icon,onClick,hint}), nieuwe kaartstijl zoals
// het goedgekeurde mockup-canvas (Stijl F): afgeronde witte kaart, zachtere kleuren, actieknop
// onderin i.p.v. de hele kaart als knop.
// Fase 3 — `expandable`/`expanded`/`children` (uitklappen naar het volledige onderliggende paneel
// i.p.v. ernaartoe springen) worden nu gebruikt. Belangrijk: het uitgeklapte paneel (`children`) kan
// zelf knoppen/velden/dropdowns bevatten (bijv. BTW-tarieven, categorieregels) — die mogen NIET
// genest zitten in de klikbare kaart-knop (ongeldige/onvoorspelbare HTML, geneste <button>s). Alleen
// de kop (titel/waarde/regels/actieknop-label) zit daarom in de klikbare knop; het uitgeklapte
// paneel staat er als aparte, gewone sectie naast/onder, buiten die knop.
const TONE = {
  ok: { border: "border-emerald-200", bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700" },
  attention: { border: "border-amber-300", bg: "bg-amber-50", dot: "bg-amber-500", text: "text-amber-700" },
  neutral: { border: "border-slate-200", bg: "bg-slate-100", dot: "bg-slate-300", text: "text-slate-700" },
  risk: { border: "border-red-300", bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700" },
};

export function SectionCard({ title, icon, value, lines, subtitle, tone = "neutral", actionLabel, onClick, hint, expanded, children, helpChapter, onOpenHelp, inGrid }) {
  const t = TONE[tone] || TONE.neutral;
  const clickable = !!onClick;
  const Wrapper = clickable ? "button" : "div";
  return (
    <div
      className={`relative rounded-[20px] border ${t.border} bg-white p-4 flex flex-col gap-2.5 shadow-sm transition-colors ${
        clickable ? "hover:border-slate-300" : ""
      } ${expanded ? "ring-2 ring-teal-600/40" : ""}`}
    >
      {/* v301 — op verzoek: "? uitleg" ook rechtsbovenin op de kaarten hier (Controleren/Instellingen-
          mini-dashboard), niet alleen in de uitgeklapte panelen eronder. Staat als eigen element BUITEN
          de <Wrapper> hieronder (die vaak zelf een <button> is, zie hierboven "onClick") — een
          <button> binnen een <button> is ongeldige/onvoorspelbare HTML (zie ook de toelichting in
          ClassificationConfidencePanel.jsx), dus dit zit hier als losstaand, absoluut gepositioneerd
          knopje in de hoek in plaats van inline in de titelregel. */}
      {helpChapter && onOpenHelp && (
        <div className="absolute top-3 right-3 z-10">
          <HelpHint chapter={helpChapter} onOpen={onOpenHelp} label="" />
        </div>
      )}
      <Wrapper
        type={clickable ? "button" : undefined}
        onClick={onClick}
        title={hint}
        className={`text-left flex-1 flex flex-col gap-2.5 ${clickable ? "cursor-pointer" : ""}`}
      >
        <div className="flex items-center gap-2">
          <div className={`rounded-full ${t.bg} flex items-center justify-center text-sm shrink-0`} style={{ width: 26, height: 26 }}>
            {icon}
          </div>
          <span className={`flex-grow text-[13px] font-bold text-slate-900 truncate ${helpChapter ? "pr-4" : ""}`}>{title}</span>
          {/* v284 — voorheen verborgen zodra een kaart ook `lines` toont (elke kaart met `lines` zette
              tot nu toe geen top-level `value`, dus dit veranderde tot nu toe niets) — "BTW-kwartalen"
              wil nu juist wél een badge (het jaartotaal) tonen NAAST de per-kwartaal regels. */}
          {value != null && (
            <span className={`text-xs font-bold rounded-full px-2 py-0.5 whitespace-nowrap ${tone === "neutral" ? "bg-slate-200 text-slate-600" : `${t.dot} text-white`}`}>
              {value}
            </span>
          )}
        </div>

        {lines && (
          <div className="flex flex-col gap-1.5">
            {lines.map((l) => (
              <div key={l.label} className="flex justify-between items-baseline gap-2">
                <span className="text-[11.5px] text-slate-500">{l.label}</span>
                <span className={`text-[13px] font-semibold ${t.text}`}>{metBolletjes(l.value)}</span>
              </div>
            ))}
          </div>
        )}
        {/* v286 — voorheen alleen getoond als er GEEN `lines` waren; sommige kaarten (Dossierstatus,
            Bestanden geladen) zetten beide en willen de subtitle als extra toelichting ónder de
            regels tonen (bijv. of zakelijk/privé-overboekingen matchen), niet in plaats ervan. */}
        {subtitle && <p className="text-[11.5px] text-slate-500 leading-snug">{metBolletjes(subtitle)}</p>}

        {actionLabel && <div className={`mt-auto text-center rounded-full py-1.5 text-[11.5px] font-bold ${t.bg} ${t.text}`}>{actionLabel} →</div>}
      </Wrapper>

      {/* v312 (V33) — de uitgeklapte inhoud staat niet meer in de kaart zelf (die de overige kaarten naar
          beneden duwde) maar in SectionCardGrid, onder het hele rooster van kaarten. */}
      {!inGrid && expanded && children && <div className="pt-1 mt-1 border-t border-slate-100">{children}</div>}
    </div>
  );
}

// Rendert een set dashboardCards (zelfde array als voorheen aan DashboardOverview gegeven) als
// een grid van SectionCard-tegels, met dezelfde grid-stijl (afronding/kleuren) als het Overzicht-
// mockup. `title` is optioneel — op Overzicht wordt de titel nu getoond via DashboardHeader.
export default function SectionCardGrid({ title, cards, onOpenHelp }) {
  if (!cards || cards.length === 0) return null;
  return (
    <section className="space-y-3">
      {title && <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <SectionCard
            key={card.key}
            title={card.title}
            icon={card.icon}
            value={card.value}
            lines={card.lines}
            subtitle={card.subtitle}
            tone={card.tone}
            actionLabel={card.actionLabel}
            onClick={card.onClick}
            hint={card.hint}
            expanded={card.expanded}
            helpChapter={card.helpChapter}
            onOpenHelp={onOpenHelp}
            inGrid
          />
        ))}
      </div>
      {cards.filter((c) => c.expanded && c.expandedContent).map((card) => (
        <div key={`open-${card.key}`} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-[13px] font-bold text-slate-900 mb-3">{card.title}</h3>
          {card.expandedContent}
        </div>
      ))}
    </section>
  );
}
