import { flushSync } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { SectionCard } from "./SectionCard.jsx";
import IndicatieveAangifteCard from "./IndicatieveAangifteCard.jsx";
import IndicatieveVpbCard from "./IndicatieveVpbCard.jsx";
import { eur } from "../../utils/amounts.js";

// Fase 1, dashboard-restyling (Stijl F) — "Details en overzichten"-paneel onderaan het Overzicht-
// tabblad, met sub-tabs (Jaaroverzicht/Transacties/Categorieën/Activa/Leningen/Lease/BTW/
// Rapportages) zoals in het mockup-canvas. Dit paneel bouwt GEEN nieuwe interactieve tabellen na —
// het echte werk (transacties bewerken, categorieën instellen, leningdetails invullen) blijft op
// Controleren/Instellingen staan, exact zoals het al werkte. Elke sub-tab hier toont een korte,
// realistische samenvatting (uit dezelfde dashboardCards-data) plus een knop die naar de bijbehorende
// plek springt (dezelfde jumpToSection-functie als de rest van de app al gebruikt).
const TABS = [
  { key: "jaaroverzicht", label: "Jaaroverzicht" },
  { key: "transacties", label: "Transacties" },
  { key: "categorieen", label: "Categorieën" },
  { key: "activa", label: "Activa" },
  { key: "leningen", label: "Leningen" },
  { key: "lease", label: "Lease" },
];

// dashboardCards-objecten dragen een `key`-veld (voor React-lijsten in SectionCardGrid) — dat mag
// nooit meegespreid worden in JSX (React reserveert `key` en waarschuwt anders), dus hier eruit
// gehaald vóór het doorgeven aan een los <SectionCard />.
function CardTile(card) {
  if (!card) return null;
  const { key, ...rest } = card;
  return <SectionCard {...rest} />;
}

function LinkOut({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full px-3 py-1.5"
    >
      {label} →
    </button>
  );
}


export default function DetailsPanel({
  year,
  cardsByKey,
  aannamesCard,
  dashboardAangifteIndicatie,
  rechtsvorm,
  vpbIndicatie,
  vpbBreakdown,
  omzetBreakdown,
  holdingCard,
  belastingTotaal,
  winst,
  previousWinst,
  showTrend,
  onShowFullCalculation,
  zakCount,
  priCount,
  onJump, herkenningsregelsCount,
  years = [], onSelectYear,
}) {
  const [tab, setTab] = useState("jaaroverzicht");
  // Veegbeweging (links/rechts) wisselt van jaar. De inhoud schuift tijdens het vegen mee met je vinger; bij
  // loslaten na een duidelijke veeg schuift hij weg en komt het andere jaar rustig van de andere kant binnen,
  // anders veert hij terug. Bewust voorzichtig: een veeg die begint in iets wat zelf zijdelings kan scrollen
  // (brede tabel, tabbladenrij) of in een invoerveld telt niet mee, en omhoog/omlaag scrollen blijft ongemoeid.
  const contentRef = useRef(null);
  const panelRef = useRef(null);
  const drag = useRef(null); // { x, y, mode: null | "h" | "v", dx }
  const kanVegen = years.length > 1 && typeof onSelectYear === "function";
  const zijdelingsScrollbaar = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 2) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
      }
    }
    return false;
  };
  const doelJaar = (dx) => { const i = years.indexOf(year); return i < 0 ? undefined : (dx < 0 ? years[i + 1] : years[i - 1]); }; // veeg naar links = volgend jaar
  const zet = (el, transform, opacity, transition) => { el.style.transition = transition; el.style.transform = transform; el.style.opacity = opacity; };
  const terugveren = () => { const el = contentRef.current; if (el) zet(el, "none", "1", "transform .18s ease-out, opacity .18s ease-out"); };
  const onTouchStart = (e) => {
    drag.current = null;
    if (!kanVegen || e.touches.length !== 1) return;
    const t = e.target;
    if (!contentRef.current?.parentElement?.contains(t)) return; // alleen een veeg binnen het inhoudsvenster, niet op de kop/tabbladen
    if (t.closest && t.closest("input, select, textarea")) return;
    if (zijdelingsScrollbaar(t)) return;
    drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, mode: null, dx: 0 };
    const el = contentRef.current; if (el) zet(el, "none", "1", "none");
  };
  const onTouchMove = (e) => {
    const d = drag.current; const el = contentRef.current;
    if (!d || !el || !e.touches.length) return;
    const dx = e.touches[0].clientX - d.x, dy = e.touches[0].clientY - d.y;
    if (d.mode === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.mode = Math.abs(dx) > Math.abs(dy) * 1.4 ? "h" : "v";
    }
    if (d.mode !== "h") return;
    if (e.cancelable) e.preventDefault(); // voorkomt dat Safari/iPadOS de beweging overneemt (terug-gebaar, rubberband)
    d.dx = dx;
    const heeftDoel = doelJaar(dx) != null;
    const factor = heeftDoel ? 0.8 : 0.2; // aan het eerste/laatste jaar zwaar tegenhouden
    el.style.transform = `translateX(${dx * factor}px)`;
    el.style.opacity = String(heeftDoel ? Math.max(0.4, 1 - Math.abs(dx) / 450) : 1);
  };
  const onTouchCancel = () => { drag.current = null; terugveren(); };
  const onTouchEnd = () => {
    const d = drag.current; drag.current = null;
    const el = contentRef.current;
    if (!d || !el) return;
    if (d.mode !== "h") { terugveren(); return; }
    const naar = doelJaar(d.dx);
    if (Math.abs(d.dx) < 80 || naar == null) { terugveren(); return; }
    const uit = d.dx < 0 ? -70 : 70;
    zet(el, `translateX(${uit}px)`, "0", "transform .13s ease-in, opacity .13s ease-in");
    setTimeout(() => {
      // Synchroon renderen terwijl het blok onzichtbaar is: de zware herberekening zit zo niet midden in de animatie.
      flushSync(() => onSelectYear(naar));
      zet(el, `translateX(${-uit}px)`, "0", "none");
      requestAnimationFrame(() => requestAnimationFrame(() => zet(el, "none", "1", "transform .24s ease-out, opacity .24s ease-out")));
    }, 130);
  };
  // Native listeners (touchmove niet-passief), anders mag preventDefault niet en neemt Safari de veeg halverwege over.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return undefined;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  });
  // Voorkomt dat een veeg naar rechts door de browser als "pagina terug" wordt opgevat zolang dit paneel in beeld is.
  useEffect(() => {
    if (!kanVegen) return undefined;
    const vorig = document.documentElement.style.overscrollBehaviorX;
    document.documentElement.style.overscrollBehaviorX = "none";
    return () => { document.documentElement.style.overscrollBehaviorX = vorig; };
  }, [kanVegen]);
  const aanraking = typeof window !== "undefined" && "ontouchstart" in window;
  const jaarIdx = years.indexOf(year);
  // De route-balk ("Advies") vraagt om het Jaaroverzicht-tabblad met de indicatieve aangifte.
  useEffect(() => {
    const h = () => setTab("jaaroverzicht");
    window.addEventListener("bankoverzicht-toon-advies", h);
    return () => window.removeEventListener("bankoverzicht-toon-advies", h);
  }, []);
  const btwQuarters = cardsByKey.btwQuarters;
  const loans = cardsByKey.loans;
  const leases = cardsByKey.leases;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" ref={panelRef} data-testid="details-panel">
      <div className="px-5 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
          <h3 className="text-sm font-bold text-slate-900 mr-1">
            Details en overzichten
            {kanVegen && aanraking && (
              <span className="ml-2 text-[11px] font-normal text-slate-400" title="Veeg naar links of rechts om van jaar te wisselen">
                {jaarIdx > 0 ? "‹ " : ""}veeg voor ander jaar{jaarIdx >= 0 && jaarIdx < years.length - 1 ? " ›" : ""}
              </span>
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <LinkOut label="Meerjarenoverzicht" onClick={() => onJump("meerjaren")} />
            <LinkOut label={`Herkenningsregels${herkenningsregelsCount != null ? ` (${herkenningsregelsCount})` : ""}`} onClick={() => onJump("herkenningsregels")} />
            <LinkOut label="Excel exporteren" onClick={() => onJump("excel")} />
            <LinkOut label="Print" onClick={() => onJump("print")} />
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === t.key ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "clip" }}>
      <div ref={contentRef} className="border-t border-slate-100 p-5" style={{ willChange: "transform" }}>
        {/* v273 — voorheen werd dit hele paneel niet gerenderd zolang er geen activeYear was; nu
            toont het altijd de kop + sub-tabs, met deze neutrale lege-staat als body i.p.v. content
            die uitgaat van bestaande jaardata (zakCount/priCount/cardsByKey e.d.). */}
        {!year ? (
          <p className="text-sm text-slate-400 italic">Start een nieuw dossier of laad een eerder opgeslagen dossier (links bij "Dossier") om deze gegevens te zien.</p>
        ) : (
          <>
        {tab === "jaaroverzicht" && (
          rechtsvorm === "bv" ? (
            // v282 — BV kent geen IB/Zvw-indicatie (dat bestaat alleen in de IB), maar wél een
            // eigen indicatieve Vpb-berekening plus (als er een holding is) de holding-boekingen
            // voor het actieve jaar — zelfde opzet als de zzp-kant hieronder.
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <IndicatieveVpbCard
                year={year}
                winst={winst}
                vpbIndicatie={vpbIndicatie}
                breakdown={vpbBreakdown}
                showTrend={showTrend}
                prevWinst={previousWinst}
                onShowFullCalculation={onShowFullCalculation}
              />
              <div className="flex flex-col gap-4">
                {CardTile(holdingCard)}
                {CardTile(btwQuarters)}
              </div>
            </div>
          ) : dashboardAangifteIndicatie ? (
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <IndicatieveAangifteCard
                year={year}
                winst={winst}
                indicatie={dashboardAangifteIndicatie}
                breakdown={omzetBreakdown}
                showTrend={showTrend}
                prevWinst={previousWinst}
                onShowFullCalculation={onShowFullCalculation}
              />
              <div className="flex flex-col gap-4">
                {CardTile(aannamesCard)}
                {CardTile(btwQuarters)}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 items-start">{CardTile(btwQuarters)}</div>
          )
        )}

        {tab === "jaaroverzicht" && belastingTotaal && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Totaal te betalen / terug te krijgen {year}</p>
              <p className="text-[11.5px] text-slate-500">
                {belastingTotaal.delen.map((d) => `${d.label} ${eur(d.bedrag)}`).join(" + ")} · indicatief
              </p>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {eur(Math.abs(belastingTotaal.totaal))}{" "}
              <span className="text-xs font-semibold text-slate-500">{belastingTotaal.totaal < 0 ? "terug te krijgen" : "te betalen"}</span>
            </p>
          </div>
        )}

        {tab === "transacties" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-600">
                {zakCount} zakelijke en {priCount} privé-transacties in {year}.
              </p>
              <LinkOut label="Bekijk detailoverzicht" onClick={() => onJump("details")} />
            </div>
            {/* v286 — op verzoek: hoeveel bestanden zakelijk/privé geladen zijn stond nergens, en of
                ze onderling matchen (overboekingen zakelijk ↔ privé) al helemaal niet op dit
                tabblad — zelfde kaart/berekening als op Controleren ("Controle zakelijk ↔ privé"). */}
            <div className="grid md:grid-cols-2 gap-4 items-start">{CardTile(cardsByKey.bestandenOverzicht)}</div>
          </div>
        )}

        {tab === "categorieen" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">Categorieën zakelijk/privé, inclusief BTW per categorie voor {year}.</p>
            <LinkOut label="Bekijk categorieën" onClick={() => onJump("categorieen")} />
          </div>
        )}

        {tab === "activa" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">Activa en afschrijving worden bij Instellingen bijgehouden.</p>
            <LinkOut label="Bekijk activa" onClick={() => onJump("activa")} />
          </div>
        )}

        {tab === "leningen" && (
          <div className="grid md:grid-cols-2 gap-4 items-start">
            {CardTile(loans)}
            <div className="flex items-center">
              <LinkOut label="Leningdetails bewerken" onClick={() => onJump("leningen")} />
            </div>
          </div>
        )}

        {tab === "lease" && (
          <div className="grid md:grid-cols-2 gap-4 items-start">
            {CardTile(leases)}
            <div className="flex items-center">
              <LinkOut label="Leasedetails bewerken" onClick={() => onJump("lease")} />
            </div>
          </div>
        )}

          </>
        )}
      </div>
      </div>
    </div>
  );
}
