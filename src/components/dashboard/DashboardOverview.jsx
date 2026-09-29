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
  // v242 — apart van "attention" (amber, voor "deels compleet"): dit is voor "er is iets gevonden,
  // maar er is helemaal nog niets over ingevuld" — bijv. leningen/leases waarvan geen enkele de
  // gegevens heeft. Iets dringender dan een gedeeltelijke onvolledigheid, dus rood i.p.v. amber.
  risk: "border-red-300 bg-red-50 hover:border-red-400",
};

const TONE_VALUE = {
  ok: "text-emerald-700",
  attention: "text-amber-700",
  neutral: "text-slate-900",
  risk: "text-red-700",
};

export default function DashboardOverview({ title = "Overzicht", cards }) {
  if (!cards || cards.length === 0) return null;
  return (
    <section className="rounded-xl border-2 border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
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
              className={`text-left rounded-xl border-2 p-3 shadow-sm transition-colors ${TONE_CARD[tone]} ${
                clickable ? "cursor-pointer" : "cursor-default opacity-90"
              }`}
              title={card.hint}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                {card.icon}
                <span>{card.title}</span>
              </div>
              {/* v239 — "lines": losse, los afleesbare bedragen (label + bedrag per stuk) i.p.v. 1
                  opgeteld totaal in de grote getal-stijl. Voor kaarten die bewust meerdere aparte
                  posten naast elkaar tonen (bijv. IB/Zvw of de aftrekposten) — de gebruiker gaf aan
                  liever de losse bedragen te zien dan een samengevoegd totaal. */}
              {card.lines ? (
                <div className="mt-1.5 space-y-1.5">
                  {/* v254 — label/waarde staan onder elkaar i.p.v. naast elkaar op 1 regel: bij een
                      langere label (bijv. "Privé/kasstroomsignaal") liep de waarde er anders zonder
                      spatie tegenaan, omdat flex-items van huis uit niet onder hun eigen tekstbreedte
                      krimpen. Voor de bestaande korte labels (IB/Zvw) oogt dit nauwelijks anders. */}
                  {card.lines.map((l) => (
                    <div key={l.label}>
                      <div className="text-[10px] text-slate-500 leading-tight">{l.label}</div>
                      <div className={`text-sm font-semibold tabular-nums leading-tight ${TONE_VALUE[tone]}`}>{l.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`mt-1 text-2xl font-semibold leading-tight ${TONE_VALUE[tone]}`}>{card.value}</div>
              )}
              {card.subtitle && <div className="mt-0.5 text-[11px] text-slate-500 leading-snug">{card.subtitle}</div>}
              {/* v258 — punt 11 uit de ChatGPT-aanbevelingen: "status → korte uitleg → actieknop".
                  Gericht toegepast op kaarten die al een compleet/onvolledig-telling hebben (Leningen,
                  Lease, Activa) i.p.v. op alle kaarten — voor een cijfer- of bedragkaart (Resultaat,
                  IB/Zvw) voegt een actieknop niets toe, die tonen geen actionLabel. */}
              {card.actionLabel && (
                <div className={`mt-1.5 text-[11px] font-semibold ${TONE_VALUE[tone]}`}>{card.actionLabel} →</div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
