// Compacte, vaste navigatiebalk (v219, dashboard fase 3) — blijft zichtbaar tijdens scrollen zodat
// je vanaf elk punt op de pagina meteen naar een ander deel kunt springen. Anders dan StickyYearNav
// (die vast aan de zijkant hangt en over jaren wisselt) is dit een horizontale balk direct onder de
// header, die naar bestaande secties VERDER OP DEZELFDE PAGINA scrollt — geen aparte route/tab, dus
// terug-navigeren (bijv. via de browser) laat de rest van de pagina gewoon staan.
// v227 — de "Bestand laden"-knop (v226) is verhuisd naar de header zelf, naast "Project opslaan"
// (samen met de andere bestandsacties), dus deze balk toont weer alleen de sectie-navigatie.
// v228 — dit was een scroll-naar-sectie-navbalk; de knoppen zijn nu echte tabblad-schakelaars
// (item.onClick wisselt activeTab in App.jsx), dus deze balk toont voortaan ook welk tabblad actief
// is (onderrand in dezelfde slate-kleur als de rest van de app, geen nieuw kleurenschema).
export default function StickyTopNav({ items, activeTab }) {
  if (!items || items.length === 0) return null;
  return (
    <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 flex items-center gap-0.5 overflow-x-auto">
        {items.map((item) => {
          const isActive = item.key === activeTab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
                isActive
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50 rounded-md"
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
