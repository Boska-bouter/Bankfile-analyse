// Compacte, vaste navigatiebalk (v219, dashboard fase 3) — blijft zichtbaar tijdens scrollen zodat
// je vanaf elk punt op de pagina meteen naar een ander deel kunt springen. Anders dan StickyYearNav
// (die vast aan de zijkant hangt en over jaren wisselt) is dit een horizontale balk direct onder de
// header, die naar bestaande secties VERDER OP DEZELFDE PAGINA scrollt — geen aparte route/tab, dus
// terug-navigeren (bijv. via de browser) laat de rest van de pagina gewoon staan.
// v227 — de "Bestand laden"-knop (v226) is verhuisd naar de header zelf, naast "Project opslaan"
// (samen met de andere bestandsacties), dus deze balk toont weer alleen de sectie-navigatie.
// v228 — dit was een scroll-naar-sectie-navbalk; de knoppen zijn nu echte tabblad-schakelaars
// (item.onClick wisselt activeTab in App.jsx), dus deze balk toont voortaan ook welk tabblad actief
// is.
// v230 — stijl geactualiseerd (mockup): het actieve tabblad krijgt nu een gevulde teal "pil" in
// plaats van een zwarte onderrand — rustiger en herkenbaarder als tabblad-schakelaar.
export default function StickyTopNav({ items, activeTab }) {
  if (!items || items.length === 0) return null;
  return (
    <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 flex items-center gap-1 overflow-x-auto py-2">
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
    </nav>
  );
}
