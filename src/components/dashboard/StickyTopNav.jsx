// Compacte, vaste navigatiebalk (v219, dashboard fase 3) — blijft zichtbaar tijdens scrollen zodat
// je vanaf elk punt op de pagina meteen naar een ander deel kunt springen. Anders dan StickyYearNav
// (die vast aan de zijkant hangt en over jaren wisselt) is dit een horizontale balk direct onder de
// header, die naar bestaande secties VERDER OP DEZELFDE PAGINA scrollt — geen aparte route/tab, dus
// terug-navigeren (bijv. via de browser) laat de rest van de pagina gewoon staan.
// v227 — de "Bestand laden"-knop (v226) is verhuisd naar de header zelf, naast "Project opslaan"
// (samen met de andere bestandsacties), dus deze balk toont weer alleen de sectie-navigatie.
export default function StickyTopNav({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 flex items-center gap-0.5 overflow-x-auto">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className="shrink-0 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
