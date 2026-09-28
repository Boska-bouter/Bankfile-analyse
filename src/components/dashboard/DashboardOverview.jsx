// Dashboard-overzicht (v217, fase 1) — een altijd-zichtbare kaartenlaag bovenaan de pagina met
// live cijfers uit al bestaande berekeningen (confidenceSummary, pendingPersonReview, etc.). Elke
// kaart is een snelkoppeling: klikken scrollt naar en opent de bijbehorende sectie verderop op
// DEZELFDE pagina (geen aparte route/tab) — zie App.jsx voor de scroll/open-logica per kaart.
//
// Dit vervangt TodoPanel niet: TodoPanel blijft de gedetailleerde "openstaande punten"-lijst
// verderop; dit blok is de compacte, altijd-zichtbare samenvatting bovenaan (ook op 0 tonen, met
// een groen "in orde"-kleurtje, in plaats van pas te verschijnen zodra er iets te doen is).

const TONE_CARD = {
  ok: "border-emerald-200 bg-emerald-50 hover:border-emerald-300",
  attention: "border-amber-300 bg-amber-50 hover:border-amber-400",
  neutral: "border-slate-200 bg-white hover:border-slate-300",
};

const TONE_VALUE = {
  ok: "text-emerald-700",
  attention: "text-amber-700",
  neutral: "text-slate-900",
};

export default function DashboardOverview({ title = "Overzicht", cards }) {
  if (!cards || cards.length === 0) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card) => {
          const tone = card.tone || "neutral";
          const clickable = !!card.onClick;
          return (
            <button
              key={card.key}
              type="button"
              onClick={card.onClick}
              disabled={!clickable}
              className={`text-left rounded-lg border p-3 transition-colors ${TONE_CARD[tone]} ${
                clickable ? "cursor-pointer" : "cursor-default opacity-90"
              }`}
              title={card.hint}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                {card.icon}
                <span>{card.title}</span>
              </div>
              <div className={`mt-1 text-2xl font-semibold leading-tight ${TONE_VALUE[tone]}`}>{card.value}</div>
              {card.subtitle && <div className="mt-0.5 text-[11px] text-slate-500 leading-snug">{card.subtitle}</div>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
