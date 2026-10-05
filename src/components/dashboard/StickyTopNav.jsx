// Compacte, vaste navigatiebalk (v219, dashboard fase 3) — blijft zichtbaar tijdens scrollen zodat
// je vanaf elk punt op de pagina meteen naar een ander deel kunt springen. Anders dan StickyYearNav
// (die vast aan de zijkant hangt en over jaren wisselt) is dit een horizontale balk direct onder de
// header, die naar bestaande secties VERDER OP DEZELFDE PAGINA scrollt — geen aparte route/tab, dus
// terug-navigeren (bijv. via de browser) laat de rest van de pagina gewoon staan.
// v227 — de "Bestand laden"-knop (v226) is verhuisd naar de header zelf, naast "Dossier opslaan"
// (samen met de andere bestandsacties), dus deze balk toont weer alleen de sectie-navigatie.
// v228 — dit was een scroll-naar-sectie-navbalk; de knoppen zijn nu echte tabblad-schakelaars
// (item.onClick wisselt activeTab in App.jsx), dus deze balk toont voortaan ook welk tabblad actief
// is.
// v230 — stijl geactualiseerd (mockup): het actieve tabblad krijgt nu een gevulde teal "pil" in
// plaats van een zwarte onderrand — rustiger en herkenbaarder als tabblad-schakelaar.
// v244 — pijlknoppen om met 1 klik naar het vorige/volgende tabblad te gaan, zonder een tabblad-knop
// te hoeven aanklikken — handig als je de hele rij doorloopt (bijv. Overzicht → Controleren →
// Instellingen). Geen wrap-around: bij het eerste/laatste tabblad is de bijbehorende pijl
// uitgegrijsd i.p.v. terug naar het andere eind te springen — dat zou verwarrend zijn omdat de rij
// hier geen "ronde" reeks is (Instellingen → Overzicht voelt niet als "volgende").
// v246 — de pijlen stonden eerst binnen de gecentreerde tabbalk-container (dus, op brede schermen,
// midden op de pagina naast de tabbladen) en waren klein (h-4 icoon, dun padding). Nu staan ze los
// van die container, absoluut gepositioneerd tegen de linker/rechter rand van de HELE navigatiebalk
// (die zelf altijd de volle schermbreedte beslaat, ongeacht de max-w-7xl van de tabbalk erbinnen) —
// dus echt uiterst links/rechts op het scherm, op elke schermbreedte (tablet/laptop/desktop). Ze zijn
// ook groter (grotere cirkel + groter icoon) en hebben nu altijd een zichtbare rand/achtergrond
// (niet pas bij hover), zodat ze duidelijker als knop herkenbaar zijn. De tabbalk-container krijgt
// links/rechts extra binnenmarge zodat de tabbladen nooit onder deze knoppen schuiven.
import { ChevronLeft, ChevronRight } from "lucide-react";

function TabNavArrow({ direction, onClick, disabled }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const sideClass = direction === "prev" ? "left-1 sm:left-2 lg:left-3" : "right-1 sm:right-2 lg:right-3";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={direction === "prev" ? "Vorig tabblad" : "Volgend tabblad"}
      aria-label={direction === "prev" ? "Vorig tabblad" : "Volgend tabblad"}
      className={`absolute inset-y-0 ${sideClass} z-10 flex items-center justify-center`}
    >
      <span
        className={`flex items-center justify-center rounded-full border-2 h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11 transition-colors ${
          disabled
            ? "border-slate-100 text-slate-200 cursor-default"
            : "border-slate-300 bg-white text-slate-600 shadow-sm hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50"
        }`}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
      </span>
    </button>
  );
}

export default function StickyTopNav({ items, activeTab }) {
  if (!items || items.length === 0) return null;
  const activeIndex = items.findIndex((item) => item.key === activeTab);
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex >= 0 && activeIndex < items.length - 1;
  return (
    <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 relative">
      <TabNavArrow direction="prev" onClick={() => canGoPrev && items[activeIndex - 1].onClick()} disabled={!canGoPrev} />
      <div className="max-w-7xl mx-auto px-14 sm:px-16 lg:px-24 flex items-center py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const isActive = item.key === activeTab;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 px-3.5 py-1.5 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                  isActive ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <TabNavArrow direction="next" onClick={() => canGoNext && items[activeIndex + 1].onClick()} disabled={!canGoNext} />
    </nav>
  );
}
