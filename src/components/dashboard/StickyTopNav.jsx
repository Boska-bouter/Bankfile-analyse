import { Upload } from "lucide-react";

// Compacte, vaste navigatiebalk (v219, dashboard fase 3) — blijft zichtbaar tijdens scrollen zodat
// je vanaf elk punt op de pagina meteen naar een ander deel kunt springen. Anders dan StickyYearNav
// (die vast aan de zijkant hangt en over jaren wisselt) is dit een horizontale balk direct onder de
// header, die naar bestaande secties VERDER OP DEZELFDE PAGINA scrollt — geen aparte route/tab, dus
// terug-navigeren (bijv. via de browser) laat de rest van de pagina gewoon staan.
// v226 — "Bestand laden" staat er nu ook als vaste knop rechts in de balk: het toevoegen van een
// nieuw bank-bestand (bijv. een volgend kwartaal) was voorheen alleen bereikbaar door helemaal naar
// de sleep/kies-sectie onderaan de pagina te scrollen — vanuit elk punt in de app nu direct bereikbaar.
export default function StickyTopNav({ items, onLoadFile }) {
  if ((!items || items.length === 0) && !onLoadFile) return null;
  return (
    <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 flex items-center gap-0.5 overflow-x-auto">
        {(items || []).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className="shrink-0 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
        {onLoadFile && (
          <>
            <span className="flex-1" />
            <button
              type="button"
              onClick={onLoadFile}
              className="shrink-0 my-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md whitespace-nowrap"
              title="Nog een bank-bestand toevoegen (CSV, XLS, MT940 of CAMT.053)"
            >
              <Upload className="h-3.5 w-3.5" /> Bestand laden
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
